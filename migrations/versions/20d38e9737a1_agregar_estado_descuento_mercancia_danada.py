"""Agregar estado de descuento de inventario a mercancía dañada.

Revision ID: 20d38e9737a1
Revises: ee0d17163ae9
Create Date: 2026-10-15 15:44:00.000000
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


revision = "20d38e9737a1"
down_revision = "ee0d17163ae9"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "mercancia_danada",
        sa.Column(
            "descontadoDeInventario",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    tipos_danio = sa.table(
        "tipo_danio",
        sa.column("nombre", sa.String(60)),
        sa.column("descripcion", sa.String(200)),
        sa.column("imputableProveedor", sa.Boolean()),
        sa.column("activo", sa.Boolean()),
        sa.column("fecha_creacion", sa.DateTime(timezone=True)),
    )
    ahora = datetime.now(timezone.utc)
    op.bulk_insert(tipos_danio, [
        {
            "nombre": "Producto roto",
            "descripcion": "Producto quebrado o averiado.",
            "imputableProveedor": False,
            "activo": True,
            "fecha_creacion": ahora,
        },
        {
            "nombre": "Caja dañada",
            "descripcion": "Empaque o caja dañada.",
            "imputableProveedor": False,
            "activo": True,
            "fecha_creacion": ahora,
        },
        {
            "nombre": "Faltantes",
            "descripcion": "Cantidad recibida menor a la solicitada.",
            "imputableProveedor": True,
            "activo": True,
            "fecha_creacion": ahora,
        },
        {
            "nombre": "Vencido",
            "descripcion": "Producto vencido o fuera de su vida útil.",
            "imputableProveedor": False,
            "activo": True,
            "fecha_creacion": ahora,
        },
        {
            "nombre": "Otro",
            "descripcion": "Otro tipo de daño.",
            "imputableProveedor": False,
            "activo": True,
            "fecha_creacion": ahora,
        },
        {
            "nombre": "Defecto de fábrica",
            "descripcion": "Defecto atribuible a la fabricación.",
            "imputableProveedor": True,
            "activo": True,
            "fecha_creacion": ahora,
        },
    ])


def downgrade():
    op.drop_column("mercancia_danada", "descontadoDeInventario")
