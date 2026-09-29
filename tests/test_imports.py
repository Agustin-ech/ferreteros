import importlib


def test_venta_routes_imports():
    mod = importlib.import_module('app.routes.venta_routes')
    assert hasattr(mod, 'venta_bp')
