from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.extensions import db
from app.models.detalle_devolucion import DetalleDevolucion
from app.models.detalle_venta import DetalleVenta
from app.models.devoluciones import Devolucion
from app.models.factura import Factura
from app.models.inventario import Inventario
from app.models.tipo_devolucion import TipoDevolucion
from app.models.venta import Venta

class DevolucionService:
    CENTAVO = Decimal("0.01")

    @staticmethod
    def procesar_devolucion(
        id_factura,
        id_usuario,
        id_tipo_devolucion,
        motivo,
        detalles_data,
        id_sucursal_usuario=None,
    ):
        try:
            factura = db.session.scalar(
                select(Factura)
                .where(Factura.idFactura == id_factura, Factura.activo.is_(True))
                .with_for_update()
            )
            if factura is None:
                raise ValueError("La factura no existe o está inactiva.")

            venta = db.session.get(Venta, factura.idVenta)
            if venta is None or not venta.activo:
                raise ValueError("La venta asociada a la factura no existe o está inactiva.")
            if id_sucursal_usuario is not None and venta.idSucursal != int(id_sucursal_usuario):
                raise PermissionError("Solo puede procesar devoluciones de su sucursal asignada.")

            tipo_devolucion = db.session.get(TipoDevolucion, id_tipo_devolucion)
            if tipo_devolucion is None or not tipo_devolucion.activo:
                raise ValueError("El tipo de devolución no existe o está inactivo.")

            ids_detalle = [item["idDetalleVenta"] for item in detalles_data]
            detalles_venta = db.session.scalars(
                select(DetalleVenta)
                .where(DetalleVenta.idDetalleVenta.in_(ids_detalle))
                .order_by(DetalleVenta.idDetalleVenta)
                .with_for_update()
            ).all()
            detalles_por_id = {detalle.idDetalleVenta: detalle for detalle in detalles_venta}
            detalles_existentes = set(db.session.scalars(
                select(DetalleDevolucion.idDetalleVenta).where(
                    DetalleDevolucion.idDetalleVenta.in_(ids_detalle)
                )
            ).all())

            detalles_procesados = []
            cantidades_reingreso = {}
            monto_total = Decimal("0.00")
            for item in detalles_data:
                id_detalle = item["idDetalleVenta"]
                detalle_venta = detalles_por_id.get(id_detalle)
                if detalle_venta is None or not detalle_venta.activo:
                    raise ValueError(f"El detalle de venta {id_detalle} no existe o está inactivo.")
                if detalle_venta.idVenta != venta.idVenta:
                    raise ValueError(f"El detalle de venta {id_detalle} no pertenece a la factura indicada.")
                if id_detalle in detalles_existentes:
                    raise ValueError(f"El detalle de venta {id_detalle} ya fue devuelto anteriormente.")

                cantidad_devuelta = item["cantidadDevuelta"]
                cantidad_vendida = Decimal(detalle_venta.cantidad)
                if cantidad_vendida <= 0:
                    raise ValueError(f"El detalle de venta {id_detalle} tiene una cantidad inválida.")
                if cantidad_devuelta > cantidad_vendida:
                    raise ValueError(
                        f"La cantidad a devolver ({cantidad_devuelta}) supera la comprada ({cantidad_vendida})."
                    )

                monto_detalle = (
                    Decimal(detalle_venta.subtotal) * cantidad_devuelta / cantidad_vendida
                ).quantize(DevolucionService.CENTAVO, rounding=ROUND_HALF_UP)
                monto_total += monto_detalle
                id_producto = detalle_venta.idProducto
                if item["productoApto"]:
                    cantidades_reingreso[id_producto] = (
                        cantidades_reingreso.get(id_producto, Decimal("0")) + cantidad_devuelta
                    )
                detalles_procesados.append({
                    "detalle_venta": detalle_venta,
                    "cantidadDevuelta": cantidad_devuelta,
                    "montoDevuelto": monto_detalle,
                    "productoApto": item["productoApto"],
                    "idProducto": id_producto,
                })

            inventarios = db.session.scalars(
                select(Inventario)
                .where(
                    Inventario.idSucursal == venta.idSucursal,
                    Inventario.idProducto.in_(sorted(cantidades_reingreso)),
                    Inventario.activo.is_(True),
                )
                .order_by(Inventario.idProducto)
                .with_for_update()
            ).all() if cantidades_reingreso else []
            inventarios_por_producto = {row.idProducto: row for row in inventarios}

            nueva_devolucion = Devolucion(
                idFactura=id_factura,
                idUsuario=id_usuario,
                idTipoDevolucion=id_tipo_devolucion,
                motivo=motivo,
                montoTotal=monto_total,
                aprobada=True,
            )
            db.session.add(nueva_devolucion)
            db.session.flush()

            for det in detalles_procesados:
                nueva_devolucion.detalles.append(DetalleDevolucion(
                    idDetalleVenta=det["detalle_venta"].idDetalleVenta,
                    idProducto=det["idProducto"],
                    cantidadDevuelta=det["cantidadDevuelta"],
                    montoDevuelto=det["montoDevuelto"],
                    productoApto=det["productoApto"],
                ))

            for id_producto, cantidad in cantidades_reingreso.items():
                inventario = inventarios_por_producto.get(id_producto)
                if inventario is None:
                    inventario = Inventario(
                        idProducto=id_producto,
                        idSucursal=venta.idSucursal,
                        CantidadDisponible=Decimal("0"),
                    )
                    db.session.add(inventario)
                inventario.CantidadDisponible += cantidad

            db.session.commit()
            return nueva_devolucion
        except IntegrityError as error:
            db.session.rollback()
            raise ValueError("Uno de los detalles ya fue devuelto anteriormente.") from error
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def listar_devoluciones(usuario, id_factura=None):
        consulta = select(Devolucion).join(Factura).join(Venta)
        if usuario.get("rol") != "admin":
            sucursal_id = usuario.get("sucursal_id")
            if sucursal_id is None:
                return []
            consulta = consulta.where(Venta.idSucursal == int(sucursal_id))
        if id_factura is not None:
            consulta = consulta.where(Devolucion.idFactura == id_factura)
        consulta = consulta.options(selectinload(Devolucion.detalles)).order_by(
            Devolucion.fecha.desc(), Devolucion.idDevolucion.desc()
        )
        return db.session.scalars(consulta).all()

    @staticmethod
    def obtener_devolucion(id_devolucion, usuario):
        consulta = select(Devolucion).join(Factura).join(Venta).where(
            Devolucion.idDevolucion == id_devolucion
        )
        if usuario.get("rol") != "admin":
            sucursal_id = usuario.get("sucursal_id")
            if sucursal_id is None:
                return None
            consulta = consulta.where(Venta.idSucursal == int(sucursal_id))
        return db.session.scalar(consulta.options(selectinload(Devolucion.detalles)))