"""crear tabla de detalle de órdenes a proveedores

Revision ID: a7c8e54b19f2
Revises: 3c52e04d2a90
Create Date: 2026-10-17 10:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a7c8e54b19f2"
down_revision = "3c52e04d2a90"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "detalle_orden_proveedor",
        sa.Column("idDetalleOrdenProveedor", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("idPedidoProveedor", sa.Integer(), nullable=False),
        sa.Column("idProducto", sa.Integer(), nullable=False),
        sa.Column("cantidadPedida", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("cantidadRecibida", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("precioUnitario", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("subtotal", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("fecha_creacion", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["idPedidoProveedor"],
            ["pedido_proveedor.idPedidoProveedor"],
        ),
        sa.ForeignKeyConstraint(["idProducto"], ['Producto.idProducto']),
        sa.PrimaryKeyConstraint("idDetalleOrdenProveedor"),
    )


def downgrade():
    op.drop_table("detalle_orden_proveedor")
