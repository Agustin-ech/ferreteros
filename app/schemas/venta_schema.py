from decimal import Decimal

from marshmallow import Schema, ValidationError, fields, validate, validates


class DetalleVentaInputSchema(Schema):
    idProducto = fields.Int(required=True, validate=validate.Range(min=1))
    cantidad = fields.Decimal(as_string=False, required=True)

    @validates("cantidad")
    def validar_cantidad(self, value, **kwargs):
        if (
            not value.is_finite()
            or value <= 0
            or value != value.quantize(Decimal("0.01"))
        ):
            raise ValidationError("La cantidad debe ser positiva y tener máximo 2 decimales.")


class VentaInputSchema(Schema):
    idCliente = fields.Int(load_default=None, allow_none=True, validate=validate.Range(min=1))
    idSucursal = fields.Int(required=True, validate=validate.Range(min=1))
    idTipoVenta = fields.Int(required=True, validate=validate.Range(min=1))
    metodoPago = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    descuento = fields.Decimal(
        as_string=False,
        load_default=Decimal("0.00"),
        validate=validate.Range(min=0),
    )
    detalles = fields.List(
        fields.Nested(DetalleVentaInputSchema),
        required=True,
        validate=validate.Length(min=1),
    )

    @validates("descuento")
    def validar_descuento(self, value, **kwargs):
        if not value.is_finite() or value != value.quantize(Decimal("0.01")):
            raise ValidationError("El descuento debe tener máximo 2 decimales.")


class DetalleVentaOutputSchema(Schema):
    idDetalleVenta = fields.Int(dump_only=True)
    idProducto = fields.Int()
    nombreProducto = fields.Method("obtener_nombre_producto", dump_only=True)
    cantidad = fields.Float()
    precioUnitario = fields.Float(attribute="precio_unitario")
    descuento = fields.Float()
    subtotal = fields.Float()

    def obtener_nombre_producto(self, detalle):
        return detalle.producto.nombre if detalle.producto else None


class FacturaOutputSchema(Schema):
    idFactura = fields.Int(dump_only=True)
    numeroFactura = fields.Str(dump_only=True)
    fechaEmision = fields.DateTime(dump_only=True)
    total = fields.Float(attribute="valorTotal")
    activo = fields.Bool(dump_only=True)


class VentaOutputSchema(Schema):
    idVenta = fields.Int(dump_only=True)
    activo = fields.Bool(dump_only=True)
    idCliente = fields.Int()
    nombreCliente = fields.Method("obtener_nombre_cliente", dump_only=True)
    idSucursal = fields.Int()
    idUsuario = fields.Int()
    nombreVendedor = fields.Method("obtener_nombre_vendedor", dump_only=True)
    idTipoVenta = fields.Int()
    idMetodoPago = fields.Int()
    metodoPago = fields.Method("obtener_nombre_metodo_pago", dump_only=True)
    fechaHora = fields.DateTime()
    subtotal = fields.Float()
    descuento = fields.Float(attribute="descuentoTotal")
    costoEnvio = fields.Float()
    total = fields.Float()
    detalles = fields.List(fields.Nested(DetalleVentaOutputSchema))
    factura = fields.Nested(FacturaOutputSchema, dump_only=True)

    def obtener_nombre_metodo_pago(self, venta):
        return venta.metodo_pago.nombre if venta.metodo_pago else None

    def obtener_nombre_vendedor(self, venta):
        if not venta.usuario:
            return f"Usuario #{venta.idUsuario}"
        nombres = (
            venta.usuario.primerNombre,
            venta.usuario.segundoNombre,
            venta.usuario.primerApellido,
            venta.usuario.segundoApellido,
        )
        return " ".join(nombre for nombre in nombres if nombre)

    def obtener_nombre_cliente(self, venta):
        if not venta.cliente:
            return "Cliente general"
        return " ".join(
            nombre
            for nombre in (
                venta.cliente.primerNombre,
                venta.cliente.segundoNombre,
                venta.cliente.primerApellido,
                venta.cliente.segundoApellido,
            )
            if nombre
        )

venta_input_schema = VentaInputSchema()
venta_output_schema = VentaOutputSchema()
ventas_output_schema = VentaOutputSchema(many=True)
factura_output_schema = FacturaOutputSchema()