from datetime import datetime, timezone
from app.extensions import db

class Entrega(db.Model):
    __tablename__ = "Entrega"

    idEntrega = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idVenta = db.Column(db.Integer, db.ForeignKey("Venta.idVenta"), nullable=False)
    direccionEntrega = db.Column(db.String(200), nullable=False)
    costoEnvio = db.Column(db.Numeric(12, 2), nullable=False)
    fechaSolicitud = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


    def to_dict(self) -> dict:
        return {
            "idEntrega": self.idEntrega,
            "idVenta": self.idVenta,
            "direccionEntrega": self.direccionEntrega,
            "costoEnvio": float(self.costoEnvio),
            "fechaSolicitud": self.fechaSolicitud.isoformat(),
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Entrega {self.idEntrega} - {self.idVenta} - {self.direccionEntrega} - {self.costoEnvio} - {self.fechaSolicitud}>"