from datetime import datetime, timezone
from app.extensions import db

class AjusteInventario(db.Model):
    __tablename__ = "AjusteInventario"

    idAjusteInventario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idInventario = db.Column(db.Integer, db.ForeignKey("Inventario.idInventario"), nullable=False)
    idSucursal = db.Column(db.Integer, db.ForeignKey("sucursales.idSucursal"), nullable=False)
    idUser = db.Column(db.Integer, db.ForeignKey("usuarios.idUsuario"), nullable=False)
    idTipoMovimiento = db.Column(db.Integer, db.ForeignKey("tipo_movimiento.idTipoMovimiento"), nullable=False)

    cantidadAjustada = db.Column(db.Numeric(12, 3), nullable=False)
    stockAnterior = db.Column(db.Numeric(12, 3), nullable=False)
    stockNuevo = db.Column(db.Numeric(12, 3), nullable=False)
    valorRestado = db.Column(db.Numeric(12, 2), nullable=True)

    motivo = db.Column(db.String(255), nullable=False)
    estadoAutorizacion = db.Column(db.String(20), nullable=False, default="Pendiente")

    fecha = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inventario = db.relationship('Inventario')
    sucursal = db.relationship('Sucursal')
    usuario = db.relationship('Usuario')
    tipo_movimiento = db.relationship('TipoMovimiento')

    def to_dict(self) -> dict:
        return {
            "idAjusteInventario": self.idAjusteInventario,
            "idInventario": self.idInventario,
            "idSucursal": self.idSucursal,
            "idUser": self.idUser,
            "idTipoMovimiento": self.idTipoMovimiento,
            "cantidadAjustada": float(self.cantidadAjustada),
            "stockAnterior": float(self.stockAnterior),
            "stockNuevo": float(self.stockNuevo),
            "valorRestado": float(self.valorRestado) if self.valorRestado is not None else None,
            "motivo": self.motivo,
            "estadoAutorizacion": self.estadoAutorizacion,
            "fecha": self.fecha.isoformat(),
        }
    
    def __repr__(self) -> str:
        return f"<InventoryAdjustment {self.idAjusteInventario} - Inventario {self.idInventario} - Sucursal {self.idSucursal} - Usuario {self.idUser} - TipoMovimiento {self.idTipoMovimiento}>"