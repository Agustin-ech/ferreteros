from marshmallow import Schema, fields, validate


class SucursalSchema(Schema):
    idSucursal = fields.Int(dump_only=True)
    nombreSucursal = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100),
    )
    direccion = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=255),
    )
    barrio = fields.Str(allow_none=True, validate=validate.Length(max=50))
    telefono = fields.Str(allow_none=True, validate=validate.Length(max=20))
    activa = fields.Bool(load_default=True)


sucursal_schema = SucursalSchema()
sucursales_schema = SucursalSchema(many=True)
