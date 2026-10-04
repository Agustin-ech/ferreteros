"""Exportación de reportes a CSV compatible con Excel en configuración es-CO."""

from __future__ import annotations

import csv
from io import StringIO


def exportar_csv(reporte: dict) -> bytes:
    salida = StringIO(newline="")
    escritor = csv.writer(salida, delimiter=";", lineterminator="\r\n")

    escritor.writerow([reporte.get("titulo", "Reporte")])
    escritor.writerow(["Código", reporte.get("codigo", "")])
    escritor.writerow(["Alcance", reporte.get("alcance", {}).get("etiqueta", "")])
    periodo = reporte.get("periodo", {})
    escritor.writerow(["Desde", periodo.get("desde", ""), "Hasta", periodo.get("hasta", "")])

    kpis = reporte.get("kpis", [])
    if kpis:
        escritor.writerow([])
        escritor.writerow(["Indicadores"])
        escritor.writerow(["Indicador", "Valor", "Tipo", "Variación (%)"])
        for indicador in kpis:
            escritor.writerow([
                indicador.get("etiqueta", ""),
                indicador.get("valor", ""),
                indicador.get("tipo", ""),
                indicador.get("variacion", ""),
            ])

    for seccion in reporte.get("secciones", []):
        escritor.writerow([])
        escritor.writerow([seccion.get("nombre", "")])
        columnas = seccion.get("columnas", [])
        escritor.writerow([columna.get("titulo", "") for columna in columnas])
        escritor.writerows(seccion.get("filas", []))
        if seccion.get("totales") is not None:
            escritor.writerow(seccion["totales"])
        if seccion.get("nota"):
            escritor.writerow([seccion["nota"]])

    return ("\ufeff" + salida.getvalue()).encode("utf-8")