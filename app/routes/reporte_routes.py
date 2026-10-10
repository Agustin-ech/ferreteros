"""
Blueprint del módulo de reportes.

    GET /api/v1/reportes/catalogo                         -> reportes disponibles
    GET /api/v1/reportes/sucursales                       -> sucursales autorizadas del usuario
    GET /api/v1/reportes/<codigo>                         -> genera el reporte (JSON)
    GET /api/v1/reportes/<codigo>?...&formato=csv|pdf     -> descarga el reporte

Parámetros comunes:
    sucursal_id=3        reporte individual de esa sucursal
    sucursal_id=todas    reporte consolidado (también es el valor por defecto)
    desde=2026-09-01&hasta=2026-09-30
    formato=json|csv|pdf

Registro del blueprint en el factory:

    from app.routes.reportes import reportes_bp
    app.register_blueprint(reportes_bp)
"""

from __future__ import annotations

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import jwt_required

from app.errors.reportes import ParametroInvalido
from app.extensions import db
from app.schemas.reporte_schema import serializar_reporte
from app.services.reporte_service import (
    agrupacion_valida,
    catalogo_implementacion,
    catalogo_listar,
    catalogo_metadatos,
    catalogo_pendientes,
    resolver_alcance,
    sucursal_id,
    sucursal_nombre,
    validar_periodo,
)
from app.utils.exportadores.csv_export import exportar_csv
from app.utils.exportadores.pdf_export import exportar_pdf

reportes_bp = Blueprint("reportes", __name__, url_prefix="/api/v1/reportes")

FORMATOS = ("json", "csv", "pdf")


# --------------------------------------------------------------------------- Catálogos
@reportes_bp.get("/catalogo")
def catalogo_reportes():
    """Lista los reportes implementados, con sus parámetros, para armar el menú."""
    return jsonify({
        "modulo": "Reportes",
        "alcance": {
            "individual": "Envíe `sucursal_id=<id>` para el reporte de una sola sucursal.",
            "consolidado": "Envíe `sucursal_id=todas` (u omita el parámetro) para el consolidado.",
        },
        "formatos": list(FORMATOS),
        "reportes": catalogo_listar(),
        "reportes_pendientes": catalogo_pendientes(),
    })


@reportes_bp.get("/sucursales")
@jwt_required()
def listar_sucursales():
    """Sucursales que el usuario puede consultar (alimenta el selector de la pantalla)."""
    alcance = resolver_alcance(db, request.args.get("sucursal_id"))
    return jsonify([
        {
            "id": sucursal_id(s),
            "nombre": sucursal_nombre(s),
            "direccion": getattr(s, "direccion", None),
            "telefono": getattr(s, "telefono", None),
            "activa": getattr(s, "activa", True),
        }
        for s in alcance.sucursales
    ])


# --------------------------------------------------------------------------- Generación
@reportes_bp.get("/<string:codigo>")
@jwt_required()
def generar_reporte(codigo: str):
    """Genera el reporte pedido y lo devuelve en JSON, CSV o PDF."""
    meta = catalogo_metadatos(codigo)
    funcion = catalogo_implementacion(codigo)

    args = request.args
    # 1) Alcance: sucursal individual o consolidado (según permisos del usuario).
    alcance = resolver_alcance(db, args.get("sucursal_id"))

    # 2) Periodo validado (mes en curso por defecto; rango máximo configurable).
    desde, hasta = validar_periodo(args.get("desde"), args.get("hasta"))

    # 3) Filtros propios del reporte (solo los declarados en el catálogo).
    filtros = _extraer_filtros(meta, args)

    # 4) Generación (toda la lógica de consulta vive en el servicio).
    datos = funcion(db, alcance, desde, hasta, **filtros)

    return _responder(datos, _formato(args.get("formato")))


# --------------------------------------------------------------------------- Utilidades internas
PARAMS_ENTEROS = {
    "tercero_id", "idCliente", "idTipoVenta", "idTipoDevolucion", "idMetodoPago",
    "idProducto", "limite",
}
PARAMS_BOOLEANOS = {"solo_aprobadas", "solo_agotados", "solo_bajo_minimo"}
VERDADEROS = {"1", "true", "si", "sí", "yes", "y"}


def _extraer_filtros(meta: dict, args) -> dict:
    """Toma de la URL únicamente los filtros que el reporte declara en el catálogo."""
    filtros: dict = {}
    for nombre in meta.get("parametros", []):
        if nombre not in args:
            continue
        valor = args.get(nombre)
        if nombre in PARAMS_ENTEROS:
            filtros[nombre] = _entero(valor, nombre)
        elif nombre in PARAMS_BOOLEANOS:
            filtros[nombre] = str(valor).strip().lower() in VERDADEROS
        elif nombre == "agrupacion":
            filtros[nombre] = agrupacion_valida(valor)
        else:
            filtros[nombre] = valor or None
    return {k: v for k, v in filtros.items() if v is not None}


def _entero(valor, nombre: str) -> int | None:
    if valor in (None, ""):
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        raise ParametroInvalido(f"El parámetro '{nombre}' debe ser un número entero (recibido: '{valor}').")


def _formato(valor: str | None) -> str:
    formato = (valor or "json").strip().lower()
    if formato not in FORMATOS:
        raise ParametroInvalido(f"Formato no soportado: '{valor}'. Use uno de {', '.join(FORMATOS)}.")
    return formato


def _responder(reporte: dict, formato: str) -> Response:
    """Entrega el contrato JSON o el archivo descargable del mismo reporte."""
    if formato == "json":
        return jsonify(serializar_reporte(reporte))

    alcance_txt = (
        "consolidado" if reporte["alcance"]["modo"] == "CONSOLIDADO"
        else f"sucursal_{reporte['alcance'].get('sucursal_id')}"
    )
    periodo = reporte["periodo"]
    # Las fechas del contrato pueden llegar como texto ISO o como `date`: se normalizan aquí.
    desde_txt = str(periodo["desde"]).replace("-", "")[:8]
    hasta_txt = str(periodo["hasta"]).replace("-", "")[:8]
    nombre_archivo = f"{reporte['codigo']}_{alcance_txt}_{desde_txt}_{hasta_txt}.{formato}"

    if formato == "csv":
        contenido, mime = exportar_csv(reporte), "text/csv; charset=utf-8"
    else:
        contenido, mime = exportar_pdf(reporte), "application/pdf"

    return Response(
        contenido,
        mimetype=mime,
        headers={
            "Content-Disposition": f'attachment; filename="{nombre_archivo}"',
            "X-Reporte-Alcance": reporte["alcance"]["modo"],
        },
    )
