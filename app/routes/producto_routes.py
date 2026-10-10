from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.producto import Producto
from app.models.tipo_producto import TipoProducto
from app.models.unidad_medida import UnidadMedida
from app.schemas.producto_schema import ProductoSchema
from app.utils.auth import roles_required

producto_bp = Blueprint("productos", __name__, url_prefix="/api/productos")
producto_schema = ProductoSchema()
productos_schema = ProductoSchema(many=True)


def _error(mensaje, codigo):
    return jsonify({"error": mensaje}), codigo


@producto_bp.errorhandler(ValidationError)
def _datos_invalidos(error):
    return jsonify({"error": "Datos inválidos.", "detalles": error.messages}), 400


def _referencias_validas(data):
    tipo_id = data.get("idTipoProducto")
    unidad_id = data.get("idUnidadMedida")
    if tipo_id is not None:
        tipo = db.session.get(TipoProducto, tipo_id)
        if tipo is None or not tipo.activo:
            return "El tipo de producto no existe o está inactivo."
    if unidad_id is not None:
        unidad = db.session.get(UnidadMedida, unidad_id)
        if unidad is None or not unidad.activo:
            return "La unidad de medida no existe o está inactiva."
    return None


@producto_bp.post("")
@roles_required("admin", "bodega")
def crear_producto():
    data = producto_schema.load(request.get_json(silent=True))
    error_referencia = _referencias_validas(data)
    if error_referencia:
        return _error(error_referencia, 400)
    if Producto.query.filter_by(codigoSKU=data["codigoSKU"]).first():
        return _error("Ya existe un producto con ese código SKU.", 409)

    producto = Producto(**data)
    db.session.add(producto)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("Ya existe un producto con ese código SKU.", 409)
    return jsonify(producto_schema.dump(producto)), 201


@producto_bp.get("")
@roles_required("admin", "bodega", "vendedor")
def listar_productos():
    consulta = Producto.query
    texto = (request.args.get("q") or request.args.get("nombre") or "").strip()
    if texto:
        patron = f"%{texto}%"
        consulta = consulta.filter(
            or_(Producto.nombre.ilike(patron), Producto.codigoSKU.ilike(patron))
        )

    id_tipo = request.args.get("idTipoProducto", type=int)
    if id_tipo is not None:
        consulta = consulta.filter_by(idTipoProducto=id_tipo)
    id_unidad = request.args.get("idUnidadMedida", type=int)
    if id_unidad is not None:
        consulta = consulta.filter_by(idUnidadMedida=id_unidad)

    productos = consulta.order_by(Producto.nombre).all()
    return jsonify(productos_schema.dump(productos)), 200


@producto_bp.get("/<int:producto_id>")
@roles_required("admin", "bodega", "vendedor")
def obtener_producto(producto_id):
    producto = db.session.get(Producto, producto_id)
    if producto is None:
        return _error("El producto no existe.", 404)
    return jsonify(producto_schema.dump(producto)), 200


@producto_bp.put("/<int:producto_id>")
@roles_required("admin", "bodega")
def actualizar_producto(producto_id):
    producto = db.session.get(Producto, producto_id)
    if producto is None:
        return _error("El producto no existe.", 404)

    json_data = request.get_json(silent=True)
    if not isinstance(json_data, dict) or not json_data:
        return _error("Envía al menos un campo para actualizar.", 400)
    try:
        data = producto_schema.load(json_data, partial=True)
    except ValidationError as error:
        return jsonify({"error": "Datos inválidos.", "detalles": error.messages}), 400

    error_referencia = _referencias_validas(data)
    if error_referencia:
        return _error(error_referencia, 400)
    nuevo_sku = data.get("codigoSKU")
    if nuevo_sku and nuevo_sku != producto.codigoSKU:
        if Producto.query.filter_by(codigoSKU=nuevo_sku).first():
            return _error("Ya existe un producto con ese código SKU.", 409)

    for campo, valor in data.items():
        setattr(producto, campo, valor)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("No se pudo actualizar el producto por un conflicto de datos.", 409)
    return jsonify(producto_schema.dump(producto)), 200