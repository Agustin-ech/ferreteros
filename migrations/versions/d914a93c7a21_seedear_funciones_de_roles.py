"""Seed the system modules managed by role permissions."""

from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = "d914a93c7a21"
down_revision = "c68a0572bde1"
branch_labels = None
depends_on = None


FUNCIONES = (
    ("inventario", "Inventario", "Consultar y administrar inventario."),
    ("facturas", "Facturas", "Consultar y gestionar ventas y facturas."),
    ("finanzas", "Finanzas", "Consultar información financiera."),
    ("reportes", "Reportes", "Consultar reportes del sistema."),
    ("empleados", "Empleados", "Consultar y administrar personal."),
    ("config", "Configuración", "Administrar la configuración del sistema."),
)


def upgrade():
    bind = op.get_bind()
    for modulo, nombre, descripcion in FUNCIONES:
        bind.execute(
            sa.text(
                'INSERT INTO "Funcion" (modulo, nombre, descripcion, activo, fecha_creacion) '
                'SELECT :modulo, :nombre, :descripcion, :activo, :fecha_creacion '
                'WHERE NOT EXISTS (SELECT 1 FROM "Funcion" WHERE modulo = :modulo)'
            ),
            {
                "modulo": modulo,
                "nombre": nombre,
                "descripcion": descripcion,
                "activo": True,
                "fecha_creacion": datetime.now(timezone.utc),
            },
        )
    permisos_base = {
        ("admin", "administrador"): tuple(modulo for modulo, _, _ in FUNCIONES),
        ("vendedor",): ("inventario", "facturas", "reportes"),
        ("bodega", "bodeguero"): ("inventario", "reportes"),
    }
    for nombres_rol, modulos in permisos_base.items():
        bind.execute(
            sa.text(
                'INSERT INTO tipo_usuario_funcion ("idTipoUsuario", "idFuncion") '
                'SELECT tipo."idTipoUsuario", funcion."idFuncion" '
                'FROM "TipoUsuario" AS tipo CROSS JOIN "Funcion" AS funcion '
                'WHERE lower(tipo.nombre) IN :nombres '
                'AND funcion.modulo IN :modulos '
                'AND NOT EXISTS (SELECT 1 FROM tipo_usuario_funcion AS asignacion '
                'WHERE asignacion."idTipoUsuario" = tipo."idTipoUsuario" '
                'AND asignacion."idFuncion" = funcion."idFuncion")'
            ).bindparams(
                sa.bindparam("nombres", expanding=True),
                sa.bindparam("modulos", expanding=True),
            ),
            {"nombres": nombres_rol, "modulos": modulos},
        )


def downgrade():
    # Keep permission assignments intact when rolling back application code.
    pass
