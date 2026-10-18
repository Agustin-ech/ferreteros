import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import db
from app.models.sucursal import Sucursal
from app.models.sucursal_usuario import SucursalUsuario
from app.models.tipo_documento import TipoDeDocumento
from app.models.tipo_usuario import TipoUsuario
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
        TipoDeDocumento.__table__,
        TipoUsuario.__table__,
        Sucursal.__table__,
        Usuario.__table__,
        SucursalUsuario.__table__,
    ]
    with application.app_context():
        db.metadata.create_all(bind=db.engine, tables=tables)
        db.session.add_all([
            TipoDeDocumento(idTipoDocumento=1, Acronimo="CC", nombre="Cédula", activo=True),
            TipoUsuario(idTipoUsuario=1, nombre="administrador", descripcion="Administración", activo=True),
            TipoUsuario(idTipoUsuario=2, nombre="vendedor", descripcion="Ventas", activo=True),
            Sucursal(idSucursal=1, nombreSucursal="Centro", direccion="Calle 1", activa=True),
            Sucursal(idSucursal=2, nombreSucursal="Norte", direccion="Calle 2", activa=True),
        ])
        db.session.flush()
        administrador = Usuario(
            idUsuario=1,
            idTipoDocumento=1,
            numeroDocumento="ADMIN-1",
            primerNombre="Ana",
            primerApellido="Admin",
            correoElectronico="admin@example.test",
            idTipoUsuario=1,
            password_hash="not-used-in-tests",
            activo=True,
        )
        db.session.add(administrador)
        db.session.commit()
        yield application
        db.session.remove()
        db.metadata.drop_all(bind=db.engine, tables=list(reversed(tables)))


def auth_headers(app, rol="admin", usuario_id="1"):
    with app.app_context():
        token = create_access_token(
            identity=usuario_id,
            additional_claims={"rol": rol, "idSucursal": None},
        )
    return {"Authorization": f"Bearer {token}"}


def empleado_payload(**overrides):
    payload = {
        "idTipoDocumento": 1,
        "numeroDocumento": " 123456 ",
        "primerNombre": " María ",
        "segundoNombre": "Elena",
        "primerApellido": "López",
        "segundoApellido": "Díaz",
        "correoElectronico": " MARIA@EXAMPLE.TEST ",
        "telefono": "3001234567",
        "idTipoUsuario": 2,
        "idSucursal": 1,
        "password": "ClaveTemporalSegura2026",
    }
    payload.update(overrides)
    return payload


def test_admin_crea_y_lista_empleado_sin_exponer_password(app):
    client = app.test_client()
    headers = auth_headers(app)

    creado = client.post("/usuarios", headers=headers, json=empleado_payload())
    listado = client.get("/usuarios", headers=headers)

    assert creado.status_code == 201, creado.json
    empleado = creado.json["usuario"]
    assert empleado["nombre"] == "María Elena López Díaz"
    assert empleado["numeroDocumento"] == "123456"
    assert empleado["correoElectronico"] == "maria@example.test"
    assert empleado["rol"] == "vendedor"
    assert empleado["idSucursal"] == 1
    assert empleado["sucursal"] == "Centro"
    assert "password" not in empleado
    assert "password_hash" not in empleado
    assert listado.status_code == 200
    assert len(listado.json) == 2
    assert "password_hash" not in listado.json[0]

    with app.app_context():
        empleado_db = Usuario.query.filter_by(numeroDocumento="123456").one()
        assert empleado_db.check_password("ClaveTemporalSegura2026")
        assert empleado_db.password_hash != "ClaveTemporalSegura2026"


def test_catalogos_y_actualizacion_de_empleado(app):
    client = app.test_client()
    headers = auth_headers(app)
    creado = client.post("/usuarios", headers=headers, json=empleado_payload())
    id_empleado = creado.json["usuario"]["idUsuario"]

    catalogos = client.get("/usuarios/catalogos", headers=headers)
    actualizado = client.patch(
        f"/usuarios/{id_empleado}",
        headers=headers,
        json={"idSucursal": 2, "telefono": "3117654321", "activo": False},
    )

    assert catalogos.status_code == 200
    assert {rol["nombre"] for rol in catalogos.json["roles"]} == {"administrador", "vendedor"}
    assert {sucursal["nombreSucursal"] for sucursal in catalogos.json["sucursales"]} == {"Centro", "Norte"}
    assert actualizado.status_code == 200
    assert actualizado.json["usuario"]["idSucursal"] == 2
    assert actualizado.json["usuario"]["sucursal"] == "Norte"
    assert actualizado.json["usuario"]["telefono"] == "3117654321"
    assert actualizado.json["usuario"]["activo"] is False


def test_empleados_exige_admin_y_rechaza_duplicados_y_datos_invalidos(app):
    client = app.test_client()

    assert client.get("/usuarios").status_code == 401
    assert client.post("/usuarios", json=empleado_payload()).status_code == 401
    assert client.get("/usuarios", headers=auth_headers(app, rol="vendedor")).status_code == 403

    headers = auth_headers(app)
    primero = client.post("/usuarios", headers=headers, json=empleado_payload())
    duplicado = client.post(
        "/usuarios",
        headers=headers,
        json=empleado_payload(numeroDocumento="999", correoElectronico="maria@example.test"),
    )
    sin_sucursal = client.post(
        "/usuarios",
        headers=headers,
        json=empleado_payload(numeroDocumento="888", correoElectronico="otra@example.test", idSucursal=None),
    )
    clave_corta = client.post(
        "/usuarios",
        headers=headers,
        json=empleado_payload(numeroDocumento="777", correoElectronico="corta@example.test", password="123"),
    )

    assert primero.status_code == 201, primero.json
    assert duplicado.status_code == 409
    assert sin_sucursal.status_code == 400
    assert clave_corta.status_code == 400


def test_no_permite_desactivar_la_propia_o_ultima_cuenta_administradora(app):
    client = app.test_client()
    headers = auth_headers(app)

    propia = client.patch("/usuarios/1", headers=headers, json={"activo": False})
    degradada = client.patch("/usuarios/1", headers=headers, json={"idTipoUsuario": 2})

    assert propia.status_code == 400
    assert degradada.status_code == 400
