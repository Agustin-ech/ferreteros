"""
Errores del módulo de reportes.

Se registran con `registrar_handlers(app)` desde el factory. Si tu
`app/errors/handlers.py` ya maneja un formato de error propio, puedes borrar esta
clase de handlers y heredar de la excepción base del proyecto: lo único que
importan son los códigos HTTP.
"""

from __future__ import annotations

from flask import jsonify


class ErrorReporte(Exception):
    """Base de los errores de negocio del módulo de reportes."""

    codigo_http = 500
    codigo = "error_reporte"

    def __init__(self, mensaje: str, *, detalle: str | None = None):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.detalle = detalle

    def a_dict(self) -> dict:
        cuerpo = {"error": self.codigo, "mensaje": self.mensaje}
        if self.detalle:
            cuerpo["detalle"] = self.detalle
        return cuerpo


class ParametroInvalido(ErrorReporte):
    codigo_http = 422
    codigo = "parametro_invalido"


class RangoInvalido(ParametroInvalido):
    codigo = "rango_invalido"


class SucursalNoEncontrada(ErrorReporte):
    codigo_http = 404
    codigo = "sucursal_no_encontrada"


class SinSucursales(ErrorReporte):
    codigo_http = 409
    codigo = "sin_sucursales"


class ReporteNoDisponible(ErrorReporte):
    codigo_http = 404
    codigo = "reporte_no_disponible"


def registrar_handlers(app) -> None:
    @app.errorhandler(ErrorReporte)
    def _manejar_error_reporte(exc: ErrorReporte):
        return jsonify(exc.a_dict()), exc.codigo_http
