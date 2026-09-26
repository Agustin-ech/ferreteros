from datetime import datetime, timezone
from app.extensions import db

class Funcion(db.Model):
    __tablename__ = "Funcion"

    # Columnas obligatorias solicitadas
    idFuncion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    modulo = db.Column(db.String(10), unique=True, nullable=False)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    descripcion = db.Column(db.String(200), nullable=True)

    # Columnas de soporte, útiles en cualquier sistema real
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        return {
            "idFuncion": self.idFuncion,
            "modulo": self.modulo,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Funcion {self.idFuncion} - {self.modulo} - {self.nombre} - {self.descripcion}>"