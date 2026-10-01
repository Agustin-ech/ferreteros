from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.utils.decorators import requiere_rol 

inventario_bp = Blueprint("inventario", __name__, url_prefix="/api/inventario")

@inventario_bp.route("/ajustar", methods=["POST"])
@jwt_required() # 1. Primero verifica que el usuario esté logueado y el token sea válido
@requiere_rol("admin") # 2. Luego verifica que el claim 'rol' sea "admin"
def ajustar_inventario():
    # Aquí iría tu lógica para ajustar el inventario...
    
    return jsonify({
        "mensaje": "Acceso concedido al administrador. Inventario ajustado correctamente."
    }), 200

# Ejemplo de otra ruta que podrían usar múltiples roles
@inventario_bp.route("/ver", methods=["GET"])
@jwt_required()
@requiere_rol("admin", "vendedor", "supervisor") 
def ver_inventario():
    return jsonify({"mensaje": "Lista de inventario..."}), 200