from decimal import Decimal

import pytest
from marshmallow import ValidationError
from sqlalchemy import text
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import db
from app.models.ajuste_inventario import AjusteInventario
from app.models.inventario import Inventario
from app.models.producto import Producto
from app.models.tipo_movimiento import TipoMovimiento
from app.models.transaccion_inventario import TransaccionInventario
from app.schemas.inventario_schema import (
	ajuste_inventario_schema,
	inventario_schema,
)
from app.services.inventario_service import InventarioService


@pytest.fixture
def app():
	class TestConfig:
		SQLALCHEMY_DATABASE_URI = "sqlite://"
		SQLALCHEMY_TRACK_MODIFICATIONS = False
		JWT_SECRET_KEY = "test-secret-key-for-inventory-tests-min-32-chars"
		TESTING = True

	application = create_app(TestConfig)
	with application.app_context():
		db.metadata.create_all(bind=db.engine, tables=[
			Inventario.__table__,
			TipoMovimiento.__table__,
			AjusteInventario.__table__,
			Producto.__table__,
		])
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
				"fecha" DATETIME NOT NULL
			)
		'''))
		db.session.commit()
		yield application
		db.session.remove()
		db.session.execute(text('DROP TABLE "TransaccionInventario"'))
		db.metadata.drop_all(bind=db.engine, tables=[
			AjusteInventario.__table__,
			TipoMovimiento.__table__,
			Inventario.__table__,
			Producto.__table__,
		])


def test_inventario_schema_maps_numeric_model_attribute(app):
	registro = Inventario(
		idInventario=1,
		idSucursal=2,
		idProducto=3,
		CantidadDisponible=Decimal("12.50"),
	)

	resultado = inventario_schema.dump(registro)

	assert resultado["cantidadDisponible"] == 12.5
	assert isinstance(resultado["cantidadDisponible"], float)


def test_inventario_schema_includes_product_name(app):
	producto = Producto(idProducto=3, nombre="Taladro")
	registro = Inventario(
		idInventario=1,
		idSucursal=2,
		idProducto=3,
		CantidadDisponible=Decimal("12.50"),
		producto=producto,
	)

	resultado = inventario_schema.dump(registro)

	assert resultado["nombreProducto"] == "Taladro"


def test_ajuste_inventario_service_uses_decimal_stock(app):
	db.session.add(
		Inventario(idProducto=3, idSucursal=2, CantidadDisponible=Decimal("12.50"))
	)
	db.session.commit()

	resultado = InventarioService.actualizar_existencias(3, 2, Decimal("1.25"), "suma")

	assert resultado.CantidadDisponible == Decimal("13.75")
	assert InventarioService.verificar_stock(3, 2, Decimal("13.75"))
	assert not InventarioService.verificar_stock(3, 2, Decimal("13.76"))


def test_ajuste_schema_rejects_negative_quantity_and_invalid_operation(app):
	with pytest.raises(ValidationError):
		ajuste_inventario_schema.load(
			{"idProducto": 3, "idSucursal": 2, "cantidad": -1, "operacion": "suma"}
		)

	with pytest.raises(ValidationError):
		ajuste_inventario_schema.load(
			{"idProducto": 3, "idSucursal": 2, "cantidad": 1, "operacion": "multiplica"}
		)

	with pytest.raises(ValidationError):
		ajuste_inventario_schema.load(
			{"idProducto": 3, "idSucursal": 2, "cantidad": 1, "operacion": "suma"}
		)


@pytest.mark.parametrize(
	("operacion", "stock_esperado", "tipo_transaccion"),
	[("suma", Decimal("13.75"), 1), ("resta", Decimal("11.25"), 2)],
)
def test_ajuste_route_persists_reason_stock_and_transaction(
	app, operacion, stock_esperado, tipo_transaccion
):
	db.session.add_all([
		Inventario(idProducto=3, idSucursal=2, CantidadDisponible=Decimal("12.50")),
		TipoMovimiento(idTipoMovimiento=1, nombre="Entrada"),
		TipoMovimiento(idTipoMovimiento=2, nombre="Salida"),
		TipoMovimiento(idTipoMovimiento=3, nombre="Ajuste"),
		Producto(
			idProducto=3,
			idTipoProducto=1,
			idUnidadMedida=1,
			codigoSKU="TEST-003",
			nombre="Producto de prueba",
			precio=Decimal("100"),
			costoUnitario=Decimal("50"),
		),
	])
	db.session.commit()

	with app.app_context():
		token = create_access_token(identity="9", additional_claims={"rol": "admin"})

	response = app.test_client().post(
		"/api/inventario/ajustar",
		json={
			"idProducto": 3,
			"idSucursal": 2,
			"cantidad": 1.25,
			"operacion": operacion,
			"motivo": "Corrección verificada",
		},
		headers={"Authorization": f"Bearer {token}"},
	)

	assert response.status_code == 200
	assert response.json["inventario_actualizado"]["cantidadDisponible"] == float(stock_esperado)
	ajuste = AjusteInventario.query.one()
	assert ajuste.idUser == 9
	assert ajuste.idTipoMovimiento == 3
	assert ajuste.motivo == "Corrección verificada"
	assert ajuste.estadoAutorizacion == "Autorizado"
	assert ajuste.stockAnterior == Decimal("12.50")
	assert ajuste.stockNuevo == stock_esperado
	transaccion = TransaccionInventario.query.one()
	assert transaccion.idAjusteInventario == ajuste.idAjusteInventario
	assert transaccion.idTipoMovimiento == tipo_transaccion
	assert transaccion.cantidad == Decimal("1.25")


def test_inventario_routes_are_registered_once(app):
	rutas = [
		rule.rule
		for rule in app.url_map.iter_rules()
		if rule.rule.startswith("/api/inventario")
	]

	assert rutas.count("/api/inventario") == 1
	assert rutas.count("/api/inventario/ajustar") == 1
