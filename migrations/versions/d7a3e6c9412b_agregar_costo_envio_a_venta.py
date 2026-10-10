"""agregar costo de envio a venta

Revision ID: d7a3e6c9412b
Revises: c184ab27d90e
Create Date: 2026-10-05

"""
from alembic import op
import sqlalchemy as sa


revision = "d7a3e6c9412b"
down_revision = "c184ab27d90e"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "Venta",
        sa.Column("costoEnvio", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
    )
    op.execute('ALTER TABLE "Venta" DROP CONSTRAINT IF EXISTS ck_venta_total_coherente')
    op.create_check_constraint(
        "ck_venta_total_coherente",
        "Venta",
        '"total" = "subtotal" - "descuentoTotal" + "costoEnvio"',
    )
    op.alter_column("Venta", "costoEnvio", server_default=None)


def downgrade():
    op.drop_constraint("ck_venta_total_coherente", "Venta", type_="check")
    op.execute(
        'UPDATE "Venta" SET "total" = "subtotal" - "descuentoTotal" '
        'WHERE "costoEnvio" <> 0'
    )
    op.execute(
        'UPDATE "Factura" SET "valorTotal" = "Venta"."total" '
        'FROM "Venta" WHERE "Factura"."idVenta" = "Venta"."idVenta" '
        'AND "Venta"."costoEnvio" <> 0'
    )
    op.create_check_constraint(
        "ck_venta_total_coherente",
        "Venta",
        '"total" = "subtotal" - "descuentoTotal"',
    )
    op.drop_column("Venta", "costoEnvio")