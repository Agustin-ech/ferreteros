"""normalizar comparación de rol en trigger de ajustes

Revision ID: f295a124cd73
Revises: c481e6a9f21d
Create Date: 2026-10-10 10:15:00.000000

"""
from alembic import op


revision = "f295a124cd73"
down_revision = "c481e6a9f21d"
branch_labels = None
depends_on = None


_FUNCION = """
CREATE OR REPLACE FUNCTION public.fn_solo_admin_autoriza()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."estadoAutorizacion" = 'Autorizado' AND NOT EXISTS (
       SELECT 1
       FROM public.usuarios u
       JOIN public."TipoUsuario" t ON t."idTipoUsuario" = u."idTipoUsuario"
       WHERE u."idUsuario" = NEW."idUser"
         AND lower(t.nombre) = 'administrador'
         AND u.activo
  ) THEN
    RAISE EXCEPTION 'Solo el rol Administrador puede autorizar ajustes de inventario'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
"""


def upgrade():
    op.execute(_FUNCION)


def downgrade():
    op.execute("""
    CREATE OR REPLACE FUNCTION public.fn_solo_admin_autoriza()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW."estadoAutorizacion" = 'Autorizado' AND NOT EXISTS (
           SELECT 1 FROM public.usuarios u
           JOIN public."TipoUsuario" t ON t."idTipoUsuario" = u."idTipoUsuario"
           WHERE u."idUsuario" = NEW."idUser"
             AND t.nombre = 'Administrador'
             AND u.activo) THEN
        RAISE EXCEPTION 'Solo el rol Administrador puede autorizar ajustes de inventario'
          USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END;
    $$;
    """)