"""Crea una base SQLite local con datos para probar los reportes."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

from sqlalchemy.engine import URL

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.extensions import db
from tests.app_pruebas import crear_app_con_datos


RUTA_DB = Path(__file__).resolve().parents[1] / "instance" / "reportes_pruebas.sqlite"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reiniciar",
        action="store_true",
        help="Reemplaza únicamente instance/reportes_pruebas.sqlite si ya existe.",
    )
    argumentos = parser.parse_args()

    if RUTA_DB.exists():
        if not argumentos.reiniciar:
            parser.error(
                f"Ya existe {RUTA_DB}. No se modificó. Usa --reiniciar para recrear esta base de pruebas."
            )
        RUTA_DB.unlink()

    RUTA_DB.parent.mkdir(parents=True, exist_ok=True)
    uri = str(URL.create("sqlite", database=str(RUTA_DB)))
    app = crear_app_con_datos(uri=uri)

    with app.app_context():
        from app.models.cliente import Cliente
        from app.models.devoluciones import Devolucion
        from app.models.detalle_venta import DetalleVenta
        from app.models.factura import Factura
        from app.models.inventario import Inventario
        from app.models.producto import Producto
        from app.models.sucursal import Sucursal
        from app.models.venta import Venta

        conteos = {
            "sucursales": db.session.query(Sucursal).count(),
            "productos": db.session.query(Producto).count(),
            "clientes": db.session.query(Cliente).count(),
            "inventarios": db.session.query(Inventario).count(),
            "ventas": db.session.query(Venta).count(),
            "detalles de venta": db.session.query(DetalleVenta).count(),
            "facturas": db.session.query(Factura).count(),
            "devoluciones": db.session.query(Devolucion).count(),
        }
        db.engine.dispose()

    print(f"Base de pruebas creada: {RUTA_DB}")
    for nombre, cantidad in conteos.items():
        print(f"  {nombre}: {cantidad}")


if __name__ == "__main__":
    main()
