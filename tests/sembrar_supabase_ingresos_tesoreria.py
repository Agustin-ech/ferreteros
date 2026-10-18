"""Inserta ventas facturadas de prueba para generar ingresos de tesorería."""

from __future__ import annotations

import argparse
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
import os
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.config import Config
from app.extensions import db
from app.models.detalle_venta import DetalleVenta
from app.models.factura import Factura
from app.models.metodo_pago import MetodoPago
from app.models.producto import Producto
from app.models.sucursal import Sucursal
from app.models.tipo_venta import TipoVenta
from app.models.usuario import Usuario
from app.models.venta import Venta


CANTIDAD_INGRESOS = 60
CANTIDAD_INGRESOS_HOY = 10
ETIQUETA_LOTE = "PRUEBA-INGRESO-TESORERIA-V1-"
ETIQUETA_LOTE_HOY = "PRUEBA-INGRESO-TESORERIA-HOY-V1-"
SUCURSALES_OBJETIVO = {"buenavista", "lachinita"}
ZONA_TESORERIA = ZoneInfo("America/Bogota")


def _compactar(texto: str) -> str:
    return "".join(caracter for caracter in texto.casefold() if caracter.isalnum())


def _crear_app():
    load_dotenv()
    uri = os.getenv("SQLALCHEMY_DATABASE_URI")
    if not uri:
        raise RuntimeError("Falta SQLALCHEMY_DATABASE_URI en .env.")

    url = make_url(uri)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("El sembrador de ingresos solo admite PostgreSQL.")

    config = type(
        "SupabasePruebasIngresosConfig",
        (Config,),
        {
            "SQLALCHEMY_DATABASE_URI": url.set(drivername="postgresql+psycopg2"),
            "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY") or "clave-local-para-sembrado-de-pruebas",
        },
    )
    return create_app(config)


def sembrar(*, solo_hoy: bool = False) -> dict[str, int | str]:
    app = _crear_app()
    with app.app_context():
        try:
            sucursales_por_nombre = {
                _compactar(sucursal.nombreSucursal): sucursal
                for sucursal in Sucursal.query.filter(Sucursal.activa.is_(True)).all()
            }
            if not SUCURSALES_OBJETIVO.issubset(sucursales_por_nombre):
                raise RuntimeError(
                    "No se encontraron las sucursales activas Buenavista y La Chinita; "
                    "no se insertó nada."
                )
            sucursales = [
                sucursales_por_nombre[nombre]
                for nombre in ("buenavista", "lachinita")
            ]

            etiqueta_lote = ETIQUETA_LOTE_HOY if solo_hoy else ETIQUETA_LOTE
            if Factura.query.filter(Factura.numeroFactura.like(f"{etiqueta_lote}%")).first():
                raise RuntimeError(
                    f"Ya existe el lote {etiqueta_lote}; no se insertó una segunda copia."
                )

            administrador = (
                Usuario.query.filter_by(idTipoUsuario=1, activo=True)
                .order_by(Usuario.idUsuario)
                .first()
            )
            productos = Producto.query.filter_by(activo=True).order_by(Producto.idProducto).all()
            tipos_venta = TipoVenta.query.filter_by(activo=True).order_by(TipoVenta.idTipoVenta).all()
            metodos_pago = MetodoPago.query.filter_by(activo=True).order_by(MetodoPago.idMetodoPago).all()
            if administrador is None or not productos or not tipos_venta or not metodos_pago:
                raise RuntimeError(
                    "Faltan un administrador, productos, tipos de venta o métodos de pago activos."
                )

            hoy = datetime.now(timezone.utc).astimezone(ZONA_TESORERIA).date()
            ventas: list[Venta] = []
            cantidad_ingresos = CANTIDAD_INGRESOS_HOY if solo_hoy else CANTIDAD_INGRESOS
            for indice in range(cantidad_ingresos):
                producto = productos[indice % len(productos)]
                cantidad = Decimal(indice % 3 + 1)
                subtotal = (Decimal(producto.precio) * cantidad).quantize(Decimal("0.01"))
                fecha = hoy if solo_hoy else hoy - timedelta(days=indice % 45)
                fecha_utc = datetime.combine(
                    fecha,
                    time(12),
                    ZONA_TESORERIA,
                ).astimezone(timezone.utc)
                ventas.append(Venta(
                    idSucursal=sucursales[indice % len(sucursales)].idSucursal,
                    idUsuario=administrador.idUsuario,
                    idCliente=None,
                    idTipoVenta=tipos_venta[indice % len(tipos_venta)].idTipoVenta,
                    idMetodoPago=metodos_pago[indice % len(metodos_pago)].idMetodoPago,
                    fechaHora=fecha_utc,
                    subtotal=subtotal,
                    descuentoTotal=Decimal("0.00"),
                    costoEnvio=Decimal("0.00"),
                    total=subtotal,
                    activo=True,
                ))

            db.session.add_all(ventas)
            db.session.flush()

            detalles = []
            facturas = []
            for indice, venta in enumerate(ventas):
                producto = productos[indice % len(productos)]
                cantidad = Decimal(indice % 3 + 1)
                detalles.append(DetalleVenta(
                    idVenta=venta.idVenta,
                    idProducto=producto.idProducto,
                    cantidad=cantidad,
                    precio_unitario=Decimal(producto.precio),
                    descuento=Decimal("0.00"),
                    subtotal=venta.total,
                    activo=True,
                ))
                facturas.append(Factura(
                    idVenta=venta.idVenta,
                    numeroFactura=f"{etiqueta_lote}{indice + 1:03d}",
                    fechaEmision=venta.fechaHora,
                    valorTotal=venta.total,
                    activo=True,
                ))
            db.session.add_all(detalles + facturas)
            db.session.commit()

            return {
                "ingresos": len(ventas),
                "facturas": len(facturas),
                "desde": (hoy if solo_hoy else hoy - timedelta(days=44)).isoformat(),
                "hasta": hoy.isoformat(),
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
    parser.add_argument(
        "--solo-hoy",
        action="store_true",
        help=f"Inserta {CANTIDAD_INGRESOS_HOY} ventas y facturas con fecha de hoy.",
    )
    argumentos = parser.parse_args()
    if not argumentos.confirmar_supabase_pruebas:
        parser.error("Revisa .env y agrega --confirmar-supabase-pruebas para insertar el lote.")

    resultados = sembrar(solo_hoy=argumentos.solo_hoy)
    print("Ingresos de hoy con facturas insertados correctamente:" if argumentos.solo_hoy else
          "Ingresos con facturas insertados correctamente:")
    for clave, valor in resultados.items():
        print(f"  {clave}: {valor}")


if __name__ == "__main__":
    main()
