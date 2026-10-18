"""Inserta movimientos de tesorería de prueba en la Supabase configurada en .env."""

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
from app.models.metodo_pago import MetodoPago
from app.models.movimiento_tesoreria import MovimientoTesoreria
from app.models.sucursal import Sucursal
from app.models.usuario import Usuario
from app.schemas.tesoreria_schema import CONCEPTOS_EGRESO


CANTIDAD_MOVIMIENTOS = 60
ETIQUETA_LOTE = "PRUEBA-TESORERIA-V1-"
SUCURSALES_OBJETIVO = {"buenavista", "lachinita"}
ZONA_TESORERIA = ZoneInfo("America/Bogota")
TERCEROS = (
    "Servicios públicos",
    "Proveedor de ferretería",
    "Equipo de mantenimiento",
    "Empresa de transporte",
    "Personal de tienda",
    "Gastos varios de prueba",
)


def _compactar(texto: str) -> str:
    return "".join(caracter for caracter in texto.casefold() if caracter.isalnum())


def _crear_app():
    load_dotenv()
    uri = os.getenv("SQLALCHEMY_DATABASE_URI")
    if not uri:
        raise RuntimeError("Falta SQLALCHEMY_DATABASE_URI en .env.")

    url = make_url(uri)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("El sembrador de tesorería solo admite PostgreSQL.")

    config = type(
        "SupabasePruebasTesoreriaConfig",
        (Config,),
        {
            "SQLALCHEMY_DATABASE_URI": url.set(drivername="postgresql+psycopg2"),
            "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY") or "clave-local-para-sembrado-de-pruebas",
        },
    )
    return create_app(config)


def sembrar() -> dict[str, int | str]:
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

            if MovimientoTesoreria.query.filter(
                MovimientoTesoreria.descripcion.like(f"{ETIQUETA_LOTE}%")
            ).first():
                raise RuntimeError(
                    f"Ya existe el lote {ETIQUETA_LOTE}; no se insertó una segunda copia."
                )

            administrador = (
                Usuario.query.filter_by(idTipoUsuario=1, activo=True)
                .order_by(Usuario.idUsuario)
                .first()
            )
            metodos_pago = (
                MetodoPago.query.filter_by(activo=True)
                .order_by(MetodoPago.idMetodoPago)
                .all()
            )
            if administrador is None or not metodos_pago:
                raise RuntimeError(
                    "Faltan un usuario administrador activo o métodos de pago activos."
                )

            hoy = datetime.now(timezone.utc).astimezone(ZONA_TESORERIA).date()
            movimientos = []
            for indice in range(CANTIDAD_MOVIMIENTOS):
                fecha = hoy - timedelta(days=indice % 45)
                fecha_utc = datetime.combine(
                    fecha,
                    time(12),
                    ZONA_TESORERIA,
                ).astimezone(timezone.utc)
                movimientos.append(MovimientoTesoreria(
                    idSucursal=sucursales[indice % len(sucursales)].idSucursal,
                    idUsuario=administrador.idUsuario,
                    idMetodoPago=metodos_pago[indice % len(metodos_pago)].idMetodoPago,
                    concepto=CONCEPTOS_EGRESO[indice % len(CONCEPTOS_EGRESO)],
                    descripcion=f"{ETIQUETA_LOTE}{indice + 1:03d} - Egreso para pruebas",
                    tercero=TERCEROS[indice % len(TERCEROS)],
                    monto=Decimal(25_000 + (indice % 12) * 17_500),
                    fecha=fecha_utc,
                    activo=True,
                ))

            db.session.add_all(movimientos)
            db.session.commit()
            return {
                "movimientos": len(movimientos),
                "desde": (hoy - timedelta(days=44)).isoformat(),
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
    argumentos = parser.parse_args()
    if not argumentos.confirmar_supabase_pruebas:
        parser.error("Revisa .env y agrega --confirmar-supabase-pruebas para insertar el lote.")

    resultados = sembrar()
    print("Lote de movimientos de tesorería insertado correctamente:")
    for clave, valor in resultados.items():
        print(f"  {clave}: {valor}")


if __name__ == "__main__":
    main()
