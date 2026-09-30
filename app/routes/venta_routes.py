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
from datetime import date

from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError

from app.services import factura_service, venta_service
from app.services.factura_service import FacturaError
from app.services.venta_service import ValidacionError, VentaError
from app.utils.auth import roles_required

venta_bp = Blueprint("ventas", __name__, url_prefix="/api/ventas")


# --------------------------------------------------------------------------- #
# Manejo de errores del blueprint
# --------------------------------------------------------------------------- #
@venta_bp.errorhandler(VentaError)
def _error_venta(error):
    return jsonify({"error": str(error)}), error.status_code


@venta_bp.errorhandler(ValidationError)
def _datos_invalidos(error):
    return jsonify({"error": "Datos inválidos.", "detalles": error.messages}), 400


@venta_bp.errorhandler(FacturaError)
def _error_factura(error):
    return jsonify({"error": str(error)}), error.status_code


def _fecha_opcional(nombre):
    """Lee un parámetro de fecha ISO (YYYY-MM-DD) de la query string."""
    valor = request.args.get(nombre)
    if valor is None or valor == "":
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        raise ValidacionError(f"'{nombre}' debe tener formato YYYY-MM-DD.")


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@venta_bp.post("")
@roles_required("admin", "vendedor")
def registrar_venta():
    """Cuerpo esperado:
    {
      "cliente_id": 3,
      "sucursal_id": 1,            // solo el admin debe enviarlo
            "idTipoVenta": 1,
      "medio_pago": "efectivo",    // efectivo | transferencia
      "descuento": 0,              // en pesos, opcional
      "items": [{"producto_id": 10, "cantidad": 2.5}, ...]
    }
    """
    datos = request.get_json(silent=True)
    resultado = venta_service.registrar_venta(datos, g.usuario)
    return jsonify(resultado), 201


@venta_bp.get("")
@roles_required("admin", "vendedor")
def listar_ventas():
    resultado = venta_service.listar_ventas(
        usuario=g.usuario,
        sucursal_id=request.args.get("sucursal_id", type=int),
        cliente_id=request.args.get("cliente_id", type=int),
        desde=_fecha_opcional("desde"),
        hasta=_fecha_opcional("hasta"),
        pagina=request.args.get("pagina", default=1, type=int),
        por_pagina=request.args.get("por_pagina", default=20, type=int),
    )
    return jsonify(resultado), 200


@venta_bp.get("/<int:venta_id>")
@roles_required("admin", "vendedor")
def obtener_venta(venta_id):
    return jsonify(venta_service.obtener_venta(venta_id, g.usuario)), 200


@venta_bp.get("/<int:venta_id>/factura")
@roles_required("admin", "vendedor")
def obtener_factura(venta_id):
    return jsonify(factura_service.obtener_factura_por_venta(venta_id, g.usuario)), 200