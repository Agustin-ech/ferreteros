from decimal import Decimal, ROUND_HALF_UP

from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.detalle_orden_proveedor import DetalleOrdenProveedor
from app.models.estado_pedido_proveedor import EstadoPedidoProveedor
from app.models.pedido_proveedor import PedidoProveedor
from app.models.producto import Producto
from app.models.proveedor import Proveedor
from app.models.sucursal import Sucursal
from app.schemas.proveedor_schema import (
    actualizar_estado_pedido_schema,
    crear_pedido_proveedor_schema,
)
from app.utils.auth import roles_required

proveedor_bp = Blueprint("proveedores", __name__, url_prefix="/api/proveedores")

ESTADOS_PEDIDO = ("Pendiente", "Parcial", "Recibido", "Cancelado")


def _error(mensaje, codigo):
    return jsonify({"error": mensaje}), codigo


@proveedor_bp.errorhandler(ValidationError)
def _datos_invalidos(error):
    return jsonify({"error": "Datos inválidos.", "detalles": error.messages}), 400


def _serializar_pedido(pedido, detalles):
    return {
        "idPedidoProveedor": pedido.idPedidoProveedor,
        "fechaPedido": pedido.fechaPedido.isoformat(),
        "fechaRecepcion": pedido.fechaRecepcion.isoformat() if pedido.fechaRecepcion else None,
        "total": float(pedido.total),
        "estado": pedido.estado.nombre,
        "proveedor": {
            "idProveedor": pedido.proveedor.idProveedor,
            "nombreEmpresa": pedido.proveedor.nombreEmpresa,
        },
        "sucursal": {
            "idSucursal": pedido.sucursal.idSucursal,
            "nombreSucursal": pedido.sucursal.nombreSucursal,
        },
        "detalles": [
            {
                **detalle.to_dict(),
                "nombreProducto": detalle.producto.nombre,
                "codigoSKU": detalle.producto.codigoSKU,
            }
            for detalle in detalles
        ],
    }


def _obtener_o_crear_estado(nombre):
    estado = EstadoPedidoProveedor.query.filter(
        db.func.lower(EstadoPedidoProveedor.nombre) == nombre.lower()
    ).first()
    if estado is None:
        estado = EstadoPedidoProveedor(nombre=nombre, activo=True)
        db.session.add(estado)
        db.session.flush()
    elif not estado.activo:
        estado.activo = True
    return estado


@proveedor_bp.get("")
@roles_required("admin")
def listar_proveedores():
    proveedores = (
        Proveedor.query.filter_by(activo=True)
        .order_by(Proveedor.nombreEmpresa)
        .all()
    )
    return jsonify([proveedor.to_dict() for proveedor in proveedores]), 200


@proveedor_bp.get("/estados")
@roles_required("admin")
def listar_estados_pedido():
    return jsonify({"estados": ESTADOS_PEDIDO}), 200


@proveedor_bp.get("/pedidos")
@roles_required("admin")
def listar_pedidos():
    pedidos = PedidoProveedor.query.order_by(PedidoProveedor.fechaPedido.desc()).all()
    if not pedidos:
        return jsonify([]), 200

    ids_pedidos = [pedido.idPedidoProveedor for pedido in pedidos]
    detalles = (
        DetalleOrdenProveedor.query.filter(
            DetalleOrdenProveedor.idPedidoProveedor.in_(ids_pedidos)
        )
        .order_by(DetalleOrdenProveedor.idDetalleOrdenProveedor)
        .all()
    )
    detalles_por_pedido = {}
    for detalle in detalles:
        detalles_por_pedido.setdefault(detalle.idPedidoProveedor, []).append(detalle)

    return jsonify([
        _serializar_pedido(pedido, detalles_por_pedido.get(pedido.idPedidoProveedor, []))
        for pedido in pedidos
    ]), 200


@proveedor_bp.post("/pedidos")
@roles_required("admin")
def crear_pedido():
    data = crear_pedido_proveedor_schema.load(request.get_json(silent=True))
    proveedor = db.session.get(Proveedor, data["idProveedor"])
    sucursal = db.session.get(Sucursal, data["idSucursal"])
    if proveedor is None or not proveedor.activo:
        return _error("El proveedor no existe o está inactivo.", 400)
    if sucursal is None or not sucursal.activa:
        return _error("La sucursal no existe o está inactiva.", 400)

    ids_productos = [detalle["idProducto"] for detalle in data["detalles"]]
    if len(ids_productos) != len(set(ids_productos)):
        return _error("No repitas productos dentro del mismo pedido.", 400)

    productos = {
        producto.idProducto: producto
        for producto in Producto.query.filter(Producto.idProducto.in_(ids_productos)).all()
    }
    if len(productos) != len(ids_productos):
        return _error("Uno o más productos no existen.", 400)
    if any(not producto.activo for producto in productos.values()):
        return _error("No se pueden pedir productos inactivos.", 400)

    lineas = []
    total = Decimal("0.00")
    for linea in data["detalles"]:
        cantidad = Decimal(linea["cantidadPedida"])
        precio = Decimal(linea["precioUnitario"])
        subtotal = (cantidad * precio).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if subtotal > Decimal("9999999999.99"):
            return _error("El subtotal de una línea supera el monto permitido.", 400)
        total += subtotal
        lineas.append((linea["idProducto"], cantidad, precio, subtotal))
    total = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if total > Decimal("9999999999.99"):
        return _error("El total del pedido supera el monto permitido.", 400)

    pedido = PedidoProveedor(
        idProveedor=proveedor.idProveedor,
        idSucursal=sucursal.idSucursal,
        idUsuario=g.usuario["id"],
        estado=_obtener_o_crear_estado("Pendiente"),
        total=total,
    )
    db.session.add(pedido)
    db.session.flush()
    for id_producto, cantidad, precio, subtotal in lineas:
        db.session.add(DetalleOrdenProveedor(
            idPedidoProveedor=pedido.idPedidoProveedor,
            idProducto=id_producto,
            cantidadPedida=cantidad,
            cantidadRecibida=Decimal("0.00"),
            precioUnitario=precio,
            subtotal=subtotal,
        ))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("No se pudo registrar el pedido por un conflicto de datos.", 409)

    detalles = (
        DetalleOrdenProveedor.query.filter_by(idPedidoProveedor=pedido.idPedidoProveedor)
        .order_by(DetalleOrdenProveedor.idDetalleOrdenProveedor)
        .all()
    )
    return jsonify(_serializar_pedido(pedido, detalles)), 201


@proveedor_bp.patch("/pedidos/<int:pedido_id>/estado")
@roles_required("admin")
def actualizar_estado_pedido(pedido_id):
    data = actualizar_estado_pedido_schema.load(request.get_json(silent=True))
    estado_solicitado = data["estado"].strip()
    estado = next(
        (nombre for nombre in ESTADOS_PEDIDO if nombre.lower() == estado_solicitado.lower()),
        None,
    )
    if estado is None:
        return _error("El estado solicitado no es válido.", 400)

    pedido = db.session.get(PedidoProveedor, pedido_id)
    if pedido is None:
        return _error("El pedido no existe.", 404)

    pedido.estado = _obtener_o_crear_estado(estado)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("No se pudo actualizar el estado del pedido.", 409)
    return jsonify(_serializar_pedido(
        pedido,
        DetalleOrdenProveedor.query.filter_by(idPedidoProveedor=pedido_id)
        .order_by(DetalleOrdenProveedor.idDetalleOrdenProveedor)
        .all(),
    )), 200