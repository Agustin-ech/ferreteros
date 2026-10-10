"""Servicio de facturación.

Reglas que implementa (RFF-01):
  * Exactamente 1 factura por venta (además de la restricción UNIQUE en BD).
  * Número de factura único y sin condiciones de carrera.
  * La factura se crea dentro de la MISMA transacción de la venta: este servicio
    nunca hace commit; quien lo llama (venta_service) decide commit/rollback.
"""
from decimal import Decimal

from app.extensions import db
from app.models import Cliente, DetalleVenta, Factura, Producto, Sucursal, Venta


# --------------------------------------------------------------------------- #
# Errores
# --------------------------------------------------------------------------- #
class FacturaError(Exception):
    status_code = 400


class FacturaNoEncontradaError(FacturaError):
    status_code = 404


class FacturaDuplicadaError(FacturaError):
    status_code = 409


class FacturaAccesoDenegadoError(FacturaError):
    status_code = 403


# --------------------------------------------------------------------------- #
# Utilidades de formato
# --------------------------------------------------------------------------- #
def formato_dinero(valor):
    """Devuelve el valor como texto con 2 decimales (evita perder precisión con float)."""
    return f"{Decimal(str(valor)):.2f}"


def formato_cantidad(valor):
    """Devuelve la cantidad sin ceros sobrantes: 5.000 -> '5', 2.500 -> '2.5'."""
    return format(Decimal(str(valor)).normalize(), "f")


# --------------------------------------------------------------------------- #
# Creación
# --------------------------------------------------------------------------- #
def generar_numero_factura(venta):
    """Número derivado de la sucursal y del id de la venta.

    Como el id de la venta es único, el número también lo es, y no hace falta
    un contador aparte (que sería una fuente de condiciones de carrera con
    varios vendedores simultáneos, ver RFF-04).
    Ejemplo: FV-01-00000042
    """
    return f"FV-{venta.idSucursal:02d}-{venta.idVenta:08d}"


def crear_factura(venta):
    """Crea la factura de una venta. NO hace commit.

    Debe llamarse después de que la venta exista en la sesión (con id).
    """
    if venta.idVenta is None:
        db.session.flush()

    existente = Factura.query.filter_by(idVenta=venta.idVenta).first()
    if existente is not None:
        raise FacturaDuplicadaError(
            f"La venta {venta.idVenta} ya tiene la factura {existente.numeroFactura}."
        )

    factura = Factura(
        idVenta=venta.idVenta,
        numeroFactura=generar_numero_factura(venta),
        fechaEmision=venta.fechaHora,
        valorTotal=venta.total,
    )
    db.session.add(factura)
    db.session.flush()  # Asigna factura.idFactura y valida las restricciones únicas.
    return factura


# --------------------------------------------------------------------------- #
# Consulta
# --------------------------------------------------------------------------- #
def obtener_factura_por_venta(venta_id, usuario):
    """Devuelve el documento completo de la factura de una venta.

    `usuario` es un dict con al menos: id, rol, sucursal_id.
    Un usuario que no es administrador solo ve facturas de su sucursal (RFF-06).
    """
    factura = Factura.query.filter_by(idVenta=venta_id).first()
    if factura is None:
        raise FacturaNoEncontradaError(f"La venta {venta_id} no tiene factura.")

    venta = db.session.get(Venta, venta_id)
    if usuario["rol"] != "admin" and venta.idSucursal != usuario["sucursal_id"]:
        raise FacturaAccesoDenegadoError("No tienes acceso a facturas de otra sucursal.")

    cliente = db.session.get(Cliente, venta.idCliente)
    sucursal = db.session.get(Sucursal, venta.idSucursal)

    filas = (
        db.session.query(DetalleVenta, Producto)
        .join(Producto, Producto.idProducto == DetalleVenta.idProducto)
        .filter(DetalleVenta.idVenta == venta.idVenta)
        .order_by(DetalleVenta.idDetalleVenta)
        .all()
    )

    return {
        "factura": {
            "id": factura.idFactura,
            "numero": factura.numeroFactura,
            "fecha": factura.fechaEmision.isoformat(),
        },
        "sucursal": {
            "id": sucursal.idSucursal,
            "nombre": sucursal.nombreSucursal,
            "direccion": sucursal.direccion,
            "telefono": sucursal.telefono,
        },
        "cliente": {
            "id": cliente.idCliente,
            "tipo_documento": cliente.tipo_documento.nombre,
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
            "documento": cliente.numeroDocumento,
        },
        "detalles": [
            {
                "producto_id": producto.idProducto,
                "producto": producto.nombre,
                "cantidad": formato_cantidad(detalle.cantidad),
                "precio_unitario": formato_dinero(detalle.precio_unitario),
                "subtotal": formato_dinero(detalle.subtotal),
            }
            for detalle, producto in filas
        ],
        "medio_pago": venta.metodo_pago.nombre,
        "subtotal": formato_dinero(venta.subtotal),
        "descuento": formato_dinero(venta.descuentoTotal),
        "total": formato_dinero(venta.total),
    }