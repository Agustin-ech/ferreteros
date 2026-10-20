from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity

from app.extensions import db
from app.models.funcion import Funcion
from app.models.usuario import Usuario
from app.models.usuario_tipo_funcion import TipoUsuarioFuncion
from app.utils.roles import normalizar_rol

# Códigos de Funcion.modulo que controlan qué puede hacer cada rol.
VENTAS = "VENTAS"
DOMICILIOS = "DOMICILIOS"
PRODUCTOS = "PRODUCTOS"
MERMAS = "MERMAS"
AJUSTES = "AJUSTES"
DEVOLUCIONES = "DEVOLUC"
REPORTES = "REPORTES"


def tiene_funcion(usuario_id, modulo) -> bool:
    """True si el rol del usuario tiene asignada la función activa `modulo`."""
    return db.session.query(
        db.session.query(TipoUsuarioFuncion)
        .join(Funcion, Funcion.idFuncion == TipoUsuarioFuncion.idFuncion)
        .join(Usuario, Usuario.idTipoUsuario == TipoUsuarioFuncion.idTipoUsuario)
        .filter(
            Usuario.idUsuario == int(usuario_id),
            Funcion.modulo == modulo,
            Funcion.activo.is_(True),
        )
        .exists()
    ).scalar()


def requiere_funcion(modulo):
    """Exige que el rol tenga el permiso `modulo` (Roles y permisos del admin).

    Va DESPUÉS del decorador que valida el JWT y el rol. El administrador
    siempre tiene acceso total, así nadie se bloquea quitándose un permiso.
    Se consulta la base en cada petición para que un cambio de permisos se
    aplique de inmediato, sin esperar a que el usuario vuelva a iniciar sesión.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if normalizar_rol(get_jwt().get("rol")) != "admin" and not tiene_funcion(get_jwt_identity(), modulo):
                mensaje = "Tu rol no tiene permiso para esta función. Pide al administrador que lo active en Roles y permisos."
                return jsonify({"error": mensaje, "mensaje": mensaje}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
