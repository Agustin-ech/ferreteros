"""completar el historial del kardex

Revision ID: c1d2e3f4a5b6
Revises: a7c8e54b19f2
Create Date: 2026-10-17 19:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c1d2e3f4a5b6"
down_revision = "a7c8e54b19f2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "TransaccionInventario",
        sa.Column("stockAnterior", sa.Numeric(precision=12, scale=3), nullable=True),
    )
    op.add_column(
        "TransaccionInventario",
        sa.Column("stockNuevo", sa.Numeric(precision=12, scale=3), nullable=True),
    )
    op.create_index(
        "ix_transaccion_inventario_inventario_fecha",
        "TransaccionInventario",
        ["idInventario", "fecha"],
    )

    conexion = op.get_bind()
    conexion.execute(sa.text("""
        UPDATE "TransaccionInventario" AS transaccion
        SET "stockAnterior" = ajuste."stockAnterior",
            "stockNuevo" = ajuste."stockNuevo"
        FROM "AjusteInventario" AS ajuste
        WHERE transaccion."idAjusteInventario" = ajuste."idAjusteInventario"
    """))

    conexion.execute(sa.text("""
        INSERT INTO tipo_movimiento (nombre, activo)
        VALUES ('Entrada', TRUE), ('Salida', TRUE)
        ON CONFLICT (nombre) DO NOTHING
    """))

    conexion.execute(sa.text("""
        INSERT INTO "TransaccionInventario" (
            "idInventario", "idTipoMovimiento", "idVenta", cantidad, fecha
        )
        SELECT inventario."idInventario", tipo."idTipoMovimiento", venta."idVenta",
               SUM(detalle.cantidad), venta."fechaHora"
        FROM "Venta" AS venta
        JOIN detalle_venta AS detalle ON detalle."idVenta" = venta."idVenta"
        JOIN "Inventario" AS inventario
          ON inventario."idSucursal" = venta."idSucursal"
         AND inventario."idProducto" = detalle."idProducto"
        JOIN tipo_movimiento AS tipo ON tipo.nombre = 'Salida'
        WHERE NOT EXISTS (
            SELECT 1
            FROM "TransaccionInventario" AS existente
            WHERE existente."idVenta" = venta."idVenta"
              AND existente."idInventario" = inventario."idInventario"
        )
        GROUP BY inventario."idInventario", tipo."idTipoMovimiento",
                 venta."idVenta", venta."fechaHora"
    """))

    conexion.execute(sa.text("""
        INSERT INTO "TransaccionInventario" (
            "idInventario", "idTipoMovimiento", "idDevolucion", cantidad, fecha
        )
        SELECT inventario."idInventario", tipo."idTipoMovimiento",
               devolucion."idDevolucion", SUM(detalle."cantidadDevuelta"), devolucion.fecha
        FROM devolucion
        JOIN "Factura" AS factura ON factura."idFactura" = devolucion."idFactura"
        JOIN "Venta" AS venta ON venta."idVenta" = factura."idVenta"
        JOIN "DetalleDevolucion" AS detalle
          ON detalle."idDevolucion" = devolucion."idDevolucion"
        JOIN "Inventario" AS inventario
          ON inventario."idSucursal" = venta."idSucursal"
         AND inventario."idProducto" = detalle."idProducto"
        JOIN tipo_movimiento AS tipo ON tipo.nombre = 'Entrada'
        WHERE devolucion.aprobada IS TRUE
          AND detalle."productoApto" IS TRUE
          AND NOT EXISTS (
              SELECT 1
              FROM "TransaccionInventario" AS existente
              WHERE existente."idDevolucion" = devolucion."idDevolucion"
                AND existente."idInventario" = inventario."idInventario"
          )
        GROUP BY inventario."idInventario", tipo."idTipoMovimiento",
                 devolucion."idDevolucion", devolucion.fecha
    """))


def downgrade():
    op.drop_index(
        "ix_transaccion_inventario_inventario_fecha",
        table_name="TransaccionInventario",
    )
    op.drop_column("TransaccionInventario", "stockNuevo")
    op.drop_column("TransaccionInventario", "stockAnterior")
