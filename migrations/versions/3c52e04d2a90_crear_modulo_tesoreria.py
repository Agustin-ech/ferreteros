"""crear tabla de movimientos de tesoreria

Revision ID: 3c52e04d2a90
Revises: f295a124cd73
Create Date: 2026-10-14 19:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "3c52e04d2a90"
down_revision = "f295a124cd73"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "MovimientoTesoreria",
        sa.Column("idMovimientoTesoreria", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("idSucursal", sa.Integer(), nullable=False),
        sa.Column("idUsuario", sa.Integer(), nullable=False),
        sa.Column("idMetodoPago", sa.Integer(), nullable=True),
        sa.Column("concepto", sa.String(length=50), nullable=False),
        sa.Column("descripcion", sa.String(length=255), nullable=False),
        sa.Column("tercero", sa.String(length=150), nullable=True),
        sa.Column("monto", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.Column("fecha_creacion", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("monto > 0", name="ck_movimiento_tesoreria_monto_positivo"),
        sa.ForeignKeyConstraint(["idMetodoPago"], ["metodo_pago.idMetodoPago"]),
        sa.ForeignKeyConstraint(["idSucursal"], ["sucursales.idSucursal"]),
        sa.ForeignKeyConstraint(["idUsuario"], ["usuarios.idUsuario"]),
        sa.PrimaryKeyConstraint("idMovimientoTesoreria"),
    )
    op.create_index(
        "ix_movimiento_tesoreria_sucursal_fecha",
        "MovimientoTesoreria",
        ["idSucursal", "fecha"],
    )
    op.create_index(
        "ix_movimiento_tesoreria_fecha",
        "MovimientoTesoreria",
        ["fecha"],
    )


def downgrade():
    op.drop_table("MovimientoTesoreria")
