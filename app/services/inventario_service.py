from decimal import Decimal, InvalidOperation

from app.extensions import db
from app.models.inventario import Inventario

class InventarioService:

    @staticmethod
    def verificar_stock(id_producto, id_sucursal, cantidad_requerida):
        registro = Inventario.query.filter_by(idProducto=id_producto, idSucursal=id_sucursal).first()
        if not registro:
            return False
        return registro.CantidadDisponible >= Decimal(str(cantidad_requerida))

    @staticmethod
    def actualizar_existencias(id_producto, id_sucursal, cantidad, operacion):
        if operacion not in ("suma", "resta"):
            raise ValueError("Operación inválida. Debe ser 'suma' o 'resta'.")

        try:
            cantidad = Decimal(str(cantidad))
        except (InvalidOperation, TypeError, ValueError) as error:
            raise ValueError("La cantidad debe ser un número válido.") from error

        if not cantidad.is_finite() or cantidad < 0:
            raise ValueError("La cantidad debe ser un número positivo o cero.")

        registro = Inventario.query.filter_by(idProducto=id_producto, idSucursal=id_sucursal).first()

        # Si el producto llega por primera vez a la sucursal, creamos el registro base en 0
        if not registro:
            registro = Inventario(idProducto=id_producto, idSucursal=id_sucursal, CantidadDisponible=0)
            db.session.add(registro)

        # Aplicamos la operación lógica
        if operacion == "suma":
            registro.CantidadDisponible += cantidad
        else:
            if registro.CantidadDisponible < cantidad:
                raise ValueError("Stock insuficiente para realizar este ajuste de salida.")
            registro.CantidadDisponible -= cantidad

        db.session.commit()
        return registro

    @staticmethod
    def calcular_nivel_semaforo(cantidad):
        if cantidad > 10:
            return "verde"
        elif 6 <= cantidad <= 10:
            return "amarillo"
        else:  # <= 5
            return "rojo"