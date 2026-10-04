"""Exportación multipágina de reportes con tarjetas de KPI."""

from __future__ import annotations

from html import escape
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _texto(valor) -> str:
    return escape("" if valor is None else str(valor)).replace("\n", "<br/>")


def _pie(canvas, documento) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#58636B"))
    canvas.drawRightString(documento.pagesize[0] - 14 * mm, 8 * mm, f"Página {documento.page}")
    canvas.restoreState()


def exportar_pdf(reporte: dict) -> bytes:
    salida = BytesIO()
    documento = SimpleDocTemplate(
        salida,
        pagesize=landscape(letter),
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=15 * mm,
        title=reporte.get("titulo", "Reporte"),
        author=reporte.get("empresa") or "",
    )
    estilos = getSampleStyleSheet()
    titulo = ParagraphStyle(
        "ReporteTitulo", parent=estilos["Title"], fontName="Helvetica-Bold",
        fontSize=18, leading=22, alignment=TA_LEFT, textColor=colors.HexColor("#18343B"),
        spaceAfter=5,
    )
    metadato = ParagraphStyle(
        "ReporteMetadato", parent=estilos["Normal"], fontSize=9, leading=12,
        textColor=colors.HexColor("#46545A"),
    )
    valor_kpi = ParagraphStyle(
        "KpiValor", parent=estilos["Normal"], fontName="Helvetica-Bold",
        fontSize=13, leading=16, textColor=colors.HexColor("#18343B"),
    )
    etiqueta_kpi = ParagraphStyle(
        "KpiEtiqueta", parent=estilos["Normal"], fontSize=8, leading=10,
        textColor=colors.HexColor("#58636B"),
    )
    encabezado_tabla = ParagraphStyle(
        "TablaEncabezado", parent=estilos["Normal"], fontName="Helvetica-Bold",
        fontSize=8, leading=10, textColor=colors.white,
    )
    celda = ParagraphStyle(
        "TablaCelda", parent=estilos["Normal"], fontSize=7.5, leading=9,
        wordWrap="CJK",
    )
    seccion_titulo = ParagraphStyle(
        "SeccionTitulo", parent=estilos["Heading2"], fontName="Helvetica-Bold",
        fontSize=12, leading=15, textColor=colors.HexColor("#18343B"),
        spaceBefore=9, spaceAfter=5,
    )
    ancho = documento.width
    historia = [Paragraph(_texto(reporte.get("titulo", "Reporte")), titulo)]
    alcance = reporte.get("alcance", {})
    periodo = reporte.get("periodo", {})
    historia.append(Paragraph(
        " &nbsp;|&nbsp; ".join(filter(None, [
            _texto(alcance.get("etiqueta")),
            f"Periodo: {_texto(periodo.get('desde'))} a {_texto(periodo.get('hasta'))}",
            _texto(reporte.get("empresa")),
        ])),
        metadato,
    ))
    historia.append(Spacer(1, 7 * mm))

    indicadores = reporte.get("kpis", [])
    if indicadores:
        celdas = []
        for indicador in indicadores:
            contenido = [
                Paragraph(_texto(indicador.get("etiqueta", "")), etiqueta_kpi),
                Paragraph(_texto(indicador.get("valor", "")), valor_kpi),
            ]
            celdas.append(contenido)
        filas_kpi = [celdas[indice:indice + 4] for indice in range(0, len(celdas), 4)]
        for fila in filas_kpi:
            fila.extend([""] * (4 - len(fila)))
        tarjetas = Table(filas_kpi, colWidths=[ancho / 4] * 4, hAlign="LEFT")
        tarjetas.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EEF3F1")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CDD8D4")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CDD8D4")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        historia.extend([tarjetas, Spacer(1, 4 * mm)])

    for seccion in reporte.get("secciones", []):
        historia.append(Paragraph(_texto(seccion.get("nombre", "")), seccion_titulo))
        columnas = seccion.get("columnas", [])
        datos = [[Paragraph(_texto(col.get("titulo", "")), encabezado_tabla) for col in columnas]]
        datos.extend([
            [Paragraph(_texto(valor), celda) for valor in fila]
            for fila in seccion.get("filas", [])
        ])
        if seccion.get("totales") is not None:
            datos.append([Paragraph(f"<b>{_texto(valor)}</b>", celda) for valor in seccion["totales"]])
        if columnas and datos:
            pesos = [max(float(col.get("ancho", 1) or 1), 0.1) for col in columnas]
            suma_pesos = sum(pesos)
            tabla = Table(
                datos,
                colWidths=[ancho * peso / suma_pesos for peso in pesos],
                repeatRows=1,
                hAlign="LEFT",
            )
            tabla.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#24535A")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F6F5")]),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C8D0CE")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            historia.append(tabla)
        if seccion.get("nota"):
            historia.extend([Spacer(1, 2 * mm), Paragraph(_texto(seccion["nota"]), metadato)])

    documento.build(historia, onFirstPage=_pie, onLaterPages=_pie)
    return salida.getvalue()