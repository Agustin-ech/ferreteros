from decimal import Decimal

from marshmallow import Schema, ValidationError, fields, validate, validates

class DetalleDevolucionInputSchema(Schema):
    idDetalleVenta = fields.Int(required=True, validate=validate.Range(min=1))
    cantidadDevuelta = fields.Decimal(
        as_string=False,
        required=True,
        validate=validate.Range(min=Decimal("0.001")),
    )
    productoApto = fields.Bool(required=True)

    @validates("cantidadDevuelta")
    def validar_cantidad(self, value, **kwargs):
        if not value.is_finite() or value != value.quantize(Decimal("0.01")):
            raise ValidationError("La cantidad devuelta debe ser positiva y tener máximo 2 decimales.")

class DevolucionInputSchema(Schema):
    idFactura = fields.Int(required=True, validate=validate.Range(min=1))
    idTipoDevolucion = fields.Int(required=True, validate=validate.Range(min=1))
    motivo = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=255, error="El motivo debe contener entre 3 y 255 caracteres."),
    )
    detalles = fields.List(
        fields.Nested(DetalleDevolucionInputSchema),
        required=True,
        validate=validate.Length(min=1, error="Debe incluir al menos un producto a devolver."),
    )

    @validates("detalles")
    def validar_detalles_sin_repetidos(self, value, **kwargs):
        ids_detalle = [detalle["idDetalleVenta"] for detalle in value]
        if len(ids_detalle) != len(set(ids_detalle)):
            raise ValidationError("No se puede repetir un detalle de venta en la misma devolución.")

# --- Esquemas de Salida (Response) ---

class DetalleDevolucionOutputSchema(Schema):
    idDetalleDevolucion = fields.Int(dump_only=True)
    idDetalleVenta = fields.Int()
    idProducto = fields.Int()
    cantidadDevuelta = fields.Float()
    montoDevuelto = fields.Float()
    productoApto = fields.Bool()

class DevolucionOutputSchema(Schema):
    idDevolucion = fields.Int(dump_only=True)
    idFactura = fields.Int()
    idUsuario = fields.Int()
    idTipoDevolucion = fields.Int()
    motivo = fields.Str()
    montoTotal = fields.Float()
    aprobada = fields.Bool()
    fechaDevolucion = fields.DateTime(attribute="fecha", dump_only=True)
    detalles = fields.List(fields.Nested(DetalleDevolucionOutputSchema))

devolucion_input_schema = DevolucionInputSchema()
devolucion_output_schema = DevolucionOutputSchema()
devoluciones_output_schema = DevolucionOutputSchema(many=True)