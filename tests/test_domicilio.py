from decimal import Decimal

import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import db
from app.models.cliente import Cliente
from app.models.detalle_venta import DetalleVenta
from app.models.entrega import Entrega
from app.models.factura import Factura
from app.models.inventario import Inventario
from app.models.metodo_pago import MetodoPago
from app.models.producto import Producto
from app.models.sucursal import Sucursal
from app.models.tipo_venta import TipoVenta
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
			Cliente.__table__, Sucursal.__table__, Producto.__table__, Inventario.__table__,
			TipoVenta.__table__, MetodoPago.__table__, Venta.__table__, DetalleVenta.__table__,
			Factura.__table__, Entrega.__table__,
	]
	with application.app_context():
		db.metadata.create_all(bind=db.engine, tables=tables)
		db.session.add_all([
			Cliente(
				idCliente=1,
				idTipoDocumento=1,
				numeroDocumento="1001",
				primerNombre="Lina",
				primerApellido="Pruebas",
				direccion="Calle 10 # 2-3",
				barrio="San José",
			),
			Sucursal(
				idSucursal=1,
				nombreSucursal="Centro",
				direccion="Carrera 1",
				barrio="Centro",
			),
			Sucursal(
				idSucursal=2,
				nombreSucursal="San José",
				direccion="Carrera 2",
				barrio="San José",
			),
			Producto(
				idProducto=1,
				idTipoProducto=1,
				idUnidadMedida=1,
				codigoSKU="DOM-001",
				nombre="Martillo",
				precio=Decimal("25000.00"),
				costoUnitario=Decimal("12000.00"),
			),
			Inventario(
				idInventario=1,
				idProducto=1,
				idSucursal=1,
				CantidadDisponible=Decimal("10.00"),
			),
			Inventario(
				idInventario=2,
				idProducto=1,
				idSucursal=2,
				CantidadDisponible=Decimal("10.00"),
			),
			TipoVenta(idTipoVenta=1, nombre="Domicilio"),
			MetodoPago(idMetodoPago=1, nombre="Efectivo"),
		])
		db.session.commit()
		yield application
		db.session.remove()
		db.metadata.drop_all(bind=db.engine, tables=tables)


def auth_headers(app, rol="admin", sucursal_id=None):
	with app.app_context():
		token = create_access_token(
			identity="7",
			additional_claims={"rol": rol, "idSucursal": sucursal_id},
		)
	return {"Authorization": f"Bearer {token}"}


def domicilio_payload(**overrides):
	data = {
		"idCliente": 1,
		"idSucursal": 1,
		"idTipoVenta": 1,
		"metodoPago": "Efectivo",
		"detalles": [{"idProducto": 1, "cantidad": 2}],
	}
	data.update(overrides)
	return data


def test_domicilio_fuera_del_barrio_cobra_envio_en_factura_y_descuenta_stock(app):
	respuesta = app.test_client().post(
		"/api/domicilios",
		json=domicilio_payload(),
		headers=auth_headers(app),
	)

	assert respuesta.status_code == 201
	assert respuesta.json["data"]["costoEnvio"] == 5000.0
	assert respuesta.json["data"]["totalVenta"] == 55000.0
	assert respuesta.json["data"]["fechaFactura"]
	assert respuesta.json["data"]["direccionEntrega"] == "Calle 10 # 2-3"
	with app.app_context():
		venta = db.session.query(Venta).one()
		assert venta.costoEnvio == Decimal("5000.00")
		assert venta.total == Decimal("55000.00")
		assert db.session.query(Factura).count() == 1
		assert db.session.query(Entrega).count() == 1
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("8.00")


def test_domicilio_en_el_mismo_barrio_es_gratis_y_acepta_direccion_alternativa(app):
	respuesta = app.test_client().post(
		"/api/domicilios",
		json=domicilio_payload(idSucursal=2, direccionEntrega="Avenida 5"),
		headers=auth_headers(app),
	)

	assert respuesta.status_code == 201
	assert respuesta.json["data"]["costoEnvio"] == 0.0
	assert respuesta.json["data"]["totalVenta"] == 50000.0
	assert respuesta.json["data"]["direccionEntrega"] == "Avenida 5"
	with app.app_context():
		venta = db.session.query(Venta).one()
		assert venta.costoEnvio == Decimal("0.00")
		assert venta.total == Decimal("50000.00")
		assert db.session.get(Inventario, 2).CantidadDisponible == Decimal("8.00")


def test_vendedor_no_puede_crear_domicilio_para_otra_sucursal(app):
	respuesta = app.test_client().post(
		"/api/domicilios",
		json=domicilio_payload(idSucursal=2),
		headers=auth_headers(app, rol="vendedor", sucursal_id=1),
	)

	assert respuesta.status_code == 403
	with app.app_context():
		assert db.session.query(Venta).count() == 0
		assert db.session.get(Inventario, 2).CantidadDisponible == Decimal("10.00")


def test_get_domicilios_y_detalle_respetan_sucursal(app):
	cliente = app.test_client()
	creado = cliente.post(
		"/api/domicilios",
		json=domicilio_payload(),
		headers=auth_headers(app),
	)
	id_entrega = creado.json["data"]["idEntrega"]
	headers_otra_sucursal = auth_headers(app, rol="vendedor", sucursal_id=2)

	assert cliente.get("/api/domicilios", headers=headers_otra_sucursal).json == []
	assert cliente.get(
		f"/api/domicilios/{id_entrega}", headers=headers_otra_sucursal
	).status_code == 404
	assert cliente.get(f"/api/domicilios/{id_entrega}", headers=auth_headers(app)).status_code == 200


def test_error_de_entrega_revierte_venta_factura_y_stock(app, monkeypatch):
	def fallar_commit():
		raise RuntimeError("fallo simulado al confirmar")

	monkeypatch.setattr(db.session, "commit", fallar_commit)
	respuesta = app.test_client().post(
		"/api/domicilios",
		json=domicilio_payload(),
		headers=auth_headers(app),
	)

	assert respuesta.status_code == 500
	with app.app_context():
		assert db.session.query(Venta).count() == 0
		assert db.session.query(Factura).count() == 0
		assert db.session.query(Entrega).count() == 0
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("10.00")
