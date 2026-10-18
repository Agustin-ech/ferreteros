from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.sucursal import Sucursal
from app.models.sucursal_usuario import SucursalUsuario
from app.models.tipo_documento import TipoDeDocumento
from app.models.tipo_usuario import TipoUsuario
from app.models.usuario import Usuario
from app.schemas.usuario_schema import (
    usuario_create_schema,
    usuario_schema,
    usuario_update_schema,
)
from app.utils.auth import roles_required
from app.utils.decorators import requiere_rol

usuario_bp = Blueprint("usuario_bp", __name__)


def _cargar_usuario(usuario_id):
    return (
        Usuario.query
        .options(
            joinedload(Usuario.tipo_usuario),
            joinedload(Usuario.tipo_documento),
            joinedload(Usuario.sucursales).joinedload(SucursalUsuario.sucursal),
        )
        .filter_by(idUsuario=usuario_id)
        .first()
    )


def _validar_referencias(data, *, crear=False, usuario=None):
    id_tipo_documento = data.get("idTipoDocumento", usuario.idTipoDocumento if usuario else None)
    id_tipo_usuario = data.get("idTipoUsuario", usuario.idTipoUsuario if usuario else None)
    if id_tipo_documento is not None:
        documento = db.session.get(TipoDeDocumento, id_tipo_documento)
        if documento is None or not documento.activo:
            return "El tipo de documento no existe o está inactivo."

    tipo_usuario = None
    if id_tipo_usuario is not None:
        tipo_usuario = db.session.get(TipoUsuario, id_tipo_usuario)
        if tipo_usuario is None or not tipo_usuario.activo:
            return "El rol seleccionado no existe o está inactivo."

    asignacion_actual = next(
        (asignacion for asignacion in usuario.sucursales if asignacion.activo),
        None,
    ) if usuario else None
    id_sucursal = data.get(
        "idSucursal",
        None if crear else (asignacion_actual.idSucursal if asignacion_actual else None),
    )
    rol = (tipo_usuario.nombre if tipo_usuario else "").strip().lower()
    if rol != "administrador" and id_sucursal is None:
        return "Debe asignar una sucursal a los usuarios que no sean administradores."
    if id_sucursal is not None:
        sucursal = db.session.get(Sucursal, id_sucursal)
        if sucursal is None or not sucursal.activa:
            return "La sucursal seleccionada no existe o está inactiva."
    return None


def _actualizar_sucursal(usuario, id_sucursal):
    asignaciones_activas = [asignacion for asignacion in usuario.sucursales if asignacion.activo]
    asignacion_actual = next(
        (asignacion for asignacion in asignaciones_activas if asignacion.idSucursal == id_sucursal),
        None,
    ) if id_sucursal is not None else None
    for asignacion in asignaciones_activas:
        asignacion.activo = False
    if id_sucursal is not None:
        if asignacion_actual:
            asignacion_actual.activo = True
        else:
            db.session.add(SucursalUsuario(idUsuario=usuario.idUsuario, idSucursal=id_sucursal))


def _respuesta_error(mensaje, codigo):
    return jsonify({"mensaje": mensaje}), codigo


def _datos_normalizados():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None
    return {
        campo: valor.strip() if isinstance(valor, str) else valor
        for campo, valor in data.items()
    }


@usuario_bp.route("/usuarios", methods=["POST"])
@roles_required("admin")
def crear_usuario():
    cuerpo = _datos_normalizados()
    if cuerpo is None:
        return _respuesta_error("El cuerpo debe ser un objeto JSON válido.", 400)
    if isinstance(cuerpo.get("correoElectronico"), str):
        cuerpo["correoElectronico"] = cuerpo["correoElectronico"].lower()
    try:
        data = usuario_create_schema.load(cuerpo)
    except ValidationError as error:
        return jsonify({"mensaje": "Datos de empleado inválidos.", "errores": error.messages}), 400

    for campo in ("numeroDocumento", "primerNombre", "primerApellido"):
        data[campo] = data[campo].strip()
        if not data[campo]:
            return _respuesta_error(f'El campo "{campo}" no puede estar vacío.', 400)
    data["correoElectronico"] = data["correoElectronico"].strip().lower()
    error_referencia = _validar_referencias(data, crear=True)
    if error_referencia:
        return _respuesta_error(error_referencia, 400)
    if Usuario.query.filter_by(numeroDocumento=data["numeroDocumento"]).first():
        return _respuesta_error("Ya existe un empleado con ese documento.", 409)
    if Usuario.query.filter(func.lower(Usuario.correoElectronico) == data["correoElectronico"]).first():
        return _respuesta_error("Ya existe un empleado con ese correo electrónico.", 409)

    empleado = Usuario(
        idTipoDocumento=data["idTipoDocumento"],
        numeroDocumento=data["numeroDocumento"],
        primerNombre=data["primerNombre"],
        segundoNombre=(data.get("segundoNombre") or "").strip() or None,
        primerApellido=data["primerApellido"],
        segundoApellido=(data.get("segundoApellido") or "").strip() or None,
        correoElectronico=data["correoElectronico"].strip().lower(),
        telefono=(data.get("telefono") or "").strip() or None,
        idTipoUsuario=data["idTipoUsuario"],
        activo=True,
    )
    empleado.set_password(data["password"])
    db.session.add(empleado)
    try:
        db.session.flush()
        if data.get("idSucursal") is not None:
            db.session.add(SucursalUsuario(
                idUsuario=empleado.idUsuario,
                idSucursal=data["idSucursal"],
            ))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _respuesta_error("Ya existe un empleado con ese documento o correo electrónico.", 409)

    return jsonify({
        "mensaje": "Empleado creado correctamente.",
        "usuario": usuario_schema.dump(_cargar_usuario(empleado.idUsuario)),
    }), 201


@usuario_bp.route("/usuarios", methods=["GET"])
@roles_required("admin")
def listar_usuarios():
    usuarios = (
        Usuario.query
        .options(
            joinedload(Usuario.tipo_usuario),
            joinedload(Usuario.tipo_documento),
            joinedload(Usuario.sucursales).joinedload(SucursalUsuario.sucursal),
        )
        .order_by(Usuario.idUsuario.desc())
        .all()
    )
    return jsonify([usuario_schema.dump(usuario) for usuario in usuarios]), 200


@usuario_bp.route("/usuarios/catalogos", methods=["GET"])
@roles_required("admin")
def listar_catalogos_empleados():
    documentos = TipoDeDocumento.query.filter_by(activo=True).order_by(TipoDeDocumento.nombre).all()
    roles = TipoUsuario.query.filter_by(activo=True).order_by(TipoUsuario.nombre).all()
    sucursales = Sucursal.query.filter_by(activa=True).order_by(Sucursal.nombreSucursal).all()
    return jsonify({
        "tiposDocumento": [
            {"idTipoDocumento": documento.idTipoDocumento, "nombre": documento.nombre}
            for documento in documentos
        ],
        "roles": [
            {
                "idTipoUsuario": rol.idTipoUsuario,
                "nombre": rol.nombre,
                "descripcion": rol.descripcion,
            }
            for rol in roles
        ],
        "sucursales": [
            {"idSucursal": sucursal.idSucursal, "nombreSucursal": sucursal.nombreSucursal}
            for sucursal in sucursales
        ],
    }), 200


@usuario_bp.route("/usuarios/<int:usuario_id>", methods=["PATCH"])
@roles_required("admin")
def actualizar_usuario(usuario_id):
    empleado = _cargar_usuario(usuario_id)
    if empleado is None:
        return _respuesta_error("El empleado no existe.", 404)

    cuerpo = _datos_normalizados()
    if cuerpo is None:
        return _respuesta_error("El cuerpo debe ser un objeto JSON válido.", 400)
    if isinstance(cuerpo.get("correoElectronico"), str):
        cuerpo["correoElectronico"] = cuerpo["correoElectronico"].lower()
    try:
        data = usuario_update_schema.load(cuerpo, partial=True)
    except ValidationError as error:
        return jsonify({"mensaje": "Datos de empleado inválidos.", "errores": error.messages}), 400
    if not data:
        return _respuesta_error("Envía al menos un campo para actualizar.", 400)

    error_referencia = _validar_referencias(data, usuario=empleado)
    if error_referencia:
        return _respuesta_error(error_referencia, 400)
    for campo in ("primerNombre", "primerApellido", "numeroDocumento"):
        if campo in data and not data[campo].strip():
            return _respuesta_error(f'El campo "{campo}" no puede estar vacío.', 400)
    nuevo_documento = data.get("numeroDocumento")
    if nuevo_documento is not None:
        nuevo_documento = nuevo_documento.strip()
    if nuevo_documento and Usuario.query.filter(
        Usuario.numeroDocumento == nuevo_documento,
        Usuario.idUsuario != usuario_id,
    ).first():
        return _respuesta_error("Ya existe un empleado con ese documento.", 409)
    nuevo_correo = data.get("correoElectronico")
    if nuevo_correo is not None:
        nuevo_correo = nuevo_correo.strip().lower()
    if nuevo_correo and Usuario.query.filter(
        func.lower(Usuario.correoElectronico) == nuevo_correo,
        Usuario.idUsuario != usuario_id,
    ).first():
        return _respuesta_error("Ya existe un empleado con ese correo electrónico.", 409)

    usuario_actual = int(g.usuario["id"])
    rol_anterior = empleado.tipo_usuario.nombre.strip().lower()
    nuevo_id_rol = data.get("idTipoUsuario", empleado.idTipoUsuario)
    nuevo_rol = db.session.get(TipoUsuario, nuevo_id_rol).nombre.strip().lower()
    nuevo_activo = data.get("activo", empleado.activo)
    if usuario_id == usuario_actual and (
        not nuevo_activo or nuevo_rol != "administrador"
    ):
        return _respuesta_error("No puedes desactivar ni cambiar el rol de tu propia cuenta.", 400)
    if rol_anterior == "administrador" and empleado.activo and (
        not nuevo_activo or nuevo_rol != "administrador"
    ):
        administradores_activos = (
            Usuario.query.join(TipoUsuario)
            .filter(
                Usuario.activo.is_(True),
                TipoUsuario.activo.is_(True),
                func.lower(TipoUsuario.nombre) == "administrador",
                Usuario.idUsuario != usuario_id,
            )
            .count()
        )
        if administradores_activos == 0:
            return _respuesta_error("No se puede desactivar o cambiar el único administrador activo.", 400)

    for campo in (
        "idTipoDocumento",
        "numeroDocumento",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "telefono",
        "activo",
    ):
        if campo in data:
            valor = data[campo]
            if isinstance(valor, str):
                valor = valor.strip() or None
            setattr(empleado, campo, valor)
    if "correoElectronico" in data:
        empleado.correoElectronico = nuevo_correo
    if "numeroDocumento" in data:
        empleado.numeroDocumento = nuevo_documento
    if "idTipoUsuario" in data:
        empleado.idTipoUsuario = data["idTipoUsuario"]
    if "idSucursal" in data:
        _actualizar_sucursal(empleado, data["idSucursal"])
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _respuesta_error("Ya existe un empleado con ese documento o correo electrónico.", 409)

    return jsonify({
        "mensaje": "Empleado actualizado correctamente.",
        "usuario": usuario_schema.dump(_cargar_usuario(usuario_id)),
    }), 200


@usuario_bp.route("/api/usuarios/nombres", methods=["GET"])
@jwt_required()
@requiere_rol("admin")
def listar_nombres_usuarios():
    usuarios = (
        Usuario.query
        .order_by(Usuario.idUsuario)
        .all()
    )
    return jsonify({
        "data": [
            {
                "idUsuario": usuario.idUsuario,
                "nombre": " ".join(
                    parte
                    for parte in (
                        usuario.primerNombre,
                        usuario.segundoNombre,
                        usuario.primerApellido,
                        usuario.segundoApellido,
                    )
                    if parte
                ),
            }
            for usuario in usuarios
        ],
    }), 200
