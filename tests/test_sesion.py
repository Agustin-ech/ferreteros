import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import db
from app.models.funcion import Funcion
from app.models.sucursal import Sucursal
from app.models.sucursal_usuario import SucursalUsuario
from app.models.tipo_documento import TipoDeDocumento
from app.models.tipo_usuario import TipoUsuario
from app.models.usuario import Usuario
from app.models.usuario_tipo_funcion import TipoUsuarioFuncion

pytestmark = pytest.mark.sesion_real


class _Config:
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "test-secret-for-session-tests-at-least-32-chars"
    TESTING = True


@pytest.fixture
def app():
    application = create_app(_Config)
    tablas = [
        TipoDeDocumento.__table__, TipoUsuario.__table__, Usuario.__table__,
        Sucursal.__table__, SucursalUsuario.__table__,
        Funcion.__table__, TipoUsuarioFuncion.__table__,  # /api/auth/me incluye los permisos
    ]
    with application.app_context():
        db.metadata.create_all(bind=db.engine, tables=tablas)
        db.session.add_all([
            TipoDeDocumento(idTipoDocumento=1, Acronimo="CC", nombre="Cédula"),
            TipoUsuario(idTipoUsuario=1, nombre="administrador"),
            TipoUsuario(idTipoUsuario=2, nombre="vendedor"),
            Sucursal(idSucursal=1, nombreSucursal="Centro", direccion="Calle 1", barrio="Centro", telefono="1"),
            Sucursal(idSucursal=2, nombreSucursal="Norte", direccion="Calle 2", barrio="Norte", telefono="2"),
        ])
        vendedor = Usuario(idUsuario=1, idTipoDocumento=1, numeroDocumento="1", primerNombre="Vera",
                           primerApellido="Prueba", correoElectronico="vera@prueba.test", idTipoUsuario=2)
        vendedor.set_password("clave-de-prueba")
        db.session.add_all([vendedor, SucursalUsuario(idUsuario=1, idSucursal=1)])
        db.session.commit()
        yield application
        db.session.remove()
        db.metadata.drop_all(bind=db.engine, tables=tablas)


def _get_me(app, rol="vendedor", sucursal=1):
    with app.app_context():
        token = create_access_token(identity="1", additional_claims={"rol": rol, "idSucursal": sucursal})
    return app.test_client().get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})


def test_sesion_vigente_pasa(app):
    respuesta = _get_me(app)
    assert respuesta.status_code == 200


def test_usuario_desactivado_pierde_la_sesion(app):
    with app.app_context():
        db.session.get(Usuario, 1).activo = False
        db.session.commit()
    respuesta = _get_me(app)
    assert respuesta.status_code == 401
    assert "desactivado" in respuesta.json["mensaje"]


def test_cambio_de_rol_invalida_el_token_anterior(app):
    with app.app_context():
        db.session.get(Usuario, 1).idTipoUsuario = 1  # ahora es administrador
        db.session.commit()
    # El token viejo dice "vendedor": ya no es válido.
    assert _get_me(app, rol="vendedor").status_code == 401


def test_token_con_rol_falso_no_sirve(app):
    # Un vendedor que fabrique un token diciendo ser admin (con la clave correcta) es rechazado.
    assert _get_me(app, rol="admin", sucursal=None).status_code == 401


def test_cambio_de_sucursal_invalida_el_token_anterior(app):
    with app.app_context():
        asignacion = SucursalUsuario.query.filter_by(idUsuario=1).one()
        asignacion.idSucursal = 2
        db.session.commit()
    assert _get_me(app, sucursal=1).status_code == 401
    assert _get_me(app, sucursal=2).status_code == 200


def test_la_app_no_arranca_con_una_clave_jwt_corta():
    class ConfigDebil(_Config):
        JWT_SECRET_KEY = "una_clave_muy_segura"

    with pytest.raises(RuntimeError, match="32 caracteres"):
        create_app(ConfigDebil)
