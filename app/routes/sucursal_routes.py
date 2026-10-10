"""Rutas de sucursales.

Endpoints:
  GET    /api/sucursales        Listar (admin: todas; vendedor/bodega: solo la suya)
  GET    /api/sucursales/<id>   Consultar (admin: cualquiera; otros: solo la suya)
  POST   /api/sucursales        Crear (solo admin)
  PUT    /api/sucursales/<id>   Actualizar, parcial (solo admin)
  DELETE /api/sucursales/<id>   Desactivar (solo admin). Es borrado lógico: las
                                ventas e inventario históricos se conservan.

RFF-06: un usuario de una sucursal no ve datos de la otra; solo el admin ve ambas.
La validación y la serialización las hace SucursalSchema (app/schemas.py).
"""
from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Sucursal
from app.schemas.sucursal_schema import SucursalSchema
from app.utils.auth import roles_required

sucursal_bp = Blueprint("sucursales", __name__, url_prefix="/api/sucursales")

sucursal_schema = SucursalSchema()
sucursales_schema = SucursalSchema(many=True)


def _error(mensaje, codigo):
    return jsonify({"error": mensaje}), codigo


@sucursal_bp.errorhandler(ValidationError)
def _datos_invalidos(error):
    return jsonify({"error": "Datos inválidos.", "detalles": error.messages}), 400


def _puede_ver(sucursal_id):
    return g.usuario["rol"] == "admin" or g.usuario["sucursal_id"] == sucursal_id


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@sucursal_bp.get("")
@roles_required("admin", "vendedor", "bodega")
def listar_sucursales():
    consulta = Sucursal.query
    if g.usuario["rol"] != "admin":
        consulta = consulta.filter(Sucursal.idSucursal == g.usuario["sucursal_id"])
    elif request.args.get("solo_activas", "").lower() in ("1", "true", "si"):
        consulta = consulta.filter(Sucursal.activa.is_(True))

    return jsonify(sucursales_schema.dump(consulta.order_by(Sucursal.nombreSucursal).all())), 200


@sucursal_bp.get("/<int:sucursal_id>")
@roles_required("admin", "vendedor", "bodega")
def obtener_sucursal(sucursal_id):
    if not _puede_ver(sucursal_id):
        return _error("No tienes acceso a datos de otra sucursal.", 403)

    sucursal = db.session.get(Sucursal, sucursal_id)
    if sucursal is None:
        return _error("La sucursal no existe.", 404)
    return jsonify(sucursal_schema.dump(sucursal)), 200


@sucursal_bp.post("")
@roles_required("admin")
def crear_sucursal():
    campos = sucursal_schema.load(request.get_json(silent=True))

    if Sucursal.query.filter_by(nombreSucursal=campos["nombreSucursal"]).first():
        return _error("Ya existe una sucursal con ese nombre.", 409)

    campos.setdefault("activa", True)
    sucursal = Sucursal(**campos)
    db.session.add(sucursal)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("Ya existe una sucursal con ese nombre.", 409)
    return jsonify(sucursal_schema.dump(sucursal)), 201


@sucursal_bp.put("/<int:sucursal_id>")
@roles_required("admin")
def actualizar_sucursal(sucursal_id):
    sucursal = db.session.get(Sucursal, sucursal_id)
    if sucursal is None:
        return _error("La sucursal no existe.", 404)

    campos = sucursal_schema.load(request.get_json(silent=True), partial=True)

    nuevo_nombre = campos.get("nombreSucursal")
    if nuevo_nombre and nuevo_nombre != sucursal.nombreSucursal:
        if Sucursal.query.filter_by(nombreSucursal=nuevo_nombre).first():
            return _error("Ya existe una sucursal con ese nombre.", 409)

    for campo, valor in campos.items():
        setattr(sucursal, campo, valor)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("Ya existe una sucursal con ese nombre.", 409)
    return jsonify(sucursal_schema.dump(sucursal)), 200


@sucursal_bp.delete("/<int:sucursal_id>")
@roles_required("admin")
def desactivar_sucursal(sucursal_id):
    sucursal = db.session.get(Sucursal, sucursal_id)
    if sucursal is None:
        return _error("La sucursal no existe.", 404)

    sucursal.activa = False
    db.session.commit()
    return jsonify(sucursal_schema.dump(sucursal)), 200