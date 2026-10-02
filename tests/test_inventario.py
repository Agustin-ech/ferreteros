from decimal import Decimal

import pytest
from marshmallow import ValidationError

from app import create_app
from app.extensions import db
from app.models.inventario import Inventario
from app.models.producto import Producto
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
		JWT_SECRET_KEY = "test"
		TESTING = True

	application = create_app(TestConfig)
	with application.app_context():
		db.metadata.create_all(bind=db.engine, tables=[Inventario.__table__])
		yield application
		db.session.remove()
		db.metadata.drop_all(bind=db.engine, tables=[Inventario.__table__])


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


def test_inventario_routes_are_registered_once(app):
	rutas = [
		rule.rule
		for rule in app.url_map.iter_rules()
		if rule.rule.startswith("/api/inventario")
	]

	assert rutas.count("/api/inventario") == 1
	assert rutas.count("/api/inventario/ajustar") == 1
