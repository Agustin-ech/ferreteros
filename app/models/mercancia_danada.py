"""
Mercancía dañada: productos identificados en mal estado por el personal de bodega.

Ubicación sugerida: app/models/mercancia_danada.py

Dos tablas:

    tipo_danio        catálogo de motivos (Rotura, Humedad, Defecto de fábrica, ...)
    mercancia_danada  un registro por hallazgo: producto, sucursal, cantidad,
                      costo congelado y valor de la pérdida

Decisiones de diseño:

1. El costo se congela en el registro (`costoUnitario`): si luego cambia
   `Producto.costoUnitario`, el valor histórico de la pérdida no se altera.
2. El movimiento de inventario NO se duplica aquí: cada registro apunta al
   `AjusteInventario` que descontó el stock (`idAjusteInventario`) y, si se
   anula o se recupera, al ajuste que lo revirtió (`idAjusteReversion`).
   Así `TransaccionInventario` y su `ck_un_solo_origen` no necesitan cambios.
3. Enlace opcional con el pedido y el reclamo al proveedor, para trazar la
   mercancía que llegó dañada.
"""

from datetime import datetime, timezone

from app.extensions import db

# Estados del ciclo de vida de un registro de mercancía dañada.
ESTADO_REGISTRADA = "Registrada"
ESTADO_DADA_DE_BAJA = "Dada de baja"
ESTADO_RECLAMADA = "Reclamada"
ESTADO_RECUPERADA = "Recuperada"
ESTADO_ANULADA = "Anulada"

ESTADOS_MERCANCIA_DANADA = (
    ESTADO_REGISTRADA,    # recién registrada por bodega (ya descontada del inventario)
    ESTADO_DADA_DE_BAJA,  # pérdida confirmada: no se recupera ni se reclama
    ESTADO_RECLAMADA,     # se abrió un reclamo al proveedor por esta mercancía
    ESTADO_RECUPERADA,    # se reparó o se recuperó: vuelve al inventario
    ESTADO_ANULADA,       # error de digitación: se revierte el descuento
)


def _ahora_utc():
    return datetime.now(timezone.utc)


class TipoDanio(db.Model):
    """Catálogo de motivos de daño (equivale a tus tablas `TipoVenta`, `tipo_devolucion`)."""

    __tablename__ = "tipo_danio"

    idTipoDanio = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(60), unique=True, nullable=False)
    descripcion = db.Column(db.String(200), nullable=True)
    # Motivos que normalmente son responsabilidad del proveedor
    # (defecto de fábrica, daño en transporte): la API sugiere abrir el reclamo.
    imputableProveedor = db.Column(db.Boolean, default=False, nullable=False)

    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(db.DateTime(timezone=True), default=_ahora_utc, nullable=False)

    def to_dict(self) -> dict:
        return {
            "idTipoDanio": self.idTipoDanio,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "imputableProveedor": self.imputableProveedor,
            "activo": self.activo,
        }

    def __repr__(self) -> str:
        return f"<TipoDanio {self.idTipoDanio} - {self.nombre}>"


class MercanciaDanada(db.Model):
    """Un hallazgo de mercancía en mal estado, con su impacto en inventario y en pesos."""

    __tablename__ = "mercancia_danada"

    idMercanciaDanada = db.Column(db.Integer, primary_key=True, autoincrement=True)

    idProducto = db.Column(db.Integer, db.ForeignKey("Producto.idProducto"), nullable=False)
    idSucursal = db.Column(db.Integer, db.ForeignKey("sucursales.idSucursal"), nullable=False)
    idUsuario = db.Column(db.Integer, db.ForeignKey("usuarios.idUsuario"), nullable=False)
    idTipoDanio = db.Column(db.Integer, db.ForeignKey("tipo_danio.idTipoDanio"), nullable=False)

    # Trazabilidad opcional hacia el proveedor (mercancía que llegó dañada).
    idPedidoProveedor = db.Column(
        db.Integer, db.ForeignKey("pedido_proveedor.idPedidoProveedor"), nullable=True
    )
    idReclamoProveedor = db.Column(
        db.Integer, db.ForeignKey("ReclamoProveedor.idReclamoProveedor"), nullable=True
    )

    # Movimientos de inventario asociados (ver decisión 2 del docstring).
    idAjusteInventario = db.Column(
        db.Integer, db.ForeignKey("AjusteInventario.idAjusteInventario"),
        nullable=True, unique=True,
    )
    idAjusteReversion = db.Column(
        db.Integer, db.ForeignKey("AjusteInventario.idAjusteInventario"),
        nullable=True, unique=True,
    )

    cantidad = db.Column(db.Numeric(12, 3), nullable=False)
    costoUnitario = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    valorPerdida = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    descripcion = db.Column(db.String(255), nullable=True)
    estado = db.Column(db.String(20), nullable=False, default=ESTADO_REGISTRADA)

    fecha = db.Column(db.DateTime(timezone=True), default=_ahora_utc, nullable=False)
    fecha_creacion = db.Column(db.DateTime(timezone=True), default=_ahora_utc, nullable=False)

    producto = db.relationship("Producto")
    sucursal = db.relationship("Sucursal")
    usuario = db.relationship("Usuario")
    tipo_danio = db.relationship("TipoDanio")
    pedido_proveedor = db.relationship("PedidoProveedor")
    reclamo_proveedor = db.relationship("ReclamoProveedor")
    # Dos FK hacia la misma tabla: hay que indicar cuál usa cada relación.
    ajuste = db.relationship("AjusteInventario", foreign_keys=[idAjusteInventario])
    ajuste_reversion = db.relationship("AjusteInventario", foreign_keys=[idAjusteReversion])

    __table_args__ = (
        db.CheckConstraint(
            "estado IN ('Registrada', 'Dada de baja', 'Reclamada', 'Recuperada', 'Anulada')",
            name="ck_estado_mercancia_danada",
        ),
        db.CheckConstraint("cantidad > 0", name="ck_cantidad_mercancia_danada"),
        db.CheckConstraint("costoUnitario >= 0", name="ck_costo_mercancia_danada"),
        db.CheckConstraint("valorPerdida >= 0", name="ck_valor_mercancia_danada"),
        db.Index("ix_mercancia_danada_sucursal_fecha", "idSucursal", "fecha"),
        db.Index("ix_mercancia_danada_producto", "idProducto"),
    )

    def to_dict(self) -> dict:
        return {
            "idMercanciaDanada": self.idMercanciaDanada,
            "idProducto": self.idProducto,
            "idSucursal": self.idSucursal,
            "idUsuario": self.idUsuario,
            "idTipoDanio": self.idTipoDanio,
            "tipoDanio": self.tipo_danio.nombre if self.tipo_danio else None,
            "idPedidoProveedor": self.idPedidoProveedor,
            "idReclamoProveedor": self.idReclamoProveedor,
            "idAjusteInventario": self.idAjusteInventario,
            "idAjusteReversion": self.idAjusteReversion,
            "cantidad": float(self.cantidad),
            "costoUnitario": float(self.costoUnitario or 0),
            "valorPerdida": float(self.valorPerdida or 0),
            "descripcion": self.descripcion,
            "estado": self.estado,
            "fecha": self.fecha.isoformat() if self.fecha else None,
        }

    def __repr__(self) -> str:
        return (
            f"<MercanciaDanada {self.idMercanciaDanada} - Producto {self.idProducto} "
            f"x{self.cantidad} - {self.estado}>"
        )