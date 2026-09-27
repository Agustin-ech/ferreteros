from datetime import datetime, timezone
from app.extensions import db

class DetalleDevolucion(db.Model):
    __tablename__ = "DetalleDevolucion"

    idDetalleDevolucion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idDevolucion = db.Column(db.Integer, db.ForeignKey("devolucion.idDevolucion"), nullable=False)
    idDetalleVenta = db.Column(db.Integer, db.ForeignKey("detalle_venta.idDetalleVenta"), unique=True, nullable=False)
    idProducto = db.Column(db.Integer, db.ForeignKey("Producto.idProducto"), nullable=False)

    cantidadDevuelta = db.Column(db.Numeric(12, 3), nullable=False)
    productoApto = db.Column(db.Boolean, nullable=False, default=True)  # True = Apto para reventa, False = Dañado
    montoDevuelto = db.Column(db.Numeric(12, 2), nullable=False)

    devolucion = db.relationship('Devolucion')
    detalle_venta = db.relationship('DetalleVenta')
    producto = db.relationship('Producto')
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
            db.DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False,
        )

    producto = db.relationship('Producto')
    devolucion = db.relationship('Devolucion')
    detalle_venta = db.relationship('DetalleVenta')

    def to_dict(self) -> dict:
        return {
            "idDetalleDevolucion": self.idDetalleDevolucion,
            "idDevolucion": self.idDevolucion,
            "idDetalleVenta": self.idDetalleVenta,
            "idProducto": self.idProducto,
            "cantidadDevuelta": float(self.cantidadDevuelta),
            "productoApto": self.productoApto,
            "montoDevuelto": float(self.montoDevuelto),
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self) -> str:
        estado = "Apto para reventa" if self.productoApto else "Dañado"
        return f"<DetalleDevolucion {self.idDetalleDevolucion} - {estado}>"