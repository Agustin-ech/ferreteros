"""
Esquemas marshmallow del módulo de reportes.

Los servicios arman el contrato como diccionario (ver
`app/services/reportes/contrato.py`); estos esquemas lo validan y serializan antes
de responder. Eso deja el contrato en un solo sitio y evita repetir campos en
cada reporte.

Uso en la ruta:

    from app.schemas.reporte_schemas import serializar_reporte
    return jsonify(serializar_reporte(payload))
"""

from __future__ import annotations

from marshmallow import EXCLUDE, Schema, fields, post_dump, validate

TIPOS_COLUMNA = ["texto", "entero", "decimal", "moneda", "fecha", "porcentaje"]
ALINEACIONES = ["izq", "centro", "der"]
MODOS = ["SUCURSAL", "CONSOLIDADO"]


class ColumnaSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    clave = fields.Str(required=True)
    titulo = fields.Str(required=True)
    tipo = fields.Str(load_default="texto", validate=validate.OneOf(TIPOS_COLUMNA))
    alineacion = fields.Str(load_default="izq", validate=validate.OneOf(ALINEACIONES))
    ancho = fields.Float(load_default=1.0, validate=validate.Range(min=0.1, max=10))
    totalizar = fields.Bool(load_default=False)


class SeccionSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    nombre = fields.Str(required=True)
    columnas = fields.List(fields.Nested(ColumnaSchema), required=True)
    filas = fields.List(fields.List(fields.Raw()), load_default=list)
    totales = fields.List(fields.Raw(), allow_none=True)
    nota = fields.Str(allow_none=True)


class KpiSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    etiqueta = fields.Str(required=True)
    valor = fields.Raw(required=True)          # número o texto ("29,6 %")
    tipo = fields.Str(load_default="moneda", validate=validate.OneOf(TIPOS_COLUMNA))
    variacion = fields.Float(allow_none=True)  # % frente al periodo anterior


class AlcanceSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    modo = fields.Str(required=True, validate=validate.OneOf(MODOS))
    sucursal_id = fields.Int(allow_none=True)
    etiqueta = fields.Str(required=True)
    sucursales = fields.List(fields.Str(), load_default=list)


class PeriodoSchema(Schema):
    """
    El contrato (`contrato.py`) ya entrega las fechas en ISO-8601, por eso aquí se
    declaran como texto: así el mismo esquema sirve para el JSON de la API y para
    los exportadores, sin conversiones intermedias.
    """

    class Meta:
        unknown = EXCLUDE

    desde = fields.Str(required=True)
    hasta = fields.Str(required=True)
    dias = fields.Int(required=True)
    agrupacion = fields.Str(allow_none=True)


class ReporteSchema(Schema):
    """Contrato de salida de cualquier reporte del sistema."""

    class Meta:
        unknown = EXCLUDE

    codigo = fields.Str(required=True)
    titulo = fields.Str(required=True)
    descripcion = fields.Str(allow_none=True)
    alcance = fields.Nested(AlcanceSchema, required=True)
    periodo = fields.Nested(PeriodoSchema, required=True)
    filtros_aplicados = fields.Dict(keys=fields.Str(), values=fields.Raw(), load_default=dict)
    kpis = fields.List(fields.Nested(KpiSchema), load_default=list)
    secciones = fields.List(fields.Nested(SeccionSchema), load_default=list)
    generado_en = fields.Str(required=True)
    moneda = fields.Str(load_default="COP")
    empresa = fields.Str(allow_none=True)

    @post_dump
    def quitar_nulos(self, data, **kwargs):
        """No se envían claves nulas al front (así el JSON queda más liviano)."""
        return {k: v for k, v in data.items() if v is not None}


def serializar_reporte(payload: dict) -> dict:
    """Valida y normaliza el reporte antes de responderlo como JSON."""
    return ReporteSchema().dump(payload)


def validar_reporte(payload: dict) -> dict:
    """Valida el contrato (útil en pruebas y en la exportación programada por correo)."""
    return ReporteSchema().load(payload)
