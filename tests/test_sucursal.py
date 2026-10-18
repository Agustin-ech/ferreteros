from flask_jwt_extended import create_access_token
from types import SimpleNamespace

from app import create_app
from app.extensions import db
from app.models.sucursal import Sucursal
from tests.app_pruebas import crear_app_con_datos


def test_sucursal_api_esta_registrada_en_la_app():
    app = create_app()
    rutas = {regla.rule for regla in app.url_map.iter_rules()}

    assert "/api/sucursales" in rutas


def test_usuario_de_sucursal_solo_consulta_su_sucursal():
    app = crear_app_con_datos()
    with app.app_context():
        token = create_access_token(
            identity="1",
            additional_claims={"rol": "vendedor", "idSucursal": 1},
        )

    cliente = app.test_client()
    headers = {"Authorization": f"Bearer {token}"}

    respuesta = cliente.get("/api/sucursales", headers=headers)
    otra_sucursal = cliente.get("/api/sucursales/2", headers=headers)

    assert respuesta.status_code == 200
    assert [sucursal["idSucursal"] for sucursal in respuesta.json] == [1]
    assert otra_sucursal.status_code == 403


def test_rutas_de_escritura_de_sucursal_son_solo_para_admin():
    app = crear_app_con_datos()
    with app.app_context():
        token = create_access_token(
            identity="1",
            additional_claims={"rol": "vendedor", "idSucursal": 1},
        )

    respuesta = app.test_client().post(
        "/api/sucursales",
        json={"nombreSucursal": "Nueva", "direccion": "Calle 10"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert respuesta.status_code == 403


def test_listado_admin_filtra_sucursales_inactivas():
    app = crear_app_con_datos()
    with app.app_context():
        sucursal = db.session.get(Sucursal, 2)
        sucursal.activa = False
        db.session.commit()

    respuesta = app.test_client().get(
        "/api/sucursales",
        query_string={"solo_activas": "true"},
    )

    assert respuesta.status_code == 200
    assert [sucursal["idSucursal"] for sucursal in respuesta.json] == [1]


def test_sucursal_incluye_barrio_en_su_serializacion():
    sucursal = SimpleNamespace(
        idSucursal=1,
        nombreSucursal="Centro",
        direccion="Calle 1",
        barrio="San José",
        telefono=None,
        activa=True,
    )

    assert Sucursal.to_dict(sucursal)["barrio"] == "San José"


def test_barrio_de_sucursal_puede_ser_nulo():
    columna_barrio = Sucursal.__table__.columns["barrio"]

    assert columna_barrio.nullable is True
    assert columna_barrio.type.length == 50