from decimal import Decimal

from marshmallow import Schema, ValidationError, fields, validate, validates
from app.schemas.venta_schema import DetalleVentaInputSchema

class DomicilioInputSchema(Schema):
    idCliente = fields.Int(required=True, validate=validate.Range(min=1))
    idSucursal = fields.Int(required=True, validate=validate.Range(min=1))
    idTipoVenta = fields.Int(required=True, validate=validate.Range(min=1))
    direccionEntrega = fields.Str(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=200),
    )
    metodoPago = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    descuento = fields.Decimal(
        as_string=False,
        load_default=Decimal("0.00"),
        validate=validate.Range(min=Decimal("0.00")),
    )
    detalles = fields.List(
        fields.Nested(DetalleVentaInputSchema),
        required=True,
        validate=validate.Length(min=1, error="El domicilio debe incluir al menos un producto.")
    )

    @validates("descuento")
    def validar_descuento(self, value, **kwargs):
        if not value.is_finite() or value != value.quantize(Decimal("0.01")):
            raise ValidationError("El descuento debe ser positivo y tener máximo 2 decimales.")


class DomicilioOutputSchema(Schema):
    idEntrega = fields.Int(dump_only=True)
    idVenta = fields.Int()
    direccionEntrega = fields.Str()
    costoEnvio = fields.Float()
    fechaSolicitud = fields.DateTime()
    activo = fields.Bool()
    totalVenta = fields.Float(attribute="venta.total")
    fechaFactura = fields.DateTime(attribute="venta.factura.fechaEmision")

domicilio_input_schema = DomicilioInputSchema()
domicilio_output_schema = DomicilioOutputSchema()
domicilios_output_schema = DomicilioOutputSchema(many=True)