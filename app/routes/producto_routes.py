from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.producto import Producto
from app.models.tipo_producto import TipoProducto
from app.models.unidad_medida import UnidadMedida
from app.schemas.producto_schema import ProductoSchema
from app.services.almacenamiento_service import AlmacenamientoError, borrar_foto, subir_foto
from app.utils.auth import roles_required
from app.utils.permisos import PRODUCTOS, requiere_funcion

producto_bp = Blueprint("productos", __name__, url_prefix="/api/productos")
producto_schema = ProductoSchema()
productos_schema = ProductoSchema(many=True)


MAX_BYTES_IMAGEN = 2 * 1024 * 1024  # 2 MB


def _tipo_imagen(contenido: bytes):
    """Detecta el tipo real mirando los primeros bytes (no confía en el cliente)."""
    if contenido.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if contenido.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if contenido[:4] == b"RIFF" and contenido[8:12] == b"WEBP":
        return "image/webp"
    return None


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
@requiere_funcion(PRODUCTOS)
def crear_producto():
    data = producto_schema.load(request.get_json(silent=True))
    if data.get("descuentoPorcentaje") and g.usuario["rol"] != "admin":
        return _error("Solo el administrador puede asignar descuentos.", 403)
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
    incluir_inactivos = request.args.get("incluirInactivos", "false").lower() == "true"
    if not incluir_inactivos:
        consulta = consulta.filter_by(activo=True)

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


@producto_bp.get("/catalogos")
@roles_required("admin", "bodega", "vendedor")
def listar_catalogos_producto():
    tipos = TipoProducto.query.filter_by(activo=True).order_by(TipoProducto.nombre).all()
    unidades = UnidadMedida.query.filter_by(activo=True).order_by(UnidadMedida.nombre).all()
    return jsonify({
        "tipos": [
            {"idTipoProducto": tipo.idTipoProducto, "nombre": tipo.nombre}
            for tipo in tipos
        ],
        "unidades": [
            {"idUnidadMedida": unidad.idUnidadMedida, "nombre": unidad.nombre}
            for unidad in unidades
        ],
    }), 200


@producto_bp.get("/<int:producto_id>")
@roles_required("admin", "bodega", "vendedor")
def obtener_producto(producto_id):
    producto = db.session.get(Producto, producto_id)
    if producto is None:
        return _error("El producto no existe.", 404)
    return jsonify(producto_schema.dump(producto)), 200


@producto_bp.delete("/<int:producto_id>")
@roles_required("admin", "bodega")
@requiere_funcion(PRODUCTOS)
def desactivar_producto(producto_id):
    producto = db.session.get(Producto, producto_id)
    if producto is None:
        return _error("El producto no existe.", 404)

    producto.activo = False
    db.session.commit()
    return jsonify(producto_schema.dump(producto)), 200


@producto_bp.put("/<int:producto_id>")
@roles_required("admin", "bodega")
@requiere_funcion(PRODUCTOS)
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

    if "descuentoPorcentaje" in data and g.usuario["rol"] != "admin":
        return _error("Solo el administrador puede asignar descuentos.", 403)

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


@producto_bp.post("/<int:producto_id>/imagen")
@roles_required("admin", "bodega")
def subir_imagen_producto(producto_id):
    producto = db.session.get(Producto, producto_id)
    if producto is None:
        return _error("El producto no existe.", 404)

    archivo = request.files.get("imagen")
    if archivo is None:
        return _error("Envía la foto en el campo \"imagen\".", 400)

    contenido = archivo.read(MAX_BYTES_IMAGEN + 1)
    if not contenido:
        return _error("El archivo está vacío.", 400)
    if len(contenido) > MAX_BYTES_IMAGEN:
        return _error("La foto supera el tamaño máximo de 2 MB.", 413)
    mime = _tipo_imagen(contenido)
    if mime is None:
        return _error("Formato no válido. Usa una imagen JPG, PNG o WEBP.", 400)

    try:
        nueva_url = subir_foto(producto.idProducto, contenido, mime)
    except AlmacenamientoError as error:
        return _error(str(error), 502)

    anterior = producto.imagenUrl
    producto.imagenUrl = nueva_url
    db.session.commit()
    borrar_foto(anterior)
    return jsonify(producto_schema.dump(producto)), 200


@producto_bp.delete("/<int:producto_id>/imagen")
@roles_required("admin", "bodega")
def quitar_imagen_producto(producto_id):
    producto = db.session.get(Producto, producto_id)
    if producto is None:
        return _error("El producto no existe.", 404)
    anterior = producto.imagenUrl
    producto.imagenUrl = None
    db.session.commit()
    borrar_foto(anterior)
    return jsonify(producto_schema.dump(producto)), 200
