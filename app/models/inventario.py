from datetime import datetime, timezone
from app.extensions import db

class Inventario(db.Model):
    __tablename__ = "Inventario"

    idInventario = db.Column(db.Integer, primary_key = True, autoincrement =True)
    CantidadDisponible  = db.Column (db.Numeric(10,2), nullable = False)
    idProducto = db.Column(db.Integer, db.ForeignKey("Producto.idProducto"), nullable=False)

    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
            db.DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False,
        )

    producto = db.relationship('Producto', back_populates='inventario')

    def to_dict(self) -> dict:
        return {
            "idInventario": self.idInventario,
            "CantidadDisponible": float(self.CantidadDisponible),
            "idProducto": self.idProducto,
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }
    
    def __repr__(self) -> str:
        return f"<Inventario {self.idInventario} - Producto {self.idProducto}>"