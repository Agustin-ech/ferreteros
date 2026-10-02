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
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload, selectinload

from app.extensions import db
from app.models.cliente import Cliente
from app.models.detalle_venta import DetalleVenta
from app.models.factura import Factura
from app.models.inventario import Inventario
from app.models.metodo_pago import MetodoPago
from app.models.producto import Producto
from app.models.tipo_venta import TipoVenta
from app.models.venta import Venta

class VentaService:
    CENTAVO = Decimal("0.01")

    @staticmethod
    def registrar_venta(data_validada, usuario):
        id_sucursal = data_validada["idSucursal"]
        if usuario.get("rol") != "admin":
            sucursal_usuario = usuario.get("sucursal_id")
            if sucursal_usuario is None or int(sucursal_usuario) != id_sucursal:
                raise PermissionError("Solo puede registrar ventas en su sucursal asignada.")

        try:
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

            detalles_calculados = []
            subtotal_venta = Decimal("0.00")
            for item in items:
                producto = productos_por_id[item["idProducto"]]
                cantidad = item["cantidad"]
                subtotal = (producto.precio * cantidad).quantize(
                    VentaService.CENTAVO,
                    rounding=ROUND_HALF_UP,
                )
                subtotal_venta += subtotal
                detalles_calculados.append({
                    "idProducto": producto.idProducto,
                    "cantidad": cantidad,
                    "precio_unitario": producto.precio,
                    "subtotal": subtotal,
                })

            descuento = data_validada["descuento"].quantize(
                VentaService.CENTAVO,
                rounding=ROUND_HALF_UP,
            )
            if descuento > subtotal_venta:
                raise ValueError("El descuento no puede ser mayor al total de la venta.")

            total_final = subtotal_venta - descuento
            nueva_venta = Venta(
                idCliente=id_cliente,
                idSucursal=id_sucursal,
                idUsuario=usuario["id"],
                idTipoVenta=tipo_venta.idTipoVenta,
                idMetodoPago=metodo_pago.idMetodoPago,
                subtotal=subtotal_venta,
                descuentoTotal=descuento,
                total=total_final,
            )
            db.session.add(nueva_venta)
            db.session.flush()

            for detalle in detalles_calculados:
                nueva_venta.detalles.append(
                    DetalleVenta(
                        idProducto=detalle["idProducto"],
                        cantidad=detalle["cantidad"],
                        precio_unitario=detalle["precio_unitario"],
                        descuento=Decimal("0.00"),
                        subtotal=detalle["subtotal"],
                    )
                )

            for id_producto, cantidad in cantidades_por_producto.items():
                inventarios_por_producto[id_producto].CantidadDisponible -= cantidad

            nueva_venta.factura = VentaService.generar_factura(nueva_venta)
            db.session.commit()
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

        total = db.session.scalar(select(func.count()).select_from(consulta.subquery())) or 0
        ventas = db.session.scalars(
            consulta.options(
                selectinload(Venta.detalles).joinedload(DetalleVenta.producto),
                joinedload(Venta.factura),
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