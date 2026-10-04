"""Datos deterministas para probar los reportes sin conectarse a la BD real."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from app.extensions import db
from app.models.cliente import Cliente
from app.models.devoluciones import Devolucion
from app.models.detalle_venta import DetalleVenta
from app.models.factura import Factura
from app.models.inventario import Inventario
from app.models.metodo_pago import MetodoPago
from app.models.producto import Producto
from app.models.sucursal import Sucursal
from app.models.tipo_devolucion import TipoDevolucion
from app.models.tipo_documento import TipoDeDocumento
from app.models.tipo_producto import TipoProducto
from app.models.tipo_usuario import TipoUsuario
from app.models.tipo_venta import TipoVenta
from app.models.unidad_medida import UnidadMedida
from app.models.usuario import Usuario
from app.models.venta import Venta


def sembrar() -> None:
    """Inserta el escenario determinista que consume ``tests/test_reportes.py``."""
    db.session.add_all([
        TipoDeDocumento(
            idTipoDocumento=1,
            Acronimo="CC",
            nombre="Cédula de ciudadanía",
        ),
        TipoUsuario(idTipoUsuario=1, nombre="administrador", descripcion="Pruebas"),
        TipoProducto(idTipoProducto=1, nombre="Ferretería", descripcion="Productos de prueba"),
        UnidadMedida(
            idUnidadMedida=1,
            nombre="Unidad",
            abreviatura="und",
            permite_decimales=False,
        ),
        TipoVenta(idTipoVenta=1, nombre="Minorista"),
        TipoVenta(idTipoVenta=2, nombre="Mayorista"),
        MetodoPago(idMetodoPago=1, nombre="Efectivo"),
        TipoDevolucion(idTipoDevolucion=1, nombre="Garantía"),
        TipoDevolucion(idTipoDevolucion=2, nombre="Error de despacho"),
        Sucursal(idSucursal=1, nombreSucursal="La Chinita", direccion="Calle 1 # 2-3"),
        Sucursal(idSucursal=2, nombreSucursal="Buena Vista", direccion="Carrera 4 # 5-6"),
        Usuario(
            idUsuario=1,
            idTipoDocumento=1,
            numeroDocumento="900000001",
            primerNombre="Usuario",
            primerApellido="Pruebas",
            correoElectronico="reportes@test.local",
            idTipoUsuario=1,
            password_hash="no-se-usa-en-pruebas",
        ),
        Cliente(
            idCliente=1,
            idTipoDocumento=1,
            numeroDocumento="100000001",
            primerNombre="Cliente",
            primerApellido="Prueba",
        ),
        Producto(
            idProducto=1,
            idTipoProducto=1,
            idUnidadMedida=1,
            codigoSKU="PRD-001",
            nombre="Tornillo galvanizado",
            descripcion="Tornillo de prueba",
            precio=Decimal("1200.00"),
            costoUnitario=Decimal("700.00"),
            stockMinimo=5,
        ),
        Producto(
            idProducto=2,
            idTipoProducto=1,
            idUnidadMedida=1,
            codigoSKU="PRD-002",
            nombre="Martillo de acero",
            descripcion="Martillo de prueba",
            precio=Decimal("18000.00"),
            costoUnitario=Decimal("11000.00"),
            stockMinimo=3,
        ),
        Producto(
            idProducto=3,
            idTipoProducto=1,
            idUnidadMedida=1,
            codigoSKU="PRD-003",
            nombre="Brocha estándar",
            descripcion="Brocha de prueba",
            precio=Decimal("6500.00"),
            costoUnitario=Decimal("3500.00"),
            stockMinimo=4,
        ),
    ])
    db.session.flush()

    ventas: list[Venta] = []
    detalles: list[DetalleVenta] = []
    facturas: list[Factura] = []
    devoluciones: list[Devolucion] = []
    inicio = date(2026, 1, 1)

    for indice in range(777):
        fecha = inicio + timedelta(days=indice % 273)
        fecha_hora = datetime.combine(fecha, time(12), tzinfo=timezone.utc)
        sucursal_id = indice % 2 + 1
        producto_id = indice % 3 + 1
        subtotal = Decimal(100_000 + (indice % 10) * 10_000)
        descuento = Decimal("5000.00")
        total = subtotal - descuento
        cantidad = Decimal(indice % 4 + 1)
        venta_id = indice + 1

        ventas.append(Venta(
            idVenta=venta_id,
            idSucursal=sucursal_id,
            idUsuario=1,
            idCliente=1,
            idTipoVenta=2 if indice % 4 == 0 else 1,
            idMetodoPago=1,
            fechaHora=fecha_hora,
            subtotal=subtotal,
            descuentoTotal=descuento,
            total=total,
            activo=True,
        ))
        detalles.append(DetalleVenta(
            idDetalleVenta=venta_id,
            idVenta=venta_id,
            idProducto=producto_id,
            cantidad=cantidad,
            precio_unitario=total / cantidad,
            descuento=descuento,
            subtotal=total,
            activo=True,
        ))

        if indice < 684:
            facturas.append(Factura(
                idFactura=venta_id,
                idVenta=venta_id,
                numeroFactura=f"FAC-{venta_id:06d}",
                fechaEmision=fecha_hora,
                valorTotal=total,
                activo=True,
            ))

        if indice < 30:
            monto = (total * Decimal("0.10")).quantize(Decimal("0.01"))
            aprobada = indice < 20
            if not aprobada:
                monto = (total * Decimal("0.05")).quantize(Decimal("0.01"))
            devoluciones.append(Devolucion(
                idDevolucion=indice + 1,
                idFactura=venta_id,
                idUsuario=1,
                idTipoDevolucion=1 if aprobada else 2,
                motivo="Devolución de prueba",
                montoTotal=monto,
                aprobada=aprobada,
                fecha=fecha_hora,
            ))

    inventarios = [
        Inventario(
            idInventario=(sucursal_id - 1) * 3 + producto_id,
            idSucursal=sucursal_id,
            idProducto=producto_id,
            CantidadDisponible=Decimal(20 + sucursal_id * 10 + producto_id),
            activo=True,
        )
        for sucursal_id in range(1, 3)
        for producto_id in range(1, 4)
    ]

    db.session.add_all(ventas + detalles + facturas + devoluciones + inventarios)
    db.session.commit()