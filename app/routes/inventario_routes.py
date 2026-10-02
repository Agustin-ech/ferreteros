from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from sqlalchemy.orm import joinedload

from app.models.inventario import Inventario
from app.schemas.inventario_schema import (
    ajuste_inventario_schema,
    inventarios_schema,
    inventario_schema,
)
from app.services.inventario_service import InventarioService
from app.utils.decorators import requiere_rol

inventario_bp = Blueprint('inventario_bp', __name__, url_prefix='/api/inventario')

# a. GET /api/inventario?sucursal=<id> (Consultar existencias)
@inventario_bp.route('', methods=['GET'])
@jwt_required()
def consultar_existencias():
    # Obtener el parámetro de la URL si existe
    id_sucursal = request.args.get('sucursal', type=int)
    if request.args.get('sucursal') is not None and id_sucursal is None:
        return jsonify({"mensaje": "El parámetro sucursal debe ser un entero."}), 400

    consulta = Inventario.query.options(joinedload(Inventario.producto))
    if id_sucursal:
        consulta = consulta.filter_by(idSucursal=id_sucursal)
    inventarios = consulta.all()

    resultados = inventarios_schema.dump(inventarios)

    # Inyectar el indicador visual del semáforo al vuelo (sin guardarlo en DB)
    for item in resultados:
        item['semaforo'] = InventarioService.calcular_nivel_semaforo(item['cantidadDisponible'])

    return jsonify(resultados), 200


# b. POST /api/inventario/ajustar (Administrador)
@inventario_bp.route('/ajustar', methods=['POST'])
@jwt_required()
@requiere_rol('admin')  # Verificación estricta del claim
def ajustar_inventario():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"mensaje": "El cuerpo debe ser un objeto JSON válido."}), 400

    try:
        data = ajuste_inventario_schema.load(data)
    except ValidationError as error:
        return jsonify({"mensaje": "Datos de ajuste inválidos.", "errores": error.messages}), 400

    try:
        nuevo_registro = InventarioService.actualizar_existencias(
            id_producto=data['idProducto'],
            id_sucursal=data['idSucursal'],
            cantidad=data['cantidad'],
            operacion=data['operacion']
        )

        resultado = inventario_schema.dump(nuevo_registro)
        resultado['semaforo'] = InventarioService.calcular_nivel_semaforo(nuevo_registro.CantidadDisponible)

        return jsonify({
            "mensaje": "Ajuste de inventario realizado con éxito.",
            "inventario_actualizado": resultado
        }), 200

    except ValueError as e:
        # Atrapa los errores lanzados por el InventarioService (ej. Stock insuficiente)
        return jsonify({"mensaje": str(e)}), 400