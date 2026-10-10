from decimal import Decimal, InvalidOperation

from app.extensions import db
from app.models.ajuste_inventario import AjusteInventario
from app.models.inventario import Inventario
from app.models.tipo_movimiento import TipoMovimiento
from app.models.transaccion_inventario import TransaccionInventario

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