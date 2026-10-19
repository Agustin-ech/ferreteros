"""crear el módulo de nómina

Revision ID: b7d4e2a91f30
Revises: 746771e2e5c7
Create Date: 2026-10-18 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b7d4e2a91f30"
down_revision = "746771e2e5c7"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "usuarios",
        sa.Column("salarioBase", sa.Numeric(precision=12, scale=2), nullable=True),
    )
    op.create_check_constraint(
        "ck_usuario_salario_no_negativo",
        "usuarios",
        '"salarioBase" IS NULL OR "salarioBase" >= 0',
    )

    op.create_table(
        "NominaPago",
        sa.Column("idNominaPago", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("idUsuario", sa.Integer(), nullable=False),
        sa.Column("idSucursal", sa.Integer(), nullable=False),
        sa.Column("periodoInicio", sa.Date(), nullable=False),
        sa.Column("periodoFin", sa.Date(), nullable=False),
        sa.Column("diasTrabajados", sa.Integer(), nullable=False),
        sa.Column("salarioBase", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("salarioPeriodo", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("cantidadVentas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bonificacion", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("auxilioTransporte", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("deducciones", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("neto", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default="Pendiente"),
        sa.Column("idMovimientoTesoreria", sa.Integer(), nullable=True),
        sa.Column("fechaPago", sa.DateTime(timezone=True), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("fecha_creacion", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint('"periodoFin" >= "periodoInicio"', name="ck_nomina_periodo_valido"),
        sa.CheckConstraint("neto >= 0", name="ck_nomina_neto_no_negativo"),
        sa.CheckConstraint("estado IN ('Pendiente', 'Pagado')", name="ck_nomina_estado"),
        sa.ForeignKeyConstraint(["idUsuario"], ["usuarios.idUsuario"]),
        sa.ForeignKeyConstraint(["idSucursal"], ["sucursales.idSucursal"]),
        sa.ForeignKeyConstraint(["idMovimientoTesoreria"], ["MovimientoTesoreria.idMovimientoTesoreria"]),
        sa.PrimaryKeyConstraint("idNominaPago"),
        sa.UniqueConstraint("idUsuario", "periodoInicio", "periodoFin", name="uq_nomina_usuario_periodo"),
    )
    op.create_index("ix_nomina_periodo", "NominaPago", ["periodoInicio", "periodoFin"])


def downgrade():
    op.drop_index("ix_nomina_periodo", table_name="NominaPago")
    op.drop_table("NominaPago")
    op.drop_constraint("ck_usuario_salario_no_negativo", "usuarios", type_="check")
    op.drop_column("usuarios", "salarioBase")
