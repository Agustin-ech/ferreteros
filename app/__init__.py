from flask import Flask
from app.config import Config
from app.extensions import db, migrate, jwt, cors
from app.routes.usuario_routes import usuario_bp

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
    from app.models.funcion import Funcion
    from app.models.usuario_tipo_funcion import TipoUsuarioFuncion
    from app.models.sucursal_usuario import SucursalUsuario
    from app.models.tipo_producto import TipoProducto
    from app.models.producto import Producto
    from app.models.unidad_medida import UnidadMedida
    

    # Registro de blueprints (descomentar a medida que los crees)
    # from app.routes.auth_routes import auth_bp
    # app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from app.routes.auth_routes import auth_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(usuario_bp)

    return app