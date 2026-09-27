from datetime import datetime, timezone
from app.extensions import db

class TransaccionInventario(db.Model):
    __tablename__ = "TransaccionInventario"

    idTransaccionInventario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idInventario = db.Column(db.Integer, db.ForeignKey("Inventario.idInventario"), nullable=False)
    idTipoMovimiento = db.Column(db.Integer, db.ForeignKey("tipo_movimiento.idTipoMovimiento"), nullable=False)

    idVenta = db.Column(db.Integer, db.ForeignKey("Venta.idVenta"), nullable=True)
    idDevolucion = db.Column(db.Integer, db.ForeignKey("devolucion.idDevolucion"), nullable=True)
    idPedidoProveedor = db.Column(db.Integer, db.ForeignKey("pedido_proveedor.idPedidoProveedor"), nullable=True)
    idAjusteInventario = db.Column(db.Integer, db.ForeignKey("AjusteInventario.idAjusteInventario"), nullable=True)

    cantidad = db.Column(db.Numeric(12, 3), nullable=False)
    fecha = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inventario = db.relationship('Inventario')
    tipo_movimiento = db.relationship('TipoMovimiento')
    venta = db.relationship('Venta')
    devolucion = db.relationship('Devolucion')
    pedido_proveedor = db.relationship('PedidoProveedor')
    ajuste = db.relationship('AjusteInventario')

    __table_args__ = (
        db.CheckConstraint(
            db.text(
                '("idVenta" IS NOT NULL)::int + ("idDevolucion" IS NOT NULL)::int + '
                '("idPedidoProveedor" IS NOT NULL)::int + ("idAjusteInventario" IS NOT NULL)::int = 1'
            ),
            name="ck_un_solo_origen"
        ),
    )