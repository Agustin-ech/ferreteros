from decimal import Decimal

import pytest

from app import create_app
from app.extensions import db
from app.models.detalle_orden_proveedor import DetalleOrdenProveedor
from app.models.estado_pedido_proveedor import EstadoPedidoProveedor
from app.models.pedido_proveedor import PedidoProveedor
from app.models.producto import Producto
from app.models.proveedor import Proveedor
from app.models.sucursal import Sucursal
from app.models.usuario import Usuario


@pytest.fixture
def app():
    class TestConfig:
        SQLALCHEMY_DATABASE_URI = "sqlite://"
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        JWT_SECRET_KEY = "test-secret-that-is-at-least-32-bytes-long"
        TESTING = True

    application = create_app(TestConfig)
    tables = [
        Sucursal.__table__,
        Usuario.__table__,
        Proveedor.__table__,
        Producto.__table__,
        EstadoPedidoProveedor.__table__,
        PedidoProveedor.__table__,
        DetalleOrdenProveedor.__table__,
    ]
    with application.app_context():
        db.metadata.create_all(bind=db.engine, tables=tables)
        db.session.add_all([
            Sucursal(idSucursal=1, nombreSucursal="Centro", direccion="Calle 1"),
            Usuario(
                idUsuario=9,
                idTipoDocumento=1,
                numeroDocumento="TEST-9",
                primerNombre="Ana",
                primerApellido="Prueba",
                correoElectronico="ana@example.test",
                idTipoUsuario=1,
                password_hash="not-used-in-tests",
            ),
            Proveedor(
                idProveedor=1,
                nombreEmpresa="Proveedor Uno",
                nit="NIT-1",
                activo=True,
            ),
            Producto(
                idProducto=1,
                idTipoProducto=1,
                idUnidadMedida=1,
                codigoSKU="SKU-1",
                nombre="Tornillo",
                precio=Decimal("100.00"),
                costoUnitario=Decimal("12.50"),
                activo=True,
            ),
        ])
        db.session.commit()
        yield application
        db.session.remove()
        db.metadata.drop_all(bind=db.engine, tables=tables)


def _headers(app, rol="admin"):
    from flask_jwt_extended import create_access_token

    with app.app_context():
        token = create_access_token(
            identity="9",
            additional_claims={"rol": rol, "idSucursal": 1},
        )
    return {"Authorization": f"Bearer {token}"}


def test_registra_pedido_a_proveedor_con_estado_pendiente_y_total_calculado(app):
    response = app.test_client().post(
        "/api/proveedores/pedidos",
        headers=_headers(app),
        json={
            "idProveedor": 1,
            "idSucursal": 1,
            "detalles": [
                {
                    "idProducto": 1,
                    "cantidadPedida": "3",
                    "precioUnitario": "12.50",
                }
            ],
        },
    )

    assert response.status_code == 201
    assert response.json["total"] == 37.5
    assert response.json["estado"] == "Pendiente"
    assert response.json["proveedor"]["nombreEmpresa"] == "Proveedor Uno"
    assert response.json["detalles"][0]["nombreProducto"] == "Tornillo"
    assert response.json["detalles"][0]["subtotal"] == 37.5


def test_actualiza_estado_de_pedido_y_rechaza_estados_no_configurados(app):
    client = app.test_client()
    headers = _headers(app)
    created = client.post(
        "/api/proveedores/pedidos",
        headers=headers,
        json={
            "idProveedor": 1,
            "idSucursal": 1,
            "detalles": [
                {"idProducto": 1, "cantidadPedida": 2, "precioUnitario": 12.5}
            ],
        },
    )
    pedido_id = created.json["idPedidoProveedor"]

    updated = client.patch(
        f"/api/proveedores/pedidos/{pedido_id}/estado",
        headers=headers,
        json={"estado": "Recibido"},
    )
    invalid = client.patch(
        f"/api/proveedores/pedidos/{pedido_id}/estado",
        headers=headers,
        json={"estado": "En camino"},
    )

    assert updated.status_code == 200
    assert updated.json["estado"] == "Recibido"
    assert invalid.status_code == 400


def test_registro_de_pedido_valida_lineas_y_restringe_acceso_a_admin(app):
    client = app.test_client()
    headers = _headers(app)
    payload = {
        "idProveedor": 1,
        "idSucursal": 1,
        "detalles": [
            {"idProducto": 1, "cantidadPedida": 1, "precioUnitario": 12.5},
            {"idProducto": 1, "cantidadPedida": 2, "precioUnitario": 12.5},
        ],
    }

    duplicate = client.post("/api/proveedores/pedidos", headers=headers, json=payload)
    forbidden = client.post(
        "/api/proveedores/pedidos",
        headers=_headers(app, "vendedor"),
        json={**payload, "detalles": payload["detalles"][:1]},
    )

    assert duplicate.status_code == 400
    assert forbidden.status_code == 403
