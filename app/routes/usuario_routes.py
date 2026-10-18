from flask import Blueprint, g, jsonify, request
from marshmallow import Schema, ValidationError, fields, validate, validates
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.funcion import Funcion
from app.models.sucursal import Sucursal
from app.models.sucursal_usuario import SucursalUsuario
from app.models.tipo_documento import TipoDeDocumento
from app.models.tipo_usuario import TipoUsuario
from app.models.usuario import Usuario
from app.models.usuario_tipo_funcion import TipoUsuarioFuncion
from app.schemas.usuario_schema import usuario_schema
from app.utils.auth import roles_required
from app.utils.roles import normalizar_rol

usuario_bp = Blueprint("usuario_bp", __name__)

ROLES_SOPORTADOS = {"admin", "bodega", "vendedor"}


class UsuarioEntradaSchema(Schema):
    idTipoDocumento = fields.Int(required=True, validate=validate.Range(min=1))
    numeroDocumento = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    primerNombre = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    segundoNombre = fields.Str(allow_none=True, validate=validate.Length(max=150))
    primerApellido = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    segundoApellido = fields.Str(allow_none=True, validate=validate.Length(max=150))
    correoElectronico = fields.Email(required=True, validate=validate.Length(max=150))
    telefono = fields.Str(allow_none=True, validate=validate.Length(max=20))
    idTipoUsuario = fields.Int(required=True, validate=validate.Range(min=1))
    idSucursal = fields.Int(required=True, validate=validate.Range(min=1))
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=8, max=255))
    activo = fields.Bool()

    @validates("numeroDocumento")
    def validar_documento_no_vacio(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("El número de documento no puede estar vacío.")

    @validates("primerNombre")
    def validar_primer_nombre_no_vacio(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("El primer nombre no puede estar vacío.")

    @validates("primerApellido")
    def validar_primer_apellido_no_vacio(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("El primer apellido no puede estar vacío.")


class UsuarioActualizacionSchema(UsuarioEntradaSchema):
    idTipoDocumento = fields.Int(validate=validate.Range(min=1))
    numeroDocumento = fields.Str(validate=validate.Length(min=1, max=20))
    primerNombre = fields.Str(validate=validate.Length(min=1, max=150))
    primerApellido = fields.Str(validate=validate.Length(min=1, max=150))
    correoElectronico = fields.Email(validate=validate.Length(max=150))
    idTipoUsuario = fields.Int(validate=validate.Range(min=1))
    idSucursal = fields.Int(validate=validate.Range(min=1))
    password = fields.Str(load_only=True, validate=validate.Length(min=8, max=255))


class RolEntradaSchema(Schema):
    nombre = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    descripcion = fields.Str(allow_none=True, validate=validate.Length(max=255))
    idFunciones = fields.List(fields.Int(validate=validate.Range(min=1)), load_default=list)


class RolActualizacionSchema(Schema):
    descripcion = fields.Str(allow_none=True, validate=validate.Length(max=255))
    idFunciones = fields.List(fields.Int(validate=validate.Range(min=1)))


usuario_entrada_schema = UsuarioEntradaSchema()
usuario_actualizacion_schema = UsuarioActualizacionSchema()
rol_entrada_schema = RolEntradaSchema()
rol_actualizacion_schema = RolActualizacionSchema()


def _error(mensaje, codigo):
    return jsonify({"error": mensaje}), codigo


def _validar_entrada(schema):
    contenido = request.get_json(silent=True)
    if contenido is not None and not isinstance(contenido, dict):
        return jsonify({"error": "El cuerpo debe ser un objeto JSON válido."}), 400
    try:
        return schema.load(contenido or {})
    except ValidationError as error:
        return jsonify({"error": "Datos inválidos.", "detalles": error.messages}), 400


def _rol_soportado(tipo_usuario):
    return tipo_usuario is not None and normalizar_rol(tipo_usuario.nombre) in ROLES_SOPORTADOS


def _asignar_sucursal(usuario, sucursal_id):
    asignaciones = SucursalUsuario.query.filter_by(idUsuario=usuario.idUsuario).all()
    for asignacion in asignaciones:
        asignacion.activo = asignacion.idSucursal == sucursal_id

    asignacion = next(
        (item for item in asignaciones if item.idSucursal == sucursal_id),
        None,
    )
    if asignacion is None:
        db.session.add(SucursalUsuario(idUsuario=usuario.idUsuario, idSucursal=sucursal_id))
    else:
        asignacion.activo = True


def _tipo_usuario_conocido(tipo_usuario_id):
    tipo_usuario = db.session.get(TipoUsuario, tipo_usuario_id)
    return tipo_usuario if _rol_soportado(tipo_usuario) and tipo_usuario.activo else None


def _lista_roles():
    tipos = TipoUsuario.query.filter_by(activo=True).order_by(TipoUsuario.nombre).all()
    por_rol = {}
    for tipo in tipos:
        rol = normalizar_rol(tipo.nombre)
        if rol not in ROLES_SOPORTADOS:
            continue
        existente = por_rol.get(rol)
        if existente is None or tipo.nombre.casefold() == rol:
            por_rol[rol] = tipo
    roles = [por_rol[rol] for rol in sorted(por_rol)]
    salida = []
    for tipo in roles:
        funciones = sorted(
            (
                asignacion.funcion
                for asignacion in tipo.funciones
                if asignacion.funcion and asignacion.funcion.activo
            ),
            key=lambda funcion: funcion.nombre.casefold(),
        )
        salida.append({
            "idTipoUsuario": tipo.idTipoUsuario,
            "nombre": tipo.nombre,
            "rol": normalizar_rol(tipo.nombre),
            "descripcion": tipo.descripcion or "",
            "idFunciones": [funcion.idFuncion for funcion in funciones],
            "permisos": [funcion.nombre for funcion in funciones],
            "usuarios": Usuario.query.filter_by(
                idTipoUsuario=tipo.idTipoUsuario,
                activo=True,
            ).count(),
        })
    return salida


@usuario_bp.errorhandler(ValidationError)
def _datos_invalidos(error):
    return jsonify({"error": "Datos inválidos.", "detalles": error.messages}), 400


@usuario_bp.route("/usuarios", methods=["POST"])
@usuario_bp.route("/api/usuarios", methods=["POST"])
@roles_required("admin")
def crear_usuario():
    campos = _validar_entrada(usuario_entrada_schema)
    if isinstance(campos, tuple):
        return campos

    sucursal = db.session.get(Sucursal, campos["idSucursal"])
    tipo_documento = db.session.get(TipoDeDocumento, campos["idTipoDocumento"])
    tipo_usuario = _tipo_usuario_conocido(campos["idTipoUsuario"])
    if sucursal is None or not sucursal.activa:
        return _error("La sucursal seleccionada no existe o está inactiva.", 400)
    if tipo_documento is None or not tipo_documento.activo:
        return _error("El tipo de documento seleccionado no existe o está inactivo.", 400)
    if tipo_usuario is None:
        return _error("El rol seleccionado no está activo o no es compatible con el sistema.", 400)

    if Usuario.query.filter_by(numeroDocumento=campos["numeroDocumento"].strip()).first():
        return _error("Ya existe un usuario con ese documento.", 409)
    if Usuario.query.filter_by(correoElectronico=campos["correoElectronico"].strip().casefold()).first():
        return _error("Ya existe un usuario con ese correo electrónico.", 409)

    usuario = Usuario(
        idTipoDocumento=campos["idTipoDocumento"],
        numeroDocumento=campos["numeroDocumento"].strip(),
        primerNombre=campos["primerNombre"].strip(),
        segundoNombre=(campos.get("segundoNombre") or "").strip() or None,
        primerApellido=campos["primerApellido"].strip(),
        segundoApellido=(campos.get("segundoApellido") or "").strip() or None,
        correoElectronico=campos["correoElectronico"].strip().casefold(),
        telefono=(campos.get("telefono") or "").strip() or None,
        idTipoUsuario=tipo_usuario.idTipoUsuario,
        activo=campos.get("activo", True),
    )
    usuario.set_password(campos["password"])
    db.session.add(usuario)
    try:
        db.session.flush()
        _asignar_sucursal(usuario, campos["idSucursal"])
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("Ya existe un usuario con ese documento o correo electrónico.", 409)
    return jsonify({"mensaje": "Usuario creado exitosamente.", "usuario": usuario_schema.dump(usuario)}), 201


@usuario_bp.route("/usuarios", methods=["GET"])
@usuario_bp.route("/api/usuarios", methods=["GET"])
@roles_required("admin")
def listar_usuarios():
    usuarios = Usuario.query.order_by(Usuario.primerApellido, Usuario.primerNombre).all()
    return jsonify([usuario_schema.dump(usuario) for usuario in usuarios]), 200


@usuario_bp.get("/api/usuarios/catalogos")
@roles_required("admin")
def catalogos_usuarios():
    documentos = TipoDeDocumento.query.filter_by(activo=True).order_by(TipoDeDocumento.nombre).all()
    sucursales = Sucursal.query.filter_by(activa=True).order_by(Sucursal.nombreSucursal).all()
    roles_existentes = _lista_roles()
    roles_presentes = {
        normalizar_rol(tipo.nombre)
        for tipo in TipoUsuario.query.all()
        if normalizar_rol(tipo.nombre) in ROLES_SOPORTADOS
    }
    return jsonify({
        "tiposDocumento": [
            {"idTipoDocumento": documento.idTipoDocumento, "nombre": documento.nombre, "acronimo": documento.Acronimo}
            for documento in documentos
        ],
        "roles": [
            {"idTipoUsuario": rol["idTipoUsuario"], "nombre": rol["nombre"], "rol": rol["rol"]}
            for rol in roles_existentes
        ],
        "rolesDisponibles": [
            {"nombre": rol, "rol": rol}
            for rol in sorted(ROLES_SOPORTADOS - roles_presentes)
        ],
        "sucursales": [
            {"idSucursal": sucursal.idSucursal, "nombreSucursal": sucursal.nombreSucursal}
            for sucursal in sucursales
        ],
    }), 200


@usuario_bp.route("/usuarios/<int:usuario_id>", methods=["PUT"])
@usuario_bp.route("/api/usuarios/<int:usuario_id>", methods=["PUT"])
@roles_required("admin")
def actualizar_usuario(usuario_id):
    usuario = db.session.get(Usuario, usuario_id)
    if usuario is None:
        return _error("El usuario no existe.", 404)
    campos = _validar_entrada(usuario_actualizacion_schema)
    if isinstance(campos, tuple):
        return campos

    if usuario.idUsuario == g.usuario["id"] and (
        campos.get("activo") is False
        or (
            "idTipoUsuario" in campos
            and normalizar_rol(usuario.tipo_usuario.nombre) == "admin"
            and campos["idTipoUsuario"] != usuario.idTipoUsuario
        )
    ):
        return _error("No puedes desactivar ni cambiar el rol de tu propia cuenta administradora.", 409)

    if "idTipoUsuario" in campos:
        tipo_usuario = _tipo_usuario_conocido(campos["idTipoUsuario"])
        if tipo_usuario is None:
            return _error("El rol seleccionado no está activo o no es compatible con el sistema.", 400)
        usuario.idTipoUsuario = tipo_usuario.idTipoUsuario
    if "idSucursal" in campos:
        sucursal = db.session.get(Sucursal, campos["idSucursal"])
        if sucursal is None or not sucursal.activa:
            return _error("La sucursal seleccionada no existe o está inactiva.", 400)
        _asignar_sucursal(usuario, sucursal.idSucursal)
    if "idTipoDocumento" in campos:
        tipo_documento = db.session.get(TipoDeDocumento, campos["idTipoDocumento"])
        if tipo_documento is None or not tipo_documento.activo:
            return _error("El tipo de documento seleccionado no existe o está inactivo.", 400)

    for campo in (
        "idTipoDocumento", "numeroDocumento", "primerNombre", "segundoNombre",
        "primerApellido", "segundoApellido", "correoElectronico", "telefono", "activo",
    ):
        if campo in campos:
            valor = campos[campo]
            if isinstance(valor, str):
                valor = valor.strip() or None
            if campo == "correoElectronico" and valor:
                valor = valor.casefold()
            setattr(usuario, campo, valor)
    if campos.get("password"):
        usuario.set_password(campos["password"])

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("Ya existe un usuario con ese documento o correo electrónico.", 409)
    return jsonify(usuario_schema.dump(usuario)), 200


@usuario_bp.route("/usuarios/<int:usuario_id>", methods=["GET"])
@usuario_bp.route("/api/usuarios/<int:usuario_id>", methods=["GET"])
@roles_required("admin")
def obtener_usuario(usuario_id):
    usuario = db.session.get(Usuario, usuario_id)
    if usuario is None:
        return _error("El usuario no existe.", 404)
    return jsonify(usuario_schema.dump(usuario)), 200


@usuario_bp.route("/usuarios/<int:usuario_id>", methods=["DELETE"])
@usuario_bp.route("/api/usuarios/<int:usuario_id>", methods=["DELETE"])
@roles_required("admin")
def desactivar_usuario(usuario_id):
    usuario = db.session.get(Usuario, usuario_id)
    if usuario is None:
        return _error("El usuario no existe.", 404)
    if usuario.idUsuario == g.usuario["id"]:
        return _error("No puedes desactivar tu propia cuenta administradora.", 409)
    usuario.activo = False
    db.session.commit()
    return jsonify(usuario_schema.dump(usuario)), 200


@usuario_bp.route("/api/roles", methods=["GET", "POST"])
@roles_required("admin")
def roles():
    if request.method == "GET":
        return jsonify(_lista_roles()), 200

    campos = _validar_entrada(rol_entrada_schema)
    if isinstance(campos, tuple):
        return campos
    nombre = campos["nombre"].strip().casefold()
    rol_canonico = normalizar_rol(nombre)
    if rol_canonico not in ROLES_SOPORTADOS:
        return _error("Solo se pueden crear los roles admin, vendedor y bodega, reconocidos por el sistema.", 400)
    if any(normalizar_rol(tipo.nombre) == rol_canonico for tipo in TipoUsuario.query.all()):
        return _error("Ese rol ya existe.", 409)

    funciones = Funcion.query.filter(
        Funcion.idFuncion.in_(campos["idFunciones"]),
        Funcion.activo.is_(True),
    ).all() if campos["idFunciones"] else []
    if len(funciones) != len(set(campos["idFunciones"])):
        return _error("Una o más funciones no existen o están inactivas.", 400)
    tipo_usuario = TipoUsuario(nombre=nombre, descripcion=campos.get("descripcion"))
    db.session.add(tipo_usuario)
    try:
        db.session.flush()
        db.session.add_all(
            TipoUsuarioFuncion(idTipoUsuario=tipo_usuario.idTipoUsuario, idFuncion=funcion.idFuncion)
            for funcion in funciones
        )
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _error("Ese rol ya existe.", 409)
    return jsonify(next(
        rol for rol in _lista_roles() if rol["idTipoUsuario"] == tipo_usuario.idTipoUsuario
    )), 201


@usuario_bp.route("/api/roles/<int:tipo_usuario_id>", methods=["PUT"])
@roles_required("admin")
def actualizar_rol(tipo_usuario_id):
    tipo_usuario = db.session.get(TipoUsuario, tipo_usuario_id)
    if not _rol_soportado(tipo_usuario) or not tipo_usuario.activo:
        return _error("El rol no existe o no es compatible con el sistema.", 404)
    campos = _validar_entrada(rol_actualizacion_schema)
    if isinstance(campos, tuple):
        return campos
    if "descripcion" in campos:
        tipo_usuario.descripcion = campos["descripcion"]
    if "idFunciones" in campos:
        ids = campos["idFunciones"]
        funciones = Funcion.query.filter(
            Funcion.idFuncion.in_(ids),
            Funcion.activo.is_(True),
        ).all() if ids else []
        if len(funciones) != len(set(ids)):
            return _error("Una o más funciones no existen o están inactivas.", 400)
        TipoUsuarioFuncion.query.filter_by(idTipoUsuario=tipo_usuario.idTipoUsuario).delete()
        db.session.add_all(
            TipoUsuarioFuncion(idTipoUsuario=tipo_usuario.idTipoUsuario, idFuncion=funcion.idFuncion)
            for funcion in funciones
        )
    db.session.commit()
    return jsonify(next(
        rol for rol in _lista_roles() if rol["idTipoUsuario"] == tipo_usuario.idTipoUsuario
    )), 200


@usuario_bp.get("/api/funciones")
@roles_required("admin")
def listar_funciones():
    funciones = Funcion.query.filter_by(activo=True).order_by(Funcion.nombre).all()
    return jsonify([funcion.to_dict() for funcion in funciones]), 200
