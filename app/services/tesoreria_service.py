from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.movimiento_tesoreria import MovimientoTesoreria
from app.models.metodo_pago import MetodoPago
from app.models.sucursal import Sucursal
from app.models.venta import Venta


ZONA_TESORERIA = ZoneInfo("America/Bogota")


def fecha_a_utc(fecha: date) -> datetime:
    return datetime.combine(fecha, time.min, ZONA_TESORERIA).astimezone(timezone.utc)


def limite_superior_utc(fecha: date) -> datetime:
    return fecha_a_utc(fecha + timedelta(days=1))


def fecha_iso_utc(fecha: datetime) -> str:
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(timezone.utc).isoformat()


def crear_egreso(data: dict, id_usuario: int) -> MovimientoTesoreria:
    sucursal = db.session.get(Sucursal, data["idSucursal"])
    if sucursal is None or not sucursal.activa:
        raise ValueError("La sucursal no existe o está inactiva.")
    descripcion = data["descripcion"].strip()
    if not descripcion:
        raise ValueError("La descripción no puede estar vacía.")

    metodo_pago = None
    if data.get("idMetodoPago") is not None:
        metodo_pago = db.session.get(MetodoPago, data["idMetodoPago"])
        if metodo_pago is None or not metodo_pago.activo:
            raise ValueError("El método de pago no existe o está inactivo.")

    movimiento = MovimientoTesoreria(
        idSucursal=data["idSucursal"],
        idUsuario=id_usuario,
        idMetodoPago=metodo_pago.idMetodoPago if metodo_pago else None,
        concepto=data["concepto"],
        descripcion=descripcion,
        tercero=data.get("tercero", "").strip() or None,
        monto=data["monto"],
        fecha=datetime.combine(data["fecha"], time(12), ZONA_TESORERIA).astimezone(timezone.utc),
    )
    db.session.add(movimiento)
    db.session.commit()
    return movimiento


def listar_egresos(desde: date, hasta: date, sucursal_id: int | None):
    consulta = (
        select(MovimientoTesoreria)
        .options(
            joinedload(MovimientoTesoreria.sucursal),
            joinedload(MovimientoTesoreria.usuario),
            joinedload(MovimientoTesoreria.metodo_pago),
        )
        .where(
            MovimientoTesoreria.activo.is_(True),
            MovimientoTesoreria.fecha >= fecha_a_utc(desde),
            MovimientoTesoreria.fecha < limite_superior_utc(hasta),
        )
    )
    if sucursal_id is not None:
        consulta = consulta.where(MovimientoTesoreria.idSucursal == sucursal_id)
    return db.session.scalars(
        consulta.order_by(MovimientoTesoreria.fecha.desc(), MovimientoTesoreria.idMovimientoTesoreria.desc())
    ).all()


def listar_ventas(desde: date, hasta: date, sucursal_id: int | None):
    consulta = (
        select(Venta)
        .options(
            joinedload(Venta.sucursal),
            joinedload(Venta.usuario),
            joinedload(Venta.metodo_pago),
            joinedload(Venta.factura),
        )
        .where(
            Venta.activo.is_(True),
            Venta.fechaHora >= fecha_a_utc(desde),
            Venta.fechaHora < limite_superior_utc(hasta),
        )
    )
    if sucursal_id is not None:
        consulta = consulta.where(Venta.idSucursal == sucursal_id)
    return db.session.scalars(
        consulta.order_by(Venta.fechaHora.desc(), Venta.idVenta.desc())
    ).all()


def serializar_egreso(movimiento: MovimientoTesoreria) -> dict:
    return {
        "idMovimiento": f"egreso-{movimiento.idMovimientoTesoreria}",
        "idMovimientoTesoreria": movimiento.idMovimientoTesoreria,
        "tipo": "egreso",
        "concepto": movimiento.concepto,
        "descripcion": movimiento.descripcion,
        "tercero": movimiento.tercero,
        "monto": float(movimiento.monto),
        "fecha": fecha_iso_utc(movimiento.fecha),
        "idSucursal": movimiento.idSucursal,
        "sucursal": movimiento.sucursal.nombreSucursal,
        "idUsuario": movimiento.idUsuario,
        "usuario": f"{movimiento.usuario.primerNombre} {movimiento.usuario.primerApellido}",
        "idMetodoPago": movimiento.idMetodoPago,
        "metodoPago": movimiento.metodo_pago.nombre if movimiento.metodo_pago else None,
    }


def serializar_venta(venta: Venta) -> dict:
    return {
        "idMovimiento": f"venta-{venta.idVenta}",
        "idVenta": venta.idVenta,
        "tipo": "ingreso",
        "concepto": "Venta",
        "descripcion": f"Venta {venta.factura.numeroFactura}" if venta.factura else f"Venta #{venta.idVenta}",
        "tercero": None,
        "monto": float(venta.total),
        "fecha": fecha_iso_utc(venta.fechaHora),
        "idSucursal": venta.idSucursal,
        "sucursal": venta.sucursal.nombreSucursal,
        "idUsuario": venta.idUsuario,
        "usuario": f"{venta.usuario.primerNombre} {venta.usuario.primerApellido}",
        "idMetodoPago": venta.idMetodoPago,
        "metodoPago": venta.metodo_pago.nombre if venta.metodo_pago else None,
    }


def obtener_movimientos(desde: date, hasta: date, sucursal_id: int | None) -> list[dict]:
    movimientos = [
        *(serializar_venta(venta) for venta in listar_ventas(desde, hasta, sucursal_id)),
        *(serializar_egreso(egreso) for egreso in listar_egresos(desde, hasta, sucursal_id)),
    ]
    movimientos.sort(key=lambda movimiento: movimiento["fecha"], reverse=True)
    return movimientos


def obtener_resumen(desde: date, hasta: date, sucursal_id: int | None) -> dict:
    movimientos = obtener_movimientos(desde, hasta, sucursal_id)
    serie_por_fecha: dict[str, dict] = {}
    ingresos = Decimal("0")
    egresos = Decimal("0")
    for movimiento in movimientos:
        fecha_local = datetime.fromisoformat(movimiento["fecha"]).astimezone(ZONA_TESORERIA).date().isoformat()
        registro = serie_por_fecha.setdefault(
            fecha_local,
            {"fecha": fecha_local, "ingresos": Decimal("0"), "egresos": Decimal("0")},
        )
        monto = Decimal(str(movimiento["monto"]))
        if movimiento["tipo"] == "ingreso":
            ingresos += monto
            registro["ingresos"] += monto
        else:
            egresos += monto
            registro["egresos"] += monto

    return {
        "periodo": {"desde": desde.isoformat(), "hasta": hasta.isoformat()},
        "resumen": {
            "ingresos": float(ingresos),
            "egresos": float(egresos),
            "balance": float(ingresos - egresos),
            "cantidadMovimientos": len(movimientos),
        },
        "serie": [
            {
                **registro,
                "ingresos": float(registro["ingresos"]),
                "egresos": float(registro["egresos"]),
            }
            for registro in sorted(serie_por_fecha.values(), key=lambda registro: registro["fecha"])
        ],
        "movimientosRecientes": movimientos[:10],
    }
