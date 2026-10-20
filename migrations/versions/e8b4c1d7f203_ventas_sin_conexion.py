"""ventas registradas sin conexión: idOperacion y comprobante provisional

Revision ID: e8b4c1d7f203
Revises: a1c5d9e3f742
Create Date: 2026-10-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "e8b4c1d7f203"
down_revision = "a1c5d9e3f742"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("Venta", sa.Column("idOperacion", sa.String(length=64), nullable=True))
    op.add_column("Venta", sa.Column("comprobanteProvisional", sa.String(length=40), nullable=True))
    op.create_unique_constraint("uq_venta_id_operacion", "Venta", ["idOperacion"])


def downgrade():
    op.drop_constraint("uq_venta_id_operacion", "Venta", type_="unique")
    op.drop_column("Venta", "comprobanteProvisional")
    op.drop_column("Venta", "idOperacion")
