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
    from app.models.inventario import Inventario
    from app.models.alerta_inventario import AlertaInventario
    from app.models.tipo_movimiento import TipoMovimiento
    from app.models.ajuste_inventario import AjusteInventario
    from app.models.cliente import Cliente
    from app.models.metodo_pago import MetodoPago
    from app.models.tipo_venta import TipoVenta
    from app.models.venta import Venta
    from app.models.detalle_venta import DetalleVenta
    from app.models.factura import Factura
    from app.models.entrega import Entrega
    from app.models.domicilio import Domicilio
    from app.models.proveedor import Proveedor
    from app.models.pedido_proveedor import PedidoProveedor
    from app.models.estado_pedido_proveedor import EstadoPedidoProveedor
    from app.models.reclamos_proveedor import ReclamoProveedor
    from app.models.tipo_devolucion import TipoDevolucion  
    from app.models.devoluciones import Devolucion
    from app.models.detalle_devolucion import DetalleDevolucion
    from app.models.transaccion_inventario import TransaccionInventario
    from app.models.mercancia_danada import MercanciaDanada
    from app.models.mercancia_danada import TipoDanio
    # Registro de blueprints (descomentar a medida que los crees)
    # from app.routes.auth_routes import auth_bp
    # app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from app.routes.auth_routes import auth_bp
    from app.routes.inventario_routes import inventario_bp
    from app.routes.producto_routes import producto_bp
    from app.routes.sucursal_routes import sucursal_bp
    from app.routes.venta_routes import venta_bp
    from app.routes.reporte_routes import reportes_bp
    from app.errors.reportes import registrar_handlers
    from app.routes.devolucion_routes import devolucion_bp
    from app.routes.domicilio_routes import domicilio_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(usuario_bp)
    app.register_blueprint(inventario_bp)
    app.register_blueprint(producto_bp)
    app.register_blueprint(sucursal_bp)
    app.register_blueprint(venta_bp)
    app.register_blueprint(reportes_bp)
    app.register_blueprint(devolucion_bp)
    app.register_blueprint(domicilio_bp)
    registrar_handlers(app)

    return app