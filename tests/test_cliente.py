from tests.app_pruebas import crear_app_con_datos
from app import create_app


def test_cliente_api_esta_registrada_en_la_app():
    app = create_app()
    rutas = {regla.rule for regla in app.url_map.iter_rules()}

    assert "/api/clientes" in rutas
    assert "/api/clientes/<int:cliente_id>" in rutas


def test_cliente_se_puede_crear_y_buscar():
    app = crear_app_con_datos()
    cliente = app.test_client()

    creado = cliente.post(
        "/api/clientes",
        json={
            "idTipoDocumento": 1,
            "numeroDocumento": "100000099",
            "primerNombre": "Ana",
            "primerApellido": "Pruebas",
            "correoElectronico": "ana@example.test",
        },
    )

    assert creado.status_code == 201
    assert creado.json["numeroDocumento"] == "100000099"

    listado = cliente.get(
        "/api/clientes",
        query_string={"q": "100000099", "pagina": 1, "por_pagina": 5},
    )

    assert listado.status_code == 200
    assert listado.json["total"] == 1
    assert listado.json["items"][0]["idCliente"] == creado.json["idCliente"]


def test_documento_de_cliente_no_se_puede_repetir():
    app = crear_app_con_datos()
    respuesta = app.test_client().post(
        "/api/clientes",
        json={
            "idTipoDocumento": 1,
            "numeroDocumento": "100000001",
            "primerNombre": "Otro",
            "primerApellido": "Cliente",
        },
    )

    assert respuesta.status_code == 409


def test_clientes_exige_jwt():
    app = crear_app_con_datos()

    respuesta = app.test_client().get(
        "/api/clientes",
        headers={"Authorization": "Bearer inválido"},
    )

    assert respuesta.status_code == 401


def test_cliente_invalido_devuelve_error_de_validacion():
    app = crear_app_con_datos()
    respuesta = app.test_client().post(
        "/api/clientes",
        json={
            "idTipoDocumento": 1,
            "numeroDocumento": "",
            "primerNombre": "Ana",
            "primerApellido": "Pruebas",
        },
    )

    assert respuesta.status_code == 400
    assert respuesta.json["error"] == "Datos inválidos."
