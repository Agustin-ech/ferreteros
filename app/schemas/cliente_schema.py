from marshmallow import Schema, fields, validate


class ClienteSchema(Schema):
    idCliente = fields.Int(dump_only=True)
    idTipoDocumento = fields.Int(required=True, validate=validate.Range(min=1))
    numeroDocumento = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    primerNombre = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    segundoNombre = fields.Str(allow_none=True, validate=validate.Length(max=150))
    primerApellido = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    segundoApellido = fields.Str(allow_none=True, validate=validate.Length(max=150))
    direccion = fields.Str(allow_none=True, validate=validate.Length(max=50))
    barrio = fields.Str(allow_none=True, validate=validate.Length(max=50))
    telefono = fields.Str(allow_none=True, validate=validate.Length(max=20))
    correoElectronico = fields.Email(allow_none=True, validate=validate.Length(max=100))
    activo = fields.Bool(dump_only=True)
    fecha_creacion = fields.DateTime(dump_only=True)
