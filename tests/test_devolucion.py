from decimal import Decimal

import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import db
from app.models.detalle_devolucion import DetalleDevolucion
from app.models.detalle_venta import DetalleVenta
from app.models.devoluciones import Devolucion
from app.models.factura import Factura
from app.models.inventario import Inventario
from app.models.producto import Producto
from app.models.tipo_devolucion import TipoDevolucion
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
		Producto.__table__,
		Inventario.__table__,
		Venta.__table__,
		DetalleVenta.__table__,
		Factura.__table__,
		TipoDevolucion.__table__,
		Devolucion.__table__,
		DetalleDevolucion.__table__,
	]
	with application.app_context():
		db.metadata.create_all(bind=db.engine, tables=tables)
		db.session.add_all([
			Producto(
				idProducto=1,
				idTipoProducto=1,
				idUnidadMedida=1,
				codigoSKU="DEV-001",
				nombre="Taladro",
				precio=Decimal("10.00"),
				costoUnitario=Decimal("5.00"),
			),
			Inventario(idInventario=1, idProducto=1, idSucursal=1, CantidadDisponible=Decimal("2.00")),
			Venta(
				idVenta=1,
				idSucursal=1,
				idUsuario=7,
				idCliente=None,
				idTipoVenta=1,
				idMetodoPago=1,
				subtotal=Decimal("30.00"),
				descuentoTotal=Decimal("0.00"),
				total=Decimal("30.00"),
			),
			Venta(
				idVenta=2,
				idSucursal=2,
				idUsuario=8,
				idCliente=None,
				idTipoVenta=1,
				idMetodoPago=1,
				subtotal=Decimal("10.00"),
				descuentoTotal=Decimal("0.00"),
				total=Decimal("10.00"),
			),
			DetalleVenta(
				idDetalleVenta=1,
				idVenta=1,
				idProducto=1,
				cantidad=Decimal("3.000"),
				precio_unitario=Decimal("10.00"),
				descuento=Decimal("0.00"),
				subtotal=Decimal("30.00"),
			),
			DetalleVenta(
				idDetalleVenta=2,
				idVenta=2,
				idProducto=1,
				cantidad=Decimal("1.000"),
				precio_unitario=Decimal("10.00"),
				descuento=Decimal("0.00"),
				subtotal=Decimal("10.00"),
			),
			Factura(idFactura=1, idVenta=1, numeroFactura="FAC-001", valorTotal=Decimal("30.00")),
			Factura(idFactura=2, idVenta=2, numeroFactura="FAC-002", valorTotal=Decimal("10.00")),
			TipoDevolucion(idTipoDevolucion=1, nombre="Garantía"),
		])
		db.session.commit()
		yield application
		db.session.remove()
		db.metadata.drop_all(bind=db.engine, tables=tables)


def token(app, rol="admin", sucursal_id=None, usuario_id=7):
	with app.app_context():
		access_token = create_access_token(
			identity=str(usuario_id),
			additional_claims={"rol": rol, "idSucursal": sucursal_id},
		)
	return {"Authorization": f"Bearer {access_token}"}


def payload(**overrides):
	data = {
		"idFactura": 1,
		"idTipoDevolucion": 1,
		"motivo": "Producto defectuoso",
		"detalles": [{
			"idDetalleVenta": 1,
			"cantidadDevuelta": 2,
			"productoApto": True,
		}],
	}
	data.update(overrides)
	return data


def test_registrar_devolucion_y_reingresar_stock_si_producto_apto(app):
	cliente = app.test_client()
	respuesta = cliente.post(
		"/api/devoluciones",
		json=payload(),
		headers=token(app),
	)

	assert respuesta.status_code == 201
	assert respuesta.json["data"]["montoTotal"] == 20.0
	assert respuesta.json["data"]["fechaDevolucion"]
	assert respuesta.json["data"]["detalles"][0]["idProducto"] == 1
	with app.app_context():
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("4.00")
		assert db.session.query(Devolucion).count() == 1


def test_producto_no_apto_no_se_reingresa_al_stock(app):
	cliente = app.test_client()
	respuesta = cliente.post(
		"/api/devoluciones",
		json=payload(detalles=[{
			"idDetalleVenta": 1,
			"cantidadDevuelta": 1,
			"productoApto": False,
		}]),
		headers=token(app),
	)

	assert respuesta.status_code == 201
	with app.app_context():
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("2.00")


@pytest.mark.parametrize("request_payload", [
	{"idFactura": 999, "idTipoDevolucion": 1, "motivo": "No existe factura", "detalles": [{
		"idDetalleVenta": 1, "cantidadDevuelta": 1, "productoApto": True,
	}]},
	{"idFactura": 1, "idTipoDevolucion": 1, "motivo": "Detalle ajeno", "detalles": [{
		"idDetalleVenta": 2, "cantidadDevuelta": 1, "productoApto": True,
	}]},
	{"idFactura": 1, "idTipoDevolucion": 1, "motivo": "Cantidad alta", "detalles": [{
		"idDetalleVenta": 1, "cantidadDevuelta": 4, "productoApto": True,
	}]},
])
def test_rechaza_factura_o_detalle_invalido_sin_cambios(app, request_payload):
	respuesta = app.test_client().post(
		"/api/devoluciones",
		json=request_payload,
		headers=token(app),
	)

	assert respuesta.status_code == 400
	with app.app_context():
		assert db.session.query(Devolucion).count() == 0
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("2.00")


def test_rechaza_detalle_repetido_y_vendedor_de_otra_sucursal(app):
	cliente = app.test_client()
	respuesta = cliente.post("/api/devoluciones", json=payload(), headers=token(app))
	assert respuesta.status_code == 201

	duplicada = cliente.post("/api/devoluciones", json=payload(), headers=token(app))
	fuera_sucursal = cliente.post(
		"/api/devoluciones",
		json=payload(idFactura=2, detalles=[{
			"idDetalleVenta": 2, "cantidadDevuelta": 1, "productoApto": True,
		}]),
		headers=token(app, rol="vendedor", sucursal_id=1, usuario_id=7),
	)

	assert duplicada.status_code == 400
	assert fuera_sucursal.status_code == 403


def test_fallo_al_confirmar_revierte_devolucion_y_stock(app, monkeypatch):
	def fallar_commit():
		raise RuntimeError("fallo simulado al confirmar")

	monkeypatch.setattr(db.session, "commit", fallar_commit)
	respuesta = app.test_client().post(
		"/api/devoluciones",
		json=payload(),
		headers=token(app),
	)

	assert respuesta.status_code == 500
	with app.app_context():
		assert db.session.query(Devolucion).count() == 0
		assert db.session.query(DetalleDevolucion).count() == 0
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("2.00")


def test_lectura_devolucion_respeta_sucursal_y_roles(app):
	cliente = app.test_client()
	creada = cliente.post("/api/devoluciones", json=payload(), headers=token(app))
	id_devolucion = creada.json["data"]["idDevolucion"]
	headers_vendedor = token(app, rol="vendedor", sucursal_id=2, usuario_id=8)

	assert cliente.get("/api/devoluciones", headers=headers_vendedor).json == []
	assert cliente.get(
		f"/api/devoluciones/{id_devolucion}", headers=headers_vendedor
	).status_code == 404
	assert cliente.get("/api/devoluciones", headers=token(app, rol="bodega")).status_code == 403
