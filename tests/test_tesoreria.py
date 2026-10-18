from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app import create_app
from app.extensions import db
from app.models.factura import Factura
from app.models.metodo_pago import MetodoPago
from app.models.movimiento_tesoreria import MovimientoTesoreria
from app.models.sucursal import Sucursal
from app.models.usuario import Usuario
from app.models.venta import Venta


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
        MetodoPago.__table__,
        Venta.__table__,
        Factura.__table__,
        MovimientoTesoreria.__table__,
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
            MetodoPago(idMetodoPago=1, nombre="Efectivo"),
        ])
        db.session.commit()
        yield application
        db.session.remove()
        db.metadata.drop_all(bind=db.engine, tables=tables)


def token_para(app, rol="admin"):
    from flask_jwt_extended import create_access_token

    with app.app_context():
        return create_access_token(
            identity="9",
            additional_claims={"rol": rol, "idSucursal": 1},
        )


def test_catalogos_tesoreria_devuelve_conceptos_y_metodos_de_pago(app):
    response = app.test_client().get(
        "/api/tesoreria/catalogos",
        headers={"Authorization": f"Bearer {token_para(app)}"},
    )

    assert response.status_code == 200
    assert response.json["conceptosEgreso"]
    assert response.json["metodosPago"][0]["idMetodoPago"] == 1
    assert response.json["metodosPago"][0]["nombre"] == "Efectivo"


def test_tesoreria_suma_ventas_activas_y_egresos_registrados(app):
    with app.app_context():
        venta = Venta(
            idSucursal=1,
            idUsuario=9,
            idCliente=None,
            idTipoVenta=1,
            idMetodoPago=1,
            fechaHora=datetime(2026, 10, 14, 15, tzinfo=timezone.utc),
            subtotal=Decimal("100.00"),
            descuentoTotal=Decimal("0.00"),
            costoEnvio=Decimal("0.00"),
            total=Decimal("100.00"),
            activo=True,
        )
        db.session.add(venta)
        db.session.flush()
        db.session.add(Factura(
            idVenta=venta.idVenta,
            numeroFactura="FAC-TEST-1",
            fechaEmision=datetime(2026, 10, 14, 15, tzinfo=timezone.utc),
            valorTotal=Decimal("100.00"),
            activo=True,
        ))
        db.session.add(MovimientoTesoreria(
            idSucursal=1,
            idUsuario=9,
            idMetodoPago=1,
            concepto="Servicios",
            descripcion="Pago de energía",
            monto=Decimal("25.00"),
            fecha=datetime(2026, 10, 14, 15, tzinfo=timezone.utc),
            activo=True,
        ))
        db.session.commit()

    response = app.test_client().get(
        "/api/tesoreria/resumen?desde=2026-10-14&hasta=2026-10-14",
        headers={"Authorization": f"Bearer {token_para(app)}"},
    )
    movements = app.test_client().get(
        "/api/tesoreria/movimientos?desde=2026-10-14&hasta=2026-10-14&por_pagina=1",
        headers={"Authorization": f"Bearer {token_para(app)}"},
    )

    assert response.status_code == 200
    assert response.json["resumen"] == {
        "ingresos": 100.0,
        "egresos": 25.0,
        "balance": 75.0,
        "cantidadMovimientos": 2,
    }
    assert {item["tipo"] for item in response.json["movimientosRecientes"]} == {"ingreso", "egreso"}
    assert movements.status_code == 200
    assert movements.json["paginacion"]["total"] == 2
    assert movements.json["paginacion"]["paginas"] == 2
    assert len(movements.json["data"]) == 1


def test_registrar_egreso_valida_datos_y_rechaza_roles_no_admin(app):
    client = app.test_client()
    headers = {"Authorization": f"Bearer {token_para(app)}"}
    payload = {
        "idSucursal": 1,
        "idMetodoPago": 1,
        "concepto": "Servicios",
        "descripcion": "Pago de energía",
        "tercero": "Empresa de energía",
        "monto": "120000.00",
        "fecha": "2026-10-14",
    }

    created = client.post("/api/tesoreria/egresos", json=payload, headers=headers)
    assert created.status_code == 201

    invalid = client.post(
        "/api/tesoreria/egresos",
        json={**payload, "monto": "0"},
        headers=headers,
    )
    blank_description = client.post(
        "/api/tesoreria/egresos",
        json={**payload, "descripcion": "   "},
        headers=headers,
    )
    forbidden = client.get(
        "/api/tesoreria/resumen",
        headers={"Authorization": f"Bearer {token_para(app, 'vendedor')}"},
    )

    assert invalid.status_code == 400
    assert blank_description.status_code == 400
    assert forbidden.status_code == 403


def test_rechaza_periodo_tesoreria_invalido(app):
    response = app.test_client().get(
        "/api/tesoreria/resumen?desde=2026-10-15&hasta=2026-10-14",
        headers={"Authorization": f"Bearer {token_para(app)}"},
    )

    assert response.status_code == 400
    assert "desde" in response.json["error"]
