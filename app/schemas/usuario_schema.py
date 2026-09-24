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
    nombre = fields.Str(dump_only=True)
    rol = fields.Str(dump_only=True)
    idSucursal = fields.Int(dump_only=True, allow_none=True)
    activo = fields.Bool(dump_only=True)


# Instancias listas para usar en las rutas, evitando crear un Schema()
# nuevo cada vez que se necesita validar o serializar.
login_schema = LoginSchema()
usuario_schema = UsuarioSchema()