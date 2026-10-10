from datetime import datetime, timezone
from app.extensions import db

class Factura(db.Model):
    __tablename__ = "Factura"

    idFactura = db.Column(db.Integer, primary_key = True, autoincrement=True)
    idVenta = db.Column(db.Integer, db.ForeignKey("Venta.idVenta"), nullable=False)
    numeroFactura = db.Column(db.String(50), nullable=False)
    fechaEmision = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    valorTotal = db.Column(db.Numeric(12, 2), nullable=False)
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    venta = db.relationship("Venta", back_populates="factura")
    
    def to_dict(self) -> dict:
        return {
            "idFactura": self.idFactura,
            "idVenta": self.idVenta,
            "numeroFactura": self.numeroFactura,
            "fechaEmision": self.fechaEmision.isoformat(),
            "valorTotal": float(self.valorTotal),
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Factura {self.idFactura} - {self.idVenta} - {self.numeroFactura} - {self.fechaEmision} - {self.valorTotal}>"