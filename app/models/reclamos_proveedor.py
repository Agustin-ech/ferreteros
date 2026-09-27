from datetime import datetime, timezone
from app.extensions import db

class ReclamoProveedor(db.Model):
    __tablename__ = "ReclamoProveedor"

    idReclamoProveedor = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idPedidoProveedor = db.Column(db.Integer, db.ForeignKey("pedido_proveedor.idPedidoProveedor"), nullable=False)

    descripcion = db.Column(db.String(255), nullable=False)
    cantidadAfectada = db.Column(db.Numeric(12, 3), nullable=False)
    estado = db.Column(db.String(20), nullable=False, default="En proceso")

    fecha = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    pedido_proveedor = db.relationship('PedidoProveedor')

    __table_args__ = (
        db.CheckConstraint(
            "estado IN ('En proceso', 'Resuelto', 'Rechazado')",
            name="ck_estado_reclamo_proveedor"
        ),
    )

    def to_dict(self) -> dict:
        return {
            "idReclamoProveedor": self.idReclamoProveedor,
            "idPedidoProveedor": self.idPedidoProveedor,
            "descripcion": self.descripcion,
            "cantidadAfectada": float(self.cantidadAfectada),
            "estado": self.estado,
            "fecha": self.fecha.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<ReclamoProveedor {self.idReclamoProveedor} - {self.estado}>"