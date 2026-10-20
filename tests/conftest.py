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


def pytest_configure(config):
    config.addinivalue_line("markers", "permisos_reales: usa la verificación real de permisos por rol")
