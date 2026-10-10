"""Rutas de clientes.

Endpoints:
  POST   /api/clientes          Crear cliente (admin, vendedor)
  GET    /api/clientes          Listar / buscar (admin, vendedor)
  GET    /api/clientes/<id>     Consultar (admin, vendedor)
  PUT    /api/clientes/<id>     Actualizar, parcial (admin, vendedor)
  DELETE /api/clientes/<id>     Eliminar (solo admin; no si tiene ventas)

Los clientes son compartidos entre sucursales, por eso aquí no se filtra por sucursal.
La validación y serialización usan directamente los campos del modelo Cliente.
"""
from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Cliente, Venta
from app.schemas import ClienteSchema
from app.utils.auth import roles_required

cliente_bp = Blueprint("clientes", __name__, url_prefix="/api/clientes")

cliente_schema = ClienteSchema()
clientes_schema = ClienteSchema(many=True)


def _error(mensaje, codigo):
    return jsonify({"error": mensaje}), codigo


@cliente_bp.errorhandler(ValidationError)
def _datos_invalidos(error):
    return jsonify({"error": "Datos inválidos.", "detalles": error.messages}), 400


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@cliente_bp.post("")
@roles_required("admin", "vendedor")
def crear_cliente():
    campos = cliente_schema.load(request.get_json(silent=True))

    if Cliente.query.filter_by(numeroDocumento=campos["numeroDocumento"]).first():
        return _error("Ya existe un cliente con ese documento.", 409)

    cliente = Cliente(**campos)
    db.session.add(cliente)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("Ya existe un cliente con ese documento.", 409)
    return jsonify(cliente_schema.dump(cliente)), 201


@cliente_bp.get("")
@roles_required("admin", "vendedor")
def listar_clientes():
    """Filtros opcionales: ?q=texto y ?idTipoDocumento=1."""
    consulta = Cliente.query

    texto = (request.args.get("q") or "").strip()
    if texto:
        patron = f"%{texto}%"
        consulta = consulta.filter(
            or_(
                Cliente.primerNombre.ilike(patron),
                Cliente.segundoNombre.ilike(patron),
                Cliente.primerApellido.ilike(patron),
                Cliente.segundoApellido.ilike(patron),
                Cliente.numeroDocumento.ilike(patron),
            )
        )

    id_tipo_documento = request.args.get("idTipoDocumento", type=int)
    if id_tipo_documento is not None:
        consulta = consulta.filter(Cliente.idTipoDocumento == id_tipo_documento)

    pagina = max(request.args.get("pagina", default=1, type=int), 1)
    por_pagina = min(max(request.args.get("por_pagina", default=20, type=int), 1), 100)
    resultado = consulta.order_by(Cliente.primerApellido, Cliente.primerNombre).paginate(
        page=pagina,
        per_page=por_pagina,
        error_out=False,
    )

    return jsonify(
        {
            "items": clientes_schema.dump(resultado.items),
            "pagina": resultado.page,
            "por_pagina": resultado.per_page,
            "total": resultado.total,
            "paginas": resultado.pages,
        }
    ), 200


@cliente_bp.get("/<int:cliente_id>")
@roles_required("admin", "vendedor")
def obtener_cliente(cliente_id):
    cliente = db.session.get(Cliente, cliente_id)
    if cliente is None:
        return _error("El cliente no existe.", 404)
    return jsonify(cliente_schema.dump(cliente)), 200


@cliente_bp.put("/<int:cliente_id>")
@roles_required("admin", "vendedor")
def actualizar_cliente(cliente_id):
    cliente = db.session.get(Cliente, cliente_id)
    if cliente is None:
        return _error("El cliente no existe.", 404)

    campos = cliente_schema.load(request.get_json(silent=True), partial=True)

    nuevo_documento = campos.get("numeroDocumento")
    if nuevo_documento and nuevo_documento != cliente.numeroDocumento:
        if Cliente.query.filter_by(numeroDocumento=nuevo_documento).first():
            return _error("Ya existe un cliente con ese documento.", 409)

    for campo, valor in campos.items():
        setattr(cliente, campo, valor)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("Ya existe un cliente con ese documento.", 409)
    return jsonify(cliente_schema.dump(cliente)), 200


@cliente_bp.delete("/<int:cliente_id>")
@roles_required("admin")
def eliminar_cliente(cliente_id):
    cliente = db.session.get(Cliente, cliente_id)
    if cliente is None:
        return _error("El cliente no existe.", 404)

    if Venta.query.filter_by(idCliente=cliente_id).first():
        return _error("No se puede eliminar un cliente que tiene ventas registradas.", 409)

    db.session.delete(cliente)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("No se puede eliminar el cliente porque tiene registros asociados.", 409)
    return "", 204