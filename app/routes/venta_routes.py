"""Rutas de ventas.

Endpoints:
  POST /api/ventas                    Registrar una venta (admin, vendedor)
  GET  /api/ventas                    Listar ventas con filtros y paginación (admin, vendedor)
  GET  /api/ventas/<id>               Detalle de una venta (admin, vendedor)
  GET  /api/ventas/<id>/factura       Factura de una venta (admin, vendedor)

Se asume un decorador `roles_required` en app/utils/auth.py que:
  * responde 401 si no hay sesión/token válido,
  * responde 403 si el rol no está permitido (RFF-06),
  * deja el usuario autenticado en `g.usuario` como dict: {id, rol, sucursal_id}.
"""
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.schemas.venta_schema import (
    factura_output_schema,
    venta_input_schema,
    venta_output_schema,
    ventas_output_schema,
)
from app.services.venta_service import VentaService
from app.utils.decorators import requiere_rol

venta_bp = Blueprint("venta_bp", __name__, url_prefix="/api/ventas")


def _usuario_actual():
    claims = get_jwt()
    return {
        "id": int(get_jwt_identity()),
        "rol": claims.get("rol"),
        "sucursal_id": claims.get("idSucursal"),
    }


def _parametro_entero(nombre, valor_predeterminado=None, minimo=1):
    valor = request.args.get(nombre)
    if valor is None:
        return valor_predeterminado
    try:
        resultado = int(valor)
    except (TypeError, ValueError) as error:
        raise ValueError(f"El parámetro '{nombre}' debe ser un entero.") from error
    if resultado < minimo:
        raise ValueError(f"El parámetro '{nombre}' debe ser como mínimo {minimo}.")
    return resultado


def _parametro_fecha(nombre):
    valor = request.args.get(nombre)
    if valor is None:
        return None
    try:
        fecha = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError(f"El parámetro '{nombre}' debe ser una fecha ISO válida.") from error
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha


@venta_bp.route("", methods=["POST"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def registrar_venta():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"mensaje": "El cuerpo debe ser un objeto JSON válido."}), 400

    try:
        data_validada = venta_input_schema.load(data)
    except ValidationError as err:
        return jsonify({"errores_validacion": err.messages}), 400

    try:
        nueva_venta = VentaService.registrar_venta(data_validada, _usuario_actual())
        return jsonify({
            "mensaje": "Venta procesada y factura generada con éxito.",
            "data": venta_output_schema.dump(nueva_venta)
        }), 201
    except PermissionError as error:
        return jsonify({"mensaje": str(error)}), 403
    except ValueError as e:
        return jsonify({"mensaje": str(e)}), 400
    except Exception:
        return jsonify({"mensaje": "Error al procesar la venta."}), 500


@venta_bp.route("", methods=["GET"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def listar_ventas():
    try:
        pagina = _parametro_entero("pagina", 1)
        por_pagina = _parametro_entero("por_pagina", 20)
        if por_pagina > 100:
            raise ValueError("El parámetro 'por_pagina' no puede superar 100.")

        filtros = {
            "idSucursal": _parametro_entero("sucursal"),
            "idCliente": _parametro_entero("cliente"),
            "desde": _parametro_fecha("desde"),
            "hasta": _parametro_fecha("hasta"),
        }
        if filtros["desde"] and filtros["hasta"] and filtros["desde"] >= filtros["hasta"]:
            raise ValueError("'desde' debe ser anterior a 'hasta'.")

        ventas, total = VentaService.listar_ventas(
            _usuario_actual(), filtros, pagina, por_pagina
        )
        return jsonify({
            "data": ventas_output_schema.dump(ventas),
            "paginacion": {
                "pagina": pagina,
                "por_pagina": por_pagina,
                "total": total,
                "paginas": (total + por_pagina - 1) // por_pagina,
            },
        }), 200
    except ValueError as error:
        return jsonify({"mensaje": str(error)}), 400


@venta_bp.route("/<int:id_venta>", methods=["GET"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def obtener_venta(id_venta):
    venta = VentaService.obtener_venta(id_venta, _usuario_actual())
    if not venta:
        return jsonify({"mensaje": "Venta no encontrada."}), 404
    return jsonify(venta_output_schema.dump(venta)), 200


@venta_bp.route("/<int:id_venta>/factura", methods=["GET"])
@jwt_required()
@requiere_rol("admin", "vendedor")
def obtener_factura(id_venta):
    factura = VentaService.obtener_factura(id_venta, _usuario_actual())
    if not factura:
        return jsonify({"mensaje": "Factura no encontrada."}), 404
    return jsonify(factura_output_schema.dump(factura)), 200