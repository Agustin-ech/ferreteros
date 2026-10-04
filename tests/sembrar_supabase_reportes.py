"""Inserta un lote de datos de reportes en la Supabase de pruebas configurada en .env."""

from __future__ import annotations

import argparse
import os
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from pathlib import Path
import sys

from dotenv import load_dotenv
from sqlalchemy import func
from sqlalchemy.engine import make_url

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Config
from app import create_app
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
from app.models.tipo_venta import TipoVenta
from app.models.usuario import Usuario
from app.models.venta import Venta


CANTIDAD_VENTAS = 777
CANTIDAD_FACTURAS = 684
CANTIDAD_DEVOLUCIONES = 30
ETIQUETA_LOTE = "PRUEBA-REPORTES-20261003-"
SUCURSALES_OBJETIVO = {"buenavista", "lachinita"}


def _compactar(texto: str) -> str:
    return "".join(caracter for caracter in texto.casefold() if caracter.isalnum())


def _crear_app():
    load_dotenv()
    uri = os.getenv("SQLALCHEMY_DATABASE_URI")
    if not uri:
        raise RuntimeError("Falta SQLALCHEMY_DATABASE_URI en .env.")

    url = make_url(uri)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("El sembrador remoto solo admite PostgreSQL.")

    config = type(
        "SupabasePruebasConfig",
        (Config,),
        {
            "SQLALCHEMY_DATABASE_URI": url.set(drivername="postgresql+psycopg2"),
            "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY") or "clave-local-para-sembrado-de-pruebas",
        },
    )
    return create_app(config)


def sembrar() -> dict[str, int]:
    app = _crear_app()
    with app.app_context():
        try:
            sucursales = Sucursal.query.filter(Sucursal.activa.is_(True)).all()
            por_nombre = {_compactar(s.nombreSucursal): s for s in sucursales}
            if not SUCURSALES_OBJETIVO.issubset(por_nombre):
                raise RuntimeError(
                    "No se encontraron las sucursales activas Buenavista y La Chinita; no se insertó nada."
                )
            sucursales_objetivo = [por_nombre[nombre] for nombre in ("buenavista", "lachinita")]
            ids_sucursales = [s.idSucursal for s in sucursales_objetivo]

            lote_existente = Factura.query.filter(
                Factura.numeroFactura.like(f"{ETIQUETA_LOTE}%")
            ).first()
            if lote_existente:
                raise RuntimeError(
                    f"Ya existe el lote {ETIQUETA_LOTE}; no se insertó una segunda copia."
                )

            administrador = (
                Usuario.query.filter_by(idTipoUsuario=1, activo=True)
                .order_by(Usuario.idUsuario)
                .first()
            )
            productos = Producto.query.filter_by(activo=True).order_by(Producto.idProducto).all()
            tipos_venta = TipoVenta.query.filter_by(activo=True).order_by(TipoVenta.idTipoVenta).all()
            metodos_pago = MetodoPago.query.filter_by(activo=True).order_by(MetodoPago.idMetodoPago).all()
            clientes_activos = Cliente.query.filter_by(activo=True).order_by(Cliente.idCliente).all()

            if administrador is None or not productos or len(tipos_venta) < 2 or not metodos_pago:
                raise RuntimeError(
                    "Faltan usuario administrador, productos, dos tipos de venta o método de pago activo."
                )

            tipos_devolucion = []
            for nombre in ("Prueba reportes - Garantía", "Prueba reportes - Rechazo"):
                tipo = TipoDevolucion.query.filter(
                    func.lower(TipoDevolucion.nombre) == nombre.casefold()
                ).first()
                if tipo is None:
                    tipo = TipoDevolucion(nombre=nombre, activo=True)
                    db.session.add(tipo)
                tipos_devolucion.append(tipo)
            db.session.flush()

            ventas: list[Venta] = []
            detalles: list[DetalleVenta] = []
            fecha_inicio = date(2026, 1, 1)
            for indice in range(CANTIDAD_VENTAS):
                producto = productos[indice % len(productos)]
                cantidad = Decimal(indice % 3 + 1)
                subtotal = (Decimal(producto.precio) * cantidad).quantize(Decimal("0.01"))
                descuento = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
                total = subtotal - descuento
                fecha = fecha_inicio + timedelta(days=indice % 273)
                fecha_hora = datetime.combine(fecha, time(12), tzinfo=timezone.utc)
                sucursal = sucursales_objetivo[indice % len(sucursales_objetivo)]

                venta = Venta(
                    idSucursal=sucursal.idSucursal,
                    idUsuario=administrador.idUsuario,
                    idCliente=clientes_activos[indice % len(clientes_activos)].idCliente
                    if clientes_activos else None,
                    idTipoVenta=tipos_venta[indice % 2].idTipoVenta,
                    idMetodoPago=metodos_pago[indice % len(metodos_pago)].idMetodoPago,
                    fechaHora=fecha_hora,
                    subtotal=subtotal,
                    descuentoTotal=descuento,
                    total=total,
                    activo=True,
                )
                ventas.append(venta)

            db.session.add_all(ventas)
            db.session.flush()

            for indice, venta in enumerate(ventas):
                producto = productos[indice % len(productos)]
                cantidad = Decimal(indice % 3 + 1)
                total_linea = venta.total
                detalles.append(DetalleVenta(
                    idVenta=venta.idVenta,
                    idProducto=producto.idProducto,
                    cantidad=cantidad,
                    precio_unitario=(total_linea / cantidad).quantize(Decimal("0.01")),
                    descuento=venta.descuentoTotal,
                    subtotal=total_linea,
                    activo=True,
                ))
            db.session.add_all(detalles)
            db.session.flush()

            facturas: list[Factura] = []
            for indice, venta in enumerate(ventas[:CANTIDAD_FACTURAS], start=1):
                facturas.append(Factura(
                    idVenta=venta.idVenta,
                    numeroFactura=f"{ETIQUETA_LOTE}{indice:04d}",
                    fechaEmision=venta.fechaHora,
                    valorTotal=venta.total,
                    activo=True,
                ))
            db.session.add_all(facturas)
            db.session.flush()

            devoluciones = []
            for indice, factura in enumerate(facturas[:CANTIDAD_DEVOLUCIONES]):
                aprobada = indice < 20
                porcentaje = Decimal("0.10") if aprobada else Decimal("0.05")
                venta = ventas[indice]
                devoluciones.append(Devolucion(
                    idFactura=factura.idFactura,
                    idUsuario=administrador.idUsuario,
                    idTipoDevolucion=tipos_devolucion[0 if aprobada else 1].idTipoDevolucion,
                    motivo="Registro de prueba para reportes",
                    montoTotal=(venta.total * porcentaje).quantize(Decimal("0.01")),
                    aprobada=aprobada,
                    fecha=venta.fechaHora,
                ))
            db.session.add_all(devoluciones)

            productos_ids = [producto.idProducto for producto in productos]
            inventario_existente = {
                (fila.idSucursal, fila.idProducto)
                for fila in Inventario.query.filter(
                    Inventario.idSucursal.in_(ids_sucursales),
                    Inventario.idProducto.in_(productos_ids),
                ).all()
            }
            inventarios = [
                Inventario(
                    idSucursal=sucursal.idSucursal,
                    idProducto=producto.idProducto,
                    CantidadDisponible=Decimal(50 + sucursal.idSucursal + indice),
                    activo=True,
                )
                for sucursal in sucursales_objetivo
                for indice, producto in enumerate(productos, start=1)
                if (sucursal.idSucursal, producto.idProducto) not in inventario_existente
            ]
            db.session.add_all(inventarios)
            db.session.commit()

            return {
                "ventas": len(ventas),
                "detalles": len(detalles),
                "facturas": len(facturas),
                "devoluciones": len(devoluciones),
                "inventarios_agregados": len(inventarios),
                "sucursal_buenavista_id": sucursales_objetivo[0].idSucursal,
                "sucursal_lachinita_id": sucursales_objetivo[1].idSucursal,
            }
        except Exception:
            db.session.rollback()
            raise
        finally:
            db.session.remove()
            db.engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--confirmar-supabase-pruebas",
        action="store_true",
        help="Confirma que SQLALCHEMY_DATABASE_URI apunta a la Supabase de pruebas.",
    )
    argumentos = parser.parse_args()
    if not argumentos.confirmar_supabase_pruebas:
        parser.error("Revisa .env y agrega --confirmar-supabase-pruebas para insertar el lote.")

    resultados = sembrar()
    print("Lote insertado correctamente:")
    for clave, cantidad in resultados.items():
        print(f"  {clave}: {cantidad}")


if __name__ == "__main__":
    main()
