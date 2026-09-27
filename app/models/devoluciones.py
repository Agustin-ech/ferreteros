from datetime import datetime, timezone
from app.extensions import db

class Devolucion(db.Model):
    __tablename__ = "devolucion"

    idDevolucion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idFactura = db.Column(db.Integer, db.ForeignKey("Factura.idFactura"), nullable=False)
    idUsuario = db.Column(db.Integer, db.ForeignKey("usuarios.idUsuario"), nullable=False)  # vendedor que procesa
    idTipoDevolucion = db.Column(db.Integer, db.ForeignKey("tipo_devolucion.idTipoDevolucion"), nullable=False)

    motivo = db.Column(db.String(255), nullable=False)
    montoTotal = db.Column(db.Numeric(12, 2), nullable=False)
    aprobada = db.Column(db.Boolean, nullable=False, default=True)  # True = Aprobada, False = Rechazada

    fecha = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    factura = db.relationship('Factura')
    usuario = db.relationship('Usuario')
    tipo_devolucion = db.relationship('TipoDevolucion')

    def to_dict(self) -> dict:
        return {
            "idDevolucion": self.idDevolucion,
            "idFactura": self.idFactura,
            "idUsuario": self.idUsuario,
            "idTipoDevolucion": self.idTipoDevolucion,
            "motivo": self.motivo,
            "montoTotal": float(self.montoTotal),
            "aprobada": self.aprobada,
            "fecha": self.fecha.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Devolucion {self.idDevolucion} - {'Aprobada' if self.aprobada else 'Rechazada'}>"