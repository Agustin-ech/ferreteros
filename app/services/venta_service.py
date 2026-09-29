"""Servicio de ventas.

Reglas que implementa:
  RFF-01  La venta se guarda íntegra: total = suma de subtotales - descuento,
          stock descontado exacto, medio de pago válido, 1 factura por venta y
          rollback total si algo falla a mitad de camino.
  RFF-04  Se registra en pocas consultas (1 de productos + 1 de inventario) y
          se bloquean las filas de inventario con SELECT ... FOR UPDATE para
          que ventas simultáneas del mismo producto no dejen stock negativo.
  RFF-06  Un usuario que no es administrador solo opera sobre su sucursal.

`usuario` es un dict con: id, rol ('admin' | 'vendedor' | 'bodega'), sucursal_id.
"""
from datetime import datetime, time, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from app.extensions import db
from app.models import Cliente, DetalleVenta, Inventario, Producto, Sucursal, Venta
from app.services import factura_service

MEDIOS_PAGO_VALIDOS = {"efectivo", "transferencia"}
DOS_DECIMALES = Decimal("0.01")
TRES_DECIMALES = Decimal("0.001")
MAX_POR_PAGINA = 100


# --------------------------------------------------------------------------- #
# Errores (cada uno lleva el código HTTP con el que la ruta debe responder)
# --------------------------------------------------------------------------- #
class VentaError(Exception):
    status_code = 400


class ValidacionError(VentaError):
    status_code = 400


class PermisoError(VentaError):
    status_code = 403


class RecursoNoEncontradoError(VentaError):
    status_code = 404


class StockInsuficienteError(VentaError):
    status_code = 409


# --------------------------------------------------------------------------- #
# Helpers de validación
# --------------------------------------------------------------------------- #
def _a_entero(valor, campo):
    if isinstance(valor, bool):
        raise ValidacionError(f"'{campo}' debe ser un número entero.")
    if isinstance(valor, int):
        return valor
    if isinstance(valor, str) and valor.strip().isdigit():
        return int(valor.strip())
    raise ValidacionError(f"'{campo}' debe ser un número entero.")


def _a_decimal(valor, campo):
    if valor is None or isinstance(valor, bool):
        raise ValidacionError(f"'{campo}' es obligatorio y debe ser numérico.")
    try:
        numero = Decimal(str(valor))
    except (InvalidOperation, ValueError):
        raise ValidacionError(f"'{campo}' debe ser numérico.")
    if not numero.is_finite():
        raise ValidacionError(f"'{campo}' debe ser un número finito.")
    return numero


def _verificar_acceso_sucursal(sucursal_id, usuario):
    if usuario["rol"] != "admin" and sucursal_id != usuario["sucursal_id"]:
        raise PermisoError("No tienes acceso a datos de otra sucursal.")


def _normalizar_solicitud(datos, usuario):
    """Valida el JSON de entrada y lo deja en tipos seguros (Decimal, int)."""
    if not isinstance(datos, dict):
        raise ValidacionError("El cuerpo de la solicitud debe ser un objeto JSON.")

    # Medio de pago
    medio_pago = str(datos.get("medio_pago", "")).strip().lower()
    if medio_pago not in MEDIOS_PAGO_VALIDOS:
        raise ValidacionError(
            "Medio de pago inválido. Valores permitidos: " + ", ".join(sorted(MEDIOS_PAGO_VALIDOS)) + "."
        )

    # Cliente
    if datos.get("cliente_id") is None:
        raise ValidacionError("'cliente_id' es obligatorio.")
    cliente_id = _a_entero(datos["cliente_id"], "cliente_id")

    # Sucursal: el admin la elige; los demás roles usan siempre la suya
    if usuario["rol"] == "admin":
        if datos.get("sucursal_id") is None:
            raise ValidacionError("'sucursal_id' es obligatorio para el administrador.")
        sucursal_id = _a_entero(datos["sucursal_id"], "sucursal_id")
    else:
        sucursal_id = usuario["sucursal_id"]
        enviada = datos.get("sucursal_id")
        if enviada is not None and _a_entero(enviada, "sucursal_id") != sucursal_id:
            raise PermisoError("Solo puedes registrar ventas en tu propia sucursal.")

    # Descuento (valor en pesos, no porcentaje)
    descuento = _a_decimal(datos.get("descuento", 0), "descuento").quantize(DOS_DECIMALES, ROUND_HALF_UP)
    if descuento < 0:
        raise ValidacionError("'descuento' no puede ser negativo.")

    # Ítems: si un producto viene repetido, se suman las cantidades
    items_crudos = datos.get("items")
    if not isinstance(items_crudos, list) or not items_crudos:
        raise ValidacionError("Debes enviar al menos un producto en 'items'.")

    items = {}
    for posicion, item in enumerate(items_crudos, start=1):
        if not isinstance(item, dict):
            raise ValidacionError(f"items[{posicion}] debe ser un objeto.")
        producto_id = _a_entero(item.get("producto_id"), f"items[{posicion}].producto_id")
        cantidad = _a_decimal(item.get("cantidad"), f"items[{posicion}].cantidad")
        cantidad = cantidad.quantize(TRES_DECIMALES, ROUND_HALF_UP)
        if cantidad <= 0:
            raise ValidacionError(f"items[{posicion}].cantidad debe ser mayor que cero.")
        items[producto_id] = items.get(producto_id, Decimal("0")) + cantidad

    return {
        "cliente_id": cliente_id,
        "sucursal_id": sucursal_id,
        "medio_pago": medio_pago,
        "descuento": descuento,
        "items": items,  # {producto_id: cantidad}
    }


def _validar_datos_cliente(cliente):
    if not (cliente.nombre or "").strip() or not (cliente.documento or "").strip():
        raise ValidacionError("El cliente no tiene los datos obligatorios (nombre y documento/NIT).")


# --------------------------------------------------------------------------- #
# Registro de venta (RFF-01 / RFF-04)
# --------------------------------------------------------------------------- #
def registrar_venta(datos, usuario):
    """Registra venta + detalles + descuento de stock + factura en UNA transacción.

    Si cualquier paso falla se hace rollback y la BD queda como estaba antes:
    sin ventas, detalles ni facturas huérfanos.
    """
    solicitud = _normalizar_solicitud(datos, usuario)
    try:
        respuesta = _registrar_en_transaccion(solicitud, usuario)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return respuesta


def _registrar_en_transaccion(solicitud, usuario):
    sucursal_id = solicitud["sucursal_id"]

    sucursal = db.session.get(Sucursal, sucursal_id)
    if sucursal is None or not sucursal.activa:
        raise RecursoNoEncontradoError("La sucursal no existe o está inactiva.")

    cliente = db.session.get(Cliente, solicitud["cliente_id"])
    if cliente is None:
        raise RecursoNoEncontradoError("El cliente no existe.")
    _validar_datos_cliente(cliente)

    # Se procesa siempre en orden de producto_id: así dos ventas simultáneas
    # bloquean las filas en el mismo orden y no se produce un deadlock.
    ids = sorted(solicitud["items"])

    productos = {p.id: p for p in Producto.query.filter(Producto.id.in_(ids)).all()}
    no_existen = [i for i in ids if i not in productos]
    if no_existen:
        raise RecursoNoEncontradoError(f"Productos inexistentes: {no_existen}.")

    inventarios = {
        inv.producto_id: inv
        for inv in (
            Inventario.query.filter(
                Inventario.sucursal_id == sucursal_id,
                Inventario.producto_id.in_(ids),
            )
            .order_by(Inventario.producto_id)
            .with_for_update()  # bloquea las filas hasta el commit/rollback
            .all()
        )
    }

    # Validar stock de TODOS los ítems antes de tocar nada
    faltas = []
    for producto_id in ids:
        cantidad = solicitud["items"][producto_id]
        inventario = inventarios.get(producto_id)
        disponible = Decimal(str(inventario.stock)) if inventario is not None else Decimal("0")
        if inventario is None or disponible < cantidad:
            faltas.append(
                f"{productos[producto_id].nombre} "
                f"(disponible: {factura_service.formato_cantidad(disponible)}, "
                f"solicitado: {factura_service.formato_cantidad(cantidad)})"
            )
    if faltas:
        raise StockInsuficienteError("Stock insuficiente para: " + "; ".join(faltas) + ".")

    # Calcular líneas y totales con precios de la BD (nunca los del cliente HTTP)
    lineas = []
    subtotal_venta = Decimal("0.00")
    for producto_id in ids:
        producto = productos[producto_id]
        if not getattr(producto, "activo", True):
            raise ValidacionError(f"El producto '{producto.nombre}' está inactivo.")
        precio = Decimal(str(producto.precio_venta)).quantize(DOS_DECIMALES, ROUND_HALF_UP)
        if precio <= 0:
            raise ValidacionError(f"El producto '{producto.nombre}' no tiene un precio válido.")
        cantidad = solicitud["items"][producto_id]
        subtotal = (cantidad * precio).quantize(DOS_DECIMALES, ROUND_HALF_UP)
        lineas.append((producto_id, cantidad, precio, subtotal))
        subtotal_venta += subtotal

    descuento = solicitud["descuento"]
    if descuento > subtotal_venta:
        raise ValidacionError("El descuento no puede ser mayor que el subtotal de la venta.")
    total = subtotal_venta - descuento

    # Persistir venta -> detalles -> stock -> factura (todo sin commit)
    venta = Venta(
        cliente_id=cliente.id,
        sucursal_id=sucursal_id,
        usuario_id=usuario["id"],
        fecha=datetime.now(timezone.utc),
        subtotal=subtotal_venta,
        descuento=descuento,
        total=total,
        medio_pago=solicitud["medio_pago"],
    )
    db.session.add(venta)
    db.session.flush()  # obtiene venta.id

    for producto_id, cantidad, precio, subtotal in lineas:
        db.session.add(
            DetalleVenta(
                venta_id=venta.id,
                producto_id=producto_id,
                cantidad=cantidad,
                precio_unitario=precio,
                subtotal=subtotal,
            )
        )
        inventario = inventarios[producto_id]
        inventario.stock = Decimal(str(inventario.stock)) - cantidad
        # RFF-02: aquí puedes disparar la verificación de stock crítico
        # (si inventario.stock <= 5, crear/actualizar la alerta sin duplicarla).

    factura = factura_service.crear_factura(venta)

    dinero = factura_service.formato_dinero
    return {
        "venta": {
            "id": venta.id,
            "fecha": venta.fecha.isoformat(),
            "cliente_id": venta.cliente_id,
            "sucursal_id": venta.sucursal_id,
            "usuario_id": venta.usuario_id,
            "medio_pago": venta.medio_pago,
            "subtotal": dinero(subtotal_venta),
            "descuento": dinero(descuento),
            "total": dinero(total),
        },
        "detalles": [
            {
                "producto_id": producto_id,
                "cantidad": factura_service.formato_cantidad(cantidad),
                "precio_unitario": dinero(precio),
                "subtotal": dinero(subtotal),
            }
            for producto_id, cantidad, precio, subtotal in lineas
        ],
        "factura": {"id": factura.id, "numero": factura.numero},
    }


# --------------------------------------------------------------------------- #
# Consultas
# --------------------------------------------------------------------------- #
def _venta_a_dict(venta):
    dinero = factura_service.formato_dinero
    return {
        "id": venta.id,
        "fecha": venta.fecha.isoformat(),
        "cliente_id": venta.cliente_id,
        "sucursal_id": venta.sucursal_id,
        "usuario_id": venta.usuario_id,
        "medio_pago": venta.medio_pago,
        "subtotal": dinero(venta.subtotal),
        "descuento": dinero(venta.descuento),
        "total": dinero(venta.total),
    }


def listar_ventas(usuario, sucursal_id=None, cliente_id=None, desde=None, hasta=None, pagina=1, por_pagina=20):
    """Lista paginada. `desde` y `hasta` son objetos date (hasta es inclusivo).

    Un no-admin siempre ve solo su sucursal, aunque envíe otro sucursal_id.
    """
    consulta = Venta.query

    if usuario["rol"] != "admin":
        consulta = consulta.filter(Venta.sucursal_id == usuario["sucursal_id"])
    elif sucursal_id is not None:
        consulta = consulta.filter(Venta.sucursal_id == sucursal_id)

    if cliente_id is not None:
        consulta = consulta.filter(Venta.cliente_id == cliente_id)
    if desde is not None:
        consulta = consulta.filter(Venta.fecha >= datetime.combine(desde, time.min, tzinfo=timezone.utc))
    if hasta is not None:
        siguiente = datetime.combine(hasta + timedelta(days=1), time.min, tzinfo=timezone.utc)
        consulta = consulta.filter(Venta.fecha < siguiente)

    pagina = max(pagina, 1)
    por_pagina = min(max(por_pagina, 1), MAX_POR_PAGINA)
    resultado = consulta.order_by(Venta.fecha.desc()).paginate(page=pagina, per_page=por_pagina, error_out=False)

    return {
        "items": [_venta_a_dict(v) for v in resultado.items],
        "pagina": resultado.page,
        "por_pagina": resultado.per_page,
        "total": resultado.total,
        "paginas": resultado.pages,
    }


def obtener_venta(venta_id, usuario):
    venta = db.session.get(Venta, venta_id)
    if venta is None:
        raise RecursoNoEncontradoError("La venta no existe.")
    _verificar_acceso_sucursal(venta.sucursal_id, usuario)

    filas = (
        db.session.query(DetalleVenta, Producto)
        .join(Producto, Producto.id == DetalleVenta.producto_id)
        .filter(DetalleVenta.venta_id == venta.id)
        .order_by(DetalleVenta.id)
        .all()
    )

    resultado = _venta_a_dict(venta)
    resultado["detalles"] = [
        {
            "producto_id": producto.id,
            "producto": producto.nombre,
            "cantidad": factura_service.formato_cantidad(detalle.cantidad),
            "precio_unitario": factura_service.formato_dinero(detalle.precio_unitario),
            "subtotal": factura_service.formato_dinero(detalle.subtotal),
        }
        for detalle, producto in filas
    ]
    return resultado