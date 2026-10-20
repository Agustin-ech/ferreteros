from decimal import Decimal

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import EXCLUDE, Schema, ValidationError, fields, validate
from sqlalchemy import desc
from sqlalchemy.orm import joinedload

from app.errors.negocio import DatosInvalidos, RecursoNoEncontrado
from app.extensions import db
from app.models.mercancia_recibida import MercanciaRecibida
from app.models.producto import Producto
from app.models.sucursal import Sucursal
from app.services.inventario_service import ajustar_inventario
from app.utils.decorators import requiere_rol
from app.utils.roles import normalizar_rol, sucursal_autorizada
from app.utils.permisos import PRODUCTOS, requiere_funcion

mercancia_recibida_bp = Blueprint(
    "mercancia_recibida",
    __name__,
    url_prefix="/api/v1/mercancia-recibida",
)


class RegistroRecepcionSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    idProducto = fields.Int(required=True, validate=validate.Range(min=1))
    idSucursal = fields.Int(required=False, validate=validate.Range(min=1))
    fecha = fields.Date(required=True)
    factura = fields.Str(required=True, validate=validate.Length(min=1, max=60))
    proveedor = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    cantidad = fields.Decimal(
        required=True,
        as_string=False,
        validate=validate.Range(min=Decimal("0.001")),
    )


registro_recepcion_schema = RegistroRecepcionSchema()


@mercancia_recibida_bp.route("", methods=["GET"])
@jwt_required()
@requiere_rol("admin", "bodega")
@requiere_funcion(PRODUCTOS)
def listar_mercancia_recibida():
    claims = get_jwt()
    rol = normalizar_rol(claims.get("rol"))
    sucursal_usuario = claims.get("idSucursal")
    sucursal_solicitada = request.args.get("sucursal_id", type=int)
    if request.args.get("sucursal_id") is not None and sucursal_solicitada is None:
        raise DatosInvalidos("El parámetro sucursal_id debe ser un entero.")

    if rol != "admin":
        if sucursal_usuario is None:
            return jsonify({"mensaje": "El usuario no tiene una sucursal asignada."}), 403
        if sucursal_solicitada is not None and not sucursal_autorizada(
            rol, sucursal_usuario, sucursal_solicitada
        ):
            return jsonify({"mensaje": "No puede consultar ingresos de otra sucursal."}), 403
        sucursal_solicitada = int(sucursal_usuario)
    elif sucursal_solicitada is not None and db.session.get(Sucursal, sucursal_solicitada) is None:
        raise RecursoNoEncontrado(f"No existe la sucursal {sucursal_solicitada}.")

    consulta = MercanciaRecibida.query.options(
        joinedload(MercanciaRecibida.producto)
    ).order_by(desc(MercanciaRecibida.fecha), desc(MercanciaRecibida.idMercanciaRecibida))
    if sucursal_solicitada is not None:
        consulta = consulta.filter_by(idSucursal=sucursal_solicitada)
    return jsonify([registro.to_dict() for registro in consulta.all()]), 200


@mercancia_recibida_bp.route("", methods=["POST"])
@jwt_required()
@requiere_rol("admin", "bodega")
@requiere_funcion(PRODUCTOS)
def registrar_mercancia_recibida():
    cuerpo = request.get_json(silent=True)
    if not isinstance(cuerpo, dict):
        raise DatosInvalidos("El cuerpo debe ser un objeto JSON válido.")
    try:
        datos = registro_recepcion_schema.load(cuerpo)
    except ValidationError as error:
        return jsonify({
            "error": "datos_invalidos",
            "mensaje": "Hay campos inválidos en la petición.",
            "campos": error.messages,
        }), 422

    claims = get_jwt()
    rol = normalizar_rol(claims.get("rol"))
    id_sucursal = (
        datos.get("idSucursal") if rol == "admin" else claims.get("idSucursal")
    )
    if id_sucursal is None:
        raise DatosInvalidos("Debe indicar una sucursal para registrar el ingreso.")
    if not sucursal_autorizada(rol, claims.get("idSucursal"), id_sucursal):
        return jsonify({"mensaje": "No puede registrar ingresos en otra sucursal."}), 403

    sucursal = db.session.get(Sucursal, id_sucursal)
    if sucursal is None:
        raise RecursoNoEncontrado(f"No existe la sucursal {id_sucursal}.")
    producto = db.session.get(Producto, datos["idProducto"])
    if producto is None:
        raise RecursoNoEncontrado(f"No existe el producto {datos['idProducto']}.")
    if not producto.activo:
        raise DatosInvalidos("No se puede recibir mercancía de un producto inactivo.")

    factura = datos["factura"].strip()
    proveedor = datos["proveedor"].strip()
    if not factura or not proveedor:
        raise DatosInvalidos("La factura y el proveedor no pueden quedar vacíos.")

    try:
        ajuste = ajustar_inventario(
            db,
            producto.idProducto,
            id_sucursal,
            datos["cantidad"],
            motivo=f"Recepción factura {factura}"[:255],
            id_usuario=int(get_jwt_identity()),
            crear_si_falta=True,
        )
        registro = MercanciaRecibida(
            idProducto=producto.idProducto,
            idSucursal=id_sucursal,
            idUsuario=int(get_jwt_identity()),
            idAjusteInventario=ajuste.idAjusteInventario,
            fecha=datos["fecha"],
            factura=factura,
            proveedor=proveedor,
            cantidad=datos["cantidad"],
        )
        db.session.add(registro)
        db.session.commit()
    except ValueError as error:
        db.session.rollback()
        return jsonify({"mensaje": str(error)}), 400
    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        **registro.to_dict(),
        "existenciasRestantes": float(ajuste.stockNuevo),
    }), 201
