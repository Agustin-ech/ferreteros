"""
Prueba de humo de las piezas independientes del proyecto anfitrión:
contrato de reportes, exportación CSV y exportación PDF.

Se puede ejecutar aquí mismo (sin la base de datos ni Flask):

    python tests/test_exportadores.py
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.reporte_service import (
    col_entero,
    col_moneda,
    columna,
    kpi,
    porcentaje,
    reporte,
    seccion,
    variacion_pct,
)
from app.utils.exportadores.csv_export import exportar_csv
from app.utils.exportadores.pdf_export import exportar_pdf

SALIDA = Path(__file__).resolve().parents[1] / "salidas_ejemplo"


def reporte_de_ejemplo() -> dict:
    columnas = [
        columna("sucursal", "Sucursal", ancho=1.8),
        col_entero("facturas", "N.º facturas"),
        col_moneda("ventas", "Ventas netas"),
        col_moneda("egresos", "Egresos"),
        col_moneda("resultado", "Resultado"),
        columna("participacion", "Participación", "porcentaje", ancho=1.0),
    ]
    filas = [
        ["Bodega Principal Norte", 100, 637_169_913.00, 192_129_122.59, 445_040_790.41, 0.0],
        ["Sucursal Centro", 77, 438_537_219.50, 304_874_986.62, 133_662_232.88, 0.0],
        ["Sucursal Medellín", 54, 334_343_406.25, 228_115_812.56, 106_227_593.69, 0.0],
    ]
    total = sum(f[2] for f in filas)
    for fila in filas:
        fila[5] = porcentaje(fila[2], total)

    return reporte(
        codigo="consolidado-sucursales",
        titulo="Consolidado comparativo por sucursal",
        alcance_={
            "modo": "CONSOLIDADO",
            "sucursal_id": None,
            "etiqueta": "Consolidado — 3 sucursales",
            "sucursales": ["Bodega Principal Norte", "Sucursal Centro", "Sucursal Medellín"],
        },
        desde=date(2026, 9, 1),
        hasta=date(2026, 9, 30),
        secciones=[
            seccion(
                "Comparativo por sucursal",
                columnas,
                filas,
                totales=["TOTAL CONSOLIDADO", 231, total, 725_119_921.77, 684_930_616.98, 100.0],
                nota="Resultado = ventas netas + otros ingresos - egresos del periodo.",
            )
        ],
        kpis=[
            kpi("Ventas netas consolidadas", 1_401_290_538.75, variacion=variacion_pct(1_401_290_538.75, 1_050_000_000)),
            kpi("Resultado consolidado", 684_930_616.98, variacion=12.4),
            kpi("Sucursales incluidas", 3, tipo="entero"),
            kpi("Margen neto", "18,2 %", tipo="texto"),
        ],
        empresa="Comercializadora Andina S.A.S.",
    )


def main() -> None:
    SALIDA.mkdir(exist_ok=True)
    datos = reporte_de_ejemplo()

    csv_bytes = exportar_csv(datos)
    pdf_bytes = exportar_pdf(datos)
    (SALIDA / "consolidado_sucursales_ejemplo.csv").write_bytes(csv_bytes)
    (SALIDA / "consolidado_sucursales_ejemplo.pdf").write_bytes(pdf_bytes)

    assert csv_bytes.startswith(b"\xef\xbb\xbf"), "El CSV debe incluir BOM UTF-8"
    assert pdf_bytes.startswith(b"%PDF"), "El PDF debe ser un PDF válido"
    assert "Consolidado — 3 sucursales" in csv_bytes.decode("utf-8-sig")

    print("OK")
    print(f"  CSV: {len(csv_bytes):>7} bytes  -> salidas_ejemplo/consolidado_sucursales_ejemplo.csv")
    print(f"  PDF: {len(pdf_bytes):>7} bytes  -> salidas_ejemplo/consolidado_sucursales_ejemplo.pdf")


if __name__ == "__main__":
    main()
