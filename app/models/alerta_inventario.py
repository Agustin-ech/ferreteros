from datetime import datetime, timezone

from app.extensions import db


class AlertaInventario(db.Model):
    __tablename__ = "AlertaInventario"

    idAlertaInventario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idInventario = db.Column(
        db.Integer,
        db.ForeignKey("Inventario.idInventario"),
        nullable=False,
    )
    cantidadActual = db.Column(db.Numeric(10, 2), nullable=False)
    estado = db.Column(
        db.String(20),
        nullable=False,
        default="No leída",
        server_default="No leída",
    )
    fecha = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.func.now(),
    )

    inventario = db.relationship("Inventario")

    __table_args__ = (
        db.CheckConstraint(
            "estado IN ('No leída', 'Leída', 'Resuelta')",
            name="AlertaInventario_estado_check",
        ),
        db.Index(
            "uq_alerta_activa",
            "idInventario",
            unique=True,
            postgresql_where=db.text("((estado)::text <> 'Resuelta'::text)"),
        ),
    )