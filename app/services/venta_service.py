"""Servicio de ventas.

Reglas que implementa:
  RFF-01  La venta se guarda íntegra: total = suma de subtotales - descuento,
          stock descontado exacto, medio de pago válido, 1 factura por venta y
          rollback total si algo falla a mitad de camino.
  RFF-04  Se registra en pocas consultas (1 de productos + 1 de inventario) y
          se bloquean las filas de inventario con SELECT ... FOR UPDATE para
          que ventas simultáneas del mismo producto no dejen stock negativo.
  RFF-06  Un usuario que no es administrador solo opera sobre su sucursal.

`usuario` es un dict con: id, rol ('admin' | 'vendedor' | 'bodega'), sucursal_id.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload, selectinload

from app.extensions import db
from app.models.cliente import Cliente
from app.models.detalle_venta import DetalleVenta
from app.models.factura import Factura
from app.models.inventario import Inventario
from app.models.metodo_pago import MetodoPago
from app.models.producto import Producto
from app.models.tipo_movimiento import TipoMovimiento
from app.models.tipo_venta import TipoVenta
from app.models.transaccion_inventario import TransaccionInventario
from app.models.venta import Venta

class VentaService:
    CENTAVO = Decimal("0.01")
    # Ventas sin conexión: se aceptan hasta 7 días después (y no en el futuro).
    MAX_ATRASO_OFFLINE = timedelta(days=7)
    TOLERANCIA_RELOJ = timedelta(minutes=5)

    @staticmethod
    def buscar_por_operacion(id_operacion):
        if not id_operacion:
            return None
        return db.session.scalar(select(Venta).where(Venta.idOperacion == id_operacion))

    @staticmethod
    def _fecha_offline(fecha):
        if fecha is None:
            return None
        ahora = datetime.now(timezone.utc)
        if fecha > ahora + VentaService.TOLERANCIA_RELOJ:
            raise ValueError("La fecha de la venta sin conexión está en el futuro. Revisa la hora del dispositivo.")
        if fecha < ahora - VentaService.MAX_ATRASO_OFFLINE:
            raise ValueError("La venta sin conexión tiene más de 7 días; regístrala de nuevo o consulta al administrador.")
        return fecha

    @staticmethod
    def registrar_venta(data_validada, usuario, *, confirmar=True, cargo_adicional=Decimal("0.00")):
        id_sucursal = data_validada["idSucursal"]
        if usuario.get("rol") != "admin":
            sucursal_usuario = usuario.get("sucursal_id")
            if sucursal_usuario is None or int(sucursal_usuario) != id_sucursal:
                raise PermissionError("Solo puede registrar ventas en su sucursal asignada.")

        try:
            fecha_offline = VentaService._fecha_offline(data_validada.get("fechaOffline"))
            items = data_validada["detalles"]
            cantidades_por_producto = {}
            for item in items:
                id_producto = item["idProducto"]
                cantidades_por_producto[id_producto] = (
                    cantidades_por_producto.get(id_producto, Decimal("0"))
                    + item["cantidad"]
                )

            ids_producto = sorted(cantidades_por_producto)
            productos = db.session.scalars(
                select(Producto).where(
                    Producto.idProducto.in_(ids_producto),
                    Producto.activo.is_(True),
                )
            ).all()
            productos_por_id = {producto.idProducto: producto for producto in productos}
            for id_producto in ids_producto:
                if id_producto not in productos_por_id:
                    raise ValueError(f"El producto con ID {id_producto} no existe o está inactivo.")

            inventarios = db.session.scalars(
                select(Inventario)
                .where(
                    Inventario.idSucursal == id_sucursal,
                    Inventario.idProducto.in_(ids_producto),
                    Inventario.activo.is_(True),
                )
                .order_by(Inventario.idProducto)
                .with_for_update()
            ).all()
            inventarios_por_producto = {row.idProducto: row for row in inventarios}
            for id_producto, cantidad in cantidades_por_producto.items():
                inventario = inventarios_por_producto.get(id_producto)
                if inventario is None or inventario.CantidadDisponible < cantidad:
                    producto = productos_por_id[id_producto]
                    raise ValueError(
                        f"Stock insuficiente para '{producto.nombre}' en la sucursal {id_sucursal}."
                    )

            tipo_venta = db.session.get(TipoVenta, data_validada["idTipoVenta"])
            if not tipo_venta or not tipo_venta.activo:
                raise ValueError("El tipo de venta no existe o está inactivo.")

            nombre_metodo_pago = data_validada["metodoPago"].strip().lower()
            metodo_pago = db.session.scalar(
                select(MetodoPago).where(func.lower(MetodoPago.nombre) == nombre_metodo_pago)
            )
            if not metodo_pago or not metodo_pago.activo:
                raise ValueError("El método de pago no existe o está inactivo.")

            id_cliente = data_validada.get("idCliente")
            if id_cliente is not None:
                cliente = db.session.get(Cliente, id_cliente)
                if not cliente or not cliente.activo:
                    raise ValueError("El cliente no existe o está inactivo.")

            # El descuento del producto lo fija el administrador y se aplica
            # aquí, no desde el cliente. Venta.subtotal guarda el valor bruto y
            # descuentoTotal suma los descuentos de producto y el manual; el
            # subtotal de cada detalle queda neto para que las devoluciones
            # reembolsen lo que realmente se pagó.
            detalles_calculados = []
            subtotal_venta = Decimal("0.00")
            descuento_productos = Decimal("0.00")
            for item in items:
                producto = productos_por_id[item["idProducto"]]
                cantidad = item["cantidad"]
                bruto = (producto.precio * cantidad).quantize(
                    VentaService.CENTAVO,
                    rounding=ROUND_HALF_UP,
                )
                porcentaje = Decimal(str(producto.descuentoPorcentaje or 0))
                descuento_linea = (bruto * porcentaje / 100).quantize(
                    VentaService.CENTAVO,
                    rounding=ROUND_HALF_UP,
                )
                subtotal_venta += bruto
                descuento_productos += descuento_linea
                detalles_calculados.append({
                    "idProducto": producto.idProducto,
                    "cantidad": cantidad,
                    "precio_unitario": producto.precio,
                    "descuento": descuento_linea,
                    "subtotal": bruto - descuento_linea,
                })

            descuento_manual = data_validada["descuento"].quantize(
                VentaService.CENTAVO,
                rounding=ROUND_HALF_UP,
            )
            # El descuento manual no tiene tope por producto: solo el administrador
            # puede aplicarlo (un vendedor podría dejar la venta en $0 llamando a la API).
            if descuento_manual > 0 and usuario.get("rol") != "admin":
                raise PermissionError("Solo el administrador puede aplicar descuentos manuales.")
            if descuento_manual > subtotal_venta - descuento_productos:
                raise ValueError("El descuento no puede ser mayor al total de la venta.")
            descuento = descuento_productos + descuento_manual

            cargo_adicional = Decimal(str(cargo_adicional)).quantize(
                VentaService.CENTAVO,
                rounding=ROUND_HALF_UP,
            )
            if not cargo_adicional.is_finite() or cargo_adicional < 0:
                raise ValueError("El cargo adicional debe ser un monto válido y no negativo.")
            total_final = subtotal_venta - descuento + cargo_adicional
            nueva_venta = Venta(
                idCliente=id_cliente,
                idSucursal=id_sucursal,
                idUsuario=usuario["id"],
                idTipoVenta=tipo_venta.idTipoVenta,
                idMetodoPago=metodo_pago.idMetodoPago,
                subtotal=subtotal_venta,
                descuentoTotal=descuento,
                costoEnvio=cargo_adicional,
                total=total_final,
                idOperacion=data_validada.get("idOperacion"),
                comprobanteProvisional=data_validada.get("comprobanteProvisional"),
            )
            if fecha_offline is not None:
                nueva_venta.fechaHora = fecha_offline
            db.session.add(nueva_venta)
            db.session.flush()

            for detalle in detalles_calculados:
                nueva_venta.detalles.append(
                    DetalleVenta(
                        idProducto=detalle["idProducto"],
                        cantidad=detalle["cantidad"],
                        precio_unitario=detalle["precio_unitario"],
                        descuento=detalle["descuento"],
                        subtotal=detalle["subtotal"],
                    )
                )

            tipo_salida = db.session.scalar(
                select(TipoMovimiento).where(TipoMovimiento.nombre == "Salida")
            )
            if tipo_salida is None:
                raise ValueError("No está configurado el tipo de movimiento 'Salida'.")

            for id_producto, cantidad in cantidades_por_producto.items():
                inventario = inventarios_por_producto[id_producto]
                stock_anterior = Decimal(str(inventario.CantidadDisponible))
                inventario.CantidadDisponible -= cantidad
                db.session.add(TransaccionInventario(
                    idInventario=inventario.idInventario,
                    idTipoMovimiento=tipo_salida.idTipoMovimiento,
                    idVenta=nueva_venta.idVenta,
                    cantidad=cantidad,
                    stockAnterior=stock_anterior,
                    stockNuevo=Decimal(str(inventario.CantidadDisponible)),
                    fecha=nueva_venta.fechaHora,
                ))

            nueva_venta.factura = VentaService.generar_factura(nueva_venta)
            if confirmar:
                db.session.commit()
            else:
                db.session.flush()
            return nueva_venta
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def generar_factura(venta):
        return Factura(
            numeroFactura=f"FAC-{uuid.uuid4().hex[:8].upper()}",
            fechaEmision=datetime.now(timezone.utc),
            valorTotal=venta.total,
        )

    @staticmethod
    def listar_ventas(usuario, filtros, pagina, por_pagina):
        consulta = VentaService._consulta_visible(usuario)
        if filtros.get("idSucursal") is not None:
            consulta = consulta.where(Venta.idSucursal == filtros["idSucursal"])
        if filtros.get("idCliente") is not None:
            consulta = consulta.where(Venta.idCliente == filtros["idCliente"])
        if filtros.get("desde") is not None:
            consulta = consulta.where(Venta.fechaHora >= filtros["desde"])
        if filtros.get("hasta") is not None:
            consulta = consulta.where(Venta.fechaHora < filtros["hasta"])
        if filtros.get("factura") is not None:
            # Acepta el número de factura oficial o el del comprobante provisional
            # que se entregó en una venta sin conexión (OFF-...).
            numero = filtros["factura"].upper()
            consulta = consulta.outerjoin(Factura).where(or_(
                func.upper(Factura.numeroFactura) == numero,
                func.upper(Venta.comprobanteProvisional) == numero,
            ))
        if filtros.get("metodoPago") is not None:
            consulta = consulta.join(Venta.metodo_pago).where(
                func.lower(MetodoPago.nombre) == filtros["metodoPago"].casefold()
            )

        total = db.session.scalar(select(func.count()).select_from(consulta.subquery())) or 0
        ventas = db.session.scalars(
            consulta.options(
                selectinload(Venta.detalles).joinedload(DetalleVenta.producto),
                joinedload(Venta.factura),
                joinedload(Venta.cliente),
                joinedload(Venta.usuario),
            )
            .order_by(Venta.fechaHora.desc(), Venta.idVenta.desc())
            .offset((pagina - 1) * por_pagina)
            .limit(por_pagina)
        ).all()
        return ventas, total

    @staticmethod
    def obtener_venta(id_venta, usuario):
        consulta = VentaService._consulta_visible(usuario).where(Venta.idVenta == id_venta)
        return db.session.scalar(
            consulta.options(
                selectinload(Venta.detalles).joinedload(DetalleVenta.producto),
                joinedload(Venta.factura),
                joinedload(Venta.cliente).joinedload(Cliente.tipo_documento),
                joinedload(Venta.sucursal),
                joinedload(Venta.usuario),
                joinedload(Venta.tipo_venta),
                joinedload(Venta.metodo_pago),
            )
        )

    @staticmethod
    def obtener_factura(id_venta, usuario):
        venta = VentaService.obtener_venta(id_venta, usuario)
        return venta.factura if venta else None

    @staticmethod
    def _consulta_visible(usuario):
        consulta = select(Venta)
        if usuario.get("rol") != "admin":
            sucursal_usuario = usuario.get("sucursal_id")
            if sucursal_usuario is None:
                return consulta.where(Venta.idVenta == -1)
            consulta = consulta.where(Venta.idSucursal == int(sucursal_usuario))
        return consulta