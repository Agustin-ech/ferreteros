"""
App Flask mínima para ejecutar el módulo de reportes **sin el proyecto completo**.

Registra tus modelos (los copiados en `tests/apoyo/`), el blueprint de reportes y los
manejadores de error, sobre una base SQLite descartable.

En tu proyecto esto no se usa: allá el blueprint se registra en el app factory real
(`app/__init__.py`) y la configuración vive en `app/config.py`.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from flask.testing import FlaskClient

from app.errors.reportes import registrar_handlers
from app.extensions import db
from app.services.reporte_service import fijar_modelos


class ClienteReportes(FlaskClient):
    def open(self, *args, **kwargs):
        headers = dict(kwargs.pop("headers", {}) or {})
        token = self.application.config.get("REPORTES_TEST_TOKEN")
        if token:
            headers.setdefault("Authorization", f"Bearer {token}")
        kwargs["headers"] = headers
        return super().open(*args, **kwargs)


def crear_app(config_extra: dict | None = None, uri: str = "sqlite://") -> Flask:
    app = Flask("ferreteros_pruebas")
    app.config.update(
        SQLALCHEMY_DATABASE_URI=uri,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY="pruebas",
        JWT_SECRET_KEY="clave-jwt-de-pruebas-reportes-con-longitud-segura",
        # --- Configuración del módulo de reportes (equivale a lo que va en app/config.py) ---
        REPORTES_MAX_ANIOS=5,
        REPORTES_ZONA_HORARIA="America/Bogota",
        REPORTES_MONEDA="COP",
        REPORTES_MAX_FILAS_DETALLE=300,
        REPORTES_TOP_PRODUCTOS=50,
        EMPRESA_NOMBRE="Ferretería El Tornillo S.A.S.",
        EMPRESA_NIT="NIT 901.555.777-3",
        TESTING=True,
    )
    if config_extra:
        app.config.update(config_extra)

    db.init_app(app)
    JWTManager(app)

    # En tu proyecto estos modelos se importan desde app/models/. Aquí se registran
    # explícitamente para que el módulo los encuentre (misma mecanismo: fijar_modelos).
    from app.models.cliente import Cliente
    from app.models.devoluciones import Devolucion
    from app.models.detalle_venta import DetalleVenta
    from app.models.factura import Factura
    from app.models.funcion import Funcion
    from app.models.inventario import Inventario
    from app.models.metodo_pago import MetodoPago
    from app.models.producto import Producto
    from app.models.sucursal import Sucursal
    from app.models.sucursal_usuario import SucursalUsuario
    from app.models.tipo_devolucion import TipoDevolucion
    from app.models.tipo_documento import TipoDeDocumento
    from app.models.tipo_producto import TipoProducto
    from app.models.tipo_usuario import TipoUsuario
    from app.models.tipo_venta import TipoVenta
    from app.models.unidad_medida import UnidadMedida
    from app.models.usuario import Usuario
    from app.models.usuario_tipo_funcion import TipoUsuarioFuncion
    from app.models.venta import Venta

    fijar_modelos({
        "Sucursal": Sucursal,
        "Inventario": Inventario,
        "Venta": Venta,
        "DetalleVenta": DetalleVenta,
        "Factura": Factura,
        "Devolucion": Devolucion,
        "TipoVenta": TipoVenta,
        "MetodoPago": MetodoPago,
        "TipoDeDocumento": TipoDeDocumento,
        "Producto": Producto,
        "Cliente": Cliente,
        "Usuario": Usuario,
        "TipoDevolucion": TipoDevolucion,
        "TipoProducto": TipoProducto,
        "UnidadMedida": UnidadMedida,
        "TipoUsuario": TipoUsuario,
        "Funcion": Funcion,
        "SucursalUsuario": SucursalUsuario,
        "TipoUsuarioFuncion": TipoUsuarioFuncion,
    })

    app.test_client_class = ClienteReportes

    from app.routes.reporte_routes import reportes_bp

    app.register_blueprint(reportes_bp)
    registrar_handlers(app)
    return app


def crear_app_con_datos(uri: str = "sqlite://", config_extra: dict | None = None) -> Flask:
    """App lista para consultar: crea el esquema y siembra los datos de ejemplo."""
    from tests.apoyo.datos_prueba import sembrar

    app = crear_app(config_extra=config_extra, uri=uri)
    with app.app_context():
        tablas_reportes = (
            "TipoDeDocumento", "TipoUsuario", "TipoProducto", "UnidadMedida",
            "TipoVenta", "metodo_pago", "tipo_devolucion", "sucursales",
            "usuarios", "Cliente", "Producto", "Venta", "detalle_venta",
            "Factura", "devolucion", "Inventario",
        )
        db.metadata.create_all(
            bind=db.engine,
            tables=[db.metadata.tables[nombre] for nombre in tablas_reportes],
        )
        sembrar()
        from app.models.usuario import Usuario

        administrador = Usuario.query.filter_by(correoElectronico="reportes@test.local").one()
        app.config["REPORTES_TEST_TOKEN"] = create_access_token(
            identity=str(administrador.idUsuario),
            additional_claims={"rol": "admin", "idSucursal": None},
        )
    return app
