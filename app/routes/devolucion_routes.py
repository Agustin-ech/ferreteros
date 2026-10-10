from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError
from app.schemas.devolucion_schema import (
    devolucion_input_schema,
    devolucion_output_schema,
    devoluciones_output_schema,
)
from app.services.devolucion_service import DevolucionService
from app.utils.decorators import requiere_rol

devolucion_bp = Blueprint("devolucion_bp", __name__, url_prefix="/api/devoluciones")


def _usuario_actual():
    claims = get_jwt()
    return {
        "id": int(get_jwt_identity()),
        "rol": claims.get("rol"),
        "sucursal_id": claims.get("idSucursal"),
    }

# POST /api/devoluciones (Procesar devolución)
@devolucion_bp.route("", methods=["POST"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def registrar_devolucion():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"mensaje": "El cuerpo debe ser un objeto JSON válido."}), 400

    try:
        data_validada = devolucion_input_schema.load(data)
    except ValidationError as err:
        return jsonify({"errores_validacion": err.messages}), 400

    usuario = _usuario_actual()
    if usuario["rol"] != "admin" and usuario["sucursal_id"] is None:
        return jsonify({"mensaje": "El usuario no tiene una sucursal asignada."}), 403

    try:
        devolucion = DevolucionService.procesar_devolucion(
            id_factura=data_validada["idFactura"],
            id_usuario=usuario["id"],
            id_tipo_devolucion=data_validada["idTipoDevolucion"],
            motivo=data_validada["motivo"],
            detalles_data=data_validada["detalles"],
            id_sucursal_usuario=usuario["sucursal_id"] if usuario["rol"] != "admin" else None,
        )
        return jsonify({
            "mensaje": "Devolución procesada exitosamente.",
            "data": devolucion_output_schema.dump(devolucion)
        }), 201

    except PermissionError as error:
        return jsonify({"mensaje": str(error)}), 403
    except ValueError as e:
        return jsonify({"mensaje": str(e)}), 400
    except Exception:
        return jsonify({"mensaje": "Error interno al procesar la devolución."}), 500


# GET /api/devoluciones/<id> (Consultar devolución específica)
@devolucion_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def obtener_devolucion(id):
    devolucion = DevolucionService.obtener_devolucion(id, _usuario_actual())
    if devolucion is None:
        return jsonify({"mensaje": "Devolución no encontrada."}), 404
    return jsonify(devolucion_output_schema.dump(devolucion)), 200


# GET /api/devoluciones?idFactura=<id> (Listar por factura u obtener todas)
@devolucion_bp.route("", methods=["GET"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def listar_devoluciones():
    valor_id_factura = request.args.get("idFactura")
    try:
        id_factura = int(valor_id_factura) if valor_id_factura is not None else None
        if id_factura is not None and id_factura < 1:
            raise ValueError
    except ValueError:
        return jsonify({"mensaje": "El parámetro 'idFactura' debe ser un entero positivo."}), 400
    devoluciones = DevolucionService.listar_devoluciones(_usuario_actual(), id_factura)
    return jsonify(devoluciones_output_schema.dump(devoluciones)), 200