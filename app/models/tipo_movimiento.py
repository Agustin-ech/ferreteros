from datetime import datetime, timezone
from app.extensions import db

class TipoMovimiento(db.Model):
    __tablename__ = "tipo_movimiento"

    idTipoMovimiento = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(20), unique=True, nullable=False)  # Entrada, Salida

    activo = db.Column(db.Boolean, default=True, nullable=False)

    def to_dict(self) -> dict:
        return {
            "idTipoMovimiento": self.idTipoMovimiento,
            "nombre": self.nombre,
            "activo": self.activo,
        }

    def __repr__(self) -> str:
        return f"<TipoMovimiento {self.idTipoMovimiento} - {self.nombre}>"