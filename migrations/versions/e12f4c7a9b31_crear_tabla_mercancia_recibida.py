"""Create the received merchandise register."""

from alembic import op
import sqlalchemy as sa


revision = "e12f4c7a9b31"
down_revision = "d914a93c7a21"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "mercancia_recibida",
        sa.Column("idMercanciaRecibida", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("idProducto", sa.Integer(), nullable=False),
        sa.Column("idSucursal", sa.Integer(), nullable=False),
        sa.Column("idUsuario", sa.Integer(), nullable=False),
        sa.Column("idAjusteInventario", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("factura", sa.String(length=60), nullable=False),
        sa.Column("proveedor", sa.String(length=100), nullable=False),
        sa.Column("cantidad", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.CheckConstraint("cantidad > 0", name="ck_cantidad_mercancia_recibida"),
        sa.ForeignKeyConstraint(["idAjusteInventario"], ["AjusteInventario.idAjusteInventario"]),
        sa.ForeignKeyConstraint(["idProducto"], ["Producto.idProducto"]),
        sa.ForeignKeyConstraint(["idSucursal"], ["sucursales.idSucursal"]),
        sa.ForeignKeyConstraint(["idUsuario"], ["usuarios.idUsuario"]),
        sa.PrimaryKeyConstraint("idMercanciaRecibida"),
        sa.UniqueConstraint("idAjusteInventario"),
    )
    op.create_index(
        "ix_mercancia_recibida_sucursal_fecha",
        "mercancia_recibida",
        ["idSucursal", "fecha"],
    )


def downgrade():
    op.drop_index("ix_mercancia_recibida_sucursal_fecha", table_name="mercancia_recibida")
    op.drop_table("mercancia_recibida")
