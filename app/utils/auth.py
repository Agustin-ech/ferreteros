from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from app.models.usuario import Usuario


def roles_required(*roles):
    """Valida token JWT y permisos por rol para una vista.

    El usuario autenticado queda disponible en g.usuario como:
    {
        "id": int,
        "rol": str,
        "sucursal_id": int | None,
    }
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception:
                return jsonify({"error": "Token JWT inválido o ausente."}), 401

            usuario_id = get_jwt_identity()
            claims = get_jwt()
            usuario = Usuario.query.get(usuario_id)

            if usuario is None:
                return jsonify({"error": "Usuario no encontrado."}), 401

            if not getattr(usuario, "activo", True):
                return jsonify({"error": "Usuario inactivo."}), 403

            rol_usuario = claims.get("rol")
            sucursal_id = claims.get("idSucursal")

            if roles and rol_usuario not in roles:
                return jsonify({"error": "No tiene permisos para esta operación."}), 403

            g.usuario = {
                "id": int(usuario_id),
                "rol": rol_usuario,
                "sucursal_id": sucursal_id,
            }
            return fn(*args, **kwargs)

        return wrapper

    return decorator
