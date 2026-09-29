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
    primerNombre = fields.Str(dump_only=True)
    segundoNombre = fields.Str(dump_only=True, allow_none=True)
    primerApellido = fields.Str(dump_only=True)
    segundoApellido = fields.Str(dump_only=True, allow_none=True)
    correoElectronico = fields.Email(dump_only=True)
    telefono = fields.Str(dump_only=True, allow_none=True)
    idTipoUsuario = fields.Int(dump_only=True)
    activo = fields.Bool(dump_only=True)


# Instancias listas para usar en las rutas, evitando crear un Schema()
# nuevo cada vez que se necesita validar o serializar.
login_schema = LoginSchema()
usuario_schema = UsuarioSchema()