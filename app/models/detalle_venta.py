from datetime import datetime, timezone
from app.extensions import db

class DetalleVenta(db.Model):
    __tablename__ = "detalle_venta"

    idDetalleVenta = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idVenta = db.Column(db.Integer, db.ForeignKey("Venta.idVenta"), nullable=False)
    idProducto = db.Column(db.Integer, db.ForeignKey("Producto.idProducto"), nullable=False)
    cantidad = db.Column(db.Numeric(12, 3), nullable=False)
    precio_unitario = db.Column(db.Numeric(12, 2), nullable=False)
    descuento = db.Column(db.Numeric(12, 2), nullable=False)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)

    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
            db.DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False,
        )

    venta = db.relationship("Venta", back_populates="detalles")
    producto = db.relationship("Producto")

    def to_dict(self) -> dict:
        return {
            "idDetalleVenta": self.idDetalleVenta,
            "idVenta": self.idVenta,
            "idProducto": self.idProducto,
            "cantidad": float(self.cantidad),
            "precio_unitario": float(self.precio_unitario),
            "descuento": float(self.descuento),
            "subtotal": float(self.subtotal),
        }

    def __repr__(self) -> str:
                return f"<DetalleVenta {self.idDetalleVenta} - {self.idVenta} - {self.idProducto} - {self.cantidad} - {self.precio_unitario} - {self.descuento} - {self.subtotal}>"