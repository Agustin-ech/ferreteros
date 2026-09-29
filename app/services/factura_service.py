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
    return f"FV-{venta.sucursal_id:02d}-{venta.id:08d}"


def crear_factura(venta):
    """Crea la factura de una venta. NO hace commit.

    Debe llamarse después de que la venta exista en la sesión (con id).
    """
    if venta.id is None:
        db.session.flush()

    existente = Factura.query.filter_by(venta_id=venta.id).first()
    if existente is not None:
        raise FacturaDuplicadaError(f"La venta {venta.id} ya tiene la factura {existente.numero}.")

    factura = Factura(
        venta_id=venta.id,
        numero=generar_numero_factura(venta),
        fecha=venta.fecha,
        total=venta.total,
    )
    db.session.add(factura)
    db.session.flush()  # asigna factura.id y hace valer UNIQUE(numero) / UNIQUE(venta_id)
    return factura


# --------------------------------------------------------------------------- #
# Consulta
# --------------------------------------------------------------------------- #
def obtener_factura_por_venta(venta_id, usuario):
    """Devuelve el documento completo de la factura de una venta.

    `usuario` es un dict con al menos: id, rol, sucursal_id.
    Un usuario que no es administrador solo ve facturas de su sucursal (RFF-06).
    """
    factura = Factura.query.filter_by(venta_id=venta_id).first()
    if factura is None:
        raise FacturaNoEncontradaError(f"La venta {venta_id} no tiene factura.")

    venta = db.session.get(Venta, venta_id)
    if usuario["rol"] != "admin" and venta.sucursal_id != usuario["sucursal_id"]:
        raise FacturaAccesoDenegadoError("No tienes acceso a facturas de otra sucursal.")

    cliente = db.session.get(Cliente, venta.cliente_id)
    sucursal = db.session.get(Sucursal, venta.sucursal_id)

    filas = (
        db.session.query(DetalleVenta, Producto)
        .join(Producto, Producto.id == DetalleVenta.producto_id)
        .filter(DetalleVenta.venta_id == venta.id)
        .order_by(DetalleVenta.id)
        .all()
    )

    return {
        "factura": {
            "id": factura.id,
            "numero": factura.numero,
            "fecha": factura.fecha.isoformat(),
        },
        "sucursal": {
            "id": sucursal.id,
            "nombre": sucursal.nombre,
            "direccion": sucursal.direccion,
            "telefono": sucursal.telefono,
        },
        "cliente": {
            "id": cliente.id,
            "tipo": cliente.tipo,
            "nombre": cliente.nombre,
            "documento": cliente.documento,
        },
        "detalles": [
            {
                "producto_id": producto.id,
                "producto": producto.nombre,
                "cantidad": formato_cantidad(detalle.cantidad),
                "precio_unitario": formato_dinero(detalle.precio_unitario),
                "subtotal": formato_dinero(detalle.subtotal),
            }
            for detalle, producto in filas
        ],
        "medio_pago": venta.medio_pago,
        "subtotal": formato_dinero(venta.subtotal),
        "descuento": formato_dinero(venta.descuento),
        "total": formato_dinero(venta.total),
    }