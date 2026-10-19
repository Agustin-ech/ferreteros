"""agregar descuento porcentual a producto

Revision ID: c3f1a8d5e702
Revises: b7d4e2a91f30
Create Date: 2026-10-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c3f1a8d5e702"
down_revision = "b7d4e2a91f30"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "Producto",
        sa.Column(
            "descuentoPorcentaje",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_check_constraint(
        "ck_producto_descuento_rango",
        "Producto",
        '"descuentoPorcentaje" >= 0 AND "descuentoPorcentaje" <= 100',
    )


def downgrade():
    op.drop_constraint("ck_producto_descuento_rango", "Producto", type_="check")
    op.drop_column("Producto", "descuentoPorcentaje")
