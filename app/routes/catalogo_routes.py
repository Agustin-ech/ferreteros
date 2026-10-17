from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import select

from app.extensions import db
from app.models.metodo_pago import MetodoPago
from app.models.tipo_devolucion import TipoDevolucion
from app.models.tipo_venta import TipoVenta
from app.utils.decorators import requiere_rol

catalogo_bp = Blueprint("catalogos", __name__, url_prefix="/api/catalogos")


@catalogo_bp.get("")
@jwt_required()
@requiere_rol("admin", "vendedor")
def listar_catalogos_venta():
    tipos_venta = db.session.scalars(
        select(TipoVenta).where(TipoVenta.activo.is_(True)).order_by(TipoVenta.nombre)
    ).all()
    metodos_pago = db.session.scalars(
        select(MetodoPago).where(MetodoPago.activo.is_(True)).order_by(MetodoPago.nombre)
    ).all()
    tipos_devolucion = db.session.scalars(
        select(TipoDevolucion)
        .where(TipoDevolucion.activo.is_(True))
        .order_by(TipoDevolucion.nombre)
    ).all()

    return jsonify({
        "tiposVenta": [
            {"idTipoVenta": item.idTipoVenta, "nombre": item.nombre}
            for item in tipos_venta
        ],
        "metodosPago": [
            {"idMetodoPago": item.idMetodoPago, "nombre": item.nombre}
            for item in metodos_pago
        ],
        "tiposDevolucion": [
            {"idTipoDevolucion": item.idTipoDevolucion, "nombre": item.nombre}
            for item in tipos_devolucion
        ],
    }), 200