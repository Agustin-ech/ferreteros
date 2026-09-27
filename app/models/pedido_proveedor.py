from datetime import datetime, timezone
from app.extensions import db

class PedidoProveedor(db.Model):
    __tablename__ = "pedio_proveedor"

    idPedidoProveedor = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idProveedor = db.Column(db.Integer, db.ForeignKey("Proveedor.idProveedor"), nullable=False)
    idSucursal = db.Column(db.Integer, db.ForeignKey("sucursales.idSucursal"), nullable=False)
    idUsuario = db.Column(db.Integer, db.ForeignKey("usuarios.idUsuario"), nullable=False)
    idEstadoPedidoProveedor = db.Column(db.Integer, db.ForeignKey("estado_pedido_proveedor.idEstadoPedidoProveedor"), nullable=False)

    fechaPedido = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    fechaRecepcion = db.Column(db.DateTime(timezone=True), nullable=True)
    total = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    proveedor = db.relationship('Proveedor')
    sucursal = db.relationship('Sucursal')
    usuario = db.relationship('Usuario')
    estado = db.relationship('EstadoPedidoProveedor')

    def __repr__(self) -> str:
        return f"<PedidoProveedor {self.idPedidoProveedor} - {self.estado.nombre if self.estado else ''}>"