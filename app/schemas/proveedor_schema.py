from decimal import Decimal

from marshmallow import Schema, fields, validate


MAXIMO_MONETARIO = Decimal("9999999999.99")


class DetallePedidoProveedorSchema(Schema):
    idProducto = fields.Int(required=True, validate=validate.Range(min=1))
    cantidadPedida = fields.Decimal(
        required=True,
        as_string=True,
        places=2,
        validate=validate.Range(min=0.01, max=MAXIMO_MONETARIO),
    )
    precioUnitario = fields.Decimal(
        required=True,
        as_string=True,
        places=2,
        validate=validate.Range(min=0.01, max=MAXIMO_MONETARIO),
    )


class CrearPedidoProveedorSchema(Schema):
    idProveedor = fields.Int(required=True, validate=validate.Range(min=1))
    idSucursal = fields.Int(required=True, validate=validate.Range(min=1))
    detalles = fields.List(
        fields.Nested(DetallePedidoProveedorSchema),
        required=True,
        validate=validate.Length(min=1),
    )


class ActualizarEstadoPedidoSchema(Schema):
    estado = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=20),
    )


crear_pedido_proveedor_schema = CrearPedidoProveedorSchema()
actualizar_estado_pedido_schema = ActualizarEstadoPedidoSchema()