from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.cliente import Cliente
from app.models.entrega import Entrega
from app.models.sucursal import Sucursal
from app.models.venta import Venta
from app.services.venta_service import VentaService

class DomicilioService:
    TARIFA_FUERA_BARRIO = Decimal("5000.00")

    @staticmethod
    def calcular_tarifa(barrio_cliente, barrio_sucursal):
        if barrio_cliente and barrio_sucursal:
            cliente_normalizado = " ".join(barrio_cliente.split()).casefold()
            sucursal_normalizada = " ".join(barrio_sucursal.split()).casefold()
            if cliente_normalizado == sucursal_normalizada:
                return Decimal("0.00")
        return DomicilioService.TARIFA_FUERA_BARRIO

    @staticmethod
    def registrar_pedido_domicilio(data_validada, usuario):
        id_cliente = data_validada["idCliente"]
        id_sucursal = data_validada["idSucursal"]

        if usuario.get("rol") != "admin":
            sucursal_usuario = usuario.get("sucursal_id")
            if sucursal_usuario is None or int(sucursal_usuario) != id_sucursal:
                raise PermissionError("Solo puede registrar domicilios para su sucursal asignada.")
        try:
            cliente = db.session.get(Cliente, id_cliente)
            if cliente is None or not cliente.activo:
                raise ValueError("El cliente no existe o está inactivo.")

            sucursal = db.session.get(Sucursal, id_sucursal)
            if sucursal is None or not sucursal.activa:
                raise ValueError("La sucursal no existe o está inactiva.")

            direccion = data_validada.get("direccionEntrega") or cliente.direccion
            if not direccion or not direccion.strip():
                raise ValueError("El cliente debe tener una dirección o se debe enviar direccionEntrega.")

            costo_envio = DomicilioService.calcular_tarifa(cliente.barrio, sucursal.barrio)
            venta = VentaService.registrar_venta(
                data_validada,
                usuario,
                confirmar=False,
                cargo_adicional=costo_envio,
            )
            entrega = Entrega(
                idVenta=venta.idVenta,
                direccionEntrega=direccion.strip(),
                costoEnvio=costo_envio,
            )
            db.session.add(entrega)
            db.session.commit()
            return entrega
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def listar_domicilios(usuario):
        consulta = select(Entrega).join(Venta).options(
            joinedload(Entrega.venta).joinedload(Venta.factura)
        )
        if usuario.get("rol") != "admin":
            sucursal_id = usuario.get("sucursal_id")
            if sucursal_id is None:
                return []
            consulta = consulta.where(Venta.idSucursal == int(sucursal_id))
        return db.session.scalars(
            consulta.order_by(Entrega.fechaSolicitud.desc(), Entrega.idEntrega.desc())
        ).all()