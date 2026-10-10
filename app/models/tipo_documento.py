from datetime import datetime, timezone
from app.extensions import db

class CategoriaDocumento:
    CC = "Cédula de ciudadanía"
    CE = "Cédula de extranjería"
    NIT= "Número de identificación tributaria"
    
    OPCIONES = (CC, CE, NIT)
class TipoDeDocumento(db.Model):
    __tablename__="TipoDeDocumento"

    #-- - Columnas obligatorias solicitadas ---
    idTipoDocumento = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Acronimo = db.Column(db.String(10), unique=True, nullable=False)
    nombre = db.Column(db.String(50), unique=True, nullable=False)

    # --- Columnas de soporte, útiles en cualquier sistema real ---
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
            return {
                "idTipoDocumento": self.idTipoDocumento,
                "Acronimo": self.Acronimo,
                "nombre": self.nombre,
                "activo": self.activo,
                "fecha_creacion": self.fecha_creacion.isoformat(),
            }
    
    def __repr__(self) -> str:
        return f"<TipoDeDocumento {self.idTipoDocumento} {self.Acronimo} - {self.nombre}>"