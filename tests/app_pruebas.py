"""
App Flask mínima para ejecutar reportes y mercancía dañada sin una base externa.

Registra los blueprints y modelos necesarios sobre una base SQLite descartable.

En tu proyecto esto no se usa: allá el blueprint se registra en el app factory real
(`app/__init__.py`) y la configuración vive en `app/config.py`.
"""

from __future__ import annotations

import sys
from pathlib import Path
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from flask.testing import FlaskClient
from sqlalchemy import text

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
    from app.models.alerta_inventario import AlertaInventario
    from app.models.detalle_devolucion import DetalleDevolucion
    from app.models.devoluciones import Devolucion
    from app.models.detalle_devolucion import DetalleDevolucion
    from app.models.detalle_orden_proveedor import DetalleOrdenProveedor
    from app.models.detalle_venta import DetalleVenta
    from app.models.domicilio import Domicilio
    from app.models.entrega import Entrega
    from app.models.estado_pedido_proveedor import EstadoPedidoProveedor
    from app.models.factura import Factura
    from app.models.funcion import Funcion
    from app.models.inventario import Inventario
    from app.models.metodo_pago import MetodoPago
    from app.models.ajuste_inventario import AjusteInventario
    from app.models.mercancia_danada import MercanciaDanada, TipoDanio
    from app.models.mercancia_recibida import MercanciaRecibida
    from app.models.pedido_proveedor import PedidoProveedor
    from app.models.producto import Producto
    from app.models.pedido_proveedor import PedidoProveedor
    from app.models.proveedor import Proveedor
    from app.models.reclamos_proveedor import ReclamoProveedor
    from app.models.sucursal import Sucursal
    from app.models.sucursal_usuario import SucursalUsuario
    from app.models.tipo_devolucion import TipoDevolucion
    from app.models.tipo_documento import TipoDeDocumento
    from app.models.tipo_usuario import TipoUsuario
    from app.models.tipo_venta import TipoVenta
    from app.models.tipo_movimiento import TipoMovimiento
    from app.models.tipo_producto import TipoProducto
    from app.models.transaccion_inventario import TransaccionInventario
    from app.models.unidad_medida import UnidadMedida
    from app.models.usuario import Usuario
    from app.models.usuario_tipo_funcion import TipoUsuarioFuncion
    from app.models.venta import Venta
    from app.models.proveedor import Proveedor

    fijar_modelos({
        "Sucursal": Sucursal,
        "Inventario": Inventario,
        "Venta": Venta,
        "DetalleVenta": DetalleVenta,
        "Factura": Factura,
        "Devolucion": Devolucion,
        "DetalleDevolucion": DetalleDevolucion,
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
        "DetalleOrdenProveedor": DetalleOrdenProveedor,
        "EstadoPedidoProveedor": EstadoPedidoProveedor,
        "PedidoProveedor": PedidoProveedor,
        "Proveedor": Proveedor,
    })

    app.test_client_class = ClienteReportes

    from app.routes.reporte_routes import reportes_bp
    from app.routes.mercancia_danada_routes import mercancia_danada_bp
    from app.routes.mercancia_recibida_routes import mercancia_recibida_bp
    from app.routes.cliente_routes import cliente_bp
    from app.routes.sucursal_routes import sucursal_bp
    from app.routes.auth_routes import auth_bp
    from app.routes.usuario_routes import usuario_bp
    from app.errors.negocio import registrar_handlers_negocio

    app.register_blueprint(auth_bp)
    app.register_blueprint(usuario_bp)
    app.register_blueprint(reportes_bp)
    app.register_blueprint(mercancia_danada_bp)
    app.register_blueprint(mercancia_recibida_bp)
    app.register_blueprint(cliente_bp)
    app.register_blueprint(sucursal_bp)
    registrar_handlers(app)
    registrar_handlers_negocio(app)
    return app


def crear_app_con_datos(uri: str = "sqlite://", config_extra: dict | None = None) -> Flask:
    """App lista para consultar: crea el esquema y siembra los datos de ejemplo."""
    from tests.apoyo.datos_prueba import sembrar

    app = crear_app(config_extra=config_extra, uri=uri)
    with app.app_context():
        tablas_reportes = (
            "TipoDeDocumento", "TipoUsuario", "TipoProducto", "UnidadMedida",
            "TipoVenta", "metodo_pago", "tipo_devolucion", "sucursales",
            "usuarios", "SucursalUsuario", "Funcion", "tipo_usuario_funcion",
            "Cliente", "Producto", "Venta", "detalle_venta",
            "Factura", "devolucion", "DetalleDevolucion", "Inventario",
            "Proveedor", "estado_pedido_proveedor", "pedido_proveedor",
            "detalle_orden_proveedor",
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


def preparar_mercancia_danada(app: Flask, *, con_datos: bool = False) -> None:
    """Añade el esquema SQLite del módulo de daños a las apps de prueba."""
    from app.models.ajuste_inventario import AjusteInventario
    from app.models.inventario import Inventario
    from app.models.mercancia_danada import MercanciaDanada, TipoDanio
    from app.models.mercancia_recibida import MercanciaRecibida
    from app.models.producto import Producto
    from app.models.tipo_movimiento import TipoMovimiento

    with app.app_context():
        db.metadata.create_all(
            bind=db.engine,
            tables=[
                TipoMovimiento.__table__,
                AjusteInventario.__table__,
                TipoDanio.__table__,
                MercanciaDanada.__table__,
                MercanciaRecibida.__table__,
            ],
        )
        db.session.execute(text('''
            CREATE TABLE "TransaccionInventario" (
                "idTransaccionInventario" INTEGER PRIMARY KEY,
                "idInventario" INTEGER NOT NULL,
                "idTipoMovimiento" INTEGER NOT NULL,
                "idVenta" INTEGER,
                "idDevolucion" INTEGER,
                "idPedidoProveedor" INTEGER,
                "idAjusteInventario" INTEGER,
                "cantidad" NUMERIC(12, 3) NOT NULL,
                "stockAnterior" NUMERIC(12, 3),
                "stockNuevo" NUMERIC(12, 3),
                "fecha" DATETIME NOT NULL
            )
        '''))
        if con_datos:
            db.session.add_all([
                TipoMovimiento(idTipoMovimiento=1, nombre="Entrada"),
                TipoMovimiento(idTipoMovimiento=2, nombre="Salida"),
                TipoMovimiento(idTipoMovimiento=3, nombre="Ajuste"),
                TipoDanio(idTipoDanio=1, nombre="Defecto de fábrica", imputableProveedor=True),
                TipoDanio(idTipoDanio=2, nombre="Producto roto"),
                TipoDanio(idTipoDanio=3, nombre="Caja dañada"),
                TipoDanio(idTipoDanio=4, nombre="Faltantes"),
                TipoDanio(idTipoDanio=5, nombre="Vencido"),
            ])
            for id_producto in range(5, 10):
                db.session.add(Producto(
                    idProducto=id_producto,
                    idTipoProducto=1,
                    idUnidadMedida=1,
                    codigoSKU=f"PRT-{id_producto:03d}",
                    nombre=f"Producto de prueba {id_producto}",
                    precio=Decimal("1000"),
                    costoUnitario=Decimal("500"),
                ))
                for id_sucursal in ([1, 2] if id_producto == 7 else [1]):
                    db.session.add(Inventario(
                        idInventario=id_producto * 10 + id_sucursal,
                        idProducto=id_producto,
                        idSucursal=id_sucursal,
                        CantidadDisponible=Decimal("20"),
                    ))
        db.session.commit()
