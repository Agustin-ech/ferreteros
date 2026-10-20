from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy import func, or_
from app.models.usuario import Usuario
from app.extensions import db
from app.schemas.usuario_schema import carga_usuario, login_schema, usuario_schema
from app.utils.roles import normalizar_rol

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    # 1. Validar el formato y presencia de datos recibidos
    try:
        data_validada = login_schema.load(data)
    except ValidationError as err:
        return jsonify({"errores": err.messages}), 400

    identificador = data_validada["usuario"].strip()
    password = data_validada["password"]

    # 2. Buscar por correo o por número de documento (ambos únicos).
    #    El correo se compara sin mayúsculas: hay registros antiguos que las tienen.
    usuario = (
        Usuario.query.options(*carga_usuario())
        .filter(or_(
            func.lower(Usuario.correoElectronico) == identificador.lower(),
            Usuario.numeroDocumento == identificador,
        ))
        .first()
    )

    # 3. Validar existencia y hash de contraseña
    if not usuario or not usuario.check_password(password):
        return jsonify({"mensaje": "Credenciales inválidas"}), 401

    # 4. Validar si la cuenta está activa
    if not usuario.activo:
        return jsonify({"mensaje": "El usuario se encuentra inactivo"}), 403

    rol = normalizar_rol(usuario.tipo_usuario.nombre)
    if rol is None:
        return jsonify({"mensaje": "El rol del usuario no está soportado."}), 403

    sucursales_activas = sorted(
        (
            asignacion
            for asignacion in usuario.sucursales
            if asignacion.activo and asignacion.sucursal and asignacion.sucursal.activa
        ),
        key=lambda asignacion: asignacion.idSucursal,
    )
    id_sucursal = sucursales_activas[0].idSucursal if sucursales_activas else None
    if rol != "admin" and id_sucursal is None:
        return jsonify({"mensaje": "El usuario no tiene una sucursal activa asignada."}), 403

    # 5. Generar token JWT con identity (idUsuario) y claims con rol/sucursal
    access_token = create_access_token(
        identity=str(usuario.idUsuario),
        additional_claims={
            "rol": rol,
            "idSucursal": id_sucursal,
        },
    )

    return (
        jsonify(
            {
                "mensaje": "Inicio de sesión exitoso",
                "access_token": access_token,
                "usuario": usuario_schema.dump(usuario),
            }
        ),
        200,
    )


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def obtener_perfil():
    """
    Ruta protegida de prueba para verificar que el token JWT sea válido.
    """
    usuario_id = get_jwt_identity()
    usuario = db.session.get(Usuario, usuario_id, options=carga_usuario())

    if not usuario:
        return jsonify({"mensaje": "Usuario no encontrado"}), 404

    return jsonify({"usuario": usuario_schema.dump(usuario)}), 200


@auth_bp.route("/cambiar-password", methods=["POST"])
@jwt_required()
def cambiar_password():
    """Cualquier usuario autenticado cambia su propia contraseña."""
    data = request.get_json(silent=True) or {}
    actual = data.get("passwordActual")
    nueva = data.get("passwordNueva")
    if not isinstance(actual, str) or not isinstance(nueva, str) or not actual or not nueva:
        return jsonify({"mensaje": "Escribe la contraseña actual y la nueva."}), 400
    if len(nueva) < 8 or len(nueva) > 255:
        return jsonify({"mensaje": "La nueva contraseña debe tener entre 8 y 255 caracteres."}), 400

    usuario = db.session.get(Usuario, int(get_jwt_identity()))
    if usuario is None or not usuario.activo:
        return jsonify({"mensaje": "Usuario no encontrado o inactivo."}), 404
    if not usuario.check_password(actual):
        return jsonify({"mensaje": "La contraseña actual no es correcta."}), 400
    if usuario.check_password(nueva):
        return jsonify({"mensaje": "La nueva contraseña debe ser diferente de la actual."}), 400

    usuario.set_password(nueva)
    db.session.commit()
    return jsonify({"mensaje": "Contraseña actualizada correctamente."}), 200