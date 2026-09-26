from flask import Flask
from app.config import Config
from app.extensions import db, migrate, jwt, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app)

    from app.models.usuario import Usuario
    from app.models.sucursal import Sucursal
    from app.models.tipo_documento import TipoDeDocumento
    from app.models.tipo_usuario import TipoUsuario

    # Registro de blueprints (descomentar a medida que los crees)
    # from app.routes.auth_routes import auth_bp
    # app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from app.routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp)

    return app