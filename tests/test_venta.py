from decimal import Decimal

import pytest
from sqlalchemy import text

from app import create_app
from app.extensions import db
from app.models.cliente import Cliente
from app.models.detalle_venta import DetalleVenta
from app.models.factura import Factura
from app.models.inventario import Inventario
from app.models.metodo_pago import MetodoPago
from app.models.producto import Producto
from app.models.tipo_movimiento import TipoMovimiento
from app.models.transaccion_inventario import TransaccionInventario
from app.models.tipo_devolucion import TipoDevolucion
from app.models.tipo_documento import TipoDeDocumento
from app.models.tipo_usuario import TipoUsuario
from app.models.tipo_venta import TipoVenta
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
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
		TipoDeDocumento.__table__,
		TipoUsuario.__table__,
		Sucursal.__table__,
		Cliente.__table__,
		Usuario.__table__,
		TipoVenta.__table__,
		MetodoPago.__table__,
		TipoDevolucion.__table__,
		Venta.__table__,
		DetalleVenta.__table__,
		Factura.__table__,
		TipoMovimiento.__table__,
	]
	with application.app_context():
		db.metadata.create_all(bind=db.engine, tables=tables)
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
			MetodoPago(idMetodoPago=2, nombre="Transferencia"),
			TipoMovimiento(idTipoMovimiento=1, nombre="Entrada"),
			TipoMovimiento(idTipoMovimiento=2, nombre="Salida"),
			TipoDevolucion(idTipoDevolucion=1, nombre="Cambio"),
			TipoDeDocumento(idTipoDocumento=1, Acronimo="CC", nombre="Cédula"),
			TipoUsuario(idTipoUsuario=1, nombre="vendedor"),
			Sucursal(
				idSucursal=1,
				nombreSucursal="Sucursal Prueba",
				direccion="Calle 1 # 2-3",
				barrio="Centro",
				telefono="3001234567",
			),
			Usuario(
				idUsuario=7,
				idTipoDocumento=1,
				numeroDocumento="789",
				primerNombre="Vendedor",
				primerApellido="Prueba",
				correoElectronico="vendedor@example.test",
				idTipoUsuario=1,
				password_hash="hash",
			),
			Cliente(
				idCliente=1,
				idTipoDocumento=1,
				numeroDocumento="123",
				primerNombre="Ana",
				primerApellido="Prueba",
			),
			Cliente(
				idCliente=2,
				idTipoDocumento=1,
				numeroDocumento="456",
				primerNombre="Ana",
				primerApellido="Inactiva",
				activo=False,
			),
		])
		db.session.commit()
		yield application
		db.session.remove()
		db.session.execute(text('DROP TABLE "TransaccionInventario"'))
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
		assert venta.costoEnvio == Decimal("0.00")
		assert len(venta.detalles) == 1
		assert venta.detalles[0].precio_unitario == Decimal("10.10")
		assert venta.detalles[0].descuento == Decimal("0.00")
		assert venta.factura.valorTotal == Decimal("14.00")
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("8.50")
		movimiento = db.session.query(TransaccionInventario).one()
		assert movimiento.idVenta == venta.idVenta
		assert movimiento.idTipoMovimiento == 2
		assert movimiento.cantidad == Decimal("1.50")
		assert movimiento.stockAnterior == Decimal("10.00")
		assert movimiento.stockNuevo == Decimal("8.50")
		respuesta = venta_output_schema.dump(venta)
		assert respuesta["detalles"][0]["nombreProducto"] == "Taladro"
		assert respuesta["nombreVendedor"] == "Vendedor Prueba"
		assert respuesta["activo"] is True
		assert respuesta["factura"]["activo"] is True


def test_venta_aplica_descuento_del_producto_automaticamente(app):
	with app.app_context():
		db.session.get(Producto, 1).descuentoPorcentaje = Decimal("10")
		db.session.commit()

		data = venta_input_schema.load(payload_venta(descuento=0, detalles=[{"idProducto": 1, "cantidad": 2}]))
		venta = VentaService.registrar_venta(
			data,
			{"id": 7, "rol": "admin", "sucursal_id": None},
		)

		# 2 x 10.10 = 20.20 bruto; 10 % = 2.02 de descuento.
		assert venta.subtotal == Decimal("20.20")
		assert venta.descuentoTotal == Decimal("2.02")
		assert venta.total == Decimal("18.18")
		assert venta.detalles[0].precio_unitario == Decimal("10.10")
		assert venta.detalles[0].descuento == Decimal("2.02")
		assert venta.detalles[0].subtotal == Decimal("18.18")
		assert venta.factura.valorTotal == Decimal("18.18")


def test_descuento_manual_se_suma_al_del_producto(app):
	with app.app_context():
		db.session.get(Producto, 1).descuentoPorcentaje = Decimal("10")
		db.session.commit()

		data = venta_input_schema.load(payload_venta(descuento=1, detalles=[{"idProducto": 1, "cantidad": 2}]))
		venta = VentaService.registrar_venta(
			data,
			{"id": 7, "rol": "admin", "sucursal_id": None},
		)

		assert venta.descuentoTotal == Decimal("3.02")
		assert venta.total == Decimal("17.18")


def test_solo_admin_asigna_descuento_a_producto(app):
	from flask_jwt_extended import create_access_token

	with app.app_context():
		token_bodega = create_access_token(identity="7", additional_claims={"rol": "bodega", "idSucursal": 1})
		token_admin = create_access_token(identity="7", additional_claims={"rol": "admin", "idSucursal": None})

	client = app.test_client()
	respuesta = client.put(
		"/api/productos/1",
		json={"descuentoPorcentaje": 15},
		headers={"Authorization": f"Bearer {token_bodega}"},
	)
	assert respuesta.status_code == 403

	respuesta = client.put(
		"/api/productos/1",
		json={"descuentoPorcentaje": 15},
		headers={"Authorization": f"Bearer {token_admin}"},
	)
	assert respuesta.status_code == 200
	assert respuesta.json["descuentoPorcentaje"] == 15
	assert respuesta.json["precioConDescuento"] == 8.59

	respuesta = client.put(
		"/api/productos/1",
		json={"descuentoPorcentaje": 101},
		headers={"Authorization": f"Bearer {token_admin}"},
	)
	assert respuesta.status_code == 400

	# Un PUT que no envía el descuento (como el de bodega) no lo borra.
	respuesta = client.put(
		"/api/productos/1",
		json={"precio": 10.10},
		headers={"Authorization": f"Bearer {token_bodega}"},
	)
	assert respuesta.status_code == 200
	assert respuesta.json["descuentoPorcentaje"] == 15


def _token_admin(app):
	from flask_jwt_extended import create_access_token

	with app.app_context():
		return create_access_token(identity="7", additional_claims={"rol": "admin", "idSucursal": None})


def test_venta_sin_conexion_no_se_duplica_al_reintentar(app):
	headers = {"Authorization": f"Bearer {_token_admin(app)}"}
	client = app.test_client()
	payload = payload_venta(
		descuento=0,
		idOperacion="7b0c4f5e-offline-0001",
		comprobanteProvisional="OFF-1-7-0001",
		fechaOffline="2026-10-19T15:30:00+00:00",
	)

	from datetime import datetime, timezone
	from unittest.mock import patch

	ahora = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)
	with patch("app.services.venta_service.datetime") as reloj:
		reloj.now.return_value = ahora
		primera = client.post("/api/ventas", json=payload, headers=headers)
		segunda = client.post("/api/ventas", json=payload, headers=headers)

	assert primera.status_code == 201
	assert segunda.status_code == 200
	assert segunda.json["duplicada"] is True
	assert segunda.json["data"]["idVenta"] == primera.json["data"]["idVenta"]
	assert primera.json["data"]["comprobanteProvisional"] == "OFF-1-7-0001"
	with app.app_context():
		assert db.session.query(Venta).count() == 1
		venta = db.session.query(Venta).one()
		# Se conserva la hora real en que se vendió sin conexión.
		assert venta.fechaHora.replace(tzinfo=None) == datetime(2026, 10, 19, 15, 30)
		# El stock se descontó una sola vez.
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("8.50")


def test_buscar_venta_por_comprobante_provisional_o_factura(app):
	headers = {"Authorization": f"Bearer {_token_admin(app)}"}
	client = app.test_client()
	creada = client.post("/api/ventas", headers=headers, json=payload_venta(
		idOperacion="op-devolucion-0001", comprobanteProvisional="OFF-1-7-0009"))
	assert creada.status_code == 201
	numero_factura = creada.json["data"]["factura"]["numeroFactura"]
	client.post("/api/ventas", headers=headers, json=payload_venta())  # otra venta, no debe aparecer

	por_comprobante = client.get("/api/ventas?factura=off-1-7-0009&pagina=1&por_pagina=5", headers=headers)
	por_factura = client.get(f"/api/ventas?factura={numero_factura}&pagina=1&por_pagina=5", headers=headers)
	inexistente = client.get("/api/ventas?factura=OFF-9-9-9999&pagina=1&por_pagina=5", headers=headers)

	assert [v["idVenta"] for v in por_comprobante.json["data"]] == [creada.json["data"]["idVenta"]]
	assert [v["idVenta"] for v in por_factura.json["data"]] == [creada.json["data"]["idVenta"]]
	assert inexistente.json["data"] == []


def test_venta_sin_conexion_rechaza_fechas_en_el_futuro_o_muy_viejas(app):
	headers = {"Authorization": f"Bearer {_token_admin(app)}"}
	client = app.test_client()
	futura = client.post("/api/ventas", headers=headers, json=payload_venta(
		idOperacion="op-futura-0001", fechaOffline="2999-01-01T00:00:00+00:00"))
	vieja = client.post("/api/ventas", headers=headers, json=payload_venta(
		idOperacion="op-vieja-00001", fechaOffline="2000-01-01T00:00:00+00:00"))
	assert futura.status_code == 400
	assert "futuro" in futura.json["mensaje"]
	assert vieja.status_code == 400
	with app.app_context():
		assert db.session.query(Venta).count() == 0


def test_vendedor_no_puede_aplicar_descuento_manual(app):
	with app.app_context():
		# Un vendedor que envía "descuento" directo a la API (la pantalla no lo permite).
		data = venta_input_schema.load(payload_venta(descuento=15.15))
		with pytest.raises(PermissionError, match="administrador"):
			VentaService.registrar_venta(data, {"id": 7, "rol": "vendedor", "sucursal_id": 1})
		assert db.session.query(Venta).count() == 0
		assert db.session.get(Inventario, 1).CantidadDisponible == Decimal("10.00")

		# Sin descuento manual el vendedor vende normal (el descuento del producto sigue aplicando).
		venta = VentaService.registrar_venta(
			venta_input_schema.load(payload_venta(descuento=0)),
			{"id": 7, "rol": "vendedor", "sucursal_id": 1},
		)
		assert venta.descuentoTotal == Decimal("0.00")


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
	respuesta = client.post(
		"/api/ventas",
		json=payload_venta(idCliente=1),
		headers=headers,
	)

	assert respuesta.status_code == 201
	id_venta = respuesta.json["data"]["idVenta"]
	assert respuesta.json["data"]["factura"]["total"] == 14.0
	assert respuesta.json["data"]["nombreVendedor"] == "Vendedor Prueba"
	assert respuesta.json["data"]["nombreCliente"] == "Ana Prueba"

	lista = client.get("/api/ventas?pagina=1&por_pagina=10", headers=headers)
	detalle = client.get(f"/api/ventas/{id_venta}", headers=headers)
	factura = client.get(f"/api/ventas/{id_venta}/factura", headers=headers)
	usuarios = client.get("/api/usuarios/nombres", headers=headers)
	cliente_respuesta = client.get("/api/clientes/1", headers=headers)

	assert lista.status_code == 200
	assert lista.json["paginacion"]["total"] == 1
	assert lista.json["data"][0]["activo"] is True
	assert lista.json["data"][0]["nombreVendedor"] == "Vendedor Prueba"
	assert lista.json["data"][0]["nombreCliente"] == "Ana Prueba"
	busqueda_factura = client.get(
		f"/api/ventas?factura={factura.json['numeroFactura']}",
		headers=headers,
	)

	assert lista.json["data"][0]["clienteNombre"] == "Ana Prueba"
	assert busqueda_factura.status_code == 200
	assert busqueda_factura.json["paginacion"]["total"] == 1
	assert busqueda_factura.json["data"][0]["factura"]["numeroFactura"] == factura.json["numeroFactura"]
	assert detalle.status_code == 200
	assert detalle.json["idVenta"] == id_venta
	assert factura.status_code == 200
	assert factura.json["total"] == 14.0
	assert factura.json["activo"] is True
	assert cliente_respuesta.status_code == 200
	assert cliente_respuesta.json["primerNombre"] == "Ana"
	assert cliente_respuesta.json["primerApellido"] == "Prueba"
	assert usuarios.status_code == 200
	assert usuarios.json["data"][0] == {
		"idUsuario": 7,
		"nombre": "Vendedor Prueba",
	}
	assert factura.json["cliente"]["numeroDocumento"] == "123"
	assert factura.json["sucursal"]["nombre"] == "Sucursal Prueba"
	assert factura.json["vendedor"]["nombre"] == "Vendedor Prueba"
	assert factura.json["tipoVenta"] == "Mostrador"
	assert factura.json["medioPago"] == "Efectivo"
	assert factura.json["fechaVenta"]
	assert float(factura.json["subtotal"]) == 15.15
	assert float(factura.json["descuento"]) == 1.15
	assert float(factura.json["costoEnvio"]) == 0
	assert factura.json["detalles"][0]["codigoSKU"] == "TEST-001"
	assert float(factura.json["detalles"][0]["precioUnitario"]) == 10.1


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


def test_listado_ventas_rechaza_vendedor_sin_sucursal(app):
	from flask_jwt_extended import create_access_token

	with app.app_context():
		token = create_access_token(
			identity="7",
			additional_claims={"rol": "vendedor", "idSucursal": None},
		)

	respuesta = app.test_client().get(
		"/api/ventas",
		headers={"Authorization": f"Bearer {token}"},
	)

	assert respuesta.status_code == 403
	assert "sucursal activa asignada" in respuesta.json["mensaje"]


def test_catalogos_y_busqueda_de_clientes_activos(app):
	from flask_jwt_extended import create_access_token

	with app.app_context():
		token = create_access_token(
			identity="7",
			additional_claims={"rol": "vendedor", "idSucursal": 1},
		)

	client = app.test_client()
	headers = {"Authorization": f"Bearer {token}"}
	catalogos = client.get("/api/catalogos", headers=headers)
	clientes = client.get("/api/clientes?q=Ana", headers=headers)

	assert catalogos.status_code == 200
	assert catalogos.json["tiposVenta"] == [{"idTipoVenta": 1, "nombre": "Mostrador"}]
	assert catalogos.json["metodosPago"] == [
		{"idMetodoPago": 1, "nombre": "Efectivo"},
		{"idMetodoPago": 2, "nombre": "Transferencia"},
	]
	assert catalogos.json["tiposDevolucion"] == [{"idTipoDevolucion": 1, "nombre": "Cambio"}]
	assert catalogos.json["tiposDocumento"] == [
		{"idTipoDocumento": 1, "acronimo": "CC", "nombre": "Cédula"}
	]
	assert clientes.status_code == 200
	assert [cliente["idCliente"] for cliente in clientes.json["items"]] == [1]

	cliente_por_documento = client.get(
		"/api/clientes?documento=123",
		headers=headers,
	)
	assert cliente_por_documento.status_code == 200
	assert cliente_por_documento.json["items"][0]["idCliente"] == 1

	nuevo_cliente = client.post(
		"/api/clientes",
		json={
			"idTipoDocumento": 1,
			"numeroDocumento": "999",
			"primerNombre": "Luis",
			"primerApellido": "Nuevo",
			"direccion": "Calle 1",
		},
		headers=headers,
	)
	assert nuevo_cliente.status_code == 201
	assert nuevo_cliente.json["idCliente"] is not None

	venta_con_cliente = client.post(
		"/api/ventas",
		# Vendedor: sin descuento manual (solo el administrador puede aplicarlo).
		json=payload_venta(idCliente=nuevo_cliente.json["idCliente"], descuento=0),
		headers=headers,
	)
	assert venta_con_cliente.status_code == 201
	assert venta_con_cliente.json["data"]["idCliente"] == nuevo_cliente.json["idCliente"]


def test_listado_ventas_filtra_por_metodo_pago(app):
	from flask_jwt_extended import create_access_token

	with app.app_context():
		token = create_access_token(
			identity="7",
			additional_claims={"rol": "admin", "idSucursal": None},
		)

	client = app.test_client()
	headers = {"Authorization": f"Bearer {token}"}
	for metodo in ("Efectivo", "Transferencia"):
		respuesta = client.post(
			"/api/ventas",
			json=payload_venta(metodoPago=metodo),
			headers=headers,
		)
		assert respuesta.status_code == 201

	efectivo = client.get("/api/ventas?metodoPago=Efectivo", headers=headers)
	transferencia = client.get("/api/ventas?metodoPago=transferencia", headers=headers)
	todas = client.get("/api/ventas", headers=headers)

	assert efectivo.status_code == 200
	assert efectivo.json["paginacion"]["total"] == 1
	assert efectivo.json["data"][0]["metodoPago"] == "Efectivo"
	assert transferencia.status_code == 200
	assert transferencia.json["paginacion"]["total"] == 1
	assert transferencia.json["data"][0]["metodoPago"] == "Transferencia"
	assert todas.status_code == 200
	assert todas.json["paginacion"]["total"] == 2
