from decimal import Decimal

from marshmallow import Schema, ValidationError, fields, validate, validates


CONCEPTOS_EGRESO = (
    "Arriendo",
    "Servicios",
    "Nómina",
    "Transporte",
    "Mantenimiento",
    "Compras",
    "Otro",
)


class EgresoInputSchema(Schema):
    idSucursal = fields.Int(required=True, validate=validate.Range(min=1))
    idMetodoPago = fields.Int(allow_none=True, load_default=None, validate=validate.Range(min=1))
    concepto = fields.Str(required=True, validate=validate.OneOf(CONCEPTOS_EGRESO))
    descripcion = fields.Str(required=True, validate=validate.Length(min=3, max=255))
    tercero = fields.Str(allow_none=True, load_default=None, validate=validate.Length(max=150))
    monto = fields.Decimal(as_string=False, required=True, validate=validate.Range(min=Decimal("0.01")))
    fecha = fields.Date(required=True)

    @validates("monto")
    def validar_monto(self, value, **kwargs):
        if not value.is_finite() or value != value.quantize(Decimal("0.01")):
            raise ValidationError("El monto debe ser positivo y tener máximo 2 decimales.")


egreso_input_schema = EgresoInputSchema()
