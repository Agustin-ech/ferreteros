from flask import jsonify
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.sucursal_usuario import SucursalUsuario
from app.models.usuario import Usuario
from app.utils.roles import normalizar_rol

MENSAJE_SESION_INVALIDA = (
    "Tu sesión ya no es válida: el usuario fue desactivado o cambió su rol o sucursal. "
    "Inicia sesión de nuevo."
)


def _sesion_vigente(usuario, datos_token):
    """El token guarda rol y sucursal al iniciar sesión; deben seguir siendo ciertos."""
    if usuario is None or not usuario.activo or usuario.tipo_usuario is None:
        return False
    rol_token = normalizar_rol(datos_token.get("rol"))
    if rol_token != normalizar_rol(usuario.tipo_usuario.nombre):
        return False
    if rol_token == "admin":
        return True
    sucursal_token = datos_token.get("idSucursal")
    sucursales_activas = {
        asignacion.idSucursal
        for asignacion in usuario.sucursales
        if asignacion.activo and asignacion.sucursal and asignacion.sucursal.activa
    }
    try:
        return sucursal_token is not None and int(sucursal_token) in sucursales_activas
    except (TypeError, ValueError):
        return False


def usuario_de_sesion(datos_token):
    """Usuario del token si su sesión sigue vigente; None si no."""
    try:
        id_usuario = int(datos_token["sub"])
    except (KeyError, TypeError, ValueError):
        return None
    # Una sola consulta: usuario, rol y sucursales asignadas.
    usuario = db.session.get(
        Usuario,
        id_usuario,
        options=[
            joinedload(Usuario.tipo_usuario),
            joinedload(Usuario.sucursales).joinedload(SucursalUsuario.sucursal),
        ],
    )
    return usuario if _sesion_vigente(usuario, datos_token) else None


def registrar_validacion_sesion(jwt):
    """Valida en cada petición autenticada que el usuario siga activo y con el
    mismo rol y sucursal de su token.

    Sin esto, un usuario desactivado (o al que se le cambió el rol) seguía
    operando hasta que vencía su token (10 horas), porque varias rutas solo
    leen el rol guardado en el token. flask-jwt-extended llama a este cargador
    en cada @jwt_required / verify_jwt_in_request.
    """

    @jwt.user_lookup_loader
    def cargar_usuario(_cabecera, datos_token):
        # Se busca en el módulo en cada llamada para que los tests puedan sustituirla.
        import app.utils.sesion as sesion
        return sesion.usuario_de_sesion(datos_token)

    @jwt.user_lookup_error_loader
    def sesion_invalida(_cabecera, _datos_token):
        return jsonify({"error": MENSAJE_SESION_INVALIDA, "mensaje": MENSAJE_SESION_INVALIDA}), 401
