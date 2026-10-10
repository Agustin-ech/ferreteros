from datetime import datetime, timezone
from app.extensions import db

class SucursalUsuario(db.Model):
    __tablename__ = "SucursalUsuario"

    idSucursalUsuario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idSucursal = db.Column(db.Integer, db.ForeignKey("sucursales.idSucursal"), nullable=False)
    idUsuario = db.Column(db.Integer, db.ForeignKey("usuarios.idUsuario"), nullable=False)

    # Columnas de soporte
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    usuario = db.relationship('Usuario', back_populates='sucursales')
    sucursal = db.relationship('Sucursal', back_populates='usuarios')

    __table_args__ = (
            db.UniqueConstraint('idSucursal', 'idUsuario', name='uq_sucursal_usuario'),
        )