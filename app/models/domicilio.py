from datetime import datetime, timezone
from app.extensions import db

class Domicilio(db.Model):
    __tablename__ = "Domicilio"

    idDomicilio = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idEntrega = db.Column(db.Integer, db.ForeignKey("Entrega.idEntrega"), nullable=False)
    idUsuario = db.Column(db.Integer, db.ForeignKey("usuarios.idUsuario"), nullable=False)
    horaSalida = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    horaRecepcionPago = db.Column(db.DateTime(timezone=True), nullable=True)
    montoEsperado = db.Column(db.Numeric(12, 2), nullable=False)
    montoRecibido = db.Column(db.Numeric(12, 2), nullable=False)
    desbalance = db.Column(db.Numeric(12, 2), nullable=False)
    observaciones = db.Column(db.String(200), nullable=True)
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        return {
            "idDomicilio": self.idDomicilio,
            "idEntrega": self.idEntrega,
            "idUsuario": self.idUsuario,
            "horaSalida": self.horaSalida.isoformat(),
            "horaRecepcionPago": self.horaRecepcionPago.isoformat() if self.horaRecepcionPago else None,
            "montoEsperado": float(self.montoEsperado),
            "montoRecibido": float(self.montoRecibido),
            "desbalance": float(self.desbalance),
            "observaciones": self.observaciones,
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Domicilio {self.idDomicilio} - {self.idEntrega} - {self.idUsuario} - {self.horaSalida} - {self.horaRecepcionPago} - {self.montoEsperado} - {self.montoRecibido} - {self.desbalance} - {self.observaciones}>"