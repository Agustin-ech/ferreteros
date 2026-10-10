from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.entrega import Entrega
from app.models.venta import Venta
from app.schemas.domicilio_schema import (
    domicilio_input_schema,
    domicilio_output_schema,
    domicilios_output_schema,
)
from app.services.domicilio_service import DomicilioService
from app.utils.decorators import requiere_rol

domicilio_bp = Blueprint("domicilio_bp", __name__, url_prefix="/api/domicilios")


def _usuario_actual():
    claims = get_jwt()
    return {
        "id": int(get_jwt_identity()),
        "rol": claims.get("rol"),
        "sucursal_id": claims.get("idSucursal"),
    }


@domicilio_bp.route("", methods=["POST"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def crear_domicilio():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"mensaje": "El cuerpo debe ser un objeto JSON válido."}), 400

    try:
        data_validada = domicilio_input_schema.load(data)
    except ValidationError as err:
        return jsonify({"errores_validacion": err.messages}), 400

    usuario = _usuario_actual()
    if usuario["rol"] != "admin" and usuario["sucursal_id"] is None:
        return jsonify({"mensaje": "El usuario no tiene una sucursal asignada."}), 403

    try:
        nueva_entrega = DomicilioService.registrar_pedido_domicilio(data_validada, usuario)
        return jsonify({
            "mensaje": "Pedido a domicilio registrado exitosamente.",
            "data": domicilio_output_schema.dump(nueva_entrega),
        }), 201
    except PermissionError as error:
        return jsonify({"mensaje": str(error)}), 403
    except ValueError as error:
        return jsonify({"mensaje": str(error)}), 400
    except Exception:
        current_app.logger.exception("Error inesperado al procesar pedido a domicilio")
        return jsonify({"mensaje": "Error al procesar el pedido a domicilio."}), 500


@domicilio_bp.route("", methods=["GET"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def listar_domicilios():
    entregas = DomicilioService.listar_domicilios(_usuario_actual())
    return jsonify(domicilios_output_schema.dump(entregas)), 200


@domicilio_bp.route("/<int:id_entrega>", methods=["GET"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def obtener_domicilio(id_entrega):
    usuario = _usuario_actual()
    consulta = select(Entrega).join(Venta).where(Entrega.idEntrega == id_entrega)
    if usuario["rol"] != "admin":
        sucursal_id = usuario["sucursal_id"]
        if sucursal_id is None:
            consulta = consulta.where(Venta.idVenta == -1)
        else:
            consulta = consulta.where(Venta.idSucursal == int(sucursal_id))
    entrega = db.session.scalar(
        consulta.options(joinedload(Entrega.venta).joinedload(Venta.factura))
    )
    if entrega is None:
        return jsonify({"mensaje": "Domicilio no encontrado."}), 404
    return jsonify(domicilio_output_schema.dump(entrega)), 200