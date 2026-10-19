from decimal import Decimal, InvalidOperation

from app.errors.negocio import StockInsuficiente
from app.extensions import db
from app.models.ajuste_inventario import AjusteInventario
from app.models.inventario import Inventario
from app.models.tipo_movimiento import TipoMovimiento
from app.models.transaccion_inventario import TransaccionInventario


def dec(valor) -> Decimal:
    """Convierte una cantidad a Decimal y rechaza valores no numéricos o no finitos."""
    try:
        resultado = Decimal(str(valor))
    except (InvalidOperation, TypeError, ValueError) as error:
        raise ValueError("La cantidad debe ser un número válido.") from error
    if not resultado.is_finite():
        raise ValueError("La cantidad debe ser un número finito.")
    return resultado


def existencias(db_ext, id_producto, id_sucursal) -> Decimal:
    """Devuelve las existencias del producto en la sucursal, o cero si no hay fila."""
    cantidad = (
        db_ext.session.query(Inventario.CantidadDisponible)
        .filter_by(idProducto=id_producto, idSucursal=id_sucursal)
        .scalar()
    )
    return dec(cantidad) if cantidad is not None else Decimal("0")


def costo_de(producto) -> Decimal:
    """Obtiene el costo unitario vigente del producto como Decimal."""
    return dec(producto.costoUnitario)


def ajustar_inventario(
    db_ext,
    id_producto,
    id_sucursal,
    diferencia,
    *,
    motivo,
    id_usuario=None,
    crear_si_falta=False,
):
    """Aplica una variación al inventario y registra su ajuste sin confirmar la sesión."""
    diferencia = dec(diferencia)
    if diferencia == 0:
        raise ValueError("El ajuste debe cambiar el stock en una cantidad mayor que cero.")
    if not motivo or not motivo.strip() or len(motivo.strip()) > 255:
        raise ValueError("El motivo debe contener entre 1 y 255 caracteres.")

    inventario = (
        db_ext.session.query(Inventario)
        .filter_by(idProducto=id_producto, idSucursal=id_sucursal)
        .with_for_update()
        .first()
    )
    if inventario is None:
        if diferencia < 0 or not crear_si_falta:
            raise StockInsuficiente("No existe inventario suficiente para realizar el ajuste.")
        inventario = Inventario(
            idProducto=id_producto,
            idSucursal=id_sucursal,
            CantidadDisponible=Decimal("0"),
        )
        db_ext.session.add(inventario)
        db_ext.session.flush()

    anterior = dec(inventario.CantidadDisponible)
    nuevo = anterior + diferencia
    if nuevo < 0:
        raise StockInsuficiente("No hay existencias suficientes para descontar la mercancía dañada.")
    inventario.CantidadDisponible = nuevo

    if id_usuario is None:
        db_ext.session.flush()
        return None

    tipo_ajuste = TipoMovimiento.query.filter_by(nombre="Ajuste").first()
    tipo_movimiento = TipoMovimiento.query.filter_by(
        nombre="Entrada" if diferencia > 0 else "Salida"
    ).first()
    if tipo_ajuste is None or tipo_movimiento is None:
        raise ValueError("Faltan tipos de movimiento requeridos (Ajuste, Entrada o Salida).")

    db_ext.session.flush()
    ajuste = AjusteInventario(
        idInventario=inventario.idInventario,
        idSucursal=id_sucursal,
        idUser=id_usuario,
        idTipoMovimiento=tipo_ajuste.idTipoMovimiento,
        cantidadAjustada=abs(diferencia),
        stockAnterior=anterior,
        stockNuevo=nuevo,
        motivo=motivo.strip(),
        estadoAutorizacion="Autorizado",
    )
    db_ext.session.add(ajuste)
    db_ext.session.flush()
    db_ext.session.add(TransaccionInventario(
        idInventario=inventario.idInventario,
        idTipoMovimiento=tipo_movimiento.idTipoMovimiento,
        idAjusteInventario=ajuste.idAjusteInventario,
        cantidad=abs(diferencia),
    ))
    db_ext.session.flush()
    return ajuste


class InventarioService:

    @staticmethod
    def verificar_stock(id_producto, id_sucursal, cantidad_requerida):
        registro = Inventario.query.filter_by(idProducto=id_producto, idSucursal=id_sucursal).first()
        if not registro:
            return False
        return registro.CantidadDisponible >= Decimal(str(cantidad_requerida))

    @staticmethod
    def actualizar_existencias(
        id_producto,
        id_sucursal,
        cantidad,
        operacion,
        id_usuario=None,
        motivo=None,
    ):
        if operacion not in ("suma", "resta"):
            raise ValueError("Operación inválida. Debe ser 'suma' o 'resta'.")

        try:
            cantidad = Decimal(str(cantidad))
        except (InvalidOperation, TypeError, ValueError) as error:
            raise ValueError("La cantidad debe ser un número válido.") from error

        if not cantidad.is_finite() or cantidad < 0:
            raise ValueError("La cantidad debe ser un número positivo o cero.")
        if cantidad == 0:
            raise ValueError("El ajuste debe cambiar el stock en una cantidad mayor que cero.")

        if (id_usuario is None) != (motivo is None):
            raise ValueError("El usuario y el motivo son obligatorios para auditar el ajuste.")
        if motivo is not None:
            motivo = motivo.strip()
            if len(motivo) < 3 or len(motivo) > 255:
                raise ValueError("El motivo debe contener entre 3 y 255 caracteres.")

        registro = (
            Inventario.query.filter_by(idProducto=id_producto, idSucursal=id_sucursal)
            .with_for_update()
            .first()
        )

        # Si el producto llega por primera vez a la sucursal, creamos el registro base en 0
        if not registro:
            registro = Inventario(idProducto=id_producto, idSucursal=id_sucursal, CantidadDisponible=0)
            db.session.add(registro)

        stock_anterior = Decimal(str(registro.CantidadDisponible))

        if operacion == "suma":
            registro.CantidadDisponible += cantidad
        else:
            if registro.CantidadDisponible < cantidad:
                db.session.rollback()
                raise ValueError("Stock insuficiente para realizar este ajuste de salida.")
            registro.CantidadDisponible -= cantidad

        if id_usuario is not None:
            tipo_ajuste = TipoMovimiento.query.filter_by(nombre="Ajuste").first()
            nombre_transaccion = "Entrada" if operacion == "suma" else "Salida"
            tipo_transaccion = TipoMovimiento.query.filter_by(nombre=nombre_transaccion).first()
            if tipo_ajuste is None or tipo_transaccion is None:
                db.session.rollback()
                raise ValueError("Faltan tipos de movimiento requeridos (Ajuste, Entrada o Salida).")

            db.session.flush()
            ajuste = AjusteInventario(
                idInventario=registro.idInventario,
                idSucursal=id_sucursal,
                idUser=id_usuario,
                idTipoMovimiento=tipo_ajuste.idTipoMovimiento,
                cantidadAjustada=cantidad,
                stockAnterior=stock_anterior,
                stockNuevo=Decimal(str(registro.CantidadDisponible)),
                motivo=motivo.strip(),
                estadoAutorizacion="Autorizado",
            )
            db.session.add(ajuste)
            db.session.flush()
            db.session.add(TransaccionInventario(
                idInventario=registro.idInventario,
                idTipoMovimiento=tipo_transaccion.idTipoMovimiento,
                idAjusteInventario=ajuste.idAjusteInventario,
                cantidad=cantidad,
                stockAnterior=stock_anterior,
                stockNuevo=Decimal(str(registro.CantidadDisponible)),
            ))

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return registro

    @staticmethod
    def calcular_nivel_semaforo(cantidad):
        if cantidad > 10:
            return "verde"
        elif 6 <= cantidad <= 10:
            return "amarillo"
        else:  # <= 5
            return "rojo"