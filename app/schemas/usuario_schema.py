from marshmallow import Schema, fields, validate, validates, ValidationError

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
    nombre = fields.Method("nombre_completo", dump_only=True)
    rol = fields.Method("rol_nombre", dump_only=True)
    idSucursal = fields.Method("sucursal_id", dump_only=True)
    sucursal = fields.Method("sucursal_nombre", dump_only=True)
    activo = fields.Bool(dump_only=True)
    idTipoDocumento = fields.Int()
    tipoDocumento = fields.Method("tipo_documento_nombre", dump_only=True)
    numeroDocumento = fields.Str()
    primerNombre = fields.Str()
    segundoNombre = fields.Str(allow_none=True)
    primerApellido = fields.Str()
    segundoApellido = fields.Str(allow_none=True)
    correoElectronico = fields.Str()
    telefono = fields.Str(allow_none=True)
    idTipoUsuario = fields.Int()
    fecha_creacion = fields.DateTime()
    ultimo_login = fields.DateTime(allow_none=True)

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
        rol = usuario.tipo_usuario.nombre.strip().lower()
        return "admin" if rol == "administrador" else rol

    def sucursal_id(self, usuario):
        asignacion = self._asignacion_activa(usuario)
        return asignacion.idSucursal if asignacion else None

    def sucursal_nombre(self, usuario):
        asignacion = self._asignacion_activa(usuario)
        return asignacion.sucursal.nombreSucursal if asignacion and asignacion.sucursal else None

    def tipo_documento_nombre(self, usuario):
        return usuario.tipo_documento.nombre if usuario.tipo_documento else None

    @staticmethod
    def _asignacion_activa(usuario):
        asignaciones = sorted(
            (asignacion for asignacion in usuario.sucursales if asignacion.activo),
            key=lambda asignacion: asignacion.idSucursal,
        )
        return asignaciones[0] if asignaciones else None


class UsuarioCreateSchema(Schema):
    idTipoDocumento = fields.Int(required=True, validate=validate.Range(min=1))
    numeroDocumento = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    primerNombre = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    segundoNombre = fields.Str(allow_none=True, load_default=None, validate=validate.Length(max=150))
    primerApellido = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    segundoApellido = fields.Str(allow_none=True, load_default=None, validate=validate.Length(max=150))
    correoElectronico = fields.Email(required=True, validate=validate.Length(max=150))
    telefono = fields.Str(allow_none=True, load_default=None, validate=validate.Length(max=20))
    idTipoUsuario = fields.Int(required=True, validate=validate.Range(min=1))
    idSucursal = fields.Int(allow_none=True, load_default=None, validate=validate.Range(min=1))
    password = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Length(min=12, max=255),
        error_messages={"required": "La contraseña temporal es obligatoria."},
    )


class UsuarioUpdateSchema(Schema):
    idTipoDocumento = fields.Int(validate=validate.Range(min=1))
    numeroDocumento = fields.Str(validate=validate.Length(min=1, max=20))
    primerNombre = fields.Str(validate=validate.Length(min=1, max=150))
    segundoNombre = fields.Str(allow_none=True, validate=validate.Length(max=150))
    primerApellido = fields.Str(validate=validate.Length(min=1, max=150))
    segundoApellido = fields.Str(allow_none=True, validate=validate.Length(max=150))
    correoElectronico = fields.Email(validate=validate.Length(max=150))
    telefono = fields.Str(allow_none=True, validate=validate.Length(max=20))
    idTipoUsuario = fields.Int(validate=validate.Range(min=1))
    idSucursal = fields.Int(allow_none=True, validate=validate.Range(min=1))
    activo = fields.Bool()


# Instancias listas para usar en las rutas, evitando crear un Schema()
# nuevo cada vez que se necesita validar o serializar.
login_schema = LoginSchema()
usuario_schema = UsuarioSchema()
usuario_create_schema = UsuarioCreateSchema()
usuario_update_schema = UsuarioUpdateSchema()