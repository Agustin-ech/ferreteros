from app import create_app


def test_catalogos_producto_api_esta_registrada():
    class TestConfig:
        SQLALCHEMY_DATABASE_URI = "sqlite://"
        SQLALCHEMY_TRACK_MODIFICATIONS = False
        JWT_SECRET_KEY = "test-secret-key-for-product-tests-min-32-chars"
        TESTING = True

    app = create_app(TestConfig)
    reglas = {regla.rule for regla in app.url_map.iter_rules()}

    assert "/api/productos/catalogos" in reglas
