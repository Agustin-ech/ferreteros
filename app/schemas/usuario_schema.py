from marshmallow import Schema, fields, validate, validates, ValidationError

class LoginSchema(Schema):

    nombre = fields.Str(
        required=True,
        allow_none=False,
        validate=validate.Length(
            min=1,
            max=150,
            error="El nombre de usuario debe tener entre 1 y 150 caracteres.",
        ),
        error_messages={
            "required": "El campo 'nombre' es obligatorio.",
            "null": "El campo 'nombre' no puede ser nulo.",
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

    @validates("nombre")
    def validar_nombre_no_vacio(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("El campo 'nombre' no puede estar vacío.")

    @validates("password")
    def validar_password_no_vacio(self, value, **kwargs):
        if not value.strip():
            raise ValidationError("El campo 'password' no puede estar vacío.")


class UsuarioSchema(Schema):
    idUsuario = fields.Int(dump_only=True)
    nombre = fields.Method("nombre_completo", dump_only=True)
    rol = fields.Method("rol_nombre", dump_only=True)
    idSucursal = fields.Method("sucursal_id", dump_only=True)
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
        rol = usuario.tipo_usuario.nombre.strip().lower()
        return "admin" if rol == "administrador" else rol

    def sucursal_id(self, usuario):
        asignaciones = sorted(
            (asignacion for asignacion in usuario.sucursales if asignacion.activo),
            key=lambda asignacion: asignacion.idSucursal,
        )
        return asignaciones[0].idSucursal if asignaciones else None


# Instancias listas para usar en las rutas, evitando crear un Schema()
# nuevo cada vez que se necesita validar o serializar.
login_schema = LoginSchema()
usuario_schema = UsuarioSchema()