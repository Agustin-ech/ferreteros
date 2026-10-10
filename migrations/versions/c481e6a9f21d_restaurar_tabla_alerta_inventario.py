"""restaurar tabla de alertas requerida por trigger de inventario

Revision ID: c481e6a9f21d
Revises: d7a3e6c9412b
Create Date: 2026-10-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c481e6a9f21d"
down_revision = "d7a3e6c9412b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "AlertaInventario",
        sa.Column(
            "idAlertaInventario",
            sa.Integer(),
            sa.Identity(always=False),
            nullable=False,
        ),
        sa.Column("idInventario", sa.Integer(), nullable=False),
        sa.Column("cantidadActual", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "estado",
            sa.String(length=20),
            server_default=sa.text("'No leída'"),
            nullable=False,
        ),
        sa.Column(
            "fecha",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "estado IN ('No leída', 'Leída', 'Resuelta')",
            name="AlertaInventario_estado_check",
        ),
        sa.ForeignKeyConstraint(
            ["idInventario"],
            ["Inventario.idInventario"],
            name="AlertaInventario_idInventario_fkey",
        ),
        sa.PrimaryKeyConstraint(
            "idAlertaInventario",
            name="AlertaInventario_pkey",
        ),
    )
    op.create_index(
        "uq_alerta_activa",
        "AlertaInventario",
        ["idInventario"],
        unique=True,
        postgresql_where=sa.text("((estado)::text <> 'Resuelta'::text)"),
    )


def downgrade():
    op.drop_index("uq_alerta_activa", table_name="AlertaInventario")
    op.drop_table("AlertaInventario")