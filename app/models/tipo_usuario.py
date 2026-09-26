from datetime import datetime, timezone
from app.extensions import db

class CategoriaUsuario:
    ADMINISTRADOR = "administrador"
    VENDEDOR = "vendedor"
    BODEGA = "bodega"

    OPCIONES = (ADMINISTRADOR, VENDEDOR, BODEGA)
class TipoUsuario(db.Model):
    __tablename__="TipoUsuario"

    #-- - Columnas obligatorias solicitadas ---
    idTipoUsuario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    descripcion = db.Column(db.String(255), nullable=True)

    # --- Columnas de soporte, útiles en cualquier sistema real ---
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
            return {
                "nombre": self.nombre,
                "descripcion": self.descripcion,
                "activo": self.activo,
                "fecha_creacion": self.fecha_creacion.isoformat(),
            }
    
    def __repr__(self) -> str:
        return f"<TipoUsuario {self.idTipoUsuario} - {self.nombre} - {self.descripcion}>"