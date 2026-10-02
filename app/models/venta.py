from datetime import datetime, timezone
from app.extensions import db

class Venta(db.Model):
            
    __tablename__ = "Venta"

    idVenta= db.Column ( db.Integer, primary_key=True, autoincrement=True)
    idSucursal= db.Column(db.Integer,db.ForeignKey("sucursales.idSucursal"), nullable=False)
    idUsuario=db.Column(db.Integer,db.ForeignKey("usuarios.idUsuario"), nullable=False)
    idCliente=db.Column(db.Integer,db.ForeignKey("Cliente.idCliente"), nullable=True)
    idTipoVenta=db.Column(db.Integer,db.ForeignKey("TipoVenta.idTipoVenta"), nullable=False)
    idMetodoPago=db.Column(db.Integer,db.ForeignKey("metodo_pago.idMetodoPago"), nullable=False)
    fechaHora= db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    subtotal= db.Column(db.Numeric(12,2), nullable=False)
    descuentoTotal= db.Column(db.Numeric(12,2), nullable=False)
    total= db.Column(db.Numeric(12,2), nullable=False)

    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
            db.DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            nullable=False,
        )

    sucursal = db.relationship("Sucursal")
    usuario = db.relationship("Usuario")
    cliente = db.relationship("Cliente")
    metodo_pago = db.relationship("MetodoPago")
    tipo_venta = db.relationship("TipoVenta")
    detalles = db.relationship(
        "DetalleVenta",
        back_populates="venta",
        cascade="all, delete-orphan",
        order_by="DetalleVenta.idDetalleVenta",
    )
    factura = db.relationship("Factura", back_populates="venta", uselist=False)


    def to_dict(self) -> dict:
        return {
            "idVenta": self.idVenta,
            "idSucursal": self.idSucursal,
            "idUsuario": self.idUsuario,
            "idCliente": self.idCliente,
            "idTipoVenta": self.idTipoVenta,
            "idMetodoPago": self.idMetodoPago,
            "fechaHora": self.fechaHora.isoformat(),
            "subtotal": float(self.subtotal),
            "descuentoTotal": float(self.descuentoTotal),
            "total": float(self.total),
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }   

    def __repr__(self) -> str:
            return f"<Venta {self.idVenta} - {self.idSucursal} - {self.idUsuario} - {self.idCliente} - {self.idTipoVenta} - {self.idMetodoPago} - {self.fechaHora} - {self.subtotal} - {self.descuentoTotal} - {self.total}>"