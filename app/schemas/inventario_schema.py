from marshmallow import Schema, fields, validate

class InventarioSchema(Schema):
    idInventario = fields.Int(dump_only=True)
    idSucursal = fields.Int(required=True)
    idProducto = fields.Int(required=True)
    nombreProducto = fields.Method("obtener_nombre_producto", dump_only=True)
    cantidadDisponible = fields.Float(
        attribute="CantidadDisponible",
        required=True,
        validate=validate.Range(min=0),
    )
    activo = fields.Bool(dump_only=True)
    fecha_creacion = fields.DateTime(dump_only=True)

    def obtener_nombre_producto(self, inventario):
        return inventario.producto.nombre if inventario.producto else None


class AjusteInventarioSchema(Schema):
    idProducto = fields.Int(required=True, validate=validate.Range(min=1))
    idSucursal = fields.Int(required=True, validate=validate.Range(min=1))
    cantidad = fields.Decimal(
        as_string=False,
        places=2,
        required=True,
        validate=validate.Range(min=0),
    )
    operacion = fields.Str(
        required=True,
        validate=validate.OneOf(["suma", "resta"]),
    )
    motivo = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=255),
    )

inventario_schema = InventarioSchema()
inventarios_schema = InventarioSchema(many=True)
ajuste_inventario_schema = AjusteInventarioSchema()