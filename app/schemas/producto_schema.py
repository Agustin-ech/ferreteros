from decimal import ROUND_HALF_UP, Decimal

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
    # Sin load_default: un PUT parcial que no lo envía no debe borrar el descuento.
    descuentoPorcentaje = fields.Float(
        validate=validate.Range(min=0, max=100, error="El descuento debe estar entre 0 y 100 %."),
    )
    precioConDescuento = fields.Method("precio_con_descuento", dump_only=True)
    activo = fields.Bool()
    imagenUrl = fields.Str(dump_only=True, allow_none=True)
    fecha_creacion = fields.DateTime(dump_only=True)

    def precio_con_descuento(self, producto):
        precio = Decimal(str(producto.precio))
        porcentaje = Decimal(str(producto.descuentoPorcentaje or 0))
        return float((precio * (1 - porcentaje / 100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

# Instancias para un solo producto o una lista de ellos
producto_schema = ProductoSchema()
productos_schema = ProductoSchema(many=True)