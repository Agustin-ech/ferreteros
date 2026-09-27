from datetime import datetime, timezone
from app.extensions import db

class UnidadMedida(db.Model):
    __tablename__ = "UnidadMedida"

    idUnidadMedida = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)  # ej: "Kilogramo", "Litro", "Unidad", "Galón", "Caja"
    abreviatura = db.Column(db.String(10), nullable=True)  # ej: "kg", "L", "und"
    permite_decimales = db.Column(db.Boolean, default=True, nullable=False)  # False para "unidad"/"caja"

    # Columnas de soporte
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    productos = db.relationship('Product', back_populates='unidad_medida')

    def to_dict(self) -> dict:
        return {
            "idUnidadMedida": self.idUnidadMedida,
            "nombre": self.nombre,
            "abreviatura": self.abreviatura,
            "permite_decimales": self.permite_decimales,
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<UnidadMedida {self.idUnidadMedida} - {self.nombre}>"