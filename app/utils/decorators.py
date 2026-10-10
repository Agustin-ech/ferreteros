from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt

def requiere_rol(*roles_permitidos):
    """
    Decorador para restringir el acceso basado en el rol guardado en los claims del JWT.
    Debe usarse siempre DESPUÉS de @jwt_required().
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # get_jwt() obtiene los claims adicionales que guardaste en auth_routes.py
            claims = get_jwt()
            
            # Extraemos el rol. Recordar que tu login lo guarda como "admin"
            rol_usuario = claims.get("rol")

            if not rol_usuario or rol_usuario not in roles_permitidos:
                return jsonify({
                    "mensaje": f"Acceso denegado. Se requiere uno de los siguientes roles: {', '.join(roles_permitidos)}"
                }), 403

            # Si el rol es correcto, continúa con la ejecución de la ruta
            return fn(*args, **kwargs)
        return wrapper
    return decorator