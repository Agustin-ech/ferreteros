from decimal import Decimal

import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import db
from app.models.funcion import Funcion
from app.models.producto import Producto
from app.models.tipo_documento import TipoDeDocumento
from app.models.tipo_usuario import TipoUsuario
from app.models.usuario import Usuario
from app.models.usuario_tipo_funcion import TipoUsuarioFuncion
from app.schemas.usuario_schema import usuario_schema

pytestmark = pytest.mark.permisos_reales


@pytest.fixture
def app():
    class TestConfig:
        SQLALCHEMY_DATABASE_URI = "sqlite://"
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        JWT_SECRET_KEY = "test-secret-for-permission-tests-min-32-chars"
        TESTING = True

    application = create_app(TestConfig)
    tablas = [
        TipoDeDocumento.__table__,
        TipoUsuario.__table__,
        Usuario.__table__,
        Funcion.__table__,
        TipoUsuarioFuncion.__table__,
        Producto.__table__,
    ]
    with application.app_context():
        db.metadata.create_all(bind=db.engine, tables=tablas)
        db.session.add_all([
            TipoDeDocumento(idTipoDocumento=1, Acronimo="CC", nombre="Cédula"),
            TipoUsuario(idTipoUsuario=1, nombre="administrador"),
            TipoUsuario(idTipoUsuario=2, nombre="bodega"),
            Funcion(idFuncion=1, modulo="PRODUCTOS", nombre="Gestionar productos e inventario"),
            Funcion(idFuncion=2, modulo="AJUSTES", nombre="Autorizar ajustes de inventario"),
            Funcion(idFuncion=3, modulo="MERMAS", nombre="Registrar mercancía dañada", activo=False),
            TipoUsuarioFuncion(idTipoUsuario=2, idFuncion=1),
            TipoUsuarioFuncion(idTipoUsuario=2, idFuncion=3),
            Producto(
                idProducto=1, idTipoProducto=1, idUnidadMedida=1, codigoSKU="P-1",
                nombre="Martillo", precio=Decimal("10.00"), costoUnitario=Decimal("5.00"),
            ),
        ])
        for id_usuario, tipo, nombre in ((1, 1, "Admin"), (2, 2, "Bodega")):
            usuario = Usuario(
                idUsuario=id_usuario, idTipoDocumento=1, numeroDocumento=str(id_usuario),
                primerNombre=nombre, primerApellido="Prueba",
                correoElectronico=f"{nombre.lower()}@example.test", idTipoUsuario=tipo,
            )
            usuario.set_password("clave-actual-1")
            db.session.add(usuario)
        db.session.commit()
        yield application
        db.session.remove()
        db.metadata.drop_all(bind=db.engine, tables=tablas)


def _headers(app, usuario_id, rol):
    with app.app_context():
        token = create_access_token(identity=str(usuario_id), additional_claims={"rol": rol, "idSucursal": 1})
    return {"Authorization": f"Bearer {token}"}


def test_rol_sin_permiso_recibe_403_y_con_permiso_pasa(app):
    client = app.test_client()
    bodega = _headers(app, 2, "bodega")

    # Bodega tiene PRODUCTOS: puede editar productos.
    respuesta = client.put("/api/productos/1", json={"nombre": "Martillo grande"}, headers=bodega)
    assert respuesta.status_code == 200

    # Bodega no tiene AJUSTES: el ajuste se bloquea antes de tocar el inventario.
    respuesta = client.post("/api/inventario/ajustar", json={}, headers=bodega)
    assert respuesta.status_code == 403
    assert "permiso" in respuesta.json["mensaje"]


def test_permiso_inactivo_no_cuenta(app):
    client = app.test_client()
    # MERMAS está asignado a bodega, pero la función está inactiva.
    respuesta = client.get("/api/v1/mercancia-danada/tipos-danio", headers=_headers(app, 2, "bodega"))
    assert respuesta.status_code == 403


def test_admin_tiene_acceso_total_aunque_su_rol_no_tenga_el_permiso(app):
    client = app.test_client()
    respuesta = client.put("/api/productos/1", json={"nombre": "Martillo"}, headers=_headers(app, 1, "admin"))
    assert respuesta.status_code == 200


def test_cambio_de_permisos_aplica_sin_volver_a_iniciar_sesion(app):
    client = app.test_client()
    bodega = _headers(app, 2, "bodega")
    assert client.put("/api/productos/1", json={"nombre": "X"}, headers=bodega).status_code == 200

    with app.app_context():
        TipoUsuarioFuncion.query.filter_by(idTipoUsuario=2, idFuncion=1).delete()
        db.session.commit()

    assert client.put("/api/productos/1", json={"nombre": "Y"}, headers=bodega).status_code == 403


def test_perfil_incluye_codigos_de_modulo_activos(app):
    with app.app_context():
        modulos = usuario_schema.modulos_rol(db.session.get(Usuario, 2))
    assert modulos == ["PRODUCTOS"]


def test_usuario_cambia_su_propia_contrasena(app):
    client = app.test_client()
    bodega = _headers(app, 2, "bodega")

    respuesta = client.post("/api/auth/cambiar-password", headers=bodega,
                            json={"passwordActual": "incorrecta", "passwordNueva": "clave-nueva-2"})
    assert respuesta.status_code == 400
    assert "actual" in respuesta.json["mensaje"]

    respuesta = client.post("/api/auth/cambiar-password", headers=bodega,
                            json={"passwordActual": "clave-actual-1", "passwordNueva": "corta"})
    assert respuesta.status_code == 400

    respuesta = client.post("/api/auth/cambiar-password", headers=bodega,
                            json={"passwordActual": "clave-actual-1", "passwordNueva": "clave-actual-1"})
    assert respuesta.status_code == 400

    respuesta = client.post("/api/auth/cambiar-password", headers=bodega,
                            json={"passwordActual": "clave-actual-1", "passwordNueva": "clave-nueva-2"})
    assert respuesta.status_code == 200
    with app.app_context():
        usuario = db.session.get(Usuario, 2)
        assert usuario.check_password("clave-nueva-2")
        assert not usuario.check_password("clave-actual-1")
