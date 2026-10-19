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


class FacturaDetalleOutputSchema(FacturaOutputSchema):
    fechaVenta = fields.Method("obtener_fecha_venta", dump_only=True)
    subtotal = fields.Method("obtener_subtotal", dump_only=True)
    descuento = fields.Method("obtener_descuento", dump_only=True)
    costoEnvio = fields.Method("obtener_costo_envio", dump_only=True)
    medioPago = fields.Method("obtener_medio_pago", dump_only=True)
    tipoVenta = fields.Method("obtener_tipo_venta", dump_only=True)
    cliente = fields.Method("obtener_cliente", dump_only=True)
    sucursal = fields.Method("obtener_sucursal", dump_only=True)
    vendedor = fields.Method("obtener_vendedor", dump_only=True)
    detalles = fields.Method("obtener_detalles", dump_only=True)

    def obtener_fecha_venta(self, factura):
        return factura.venta.fechaHora if factura.venta else None

    def obtener_subtotal(self, factura):
        return factura.venta.subtotal if factura.venta else None

    def obtener_descuento(self, factura):
        return factura.venta.descuentoTotal if factura.venta else None

    def obtener_costo_envio(self, factura):
        return factura.venta.costoEnvio if factura.venta else None

    def obtener_medio_pago(self, factura):
        venta = factura.venta
        return venta.metodo_pago.nombre if venta and venta.metodo_pago else None

    def obtener_tipo_venta(self, factura):
        venta = factura.venta
        return venta.tipo_venta.nombre if venta and venta.tipo_venta else None

    def obtener_cliente(self, factura):
        cliente = factura.venta.cliente if factura.venta else None
        if cliente is None:
            return None
        return {
            "idCliente": cliente.idCliente,
            "nombre": " ".join(
                parte
                for parte in (
                    cliente.primerNombre,
                    cliente.segundoNombre,
                    cliente.primerApellido,
                    cliente.segundoApellido,
                )
                if parte
            ),
            "tipoDocumento": cliente.tipo_documento.nombre if cliente.tipo_documento else None,
            "numeroDocumento": cliente.numeroDocumento,
            "direccion": cliente.direccion,
            "barrio": cliente.barrio,
            "telefono": cliente.telefono,
            "correoElectronico": cliente.correoElectronico,
        }

    def obtener_sucursal(self, factura):
        sucursal = factura.venta.sucursal if factura.venta else None
        if sucursal is None:
            return None
        return {
            "idSucursal": sucursal.idSucursal,
            "nombre": sucursal.nombreSucursal,
            "direccion": sucursal.direccion,
            "barrio": sucursal.barrio,
            "telefono": sucursal.telefono,
        }

    def obtener_vendedor(self, factura):
        vendedor = factura.venta.usuario if factura.venta else None
        if vendedor is None:
            return None
        return {
            "idUsuario": vendedor.idUsuario,
            "nombre": " ".join(
                parte
                for parte in (
                    vendedor.primerNombre,
                    vendedor.segundoNombre,
                    vendedor.primerApellido,
                    vendedor.segundoApellido,
                )
                if parte
            ),
        }

    def obtener_detalles(self, factura):
        venta = factura.venta
        if venta is None:
            return []
        return [
            {
                "idDetalleVenta": detalle.idDetalleVenta,
                "idProducto": detalle.idProducto,
                "codigoSKU": detalle.producto.codigoSKU if detalle.producto else None,
                "nombreProducto": detalle.producto.nombre if detalle.producto else None,
                "cantidad": detalle.cantidad,
                "precioUnitario": detalle.precio_unitario,
                "descuento": detalle.descuento,
                "subtotal": detalle.subtotal,
            }
            for detalle in venta.detalles
        ]


class VentaOutputSchema(Schema):
    idVenta = fields.Int(dump_only=True)
    activo = fields.Bool(dump_only=True)
    idCliente = fields.Int()
    nombreCliente = fields.Method("obtener_nombre_cliente", dump_only=True)
    clienteNombre = fields.Method("obtener_nombre_cliente", dump_only=True)
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
        cliente = venta.cliente
        if cliente is None:
            return None
        return " ".join(
            parte
            for parte in (
                cliente.primerNombre,
                cliente.segundoNombre,
                cliente.primerApellido,
                cliente.segundoApellido,
            )
            if parte
        )

venta_input_schema = VentaInputSchema()
venta_output_schema = VentaOutputSchema()
ventas_output_schema = VentaOutputSchema(many=True)
factura_output_schema = FacturaOutputSchema()
factura_detalle_output_schema = FacturaDetalleOutputSchema()