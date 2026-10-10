from datetime import datetime, timezone
from app.extensions import db

class MetodoPago(db.Model):
    __tablename__ = "metodo_pago"

    idMetodoPago = db.Column(db.Integer, primary_key = True, autoincrement=True)
    nombre = db.Column(db.String(50), unique =True, nullable=False)
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        return {
            "idMetodoPago": self.idMetodoPago,
            "nombre": self.nombre,
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<MetodoPago {self.idMetodoPago} - {self.nombre}>"