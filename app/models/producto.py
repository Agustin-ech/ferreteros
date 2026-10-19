from datetime import datetime, timezone
from app.extensions import db

class Producto(db.Model):
    __tablename__ = "Producto"

    idProducto = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idTipoProducto = db.Column(db.Integer, db.ForeignKey("TipoProducto.idTipoProducto"), nullable=False)
    idUnidadMedida = db.Column(db.Integer, db.ForeignKey("UnidadMedida.idUnidadMedida"), nullable=False)

    codigoSKU = db.Column(db.String(50), unique=True, nullable=False)
    nombre = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.String(255), nullable=True)
    precio = db.Column(db.Numeric(12, 2), nullable=False)
    costoUnitario = db.Column(db.Numeric(12, 2), nullable=False)
    stockMinimo = db.Column(db.Integer, default=5, nullable=False)
    # Descuento que define el administrador; se aplica solo al registrar la venta.
    descuentoPorcentaje = db.Column(db.Numeric(5, 2), default=0, server_default="0", nullable=False)

    # Columnas de soporte
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    tipo_producto = db.relationship('TipoProducto', back_populates='productos')
    unidad_medida = db.relationship('UnidadMedida', back_populates='productos')
    inventarios = db.relationship('Inventario', back_populates='producto')

    __table_args__ = (
        db.CheckConstraint(
            '"descuentoPorcentaje" >= 0 AND "descuentoPorcentaje" <= 100',
            name="ck_producto_descuento_rango",
        ),
    )

    def to_dict(self) -> dict:
        return {
            "idProducto": self.idProducto,
            "idTipoProducto": self.idTipoProducto,
            "idUnidadMedida": self.idUnidadMedida,
            "codigoSKU": self.codigoSKU,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "precio": float(self.precio),
            "costoUnitario": float(self.costoUnitario),
            "stockMinimo": self.stockMinimo,
            "descuentoPorcentaje": float(self.descuentoPorcentaje or 0),
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Producto {self.idProducto} - {self.nombre}>"