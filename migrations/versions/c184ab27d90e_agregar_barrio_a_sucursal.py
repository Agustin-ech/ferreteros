"""agregar barrio a sucursal

Revision ID: c184ab27d90e
Revises: ee0d17163ae9
Create Date: 2026-10-05

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c184ab27d90e"
down_revision = "ee0d17163ae9"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("sucursales", sa.Column("barrio", sa.String(length=50), nullable=True))


def downgrade():
    op.drop_column("sucursales", "barrio")