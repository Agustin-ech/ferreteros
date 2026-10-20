"""agregar url de la foto al producto

Revision ID: a1c5d9e3f742
Revises: d5e2b9c4a817
Create Date: 2026-10-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a1c5d9e3f742"
down_revision = "d5e2b9c4a817"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("Producto", sa.Column("imagenUrl", sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column("Producto", "imagenUrl")
