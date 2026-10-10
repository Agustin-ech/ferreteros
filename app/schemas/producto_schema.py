from marshmallow import Schema, fields, validate

class ProductoSchema(Schema):
    idProducto = fields.Int(dump_only=True)
    idTipoProducto = fields.Int(required=True, validate=validate.Range(min=1))
    idUnidadMedida = fields.Int(required=True, validate=validate.Range(min=1))
    codigoSKU = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    nombre = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    descripcion = fields.Str(allow_none=True, validate=validate.Length(max=255))
    precio = fields.Float(
        required=True,
        validate=validate.Range(min=0.01),
    )
    costoUnitario = fields.Float(
        required=True,
        validate=validate.Range(min=0.01),
    )
    stockMinimo = fields.Int(load_default=5, validate=validate.Range(min=0))
    activo = fields.Bool(dump_only=True)
    fecha_creacion = fields.DateTime(dump_only=True)

# Instancias para un solo producto o una lista de ellos
producto_schema = ProductoSchema()
productos_schema = ProductoSchema(many=True)