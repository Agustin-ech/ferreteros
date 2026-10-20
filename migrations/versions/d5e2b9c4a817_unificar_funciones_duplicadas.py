"""unificar funciones (permisos) duplicadas

Había dos juegos de permisos que se solapaban. Las asignaciones de cada
duplicado pasan a su equivalente y el duplicado queda inactivo (no se borra).

Revision ID: d5e2b9c4a817
Revises: c3f1a8d5e702
Create Date: 2026-10-19 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d5e2b9c4a817"
down_revision = "c3f1a8d5e702"
branch_labels = None
depends_on = None

# duplicado (Funcion.modulo) -> permiso que se conserva
DUPLICADOS = {
    "inventario": "PRODUCTOS",
    "facturas": "VENTAS",
    "reportes": "REPORTES",
    "empleados": "USUARIOS",
}


def upgrade():
    conexion = op.get_bind()
    for duplicado, conservado in DUPLICADOS.items():
        parametros = {"duplicado": duplicado, "conservado": conservado}
        conexion.execute(sa.text('''
            INSERT INTO tipo_usuario_funcion ("idTipoUsuario", "idFuncion")
            SELECT DISTINCT tf."idTipoUsuario", c."idFuncion"
            FROM tipo_usuario_funcion tf
            JOIN "Funcion" d ON d."idFuncion" = tf."idFuncion" AND d.modulo = :duplicado
            JOIN "Funcion" c ON c.modulo = :conservado
            WHERE NOT EXISTS (
                SELECT 1 FROM tipo_usuario_funcion x
                WHERE x."idTipoUsuario" = tf."idTipoUsuario" AND x."idFuncion" = c."idFuncion"
            )
        '''), parametros)
        conexion.execute(sa.text('''
            DELETE FROM tipo_usuario_funcion
            WHERE "idFuncion" IN (SELECT "idFuncion" FROM "Funcion" WHERE modulo = :duplicado)
        '''), parametros)
        conexion.execute(sa.text('UPDATE "Funcion" SET activo = false WHERE modulo = :duplicado'), parametros)

    # Bodega ya hacía ajustes de inventario antes de que los permisos se
    # aplicaran; se le asigna AJUSTES para no quitarle esa función de golpe.
    conexion.execute(sa.text('''
        INSERT INTO tipo_usuario_funcion ("idTipoUsuario", "idFuncion")
        SELECT t."idTipoUsuario", f."idFuncion"
        FROM "TipoUsuario" t
        JOIN "Funcion" f ON f.modulo = 'AJUSTES'
        WHERE lower(t.nombre) IN ('bodega', 'bodeguero')
          AND NOT EXISTS (
              SELECT 1 FROM tipo_usuario_funcion x
              WHERE x."idTipoUsuario" = t."idTipoUsuario" AND x."idFuncion" = f."idFuncion"
          )
    '''))


def downgrade():
    # Reactiva los duplicados y los asigna a los roles que tienen el permiso conservado.
    conexion = op.get_bind()
    for duplicado, conservado in DUPLICADOS.items():
        parametros = {"duplicado": duplicado, "conservado": conservado}
        conexion.execute(sa.text('UPDATE "Funcion" SET activo = true WHERE modulo = :duplicado'), parametros)
        conexion.execute(sa.text('''
            INSERT INTO tipo_usuario_funcion ("idTipoUsuario", "idFuncion")
            SELECT tf."idTipoUsuario", d."idFuncion"
            FROM tipo_usuario_funcion tf
            JOIN "Funcion" c ON c."idFuncion" = tf."idFuncion" AND c.modulo = :conservado
            JOIN "Funcion" d ON d.modulo = :duplicado
            WHERE NOT EXISTS (
                SELECT 1 FROM tipo_usuario_funcion x
                WHERE x."idTipoUsuario" = tf."idTipoUsuario" AND x."idFuncion" = d."idFuncion"
            )
        '''), parametros)
