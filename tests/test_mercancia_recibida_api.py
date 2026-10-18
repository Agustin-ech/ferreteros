from __future__ import annotations

from decimal import Decimal

import pytest
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models.mercancia_recibida import MercanciaRecibida
from app.services.inventario_service import existencias
from tests.app_pruebas import crear_app_con_datos, preparar_mercancia_danada


@pytest.fixture(scope="module")
def app():
    application = crear_app_con_datos()
    preparar_mercancia_danada(application, con_datos=True)
    return application


@pytest.fixture(scope="module")
def cliente(app):
    return app.test_client()


def _existencias(app, producto=5, sucursal=1):
    with app.app_context():
        return existencias(db, producto, sucursal)


def test_registro_persiste_factura_proveedor_y_aumenta_existencias(app, cliente):
    antes = _existencias(app)
    respuesta = cliente.post(
        "/api/v1/mercancia-recibida",
        json={
            "idProducto": 5,
            "idSucursal": 1,
            "fecha": "2026-10-17",
            "factura": "FAC-REC-001",
            "proveedor": "Distribuidora Central",
            "cantidad": 7,
        },
    )

    assert respuesta.status_code == 201
    datos = respuesta.get_json()
    assert datos["factura"] == "FAC-REC-001"
    assert datos["proveedor"] == "Distribuidora Central"
    assert datos["producto"] == "Producto de prueba 5"
    assert datos["estado"] == "Recibido"
    assert Decimal(str(datos["existenciasRestantes"])) == antes + 7
    assert _existencias(app) == antes + 7

    with app.app_context():
        guardado = db.session.get(MercanciaRecibida, datos["idMercanciaRecibida"])
        assert guardado is not None
        assert guardado.factura == "FAC-REC-001"
        assert guardado.proveedor == "Distribuidora Central"


def test_listado_lee_los_registros_reales(cliente):
    respuesta = cliente.get("/api/v1/mercancia-recibida")

    assert respuesta.status_code == 200
    assert any(
        registro["factura"] == "FAC-REC-001"
        and registro["proveedor"] == "Distribuidora Central"
        for registro in respuesta.get_json()
    )


@pytest.mark.parametrize("cambios, campo", [
    ({"cantidad": 0}, "cantidad"),
    ({"factura": ""}, "factura"),
    ({"proveedor": ""}, "proveedor"),
    ({"idProducto": 9999}, None),
])
def test_rechaza_datos_invalidos_o_producto_inexistente(cliente, cambios, campo):
    cuerpo = {
        "idProducto": 5,
        "idSucursal": 1,
        "fecha": "2026-10-17",
        "factura": "FAC-REC-002",
        "proveedor": "Distribuidora Central",
        "cantidad": 2,
    }
    cuerpo.update(cambios)
    respuesta = cliente.post("/api/v1/mercancia-recibida", json=cuerpo)

    assert respuesta.status_code in (404, 422)
    if campo:
        assert campo in respuesta.get_json()["campos"]


def test_usuario_sin_sucursal_no_puede_consultar_ingresos(app, cliente):
    with app.app_context():
        token = create_access_token(
            identity="1",
            additional_claims={"rol": "bodega", "idSucursal": None},
        )

    respuesta = cliente.get(
        "/api/v1/mercancia-recibida",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert respuesta.status_code == 403
