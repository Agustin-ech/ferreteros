from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError
from sqlalchemy import desc
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.ajuste_inventario import AjusteInventario
from app.models.inventario import Inventario
from app.models.tipo_movimiento import TipoMovimiento
from app.models.transaccion_inventario import TransaccionInventario
from app.schemas.inventario_schema import (
    ajuste_inventario_schema,
    inventarios_schema,
    inventario_schema,
)
from app.services.inventario_service import InventarioService
from app.utils.decorators import requiere_rol
from app.utils.roles import normalizar_rol, sucursal_autorizada
from app.utils.permisos import AJUSTES, requiere_funcion

inventario_bp = Blueprint('inventario_bp', __name__, url_prefix='/api/inventario')

# a. GET /api/inventario?sucursal=<id> (Administrador: cualquier sucursal; Bodega: solo la suya)
@inventario_bp.route('', methods=['GET'])
@jwt_required()
@requiere_rol('admin', 'bodega', 'vendedor')
def consultar_existencias():
    # Obtener el parámetro de la URL si existe
    id_sucursal = request.args.get('sucursal', type=int)
    if request.args.get('sucursal') is not None and id_sucursal is None:
        return jsonify({"mensaje": "El parámetro sucursal debe ser un entero."}), 400

    claims = get_jwt()
    rol = normalizar_rol(claims.get("rol"))
    sucursal_usuario = claims.get("idSucursal")
    if rol != "admin":
        if sucursal_usuario is None:
            return jsonify({"mensaje": "El usuario no tiene una sucursal asignada."}), 403
        if id_sucursal is not None and not sucursal_autorizada(
            rol, sucursal_usuario, id_sucursal
        ):
            return jsonify({"mensaje": "No puede consultar inventario de otra sucursal."}), 403
        id_sucursal = int(sucursal_usuario)

    consulta = Inventario.query.options(joinedload(Inventario.producto))
    if id_sucursal:
        consulta = consulta.filter_by(idSucursal=id_sucursal)
    inventarios = consulta.all()

    resultados = inventarios_schema.dump(inventarios)

    # Inyectar el indicador visual del semáforo al vuelo (sin guardarlo en DB)
    for item in resultados:
        item['semaforo'] = InventarioService.calcular_nivel_semaforo(item['cantidadDisponible'])

    return jsonify(resultados), 200


# b. POST /api/inventario/ajustar (Administrador o bodega)
@inventario_bp.route('/ajustar', methods=['POST'])
@jwt_required()
@requiere_rol('admin', 'bodega')
@requiere_funcion(AJUSTES)
def ajustar_inventario():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"mensaje": "El cuerpo debe ser un objeto JSON válido."}), 400

    try:
        data = ajuste_inventario_schema.load(data)
    except ValidationError as error:
        return jsonify({"mensaje": "Datos de ajuste inválidos.", "errores": error.messages}), 400

    claims = get_jwt()
    if not sucursal_autorizada(
        normalizar_rol(claims.get("rol")),
        claims.get("idSucursal"),
        data["idSucursal"],
    ):
        return jsonify({"mensaje": "No puede ajustar inventario de otra sucursal."}), 403

    try:
        nuevo_registro = InventarioService.actualizar_existencias(
            id_producto=data['idProducto'],
            id_sucursal=data['idSucursal'],
            cantidad=data['cantidad'],
            operacion=data['operacion'],
            id_usuario=int(get_jwt_identity()),
            motivo=data['motivo'],
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


@inventario_bp.route('/ajustes', methods=['GET'])
@jwt_required()
@requiere_rol('admin')
def listar_ajustes_inventario():
    id_producto = request.args.get('producto', type=int)
    id_sucursal = request.args.get('sucursal', type=int)
    if not id_producto or not id_sucursal:
        return jsonify({"mensaje": "Debe indicar producto y sucursal."}), 400

    ajustes = (
        AjusteInventario.query
        .options(
            joinedload(AjusteInventario.usuario),
            joinedload(AjusteInventario.tipo_movimiento),
        )
        .join(Inventario, AjusteInventario.idInventario == Inventario.idInventario)
        .filter(
            Inventario.idProducto == id_producto,
            AjusteInventario.idSucursal == id_sucursal,
        )
        .order_by(desc(AjusteInventario.fecha))
        .limit(50)
    )

    resultado = []
    for ajuste in ajustes.all():
        usuario = ajuste.usuario
        resultado.append({
            **ajuste.to_dict(),
            "tipoMovimiento": ajuste.tipo_movimiento.nombre,
            "esEntrada": ajuste.stockNuevo > ajuste.stockAnterior,
            "nombreUsuario": " ".join(filter(None, (
                usuario.primerNombre,
                usuario.segundoNombre,
                usuario.primerApellido,
                usuario.segundoApellido,
            ))),
        })

    return jsonify(resultado), 200


@inventario_bp.route('/movimientos', methods=['GET'])
@jwt_required()
@requiere_rol('admin', 'bodega')
def listar_movimientos_inventario():
    def entero_opcional(nombre):
        valor = request.args.get(nombre)
        if valor is None or valor == "":
            return None, None
        try:
            return int(valor), None
        except ValueError:
            return None, f"El parámetro {nombre} debe ser un entero."

    id_sucursal, error = entero_opcional("sucursal")
    if error:
        return jsonify({"mensaje": error}), 400
    id_producto, error = entero_opcional("producto")
    if error:
        return jsonify({"mensaje": error}), 400
    pagina, error = entero_opcional("pagina")
    if error:
        return jsonify({"mensaje": error}), 400
    por_pagina, error = entero_opcional("por_pagina")
    if error:
        return jsonify({"mensaje": error}), 400

    pagina = 1 if pagina is None else pagina
    por_pagina = 50 if por_pagina is None else por_pagina
    if pagina < 1 or not 1 <= por_pagina <= 100:
        return jsonify({"mensaje": "La página debe ser positiva y por_pagina debe estar entre 1 y 100."}), 400

    tipo = request.args.get("tipo", "").strip()
    if tipo and tipo not in ("Entrada", "Salida"):
        return jsonify({"mensaje": "El tipo debe ser Entrada o Salida."}), 400

    try:
        desde = datetime.strptime(request.args["desde"], "%Y-%m-%d") if request.args.get("desde") else None
        hasta = datetime.strptime(request.args["hasta"], "%Y-%m-%d") if request.args.get("hasta") else None
    except ValueError:
        return jsonify({"mensaje": "Las fechas deben tener formato YYYY-MM-DD."}), 400
    if desde and hasta and desde > hasta:
        return jsonify({"mensaje": "La fecha desde no puede ser posterior a hasta."}), 400

    claims = get_jwt()
    if claims.get("rol") == "bodega":
        sucursal_usuario = claims.get("idSucursal")
        if sucursal_usuario is None:
            return jsonify({"mensaje": "Bodega no tiene una sucursal asignada."}), 403
        if id_sucursal is not None and id_sucursal != int(sucursal_usuario):
            return jsonify({"mensaje": "Bodega solo puede consultar movimientos de su sucursal."}), 403
        id_sucursal = int(sucursal_usuario)

    consulta = (
        TransaccionInventario.query
        .join(Inventario, TransaccionInventario.idInventario == Inventario.idInventario)
        .options(
            joinedload(TransaccionInventario.inventario).joinedload(Inventario.producto),
            joinedload(TransaccionInventario.tipo_movimiento),
            joinedload(TransaccionInventario.ajuste),
        )
    )
    if id_sucursal is not None:
        consulta = consulta.filter(Inventario.idSucursal == id_sucursal)
    if id_producto is not None:
        consulta = consulta.filter(Inventario.idProducto == id_producto)
    if tipo:
        consulta = consulta.join(
            TransaccionInventario.tipo_movimiento
        ).filter(TipoMovimiento.nombre == tipo)
    if desde:
        consulta = consulta.filter(TransaccionInventario.fecha >= desde)
    if hasta:
        consulta = consulta.filter(TransaccionInventario.fecha < hasta + timedelta(days=1))

    total = consulta.order_by(None).count()
    movimientos = (
        consulta
        .order_by(desc(TransaccionInventario.fecha), desc(TransaccionInventario.idTransaccionInventario))
        .offset((pagina - 1) * por_pagina)
        .limit(por_pagina)
        .all()
    )

    resultado = []
    for movimiento in movimientos:
        inventario = movimiento.inventario
        if movimiento.idVenta is not None:
            origen = "Venta"
            referencia = f"Venta #{movimiento.idVenta}"
            motivo = None
        elif movimiento.idDevolucion is not None:
            origen = "Devolución"
            referencia = f"Devolución #{movimiento.idDevolucion}"
            motivo = movimiento.devolucion.motivo if movimiento.devolucion else None
        elif movimiento.idPedidoProveedor is not None:
            origen = "Pedido a proveedor"
            referencia = f"Pedido #{movimiento.idPedidoProveedor}"
            motivo = None
        else:
            origen = "Ajuste de inventario"
            referencia = f"Ajuste #{movimiento.idAjusteInventario}"
            motivo = movimiento.ajuste.motivo if movimiento.ajuste else None

        producto = inventario.producto
        resultado.append({
            "idTransaccionInventario": movimiento.idTransaccionInventario,
            "fecha": movimiento.fecha.isoformat(),
            "idSucursal": inventario.idSucursal,
            "idProducto": inventario.idProducto,
            "codigoProducto": producto.codigoSKU if producto else None,
            "nombreProducto": producto.nombre if producto else None,
            "tipoMovimiento": movimiento.tipo_movimiento.nombre,
            "cantidad": float(movimiento.cantidad),
            "stockAnterior": float(movimiento.stockAnterior) if movimiento.stockAnterior is not None else None,
            "stockNuevo": float(movimiento.stockNuevo) if movimiento.stockNuevo is not None else None,
            "origen": origen,
            "referencia": referencia,
            "motivo": motivo,
        })

    return jsonify({
        "movimientos": resultado,
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
    }), 200