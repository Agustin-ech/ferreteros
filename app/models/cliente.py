from datetime import datetime, timezone
from app.extensions import db

class Cliente(db.Model):
    __tablename__ = "Cliente"

    idCliente = db.Column(db.Integer,primary_key=True, autoincrement=True)
    idTipoDocumento = db.Column(db.Integer, db.ForeignKey("TipoDeDocumento.idTipoDocumento"), nullable=False)
    numeroDocumento = db.Column(db.String(20), unique=True, nullable=False)
    primerNombre = db.Column(db.String(150), nullable=False)
    segundoNombre = db.Column(db.String(150), nullable=True)
    primerApellido = db.Column(db.String(150), nullable=False)
    segundoApellido = db.Column(db.String(150), nullable=True)
    direccion= db.Column(db.String(50), nullable=True)
    barrio = db.Column(db.String(50),nullable=True)
    telefono = db.Column(db.String(20), nullable=True)
    correoElectronico = db.Column(db.String(100), nullable=True)

    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
            return {
                "idCliente": self.idCliente,
                "idTipoDocumento": self.idTipoDocumento,
                "numeroDocumento": self.numeroDocumento,
                "primerNombre": self.primerNombre,
                "segundoNombre": self.segundoNombre,
                "primerApellido": self.primerApellido,
                "segundoApellido": self.segundoApellido,
                "direccion": self.direccion,
                "barrio": self.barrio,
                "telefono": self.telefono,
                "correoElectronico": self.correoElectronico,
                "activo": self.activo,
                "fecha_creacion": self.fecha_creacion.isoformat(),
            }
    
    def __repr__(self) -> str:
        return f"<Cliente {self.idCliente} - {self.primerNombre} - {self.segundoNombre} - {self.primerApellido} - {self.segundoApellido} - {self.correoElectronico} - {self.telefono} ({self.idTipoDocumento})>"