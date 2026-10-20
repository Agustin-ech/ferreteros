import pytest


@pytest.fixture(autouse=True)
def permisos_concedidos(request, monkeypatch):
    """Concede todos los permisos de Roles y permisos salvo que el test pida lo contrario.

    La mayoría de los tests crea solo las tablas de su módulo; los permisos se
    prueban aparte en test_permisos.py (marcados con @pytest.mark.permisos_reales).
    """
    if request.node.get_closest_marker("permisos_reales"):
        return
    monkeypatch.setattr("app.utils.permisos.tiene_funcion", lambda usuario_id, modulo: True)


@pytest.fixture(autouse=True)
def sesion_vigente(request, monkeypatch):
    """Da por vigente la sesión de los tokens de prueba salvo que el test pida lo contrario.

    Muchos tests firman tokens con roles y sucursales arbitrarios sin crear las
    tablas de usuarios y sucursales; la verificación real de sesión se prueba en
    test_sesion.py (marcados con @pytest.mark.sesion_real).
    """
    if request.node.get_closest_marker("sesion_real"):
        return
    monkeypatch.setattr("app.utils.sesion.usuario_de_sesion", lambda datos_token: object())


def pytest_configure(config):
    config.addinivalue_line("markers", "permisos_reales: usa la verificación real de permisos por rol")
    config.addinivalue_line("markers", "sesion_real: usa la verificación real de sesión vigente")
