from datetime import datetime, timezone
from app.extensions import db

class Sucursal(db.Model):
    __tablename__ = "sucursales"

    # --- Columnas principales ---
    idSucursal = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombreSucursal = db.Column(db.String(100), nullable=False, unique=True)
    direccion = db.Column(db.String(255), nullable=False)
    telefono = db.Column(db.String(20), nullable=True)

    # --- Columnas de soporte ---
    activa = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
            db.DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False,
        )

    # --- Relaciones ---    
    usuarios = db.relationship('SucursalUsuario', back_populates='sucursal')
    inventarios = db.relationship('Inventario', back_populates='sucursal')
    
    # ------------------------------------------------------------------
    # Utilidades
    # ------------------------------------------------------------------
    def to_dict(self) -> dict:
        return {
            "idSucursal": self.idSucursal,
            "nombreSucursal": self.nombreSucursal,
            "direccion": self.direccion,
            "telefono": self.telefono,
            "activa": self.activa,
        }

    def __repr__(self) -> str:
        return f"<Sucursal {self.idSucursal} - {self.nombreSucursal} - {self.direccion} - {self.telefono}>"