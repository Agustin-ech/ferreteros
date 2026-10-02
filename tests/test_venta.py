from decimal import Decimal

import pytest

from app import create_app
from app.extensions import db
from app.models.detalle_venta import DetalleVenta
from app.models.factura import Factura
from app.models.inventario import Inventario
from app.models.metodo_pago import MetodoPago
from app.models.producto import Producto
from app.models.tipo_venta import TipoVenta
from app.models.venta import Venta
from app.schemas.venta_schema import venta_input_schema, venta_output_schema
from app.services.venta_service import VentaService


@pytest.fixture
def app():
	class TestConfig:
		SQLALCHEMY_DATABASE_URI = "sqlite://"
		SQLALCHEMY_TRACK_MODIFICATIONS = False
		JWT_SECRET_KEY = "test-secret-that-is-at-least-32-bytes-long"
		TESTING = True

	application = create_app(TestConfig)
	tables = [
		Producto.__table__,
		Inventario.__table__,
		TipoVenta.__table__,
		MetodoPago.__table__,
		Venta.__table__,
		DetalleVenta.__table__,
		Factura.__table__,
	]
	with application.app_context():
		db.metadata.create_all(bind=db.engine, tables=tables)
		db.session.add_all([
			Producto(
				idProducto=1,
				idTipoProducto=1,
				idUnidadMedida=1,
				codigoSKU="TEST-001",
				nombre="Taladro",
				precio=Decimal("10.10"),
				costoUnitario=Decimal("5.00"),
			),
			Inventario(
				idProducto=1,
				idSucursal=1,
				CantidadDisponible=Decimal("10.00"),
			),
			TipoVenta(idTipoVenta=1, nombre="Mostrador"),
			MetodoPago(idMetodoPago=1, nombre="Efectivo"),
		])
		db.session.commit()
		yield application
		db.session.remove()
		db.metadata.drop_all(bind=db.engine, tables=tables)


def payload_venta(**overrides):
	data = {
		"idCliente": None,
		"idSucursal": 1,
		"idTipoVenta": 1,
		"metodoPago": "Efectivo",
		"descuento": 1.15,
		"detalles": [{"idProducto": 1, "cantidad": 1.5}],
	}
	data.update(overrides)
	return data


def test_registrar_venta_persiste_modelos_y_descuenta_stock(app):
	with app.app_context():
		data = venta_input_schema.load(payload_venta())
		venta = VentaService.registrar_venta(
			data,
			{"id": 7, "rol": "admin", "sucursal_id": None},
		)

		assert venta.idUsuario == 7
		assert venta.idMetodoPago == 1
		assert venta.idTipoVenta == 1
		assert venta.subtotal == Decimal("15.15")
		assert venta.descuentoTotal == Decimal("1.15")
		assert venta.total == Decimal("14.00")
		assert len(venta.detalles) == 1
		assert venta.detalles[0].precio_unitario == Decimal("10.10")
		assert venta.detalles[0].descuento == Decimal("0.00")
		assert venta.factura.valorTotal == Decimal("14.00")
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("8.50")
		assert venta_output_schema.dump(venta)["detalles"][0]["nombreProducto"] == "Taladro"


def test_vendedor_no_puede_vender_en_otra_sucursal(app):
	with app.app_context():
		data = venta_input_schema.load(payload_venta(idSucursal=2))

		with pytest.raises(PermissionError):
			VentaService.registrar_venta(
				data,
				{"id": 8, "rol": "vendedor", "sucursal_id": 1},
			)

		assert db.session.query(Venta).count() == 0
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("10.00")


def test_falla_factura_reversa_venta_detalle_y_stock(app, monkeypatch):
	def fallar_factura(_venta):
		raise RuntimeError("fallo simulado al generar factura")

	monkeypatch.setattr(VentaService, "generar_factura", staticmethod(fallar_factura))

	with app.app_context():
		data = venta_input_schema.load(payload_venta())
		with pytest.raises(RuntimeError):
			VentaService.registrar_venta(
				data,
				{"id": 7, "rol": "admin", "sucursal_id": None},
			)

		assert db.session.query(Venta).count() == 0
		assert db.session.query(DetalleVenta).count() == 0
		assert db.session.query(Factura).count() == 0
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("10.00")


def test_endpoints_venta_post_lista_detalle_y_factura(app):
	from flask_jwt_extended import create_access_token

	with app.app_context():
		token = create_access_token(
			identity="7",
			additional_claims={"rol": "admin", "idSucursal": None},
		)

	client = app.test_client()
	headers = {"Authorization": f"Bearer {token}"}
	respuesta = client.post("/api/ventas", json=payload_venta(), headers=headers)

	assert respuesta.status_code == 201
	id_venta = respuesta.json["data"]["idVenta"]
	assert respuesta.json["data"]["factura"]["total"] == 14.0

	lista = client.get("/api/ventas?pagina=1&por_pagina=10", headers=headers)
	detalle = client.get(f"/api/ventas/{id_venta}", headers=headers)
	factura = client.get(f"/api/ventas/{id_venta}/factura", headers=headers)

	assert lista.status_code == 200
	assert lista.json["paginacion"]["total"] == 1
	assert detalle.status_code == 200
	assert detalle.json["idVenta"] == id_venta
	assert factura.status_code == 200
	assert factura.json["total"] == 14.0


def test_ruta_post_rechaza_sucursal_distinta_del_claim(app):
	from flask_jwt_extended import create_access_token

	with app.app_context():
		token = create_access_token(
			identity="8",
			additional_claims={"rol": "vendedor", "idSucursal": 1},
		)

	respuesta = app.test_client().post(
		"/api/ventas",
		json=payload_venta(idSucursal=2),
		headers={"Authorization": f"Bearer {token}"},
	)

	assert respuesta.status_code == 403
