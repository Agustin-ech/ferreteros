from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.extensions import db
from app.models.metodo_pago import MetodoPago
from app.schemas.tesoreria_schema import CONCEPTOS_EGRESO, egreso_input_schema
from app.services.tesoreria_service import crear_egreso, obtener_movimientos, obtener_resumen
from app.utils.decorators import requiere_rol


tesoreria_bp = Blueprint("tesoreria_bp", __name__, url_prefix="/api/tesoreria")
ZONA_TESORERIA = ZoneInfo("America/Bogota")


def _periodo():
    hoy = datetime.now(timezone.utc).astimezone(ZONA_TESORERIA).date()
    valor_desde = request.args.get("desde")
    valor_hasta = request.args.get("hasta")
    try:
        hasta = date.fromisoformat(valor_hasta) if valor_hasta else hoy
        desde = date.fromisoformat(valor_desde) if valor_desde else hasta.replace(day=1)
    except ValueError as error:
        raise ValueError("Las fechas desde y hasta deben tener formato YYYY-MM-DD.") from error
    if desde > hasta:
        raise ValueError("'desde' debe ser anterior o igual a 'hasta'.")
    if (hasta - desde).days > 366:
        raise ValueError("El periodo no puede superar 366 días.")
    return desde, hasta


def _sucursal_id():
    valor = request.args.get("sucursal_id")
    if valor in (None, "", "todas"):
        return None
    try:
        sucursal_id = int(valor)
    except ValueError as error:
        raise ValueError("'sucursal_id' debe ser un entero o 'todas'.") from error
    if sucursal_id < 1:
        raise ValueError("'sucursal_id' debe ser un entero positivo.")
    return sucursal_id


@tesoreria_bp.get("/catalogos")
@jwt_required()
@requiere_rol("admin")
def catalogos():
    metodos = MetodoPago.query.filter_by(activo=True).order_by(MetodoPago.nombre).all()
    return jsonify({
        "conceptosEgreso": list(CONCEPTOS_EGRESO),
        "metodosPago": [metodo.to_dict() for metodo in metodos],
    }), 200


@tesoreria_bp.post("/egresos")
@jwt_required()
@requiere_rol("admin")
def registrar_egreso():
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "El cuerpo debe ser un objeto JSON válido."}), 400
        data = egreso_input_schema.load(payload)
        movimiento = crear_egreso(data, int(get_jwt_identity()))
        return jsonify({
            "mensaje": "Egreso registrado.",
            "data": {
                "idMovimientoTesoreria": movimiento.idMovimientoTesoreria,
                "concepto": movimiento.concepto,
                "monto": float(movimiento.monto),
            },
        }), 201
    except ValidationError as error:
        return jsonify({"error": "Datos inválidos.", "detalles": error.messages}), 400
    except ValueError as error:
        db.session.rollback()
        return jsonify({"error": str(error)}), 400
    except Exception:
        db.session.rollback()
        return jsonify({"error": "No se pudo registrar el egreso."}), 500


@tesoreria_bp.get("/resumen")
@jwt_required()
@requiere_rol("admin")
def resumen_tesoreria():
    try:
        desde, hasta = _periodo()
        sucursal_id = _sucursal_id()
        return jsonify(obtener_resumen(desde, hasta, sucursal_id)), 200
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@tesoreria_bp.get("/movimientos")
@jwt_required()
@requiere_rol("admin")
def listar_movimientos():
    try:
        desde, hasta = _periodo()
        sucursal_id = _sucursal_id()
        pagina = int(request.args.get("pagina", 1))
        por_pagina = int(request.args.get("por_pagina", 20))
        if pagina < 1 or por_pagina < 1 or por_pagina > 100:
            raise ValueError("'pagina' debe ser positiva y 'por_pagina' debe estar entre 1 y 100.")
        tipo = request.args.get("tipo")
        if tipo not in (None, "", "ingreso", "egreso"):
            raise ValueError("'tipo' debe ser 'ingreso' o 'egreso'.")
        movimientos = obtener_movimientos(desde, hasta, sucursal_id)
        if tipo:
            movimientos = [item for item in movimientos if item["tipo"] == tipo]
        total = len(movimientos)
        inicio = (pagina - 1) * por_pagina
        return jsonify({
            "data": movimientos[inicio:inicio + por_pagina],
            "paginacion": {
                "pagina": pagina,
                "por_pagina": por_pagina,
                "total": total,
                "paginas": (total + por_pagina - 1) // por_pagina,
            },
        }), 200
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
