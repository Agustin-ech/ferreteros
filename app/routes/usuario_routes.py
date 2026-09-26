from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.usuario import Usuario  # Ajusta la ruta de importación según tu estructura

# Definimos el Blueprint para agrupar las rutas de usuarios
usuario_bp = Blueprint('usuario_bp', __name__)

@usuario_bp.route('/usuarios', methods=['POST'])
def crear_usuario():
    """Ruta para registrar un nuevo usuario y probar la base de datos."""
    data = request.get_json()

    # Campos obligatorios mínimos para la prueba
    campos_requeridos = [
        'idTipoDocumento', 'numeroDocumento', 'primerNombre', 
        'primerApellido', 'correoElectronico', 'idTipoUsuario', 'password'
    ]
    
    for campo in campos_requeridos:
        if not data or campo not in data:
            return jsonify({'error': f'El campo obligatorio "{campo}" está ausente.'}), 400

    try:
        # Instanciar el modelo con los datos recibidos
        nuevo_usuario = Usuario(
            idTipoDocumento=data['idTipoDocumento'],
            numeroDocumento=data['numeroDocumento'],
            primerNombre=data['primerNombre'],
            segundoNombre=data.get('segundoNombre'),
            primerApellido=data['primerApellido'],
            segundoApellido=data.get('segundoApellido'),
            correoElectronico=data['correoElectronico'],
            telefono=data.get('telefono'),
            idTipoUsuario=data['idTipoUsuario']
        )
        
        # Encriptar la contraseña usando el método seguro del modelo
        nuevo_usuario.set_password(data['password'])

        # Guardar en la base de datos
        db.session.add(nuevo_usuario)
        db.session.commit()

        return jsonify({
            'mensaje': 'Usuario creado exitosamente en la base de datos',
            'usuario': nuevo_usuario.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@usuario_bp.route('/usuarios', methods=['GET'])
def listar_usuarios():
    """Ruta para listar todos los usuarios y verificar la conexión."""
    try:
        usuarios = Usuario.query.all()
        return jsonify([u.to_dict() for u in usuarios]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500