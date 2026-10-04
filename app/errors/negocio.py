"""
Errores de negocio compartidos por los módulos de mercancía dañada y proveedores.

Si tu `app/errors/handlers.py` ya define un formato de error propio, borra
`registrar_handlers_negocio` y haz que estas clases hereden de tu excepción base:
lo único que importa es el código HTTP de cada una.

    404  RecursoNoEncontrado     el id no existe (o no está autorizado)
    409  ConflictoNegocio        la operación no es válida en el estado actual
    409  StockInsuficiente       no hay existencias suficientes para descontar
    422  DatosInvalidos          el cuerpo de la petición no pasa validación

Todas responden con el mismo cuerpo que el módulo de reportes:

    {"error": "stock_insuficiente", "mensaje": "...", "detalle": "..."}
"""

from __future__ import annotations

from flask import jsonify


class ErrorNegocio(Exception):
    """Base de los errores de negocio (nunca un 500 por reglas del dominio)."""

    codigo_http = 400
    codigo = "error_negocio"

    def __init__(self, mensaje: str, *, detalle: str | None = None, extra: dict | None = None):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.detalle = detalle
        self.extra = extra or {}

    def a_dict(self) -> dict:
        cuerpo = {"error": self.codigo, "mensaje": self.mensaje}
        if self.detalle:
            cuerpo["detalle"] = self.detalle
        cuerpo.update(self.extra)
        return cuerpo


class DatosInvalidos(ErrorNegocio):
    codigo_http = 422
    codigo = "datos_invalidos"


class RecursoNoEncontrado(ErrorNegocio):
    codigo_http = 404
    codigo = "recurso_no_encontrado"


class ConflictoNegocio(ErrorNegocio):
    codigo_http = 409
    codigo = "conflicto"


class StockInsuficiente(ConflictoNegocio):
    codigo = "stock_insuficiente"


class OperacionNoPermitida(ErrorNegocio):
    codigo_http = 403
    codigo = "operacion_no_permitida"


def registrar_handlers_negocio(app) -> None:
    """
    Registra los manejadores en el app factory:

        from app.errors.negocio import registrar_handlers_negocio
        registrar_handlers_negocio(app)
    """

    @app.errorhandler(ErrorNegocio)
    def _manejar_error_negocio(exc: ErrorNegocio):
        return jsonify(exc.a_dict()), exc.codigo_http

    # Validación de marshmallow -> 422 con el detalle por campo.
    try:
        from marshmallow import ValidationError

        @app.errorhandler(ValidationError)
        def _manejar_validacion(exc: ValidationError):
            return jsonify({
                "error": "datos_invalidos",
                "mensaje": "Hay campos inválidos en la petición.",
                "campos": exc.messages,
            }), 422
    except ImportError:  # pragma: no cover - marshmallow siempre está en el proyecto
        pass

    # Violación de restricciones de la base (NIT duplicado, FK inexistente) -> 409.
    try:
        from sqlalchemy.exc import IntegrityError

        @app.errorhandler(IntegrityError)
        def _manejar_integridad(exc: IntegrityError):
            from app.extensions import db

            db.session.rollback()
            return jsonify({
                "error": "conflicto_integridad",
                "mensaje": "La operación viola una restricción de la base de datos "
                           "(por ejemplo, un NIT repetido o una referencia inexistente).",
                "detalle": str(getattr(exc, "orig", exc))[:300],
            }), 409
    except ImportError:  # pragma: no cover
        pass
