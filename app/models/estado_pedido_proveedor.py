from datetime import datetime, timezone
from app.extensions import db


class EstadoPedidoProveedor(db.Model):
    __tablename__ = "estado_pedido_proveedor"

    idEstadoPedidoProveedor = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(20), unique=True, nullable=False)  # Pendiente, Recibido, Parcial, Cancelado

    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<EstadoPedidoProveedor {self.idEstadoPedidoProveedor} - {self.nombre}>"