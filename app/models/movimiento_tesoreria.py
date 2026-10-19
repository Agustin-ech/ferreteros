from datetime import datetime, timezone

from app.extensions import db


class MovimientoTesoreria(db.Model):
    __tablename__ = "MovimientoTesoreria"

    idMovimientoTesoreria = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idSucursal = db.Column(db.Integer, db.ForeignKey("sucursales.idSucursal"), nullable=False)
    idUsuario = db.Column(db.Integer, db.ForeignKey("usuarios.idUsuario"), nullable=False)
    idMetodoPago = db.Column(db.Integer, db.ForeignKey("metodo_pago.idMetodoPago"), nullable=True)
    concepto = db.Column(db.String(50), nullable=False)
    descripcion = db.Column(db.String(255), nullable=False)
    tercero = db.Column(db.String(150), nullable=True)
    monto = db.Column(db.Numeric(12, 2), nullable=False)
    fecha = db.Column(db.DateTime(timezone=True), nullable=False)
    activo = db.Column(db.Boolean, nullable=False, default=True)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    sucursal = db.relationship("Sucursal")
    usuario = db.relationship("Usuario")
    metodo_pago = db.relationship("MetodoPago")

    __table_args__ = (
        db.CheckConstraint("monto > 0", name="ck_movimiento_tesoreria_monto_positivo"),
        db.Index("ix_movimiento_tesoreria_sucursal_fecha", "idSucursal", "fecha"),
        db.Index("ix_movimiento_tesoreria_fecha", "fecha"),
    )
