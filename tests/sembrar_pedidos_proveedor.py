"""Inserta proveedores y órdenes de demostración en la base configurada."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
import os
from pathlib import Path
import sys

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.config import Config
from app.extensions import db
from app.models.detalle_orden_proveedor import DetalleOrdenProveedor
from app.models.estado_pedido_proveedor import EstadoPedidoProveedor
from app.models.pedido_proveedor import PedidoProveedor
from app.models.producto import Producto
from app.models.proveedor import Proveedor
from app.models.sucursal import Sucursal
from app.models.usuario import Usuario


ETIQUETAS_NIT = tuple(f"DEMO-PROV-2026-{indice:03d}" for indice in range(1, 4))
PROVEEDORES_DEMO = (
    ("Proveedor Demo - Materiales Caribe", ETIQUETAS_NIT[0]),
    ("Proveedor Demo - Pinturas del Norte", ETIQUETAS_NIT[1]),
    ("Proveedor Demo - Herramientas Centro", ETIQUETAS_NIT[2]),
)
ORDENES_DEMO = (
    {
        "proveedor": 0,
        "sucursal": "buenavista",
        "estado": "Pendiente",
        "dias": 1,
        "productos": ((0, "20", "0"), (1, "10", "0")),
    },
    {
        "proveedor": 1,
        "sucursal": "lachinita",
        "estado": "Parcial",
        "dias": 2,
        "productos": ((2, "12", "5"), (3, "8", "8")),
    },
    {
        "proveedor": 2,
        "sucursal": "sucursalcentro",
        "estado": "Recibido",
        "dias": 3,
        "productos": ((4, "6", "6"), (5, "10", "10")),
    },
    {
        "proveedor": 0,
        "sucursal": "buenavista",
        "estado": "Cancelado",
        "dias": 4,
        "productos": ((6, "3", "0"),),
    },
)


def _compactar(texto: str) -> str:
    return "".join(caracter for caracter in texto.casefold() if caracter.isalnum())


def _crear_app():
    load_dotenv()
    uri = os.getenv("SQLALCHEMY_DATABASE_URI")
    if not uri:
        raise RuntimeError("Falta SQLALCHEMY_DATABASE_URI en .env.")

    url = make_url(uri)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("Este sembrador solo admite PostgreSQL.")

    config = type(
        "SembradoPedidosProveedorConfig",
        (Config,),
        {
            "SQLALCHEMY_DATABASE_URI": url.set(drivername="postgresql+psycopg2"),
            "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY") or "clave-local-para-sembrado-de-pedidos-de-proveedor",
        },
    )
    return create_app(config)


def sembrar() -> dict[str, int]:
    app = _crear_app()
    with app.app_context():
        try:
            sucursales = {
                _compactar(sucursal.nombreSucursal): sucursal
                for sucursal in Sucursal.query.filter_by(activa=True).all()
            }
            sucursal_centro = next(
                (sucursal for nombre, sucursal in sucursales.items() if "centro" in nombre),
                None,
            )
            if sucursal_centro is None:
                raise RuntimeError("No se encontró una sucursal activa que incluya Centro.")
            sucursales["sucursalcentro"] = sucursal_centro
            if "buenavista" not in sucursales or "lachinita" not in sucursales:
                raise RuntimeError(
                    "Se requieren las sucursales activas Buenavista y La Chinita."
                )

            if Proveedor.query.filter(Proveedor.nit.in_(ETIQUETAS_NIT)).first():
                raise RuntimeError(
                    "Ya existe al menos un proveedor de este lote de demostración; "
                    "no se insertó nada para evitar duplicados."
                )

            administrador = (
                Usuario.query.filter_by(idTipoUsuario=1, activo=True)
                .order_by(Usuario.idUsuario)
                .first()
            )
            productos = (
                Producto.query.filter_by(activo=True)
                .order_by(Producto.idProducto)
                .all()
            )
            if administrador is None:
                raise RuntimeError("No se encontró un administrador activo.")
            if len(productos) < 7:
                raise RuntimeError("Se necesitan al menos siete productos activos.")

            proveedores = [
                Proveedor(
                    nombreEmpresa=nombre,
                    nit=nit,
                    telefono="3000000000",
                    correo=None,
                    direccion="Proveedor de demostración",
                    activo=True,
                )
                for nombre, nit in PROVEEDORES_DEMO
            ]
            db.session.add_all(proveedores)
            estados = {}
            for nombre in ("Pendiente", "Parcial", "Recibido", "Cancelado"):
                estado = EstadoPedidoProveedor.query.filter(
                    db.func.lower(EstadoPedidoProveedor.nombre) == nombre.lower()
                ).first()
                if estado is None:
                    estado = EstadoPedidoProveedor(nombre=nombre, activo=True)
                    db.session.add(estado)
                else:
                    estado.activo = True
                estados[nombre] = estado
            db.session.flush()

            ahora = datetime.now(timezone.utc)
            pedidos = []
            for ejemplo in ORDENES_DEMO:
                fecha_pedido = ahora - timedelta(days=ejemplo["dias"])
                estado = estados[ejemplo["estado"]]
                pedido = PedidoProveedor(
                    proveedor=proveedores[ejemplo["proveedor"]],
                    sucursal=sucursales[ejemplo["sucursal"]],
                    idUsuario=administrador.idUsuario,
                    estado=estado,
                    fechaPedido=fecha_pedido,
                    fechaRecepcion=(
                        fecha_pedido + timedelta(hours=4)
                        if ejemplo["estado"] in ("Parcial", "Recibido")
                        else None
                    ),
                    total=Decimal("0.00"),
                )
                db.session.add(pedido)
                db.session.flush()

                total = Decimal("0.00")
                for indice_producto, cantidad_texto, recibida_texto in ejemplo["productos"]:
                    producto = productos[indice_producto]
                    cantidad = Decimal(cantidad_texto)
                    cantidad_recibida = Decimal(recibida_texto)
                    precio = Decimal(producto.costoUnitario).quantize(
                        Decimal("0.01"),
                        rounding=ROUND_HALF_UP,
                    )
                    subtotal = (cantidad * precio).quantize(
                        Decimal("0.01"),
                        rounding=ROUND_HALF_UP,
                    )
                    total += subtotal
                    db.session.add(DetalleOrdenProveedor(
                        idPedidoProveedor=pedido.idPedidoProveedor,
                        idProducto=producto.idProducto,
                        cantidadPedida=cantidad,
                        cantidadRecibida=cantidad_recibida,
                        precioUnitario=precio,
                        subtotal=subtotal,
                    ))
                pedido.total = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                pedidos.append(pedido)

            db.session.commit()
            return {
                "proveedores": len(proveedores),
                "pedidos": len(pedidos),
                "detalles": sum(len(ejemplo["productos"]) for ejemplo in ORDENES_DEMO),
            }
        except Exception:
            db.session.rollback()
            raise
        finally:
            db.session.remove()
            db.engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--confirmar-base-configurada",
        action="store_true",
        help="Confirma que SQLALCHEMY_DATABASE_URI apunta a la base donde cargar ejemplos.",
    )
    argumentos = parser.parse_args()
    if not argumentos.confirmar_base_configurada:
        parser.error(
            "Revisa la base configurada y agrega --confirmar-base-configurada para insertar."
        )

    resultados = sembrar()
    print("Datos de demostración insertados correctamente:")
    for clave, valor in resultados.items():
        print(f"  {clave}: {valor}")


if __name__ == "__main__":
    main()
