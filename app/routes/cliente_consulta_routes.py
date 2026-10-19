from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models.cliente import Cliente
from app.utils.decorators import requiere_rol

cliente_consulta_bp = Blueprint(
    "cliente_consulta_bp",
    __name__,
    url_prefix="/api/clientes",
)


@cliente_consulta_bp.get("/<int:cliente_id>")
@jwt_required()
@requiere_rol("admin", "vendedor")
def obtener_cliente_por_id(cliente_id):
    cliente = db.session.get(Cliente, cliente_id)
    if cliente is None:
        return jsonify({"mensaje": "El cliente no existe."}), 404
    return jsonify(cliente.to_dict()), 200
