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
from decimal import ROUND_HALF_UP, Decimal

from app.extensions import db
from app.models import (
    Cliente,
    DetalleVenta,
    Inventario,
    MetodoPago,
    Producto,
    Sucursal,
    TipoVenta,
    Venta,
)
from app.schemas import VentaCrearSchema
from app.services import factura_service

DOS_DECIMALES = Decimal("0.01")
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
def _verificar_acceso_sucursal(sucursal_id, usuario):
    if usuario["rol"] != "admin" and sucursal_id != usuario["sucursal_id"]:
        raise PermisoError("No tienes acceso a datos de otra sucursal.")


def _normalizar_solicitud(datos, usuario):
    """Valida el JSON con VentaCrearSchema y aplica las reglas que dependen del usuario.

    Si el JSON es inválido, marshmallow lanza ValidationError; la ruta lo
    convierte en un 400 con el detalle por campo.
    """
    cargado = VentaCrearSchema().load(datos)

    # Sucursal: el admin la elige; los demás roles usan siempre la suya
    if usuario["rol"] == "admin":
        if cargado["sucursal_id"] is None:
            raise ValidacionError("'sucursal_id' es obligatorio para el administrador.")
        sucursal_id = cargado["sucursal_id"]
    else:
        sucursal_id = usuario["sucursal_id"]
        if cargado["sucursal_id"] is not None and cargado["sucursal_id"] != sucursal_id:
            raise PermisoError("Solo puedes registrar ventas en tu propia sucursal.")

    # Ítems: si un producto viene repetido, se suman las cantidades
    items = {}
    for item in cargado["items"]:
        producto_id = item["producto_id"]
        items[producto_id] = items.get(producto_id, Decimal("0")) + item["cantidad"]

    return {
        "cliente_id": cargado["cliente_id"],
        "sucursal_id": sucursal_id,
        "tipo_venta_id": cargado["idTipoVenta"],
        "medio_pago": cargado["medio_pago"],
        "descuento": cargado["descuento"],
        "items": items,  # {producto_id: cantidad}
    }


def _validar_datos_cliente(cliente):
    nombre = " ".join(
        parte.strip()
        for parte in (
            cliente.primerNombre,
            cliente.segundoNombre,
            cliente.primerApellido,
            cliente.segundoApellido,
        )
        if parte and parte.strip()
    )
    if not nombre or not (cliente.numeroDocumento or "").strip():
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

    tipo_venta = db.session.get(TipoVenta, solicitud["tipo_venta_id"])
    if tipo_venta is None or not tipo_venta.activo:
        raise RecursoNoEncontradoError("El tipo de venta no existe o está inactivo.")

    metodo_pago = MetodoPago.query.filter(
        db.func.lower(MetodoPago.nombre) == solicitud["medio_pago"].strip().lower(),
        MetodoPago.activo.is_(True),
    ).first()
    if metodo_pago is None:
        raise RecursoNoEncontradoError("El método de pago no existe o está inactivo.")

    # Se procesa siempre en orden de producto_id: así dos ventas simultáneas
    # bloquean las filas en el mismo orden y no se produce un deadlock.
    ids = sorted(solicitud["items"])

    productos = {
        producto.idProducto: producto
        for producto in Producto.query.filter(Producto.idProducto.in_(ids)).all()
    }
    no_existen = [i for i in ids if i not in productos]
    if no_existen:
        raise RecursoNoEncontradoError(f"Productos inexistentes: {no_existen}.")

    inventarios = {
        inv.idProducto: inv
        for inv in (
            Inventario.query.filter(
                Inventario.idSucursal == sucursal_id,
                Inventario.idProducto.in_(ids),
                Inventario.activo.is_(True),
            )
            .order_by(Inventario.idProducto)
            .with_for_update()  # bloquea las filas hasta el commit/rollback
            .all()
        )
    }

    # Validar stock de TODOS los ítems antes de tocar nada
    faltas = []
    for producto_id in ids:
        cantidad = solicitud["items"][producto_id]
        inventario = inventarios.get(producto_id)
        disponible = (
            Decimal(str(inventario.CantidadDisponible))
            if inventario is not None
            else Decimal("0")
        )
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
        precio = Decimal(str(producto.precio)).quantize(DOS_DECIMALES, ROUND_HALF_UP)
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
        idCliente=cliente.idCliente,
        idSucursal=sucursal_id,
        idUsuario=usuario["id"],
        idTipoVenta=tipo_venta.idTipoVenta,
        idMetodoPago=metodo_pago.idMetodoPago,
        fechaHora=datetime.now(timezone.utc),
        subtotal=subtotal_venta,
        descuentoTotal=descuento,
        total=total,
    )
    db.session.add(venta)
    db.session.flush()  # Obtiene venta.idVenta.

    for producto_id, cantidad, precio, subtotal in lineas:
        db.session.add(
            DetalleVenta(
                idVenta=venta.idVenta,
                idProducto=producto_id,
                cantidad=cantidad,
                precio_unitario=precio,
                descuento=Decimal("0.00"),
                subtotal=subtotal,
            )
        )
        inventario = inventarios[producto_id]
        inventario.CantidadDisponible = Decimal(str(inventario.CantidadDisponible)) - cantidad
        # RFF-02: aquí puedes disparar la verificación de stock crítico
        # (si inventario.CantidadDisponible <= 5, actualizar la alerta sin duplicarla).

    factura = factura_service.crear_factura(venta)

    dinero = factura_service.formato_dinero
    return {
        "venta": {
            "id": venta.idVenta,
            "fecha": venta.fechaHora.isoformat(),
            "cliente_id": venta.idCliente,
            "sucursal_id": venta.idSucursal,
            "usuario_id": venta.idUsuario,
            "medio_pago": metodo_pago.nombre,
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
        "factura": {"id": factura.idFactura, "numero": factura.numeroFactura},
    }


# --------------------------------------------------------------------------- #
# Consultas
# --------------------------------------------------------------------------- #
def _venta_a_dict(venta):
    dinero = factura_service.formato_dinero
    return {
        "id": venta.idVenta,
        "fecha": venta.fechaHora.isoformat(),
        "cliente_id": venta.idCliente,
        "sucursal_id": venta.idSucursal,
        "usuario_id": venta.idUsuario,
        "medio_pago": venta.metodo_pago.nombre,
        "subtotal": dinero(venta.subtotal),
        "descuento": dinero(venta.descuentoTotal),
        "total": dinero(venta.total),
    }


def listar_ventas(usuario, sucursal_id=None, cliente_id=None, desde=None, hasta=None, pagina=1, por_pagina=20):
    """Lista paginada. `desde` y `hasta` son objetos date (hasta es inclusivo).

    Un no-admin siempre ve solo su sucursal, aunque envíe otro sucursal_id.
    """
    consulta = Venta.query

    if usuario["rol"] != "admin":
        consulta = consulta.filter(Venta.idSucursal == usuario["sucursal_id"])
    elif sucursal_id is not None:
        consulta = consulta.filter(Venta.idSucursal == sucursal_id)

    if cliente_id is not None:
        consulta = consulta.filter(Venta.idCliente == cliente_id)
    if desde is not None:
        consulta = consulta.filter(Venta.fechaHora >= datetime.combine(desde, time.min, tzinfo=timezone.utc))
    if hasta is not None:
        siguiente = datetime.combine(hasta + timedelta(days=1), time.min, tzinfo=timezone.utc)
        consulta = consulta.filter(Venta.fechaHora < siguiente)

    pagina = max(pagina, 1)
    por_pagina = min(max(por_pagina, 1), MAX_POR_PAGINA)
    resultado = consulta.order_by(Venta.fechaHora.desc()).paginate(page=pagina, per_page=por_pagina, error_out=False)

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
    _verificar_acceso_sucursal(venta.idSucursal, usuario)

    filas = (
        db.session.query(DetalleVenta, Producto)
        .join(Producto, Producto.idProducto == DetalleVenta.idProducto)
        .filter(DetalleVenta.idVenta == venta.idVenta)
        .order_by(DetalleVenta.idDetalleVenta)
        .all()
    )

    resultado = _venta_a_dict(venta)
    resultado["detalles"] = [
        {
            "producto_id": producto.idProducto,
            "producto": producto.nombre,
            "cantidad": factura_service.formato_cantidad(detalle.cantidad),
            "precio_unitario": factura_service.formato_dinero(detalle.precio_unitario),
            "subtotal": factura_service.formato_dinero(detalle.subtotal),
        }
        for detalle, producto in filas
    ]
    return resultado