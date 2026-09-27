from datetime import datetime, timezone
from app.extensions import db

class Proveedor(db.Model):

    __tablename__ = "Proveedor"

    idProveedor = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombreEmpresa = db.Column(db.String(100), nullable=False)
    nit = db.Column(db.String(20), nullable=False, unique=True)
    telefono = db.Column(db.String(15), nullable=True)
    correo = db.Column(db.String(100), nullable=True)
    direccion = db.Column(db.String(200), nullable=True)
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        return {
            "idProveedor": self.idProveedor,
            "nombreEmpresa": self.nombreEmpresa,
            "nit": self.nit,
            "telefono": self.telefono,
            "correo": self.correo,
            "direccion": self.direccion,
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Proveedor {self.idProveedor} - {self.nombreEmpresa} - {self.nit} - {self.telefono} - {self.correo} - {self.direccion}>"