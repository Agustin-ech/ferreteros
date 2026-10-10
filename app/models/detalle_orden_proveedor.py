from datetime import datetime, timezone
from app.extensions import db

class DetalleOrdenProveedor(db.Model):
    __tablename__ = "detalle_orden_proveedor"

    idDetalleOrdenProveedor = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idPedidoProveedor = db.Column(db.Integer, db.ForeignKey("pedido_proveedor.idPedidoProveedor"), nullable=False)
    idProducto = db.Column(db.Integer, db.ForeignKey("Producto.idProducto"), nullable=False)
    cantidadPedida = db.Column(db.Numeric(12, 2), nullable=False)
    cantidadRecibida = db.Column(db.Numeric(12, 2), nullable=True)
    precioUnitario = db.Column(db.Numeric(12, 2), nullable=False)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)

    fecha_creacion = db.Column(
            db.DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False,
        )

    pedido_proveedor = db.relationship('PedidoProveedor')
    producto = db.relationship('Producto')

    def to_dict(self) -> dict:
            return {
                "idDetalleOrdenProveedor": self.idDetalleOrdenProveedor,
                "idPedidoProveedor": self.idPedidoProveedor,
                "idProducto": self.idProducto,
                "cantidadPedida": float(self.cantidadPedida),
                "cantidadRecibida": float(self.cantidadRecibida) if self.cantidadRecibida is not None else None,
                "precioUnitario": float(self.precioUnitario),
                "subtotal": float(self.subtotal),
            }

    def __repr__(self) -> str:
        return f"<DetalleOrdenProveedor {self.idDetalleOrdenProveedor} - Pedido: {self.idPedidoProveedor}, Producto: {self.idProducto}>"