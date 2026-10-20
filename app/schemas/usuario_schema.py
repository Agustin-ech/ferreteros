from marshmallow import Schema, fields, validate, validates, ValidationError
from sqlalchemy.orm import joinedload, selectinload

from app.models.sucursal_usuario import SucursalUsuario
from app.models.tipo_usuario import TipoUsuario
from app.models.usuario import Usuario
from app.models.usuario_tipo_funcion import TipoUsuarioFuncion
from app.utils.roles import normalizar_rol

# Relaciones que UsuarioSchema recorre al serializar. Cargarlas por adelantado
# evita una consulta por cada permiso y sucursal (con Supabase cada consulta
# cuesta ~150 ms de ida y vuelta). Es una función porque construir las
# opciones al importar configura los mappers antes de registrar todos los modelos.
def carga_usuario():
    return (
        joinedload(Usuario.tipo_usuario)
        .selectinload(TipoUsuario.funciones)
        .joinedload(TipoUsuarioFuncion.funcion),
        selectinload(Usuario.sucursales).joinedload(SucursalUsuario.sucursal),
    )

class LoginSchema(Schema):

    primerNombre = fields.Str(
        required=True,
        allow_none=False,
        validate=validate.Length(
            min=1,
            max=150,
            error="El primer nombre debe tener entre 1 y 150 caracteres.",
        ),
        error_messages={
            "required": "El campo 'primerNombre' es obligatorio.",
            "null": "El campo 'primerNombre' no puede ser nulo.",
        },
    )

    password = fields.Str(
        required=True,
        allow_none=False,
        load_only=True,  # nunca se debe devolver en una respuesta
        validate=validate.Length(
            min=1,
            max=255,
            error="La contraseña debe tener entre 1 y 255 caracteres.",
        ),
        error_messages={
            "required": "El campo 'password' es obligatorio.",
            "null": "El campo 'password' no puede ser nulo.",
        },
    )

    idSucursal = fields.Int(
        load_default=None,
        allow_none=True,
        validate=validate.Range(min=1),
    )

    @validates("primerNombre")
    def validar_primer_nombre_no_vacio(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("El campo 'primerNombre' no puede estar vacío.")

    @validates("password")
    def validar_password_no_vacio(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("El campo 'password' no puede estar vacío.")


class UsuarioSchema(Schema):
    idUsuario = fields.Int(dump_only=True)
    idTipoDocumento = fields.Int(dump_only=True)
    numeroDocumento = fields.Str(dump_only=True)
    primerNombre = fields.Str(dump_only=True)
    segundoNombre = fields.Str(dump_only=True, allow_none=True)
    primerApellido = fields.Str(dump_only=True)
    segundoApellido = fields.Str(dump_only=True, allow_none=True)
    nombre = fields.Method("nombre_completo", dump_only=True)
    correoElectronico = fields.Str(dump_only=True)
    telefono = fields.Str(dump_only=True, allow_none=True)
    idTipoUsuario = fields.Int(dump_only=True)
    rol = fields.Method("rol_nombre", dump_only=True)
    idSucursal = fields.Method("sucursal_id", dump_only=True)
    sucursal = fields.Method("sucursal_nombre", dump_only=True)
    permisos = fields.Method("permisos_rol", dump_only=True)
    # Códigos (Funcion.modulo) que el frontend usa para mostrar u ocultar menús.
    modulos = fields.Method("modulos_rol", dump_only=True)
    activo = fields.Bool(dump_only=True)

    def nombre_completo(self, usuario):
        return " ".join(
            parte
            for parte in (
                usuario.primerNombre,
                usuario.segundoNombre,
                usuario.primerApellido,
                usuario.segundoApellido,
            )
            if parte
        )

    def rol_nombre(self, usuario):
        return normalizar_rol(usuario.tipo_usuario.nombre)

    def sucursal_id(self, usuario):
        asignaciones = self._sucursales_activas(usuario)
        return asignaciones[0].idSucursal if asignaciones else None

    def sucursal_nombre(self, usuario):
        asignaciones = self._sucursales_activas(usuario)
        return asignaciones[0].sucursal.nombreSucursal if asignaciones else None

    def permisos_rol(self, usuario):
        return sorted(
            (
                asignacion.funcion.nombre
                for asignacion in usuario.tipo_usuario.funciones
                if asignacion.funcion and asignacion.funcion.activo
            ),
            key=str.casefold,
        )

    def modulos_rol(self, usuario):
        return sorted(
            asignacion.funcion.modulo
            for asignacion in usuario.tipo_usuario.funciones
            if asignacion.funcion and asignacion.funcion.activo
        )

    def _sucursales_activas(self, usuario):
        return sorted(
            (
                asignacion
                for asignacion in usuario.sucursales
                if asignacion.activo and asignacion.sucursal and asignacion.sucursal.activa
            ),
            key=lambda asignacion: asignacion.idSucursal,
        )

# Instancias listas para usar en las rutas, evitando crear un Schema()
# nuevo cada vez que se necesita validar o serializar.
login_schema = LoginSchema()
usuario_schema = UsuarioSchema()