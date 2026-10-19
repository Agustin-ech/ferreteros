from datetime import date

from app.extensions import db


class MercanciaRecibida(db.Model):
    __tablename__ = "mercancia_recibida"

    idMercanciaRecibida = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idProducto = db.Column(db.Integer, db.ForeignKey("Producto.idProducto"), nullable=False)
    idSucursal = db.Column(db.Integer, db.ForeignKey("sucursales.idSucursal"), nullable=False)
    idUsuario = db.Column(db.Integer, db.ForeignKey("usuarios.idUsuario"), nullable=False)
    idAjusteInventario = db.Column(
        db.Integer,
        db.ForeignKey("AjusteInventario.idAjusteInventario"),
        nullable=False,
        unique=True,
    )
    fecha = db.Column(db.Date, nullable=False, default=date.today)
    factura = db.Column(db.String(60), nullable=False)
    proveedor = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Numeric(12, 3), nullable=False)

    producto = db.relationship("Producto")
    sucursal = db.relationship("Sucursal")
    usuario = db.relationship("Usuario")
    ajuste_inventario = db.relationship("AjusteInventario")

    __table_args__ = (
        db.CheckConstraint("cantidad > 0", name="ck_cantidad_mercancia_recibida"),
        db.Index("ix_mercancia_recibida_sucursal_fecha", "idSucursal", "fecha"),
    )

    def to_dict(self) -> dict:
        return {
            "idMercanciaRecibida": self.idMercanciaRecibida,
            "idProducto": self.idProducto,
            "producto": self.producto.nombre if self.producto else None,
            "codigo": self.producto.codigoSKU if self.producto else None,
            "idSucursal": self.idSucursal,
            "idUsuario": self.idUsuario,
            "idAjusteInventario": self.idAjusteInventario,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "factura": self.factura,
            "proveedor": self.proveedor,
            "cantidad": float(self.cantidad),
            "estado": "Recibido",
        }
