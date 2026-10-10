"""
Gestión de mercancía dañada — módulo completo en un solo archivo.

    "El personal de bodega podrá registrar productos identificados en mal estado y
     generar los reportes correspondientes, permitiendo realizar el control necesario
     sobre el inventario y el valor de la mercancía afectada."

Endpoints (prefijo `/api/v1/mercancia-danada`):

    GET    /tipos-danio              catálogo de motivos de daño
    POST   /tipos-danio              crea un motivo (administración)
    POST   /                         registra mercancía dañada  -> DESCUENTA inventario
    GET    /                         lista con filtros y paginación
    GET    /resumen                  unidades y valor afectado (por motivo, sucursal, producto)
    GET    /<id>                     detalle de un registro
    PATCH  /<id>/estado              dar de baja / reclamar / recuperar  (puede DEVOLVER inventario)
    DELETE /<id>                     anula el registro                   -> DEVUELVE inventario

El reporte formal (JSON + CSV + PDF) vive en el módulo de reportes y reutiliza el
mismo contrato que los demás:

    GET /api/v1/reportes/mercancia-danada?sucursal_id=2&desde=...&hasta=...&formato=pdf

Registro en el app factory:

    from app.routes.mercacia_dabada_route import mercancia_danada_bp
    app.register_blueprint(mercancia_danada_bp)

Las tres reglas que sostienen el módulo:

  1. Registrar un daño **descuenta el inventario** en la misma transacción. Si no hay
     existencias suficientes la operación falla completa (409): nunca queda un
     registro de pérdida sin su movimiento de inventario.
  2. El **costo se congela** al registrar (`costoUnitario`), así el valor histórico de
     la pérdida no cambia cuando cambie la lista de costos.
  3. Anular o marcar como recuperado **devuelve las unidades** al inventario, una sola
     vez (lo controla la bandera `descontadoDeInventario`).
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from flask import Blueprint, jsonify, request
from marshmallow import EXCLUDE, Schema, ValidationError, fields, validate
from sqlalchemy import and_, func, or_, select

from app.errors.negocio import ConflictoNegocio, DatosInvalidos, RecursoNoEncontrado
from app.extensions import db
from app.models.mercancia_danada import (
    ESTADO_ANULADA,
    ESTADO_DADA_DE_BAJA,
    ESTADO_RECLAMADA,
    ESTADO_RECUPERADA,
    ESTADO_REGISTRADA,
    ESTADOS_MERCANCIA_DANADA,
    MercanciaDanada,
    TipoDanio,
)
from app.services.inventario_service import ajustar_inventario, costo_de, dec, existencias
from app.services.reporte_service import (
    buscar_ilike,
    modelo,
    porcentaje,
    rango_datetime,
    resolver_alcance,
    validar_periodo,
)

mercancia_danada_bp = Blueprint("mercancia_danada", __name__, url_prefix="/api/v1/mercancia-danada")


# =============================================================================
# 1. ESTADOS Y TRANSICIONES
# =============================================================================

# A qué estados puede pasar cada estado. Los estados finales no tienen salida:
# así un registro dado de baja no se puede "revivir" por error desde la interfaz.
TRANSICIONES: dict[str, set[str]] = {
    ESTADO_REGISTRADA: {ESTADO_DADA_DE_BAJA, ESTADO_RECLAMADA, ESTADO_RECUPERADA, ESTADO_ANULADA},
    ESTADO_RECLAMADA: {ESTADO_DADA_DE_BAJA, ESTADO_RECUPERADA, ESTADO_ANULADA},
    ESTADO_DADA_DE_BAJA: set(),
    ESTADO_RECUPERADA: set(),
    ESTADO_ANULADA: set(),
}

# Estados en los que la mercancía vuelve a estar disponible para la venta.
ESTADOS_QUE_DEVUELVEN_INVENTARIO = {ESTADO_RECUPERADA, ESTADO_ANULADA}


# =============================================================================
# 2. VALIDACIÓN DE ENTRADA (marshmallow)
# =============================================================================

class _Base(Schema):
    class Meta:
        unknown = EXCLUDE


class RegistroDanioSchema(_Base):
    """Cuerpo de `POST /api/v1/mercancia-danada`."""

    idProducto = fields.Int(required=True, validate=validate.Range(min=1))
    idSucursal = fields.Int(required=True, validate=validate.Range(min=1))
    idUsuario = fields.Int(required=True, validate=validate.Range(min=1))
    idTipoDanio = fields.Int(required=True, validate=validate.Range(min=1))
    cantidad = fields.Decimal(required=True, as_string=False,
                              validate=validate.Range(min=Decimal("0.001")))
    # Si no se envía, se toma el costo del producto (ver `costo_de`).
    costoUnitario = fields.Decimal(required=False, allow_none=True,
                                   validate=validate.Range(min=Decimal("0")))
    descripcion = fields.Str(required=False, allow_none=True,
                             validate=validate.Length(max=255))
    # Mercancía que llegó dañada del proveedor: deja la trazabilidad del pedido.
    idPedidoProveedor = fields.Int(required=False, allow_none=True)
    fecha = fields.DateTime(required=False, allow_none=True)
    # En inventarios físicos la mercancía ya está fuera del sistema: permite no descontar.
    descontarInventario = fields.Bool(load_default=True)


class CambioEstadoSchema(_Base):
    estado = fields.Str(required=True, validate=validate.OneOf(ESTADOS_MERCANCIA_DANADA))
    observacion = fields.Str(required=False, allow_none=True, validate=validate.Length(max=255))


class TipoDanioSchema(_Base):
    nombre = fields.Str(required=True, validate=validate.Length(min=3, max=60))
    descripcion = fields.Str(required=False, allow_none=True, validate=validate.Length(max=200))
    imputableProveedor = fields.Bool(load_default=False)


# =============================================================================
# 3. SERIALIZACIÓN
# =============================================================================

def serializar(registro: MercanciaDanada, *, producto=None, sucursal=None, tipo=None) -> dict:
    """Registro + nombres legibles (evita que el front tenga que resolver cada id)."""
    datos = registro.to_dict()
    datos["producto"] = getattr(producto or registro.producto, "nombre", None)
    datos["sucursal"] = getattr(sucursal or registro.sucursal, "nombreSucursal", None)
    datos["tipoDanio"] = getattr(tipo or registro.tipo_danio, "nombre", None)
    return datos


# =============================================================================
# 4. REGLAS DE NEGOCIO
# =============================================================================

def _sucursal_autorizada(id_sucursal: int) -> int:
    """
    Verifica que el usuario pueda operar sobre esa sucursal.

    Reutiliza el mismo control de permisos del módulo de reportes: si la sucursal no
    existe o no está autorizada, responde 404 (`SucursalNoEncontrada`).
    """
    alcance = resolver_alcance(db, str(id_sucursal))
    return alcance.sucursal_id


def _obtener(id_registro: int) -> MercanciaDanada:
    registro = db.session.get(MercanciaDanada, id_registro)
    if registro is None:
        raise RecursoNoEncontrado(f"No existe el registro de mercancía dañada {id_registro}.")
    _sucursal_autorizada(registro.idSucursal)       # respeta los permisos del usuario
    return registro


def registrar(datos: dict) -> MercanciaDanada:
    """Registra el hallazgo y descuenta el inventario en una sola transacción."""
    Producto = modelo("Producto")

    id_sucursal = _sucursal_autorizada(datos["idSucursal"])

    producto = db.session.get(Producto, datos["idProducto"])
    if producto is None:
        raise RecursoNoEncontrado(f"No existe el producto {datos['idProducto']}.")

    tipo = db.session.get(TipoDanio, datos["idTipoDanio"])
    if tipo is None or not tipo.activo:
        raise RecursoNoEncontrado(f"No existe (o está inactivo) el tipo de daño {datos['idTipoDanio']}.")

    if datos.get("idPedidoProveedor"):
        _validar_pedido(datos["idPedidoProveedor"], id_sucursal)

    cantidad = dec(datos["cantidad"])
    costo = dec(datos["costoUnitario"]) if datos.get("costoUnitario") is not None else costo_de(producto)
    descontar = bool(datos.get("descontarInventario", True))

    registro = MercanciaDanada(
        idProducto=datos["idProducto"],
        idSucursal=id_sucursal,
        idUsuario=datos["idUsuario"],
        idTipoDanio=datos["idTipoDanio"],
        idPedidoProveedor=datos.get("idPedidoProveedor"),
        cantidad=cantidad,
        costoUnitario=costo,
        valorPerdida=(cantidad * costo).quantize(Decimal("0.01")),
        descripcion=datos.get("descripcion"),
        estado=ESTADO_REGISTRADA,
        descontadoDeInventario=descontar,
        fecha=datos.get("fecha") or datetime.now(timezone.utc),
    )

    try:
        if descontar:
            ajustar_inventario(db, registro.idProducto, id_sucursal, -cantidad,
                               motivo="registro de mercancía dañada")
        db.session.add(registro)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return registro


def cambiar_estado(id_registro: int, nuevo: str, observacion: str | None = None) -> MercanciaDanada:
    """Aplica una transición de estado y, si corresponde, devuelve el inventario."""
    registro = _obtener(id_registro)
    actual = registro.estado

    if nuevo == actual:
        raise ConflictoNegocio(f"El registro ya está en estado '{actual}'.")
    permitidos = TRANSICIONES.get(actual, set())
    if nuevo not in permitidos:
        raise ConflictoNegocio(
            f"No se puede pasar de '{actual}' a '{nuevo}'.",
            detalle=(f"Desde '{actual}' solo se permite: {', '.join(sorted(permitidos))}."
                     if permitidos else f"'{actual}' es un estado final."),
        )
    if nuevo == ESTADO_RECLAMADA and not registro.idPedidoProveedor:
        raise ConflictoNegocio(
            "Para reclamar al proveedor el registro debe estar asociado a un pedido "
            "(`idPedidoProveedor`).",
        )

    try:
        # Solo se devuelve el inventario si realmente se había descontado.
        if nuevo in ESTADOS_QUE_DEVUELVEN_INVENTARIO and registro.descontadoDeInventario:
            ajustar_inventario(db, registro.idProducto, registro.idSucursal, dec(registro.cantidad),
                               crear_si_falta=True, motivo=f"mercancía dañada: {nuevo.lower()}")
            registro.descontadoDeInventario = False

        registro.estado = nuevo
        if observacion:
            base = (registro.descripcion or "").strip()
            registro.descripcion = f"{base} | {nuevo}: {observacion}".strip(" |")[:255]
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

    return registro


def _validar_pedido(id_pedido: int, id_sucursal: int) -> None:
    """El pedido debe existir y ser de la misma sucursal donde se registra el daño."""
    PedidoProveedor = modelo("PedidoProveedor")
    pedido = db.session.get(PedidoProveedor, id_pedido)
    if pedido is None:
        raise RecursoNoEncontrado(f"No existe el pedido a proveedor {id_pedido}.")
    if pedido.idSucursal != id_sucursal:
        raise ConflictoNegocio(
            f"El pedido {id_pedido} pertenece a otra sucursal: no se puede asociar a este registro."
        )


# =============================================================================
# 5. CONSULTAS
# =============================================================================

def _condiciones(args, alcance) -> list:
    """Filtros comunes de los listados y del resumen."""
    desde, hasta = validar_periodo(args.get("desde"), args.get("hasta"))
    ini, fin = rango_datetime(db, desde, hasta)
    condiciones = [MercanciaDanada.fecha.between(ini, fin)]

    if args.get("idProducto"):
        condiciones.append(MercanciaDanada.idProducto == _entero(args["idProducto"], "idProducto"))
    if args.get("idTipoDanio"):
        condiciones.append(MercanciaDanada.idTipoDanio == _entero(args["idTipoDanio"], "idTipoDanio"))
    if args.get("idPedidoProveedor"):
        condiciones.append(
            MercanciaDanada.idPedidoProveedor == _entero(args["idPedidoProveedor"], "idPedidoProveedor")
        )
    if args.get("estado"):
        estado = args["estado"].strip()
        if estado not in ESTADOS_MERCANCIA_DANADA:
            raise DatosInvalidos(
                f"Estado '{estado}' no válido. Use uno de: {', '.join(ESTADOS_MERCANCIA_DANADA)}."
            )
        condiciones.append(MercanciaDanada.estado == estado)
    if args.get("incluir_anuladas", "").strip().lower() not in ("1", "true", "si", "sí"):
        condiciones.append(MercanciaDanada.estado != ESTADO_ANULADA)

    if args.get("buscar"):
        Producto = modelo("Producto")
        termino = args["buscar"]
        criterios = [buscar_ilike(MercanciaDanada.descripcion, termino),
                     buscar_ilike(Producto.nombre, termino)]
        if hasattr(Producto, "codigo"):
            criterios.append(buscar_ilike(Producto.codigo, termino))
        condiciones.append(or_(*[c for c in criterios if c is not None]))

    return condiciones, desde, hasta


def _entero(valor, nombre: str) -> int:
    try:
        return int(valor)
    except (TypeError, ValueError):
        raise DatosInvalidos(f"El parámetro '{nombre}' debe ser un número entero (recibido: '{valor}').")


# =============================================================================
# 6. ENDPOINTS
# =============================================================================

@mercancia_danada_bp.get("/tipos-danio")
def listar_tipos_danio():
    """Catálogo de motivos de daño (alimenta el selector del formulario de bodega)."""
    tipos = db.session.execute(
        select(TipoDanio).where(TipoDanio.activo.is_(True)).order_by(TipoDanio.nombre)
    ).scalars().all()
    return jsonify([t.to_dict() for t in tipos])


@mercancia_danada_bp.post("/tipos-danio")
def crear_tipo_danio():
    datos = TipoDanioSchema().load(request.get_json(silent=True) or {})
    existente = db.session.execute(
        select(TipoDanio).where(func.lower(TipoDanio.nombre) == datos["nombre"].strip().lower())
    ).scalars().first()
    if existente is not None:
        raise ConflictoNegocio(f"Ya existe un tipo de daño llamado '{existente.nombre}'.")

    tipo = TipoDanio(**datos)
    db.session.add(tipo)
    db.session.commit()
    return jsonify(tipo.to_dict()), 201


@mercancia_danada_bp.post("")
@mercancia_danada_bp.post("/")
def registrar_mercancia_danada():
    """Registra productos en mal estado y descuenta el inventario."""
    datos = RegistroDanioSchema().load(request.get_json(silent=True) or {})
    registro = registrar(datos)
    cuerpo = serializar(registro)
    cuerpo["existenciasRestantes"] = float(existencias(db, registro.idProducto, registro.idSucursal))
    return jsonify(cuerpo), 201


@mercancia_danada_bp.get("")
@mercancia_danada_bp.get("/")
def listar_mercancia_danada():
    """
    Listado con filtros y paginación.

        ?sucursal_id=2|todas &desde= &hasta= &idProducto= &idTipoDanio= &estado=
        &buscar= &pagina=1 &por_pagina=50
    """
    Producto = modelo("Producto")
    Sucursal = modelo("Sucursal")

    alcance = resolver_alcance(db, request.args.get("sucursal_id"))
    condiciones, desde, hasta = _condiciones(request.args, alcance)

    pagina = max(1, _entero(request.args.get("pagina", 1), "pagina"))
    por_pagina = min(200, max(1, _entero(request.args.get("por_pagina", 50), "por_pagina")))

    base = (
        select(MercanciaDanada, Producto, Sucursal, TipoDanio)
        .join(Producto, Producto.idProducto == MercanciaDanada.idProducto)
        .join(Sucursal, Sucursal.idSucursal == MercanciaDanada.idSucursal)
        .join(TipoDanio, TipoDanio.idTipoDanio == MercanciaDanada.idTipoDanio)
        .where(and_(*condiciones))
    )
    base = alcance.filtrar(base, MercanciaDanada.idSucursal)

    total = db.session.execute(
        alcance.filtrar(
            select(func.count(MercanciaDanada.idMercanciaDanada))
            .join(Producto, Producto.idProducto == MercanciaDanada.idProducto)
            .where(and_(*condiciones)),
            MercanciaDanada.idSucursal,
        )
    ).scalar_one()

    filas = db.session.execute(
        base.order_by(MercanciaDanada.fecha.desc(), MercanciaDanada.idMercanciaDanada.desc())
        .limit(por_pagina)
        .offset((pagina - 1) * por_pagina)
    ).all()

    return jsonify({
        "alcance": alcance.a_dict(),
        "periodo": {"desde": desde.isoformat(), "hasta": hasta.isoformat()},
        "paginacion": {
            "pagina": pagina,
            "por_pagina": por_pagina,
            "total": int(total),
            "paginas": max(1, -(-int(total) // por_pagina)),
        },
        "datos": [serializar(r, producto=p, sucursal=s, tipo=t) for r, p, s, t in filas],
    })


@mercancia_danada_bp.get("/resumen")
def resumen_mercancia_danada():
    """Unidades y valor de la mercancía afectada: por motivo, por sucursal y por producto."""
    Producto = modelo("Producto")
    Sucursal = modelo("Sucursal")

    alcance = resolver_alcance(db, request.args.get("sucursal_id"))
    condiciones, desde, hasta = _condiciones(request.args, alcance)

    def agrupado(etiqueta_col, join_, *, limite=None, orden_valor=True):
        stmt = (
            select(
                etiqueta_col,
                func.count(MercanciaDanada.idMercanciaDanada),
                func.coalesce(func.sum(MercanciaDanada.cantidad), 0),
                func.coalesce(func.sum(MercanciaDanada.valorPerdida), 0),
            )
            .where(and_(*condiciones))
            .group_by(etiqueta_col)
        )
        for destino, condicion in join_:
            stmt = stmt.join(destino, condicion)
        stmt = stmt.order_by(
            func.sum(MercanciaDanada.valorPerdida).desc() if orden_valor else etiqueta_col
        )
        if limite:
            stmt = stmt.limit(limite)
        return db.session.execute(alcance.filtrar(stmt, MercanciaDanada.idSucursal)).all()

    join_producto = [(Producto, Producto.idProducto == MercanciaDanada.idProducto)]
    por_motivo = agrupado(TipoDanio.nombre, [(TipoDanio, TipoDanio.idTipoDanio == MercanciaDanada.idTipoDanio)])
    por_sucursal = agrupado(Sucursal.nombreSucursal, [(Sucursal, Sucursal.idSucursal == MercanciaDanada.idSucursal)])
    por_producto = agrupado(Producto.nombre, join_producto, limite=10)
    por_estado = agrupado(MercanciaDanada.estado, [], orden_valor=False)

    total_valor = sum((dec(r[3]) for r in por_motivo), Decimal("0"))
    total_unidades = sum((dec(r[2]) for r in por_motivo), Decimal("0"))
    total_registros = sum(int(r[1]) for r in por_motivo)

    def bloque(filas):
        return [
            {
                "etiqueta": r[0],
                "registros": int(r[1]),
                "unidades": float(dec(r[2])),
                "valor": float(dec(r[3])),
                "participacion": porcentaje(dec(r[3]), total_valor),
            }
            for r in filas
        ]

    return jsonify({
        "alcance": alcance.a_dict(),
        "periodo": {"desde": desde.isoformat(), "hasta": hasta.isoformat()},
        "totales": {
            "registros": total_registros,
            "unidades": float(total_unidades),
            "valorPerdida": float(total_valor),
        },
        "por_motivo": bloque(por_motivo),
        "por_sucursal": bloque(por_sucursal),
        "por_producto": bloque(por_producto),
        "por_estado": bloque(por_estado),
        "nota": "El valor usa el costo congelado en cada registro, no el costo actual del producto.",
    })


@mercancia_danada_bp.get("/<int:id_registro>")
def obtener_mercancia_danada(id_registro: int):
    registro = _obtener(id_registro)
    cuerpo = serializar(registro)
    cuerpo["existenciasActuales"] = float(existencias(db, registro.idProducto, registro.idSucursal))
    cuerpo["transicionesPermitidas"] = sorted(TRANSICIONES.get(registro.estado, set()))
    return jsonify(cuerpo)


@mercancia_danada_bp.patch("/<int:id_registro>/estado")
def cambiar_estado_mercancia_danada(id_registro: int):
    """Dar de baja, reclamar al proveedor, marcar como recuperada o anular."""
    datos = CambioEstadoSchema().load(request.get_json(silent=True) or {})
    registro = cambiar_estado(id_registro, datos["estado"], datos.get("observacion"))
    cuerpo = serializar(registro)
    cuerpo["existenciasActuales"] = float(existencias(db, registro.idProducto, registro.idSucursal))
    return jsonify(cuerpo)


@mercancia_danada_bp.delete("/<int:id_registro>")
def anular_mercancia_danada(id_registro: int):
    """Anula el registro (error de digitación) y devuelve las unidades al inventario."""
    registro = cambiar_estado(id_registro, ESTADO_ANULADA,
                              (request.args.get("motivo") or "anulado por el usuario"))
    return jsonify({
        "mensaje": "Registro anulado; las unidades volvieron al inventario.",
        "registro": serializar(registro),
        "existenciasActuales": float(existencias(db, registro.idProducto, registro.idSucursal)),
    })
