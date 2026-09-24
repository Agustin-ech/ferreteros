from datetime import datetime, timezone
from app.extensions import db

class Sucursal(db.Model):
    __tablename__ = "sucursales"

    # --- Columnas principales ---
    idSucursal = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombreSucursal = db.Column(db.String(100), nullable=False, unique=True)
    direccion = db.Column(db.String(255), nullable=False)

    # --- Columnas de soporte ---
    activa = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Relaciones
    # ------------------------------------------------------------------
    usuarios = db.relationship(
        "Usuario",
        back_populates="sucursal",
        lazy="select",  # carga los usuarios solo cuando se acceden,
                        # no automáticamente al consultar la sucursal.
    )

    # A medida que se agreguen los demás modelos (Inventario, Venta,
    # PedidoProveedor, etc.) cada uno tendrá aquí su relationship
    # correspondiente, por ejemplo:
    #
    # inventarios = db.relationship("Inventario", back_populates="sucursal")
    # ventas = db.relationship("Venta", back_populates="sucursal")
    # pedidos_proveedor = db.relationship("PedidoProveedor", back_populates="sucursal")

    # ------------------------------------------------------------------
    # Utilidades
    # ------------------------------------------------------------------
    def to_dict(self) -> dict:
        return {
            "idSucursal": self.idSucursal,
            "nombreSucursal": self.nombreSucursal,
            "direccion": self.direccion,
            "activa": self.activa,
        }

    def __repr__(self) -> str:
        return f"<Sucursal {self.idSucursal} - {self.nombreSucursal}>"