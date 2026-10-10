"""
Servicio único del módulo de reportes.

Reúne TODO lo que necesita la generación de reportes en un solo archivo:

    1. contrato de respuesta (columnas, secciones, kpis, alcance, periodo)
    2. periodos, variaciones porcentuales y formato de cifras es-CO
    3. utilidades SQL (zona horaria, rangos inclusivos, agrupación por día/semana/mes)
    4. resolución de los modelos del proyecto (app/models) sin acoplarse a rutas de import
    5. alcance: reporte individual por sucursal o consolidado, con permisos por usuario
    6. catálogo de reportes disponibles (y de los pendientes, con el motivo)
    7. implementación de cada reporte
    8. registro de implementaciones

Para agregar un reporte nuevo:
    1. agréguelo a REPORTES (sección 6) con su código, nombre y parámetros;
    2. escriba la función `reporte_<codigo_con_guiones_bajos>(db, alcance, desde, hasta, **filtros)`
       en la sección 7, aplicando `alcance.filtrar(stmt, Modelo.idSucursal)` para respetar
       sucursal/consolidado, y armando el resultado con los helpers de la sección 1;
    3. regístrela en IMPLEMENTACIONES (sección 8).

El endpoint, el JSON, el CSV y el PDF funcionan automáticamente.
"""

from __future__ import annotations

import importlib
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any
from zoneinfo import ZoneInfo

from flask import current_app
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import Select, and_, case, func, literal, or_, select

from app.errors.reportes import (
    ParametroInvalido,
    RangoInvalido,
    ReporteNoDisponible,
    SinSucursales,
    SucursalNoEncontrada,
)
from app.extensions import db


# =============================================================================
# 1. CONTRATO DE RESPUESTA (columnas, secciones, kpis, alcance, periodo)
# =============================================================================

MODOS = ("SUCURSAL", "CONSOLIDADO")
TIPOS_COLUMNA = ("texto", "entero", "decimal", "moneda", "fecha", "porcentaje")


# --------------------------------------------------------------------------- Helpers de construcción
def columna(clave: str, titulo: str, tipo: str = "texto", *, alineacion: str | None = None,
            ancho: float = 1.0, totalizar: bool = False) -> dict:
    """Describe una columna: el front decide cómo pintarla, el exportador cómo formatearla."""
    if tipo not in TIPOS_COLUMNA:
        raise ValueError(f"Tipo de columna no soportado: {tipo!r}. Use uno de {TIPOS_COLUMNA}.")
    if alineacion is None:
        alineacion = "der" if tipo in ("entero", "decimal", "moneda", "porcentaje") else "izq"
    return {
        "clave": clave,
        "titulo": titulo,
        "tipo": tipo,
        "alineacion": alineacion,
        "ancho": ancho,
        "totalizar": totalizar,
    }


def col_moneda(clave: str, titulo: str, *, totalizar: bool = True, ancho: float = 1.4) -> dict:
    return columna(clave, titulo, "moneda", totalizar=totalizar, ancho=ancho)


def col_entero(clave: str, titulo: str, *, totalizar: bool = True, ancho: float = 0.8) -> dict:
    return columna(clave, titulo, "entero", totalizar=totalizar, ancho=ancho)


def col_cantidad(clave: str, titulo: str, *, ancho: float = 0.9) -> dict:
    return columna(clave, titulo, "decimal", totalizar=True, ancho=ancho)


def col_porcentaje(clave: str, titulo: str, *, ancho: float = 1.0) -> dict:
    return columna(clave, titulo, "porcentaje", ancho=ancho)


def seccion(nombre: str, columnas: list[dict], filas: list[list], *, totales: list | None = None,
            nota: str | None = None) -> dict:
    """Una tabla del reporte. Cada fila debe venir en el mismo orden que `columnas`."""
    for fila in filas:
        if len(fila) != len(columnas):
            raise ValueError(
                f"La sección '{nombre}' tiene {len(columnas)} columnas pero una fila con {len(fila)} valores."
            )
    return {"nombre": nombre, "columnas": columnas, "filas": filas, "totales": totales, "nota": nota}


def kpi(etiqueta: str, valor: Any, *, tipo: str = "moneda", variacion: float | None = None) -> dict:
    return {"etiqueta": etiqueta, "valor": valor, "tipo": tipo, "variacion": variacion}


def alcance(modo: str, etiqueta: str, *, sucursal_id: int | None = None,
            sucursales: list[str] | None = None) -> dict:
    return {
        "modo": modo,
        "sucursal_id": sucursal_id,
        "etiqueta": etiqueta,
        "sucursales": sucursales or [],
    }


def reporte(*, codigo: str, titulo: str, alcance_: dict, desde: date, hasta: date,
            secciones: list[dict], kpis: list[dict] | None = None, agrupacion: str | None = None,
            filtros: dict | None = None, descripcion: str | None = None,
            moneda: str = "COP", empresa: str | None = None) -> dict:
    """Arma la respuesta final y normaliza los tipos para JSON."""
    payload = {
        "codigo": codigo,
        "titulo": titulo,
        "descripcion": descripcion,
        "alcance": alcance_,
        "periodo": {
            "desde": desde.isoformat(),
            "hasta": hasta.isoformat(),
            "dias": (hasta - desde).days + 1,
            "agrupacion": agrupacion,
        },
        "filtros_aplicados": {k: v for k, v in (filtros or {}).items() if v not in (None, "", "TODOS")},
        "kpis": kpis or [],
        "secciones": secciones,
        "generado_en": datetime.now().isoformat(timespec="seconds"),
        "moneda": moneda,
        "empresa": empresa,
    }
    return normalizar(payload)


# --------------------------------------------------------------------------- Normalización
def _normalizar_valor(valor):
    """Decimal -> número JSON (no texto) y date -> ISO, para que el front grafique sin parsear."""
    if isinstance(valor, Decimal):
        return float(valor)
    if isinstance(valor, (date, datetime)):
        return valor.isoformat()
    return valor


def normalizar(payload: dict) -> dict:
    for sec in payload.get("secciones", []):
        sec["filas"] = [[_normalizar_valor(v) for v in fila] for fila in sec["filas"]]
        if sec.get("totales"):
            sec["totales"] = [_normalizar_valor(v) for v in sec["totales"]]
    for k in payload.get("kpis", []):
        if k.get("tipo") == "entero" and isinstance(k["valor"], (int, float, Decimal)):
            k["valor"] = int(k["valor"])
        else:
            k["valor"] = _normalizar_valor(k["valor"])
    return payload

# =============================================================================
# 2. PERIODOS, VARIACIONES Y FORMATO DE CIFRAS (es-CO)
# =============================================================================

AGRUPACIONES = ("dia", "semana", "mes")

MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


# --------------------------------------------------------------------------- Fechas
def periodo_anterior(desde: date, hasta: date) -> tuple[date, date]:
    """Periodo inmediatamente anterior de igual duración (para las variaciones %)."""
    dias = (hasta - desde).days + 1
    return desde - timedelta(days=dias), desde - timedelta(days=1)


def etiqueta_periodo(valor, agrupacion: str) -> str:
    """Convierte un periodo truncado (date/datetime o texto de SQLite) en etiqueta legible."""
    if valor is None:
        return "—"
    if isinstance(valor, str):  # variante SQLite (strftime)
        partes = valor.split("-")
        if agrupacion == "mes" and len(partes) >= 2 and partes[1].isdigit():
            return f"{MESES_ES[int(partes[1])]} {partes[0]}"
        if agrupacion == "dia" and len(partes) >= 3:
            a, m, dd = partes[0], partes[1], partes[2][:2]
            return f"{dd}/{m}/{a}"
        return valor
    f: date = valor.date() if isinstance(valor, datetime) else valor
    if agrupacion == "mes":
        return f"{MESES_ES[f.month]} {f.year}"
    if agrupacion == "semana":
        fin = f + timedelta(days=6)
        return f"Semana {f.isocalendar()[1]:02d} ({f:%d/%m} - {fin:%d/%m})"
    return f.strftime("%d/%m/%Y")


def rango_valido(desde: date, hasta: date, *, max_anios: int = 5) -> str | None:
    """Devuelve el mensaje de error si el rango no sirve, o None si es válido."""
    if desde > hasta:
        return f"Rango de fechas inválido: desde ({desde}) es posterior a hasta ({hasta})."
    if (hasta - desde).days > max_anios * 366:
        return (f"El rango máximo permitido es de {max_anios} años. "
                "Divida la consulta en periodos más cortos.")
    return None


# --------------------------------------------------------------------------- Variaciones y cifras
def variacion_pct(actual, anterior) -> float | None:
    """Variación porcentual; None cuando no hay base de comparación (evita divisiones por cero)."""
    if not anterior:
        return None
    return round((float(actual) - float(anterior)) / abs(float(anterior)) * 100, 1)


def porcentaje(parte, total, decimales: int = 1) -> float:
    if not total:
        return 0.0
    return round(float(parte) / float(total) * 100, decimales)


def d(valor) -> Decimal:
    """Convierte None/str/float a Decimal de forma segura."""
    if valor is None:
        return Decimal("0")
    if isinstance(valor, Decimal):
        return valor
    return Decimal(str(valor))


def fmt_numero(valor, decimales: int = 2) -> str:
    """Número en formato es-CO: 1.234.567,89 (miles con punto, decimales con coma)."""
    if valor is None:
        return "—"
    if isinstance(valor, str):
        return valor
    try:
        texto = f"{d(valor):,.{decimales}f}"
    except (InvalidOperation, ValueError):
        return str(valor)
    return texto.replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def fmt_fecha(valor) -> str:
    """Fecha en formato dd/mm/aaaa (acepta objetos date/datetime o texto ISO)."""
    if valor is None:
        return "—"
    if isinstance(valor, str):
        try:
            return datetime.strptime(valor[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
        except ValueError:
            return valor
    return valor.strftime("%d/%m/%Y")


def fmt_fecha_hora(valor) -> str:
    """Fecha y hora legible para los encabezados ('03/10/2026 10:30')."""
    if valor is None:
        return "—"
    if isinstance(valor, str):
        try:
            return datetime.fromisoformat(valor).strftime("%d/%m/%Y %H:%M")
        except ValueError:
            return valor
    return valor.strftime("%d/%m/%Y %H:%M")

# =============================================================================
# 3. CONSULTAS SQL (zona horaria, rangos inclusivos, agrupación temporal)
# =============================================================================

AGRUPACIONES_SQL = {"dia": ("day", "%Y-%m-%d"), "semana": ("week", "%Y-%W"), "mes": ("month", "%Y-%m")}


def zona_horaria() -> ZoneInfo:
    nombre = current_app.config.get("REPORTES_ZONA_HORARIA", "America/Bogota")
    try:
        return ZoneInfo(nombre)
    except Exception:  # zona no disponible en el sistema: se sigue en UTC
        try:
            return ZoneInfo("UTC")
        except Exception:
            return timezone.utc


def rango_datetime(db, desde: date, hasta: date) -> tuple[datetime, datetime]:
    """
    Convierte el periodo consultado (días completos) en los límites de comparación
    para una columna `DateTime(timezone=True)`.

    - PostgreSQL: límites con zona horaria (timestamptz).
    - SQLite (pruebas): límites sin zona, porque el motor no la conserva.
    """
    tz = zona_horaria()
    inicio = datetime.combine(desde, time.min, tzinfo=tz).astimezone(ZoneInfo("UTC"))
    fin = datetime.combine(hasta, time.max, tzinfo=tz).astimezone(ZoneInfo("UTC"))

    if db.engine.dialect.name == "postgresql":
        return inicio, fin
    return inicio.replace(tzinfo=None), fin.replace(tzinfo=None)


def truncar_periodo(db, columna, agrupacion: str):
    """
    Expresión SQL que agrupa una fecha por día, semana o mes **en la zona local**.

    PostgreSQL: `date_trunc('mes', fecha AT TIME ZONE 'America/Bogota')`.
    Otros motores: `strftime` equivalente (las semanas inician en lunes).
    """
    if agrupacion not in AGRUPACIONES_SQL:
        raise ValueError(f"Agrupación no soportada: {agrupacion!r}. Use una de {tuple(AGRUPACIONES_SQL)}.")
    unidad_pg, formato = AGRUPACIONES_SQL[agrupacion]

    if db.engine.dialect.name == "postgresql":
        return func.date_trunc(unidad_pg, func.timezone(str(zona_horaria()), columna))
    return func.strftime(formato, columna)


# =============================================================================
# 4. RESOLUCIÓN DE LOS MODELOS DEL PROYECTO (app/models)
# =============================================================================

MODULOS_CANDIDATOS: dict[str, tuple[str, ...]] = {
    "Sucursal": ("app.models.sucursal", "app.models.sucursales", "app.models.sucursal_model"),
    "Usuario": ("app.models.usuario", "app.models.usuarios", "app.models.user"),
    "Cliente": ("app.models.cliente", "app.models.clientes"),
    "Producto": ("app.models.producto", "app.models.productos"),
    "Venta": ("app.models.venta", "app.models.ventas"),
    "DetalleVenta": ("app.models.detalle_venta", "app.models.detalleventa"),
    "Factura": ("app.models.factura", "app.models.facturas"),
    "Devolucion": ("app.models.devolucion", "app.models.devoluciones"),
    "TipoDevolucion": ("app.models.tipo_devolucion",),
    "TipoVenta": ("app.models.tipo_venta",),
    "MetodoPago": ("app.models.metodo_pago",),
    "Inventario": ("app.models.inventario", "app.models.inventarios"),
    "MovimientoInventario": ("app.models.movimiento_inventario", "app.models.movimientos_inventario"),
    "Compra": ("app.models.compra", "app.models.compras"),
    "Gasto": ("app.models.gasto", "app.models.gastos"),
    "Egreso": ("app.models.egreso", "app.models.egresos"),
}

_OVERRIDES: dict[str, object] = {}


def fijar_modelos(mapa: dict[str, object]) -> None:
    """Registra modelos explícitamente (por ejemplo, en el app factory o en las pruebas)."""
    _OVERRIDES.update(mapa)


def modelo(nombre: str):
    """Devuelve la clase del modelo pedido o lanza ImportError con instrucciones."""
    if nombre in _OVERRIDES:
        return _OVERRIDES[nombre]

    try:
        paquete = importlib.import_module("app.models")
        objeto = getattr(paquete, nombre, None)
        if objeto is not None:
            return objeto
    except ImportError:
        pass

    for ruta in MODULOS_CANDIDATOS.get(nombre, ()):
        try:
            modulo = importlib.import_module(ruta)
        except ImportError:
            continue
        objeto = getattr(modulo, nombre, None)
        if objeto is not None:
            return objeto

    # Último recurso: cualquier módulo de app.models ya importado que exponga la clase.
    for nombre_modulo, modulo in list(sys.modules.items()):
        if not nombre_modulo.startswith("app.models") or modulo is None:
            continue
        objeto = getattr(modulo, nombre, None)
        if objeto is not None:
            return objeto

    raise ImportError(
        f"No se encontró el modelo '{nombre}'. Registre su ruta con "
        f"`fijar_modelos({{'{nombre}': MiClase}})` desde el app factory, o añada el módulo "
        f"en MODULOS_CANDIDATOS de app/services/reporte_service.py."
    )


def existe(nombre: str) -> bool:
    """Indica si un modelo está disponible (para reportes opcionales)."""
    try:
        modelo(nombre)
        return True
    except ImportError:
        return False


def campo(clase, *nombres: str):
    """
    Primer atributo existente entre los nombres propuestos.

    Sirve para que el reporte se adapte a los nombres de campo de tu proyecto
    (por ejemplo `Producto.precioVenta` vs `Producto.precio_venta`) sin tocar la lógica.
    """
    for nombre in nombres:
        if hasattr(clase, nombre):
            return getattr(clase, nombre)
    return None

# =============================================================================
# 5. ALCANCE: REPORTE POR SUCURSAL O CONSOLIDADO + PERMISOS
# =============================================================================

VALORES_CONSOLIDADO = {"todas", "todos", "all", "*", "consolidado", ""}


# --------------------------------------------------------------------------- Accesores del modelo Sucursal
def sucursal_id(sucursal) -> int | None:
    """Id de la sucursal, con los nombres usados en el proyecto (idSucursal) o genéricos."""
    return getattr(sucursal, "idSucursal", None) or getattr(sucursal, "id", None)


def sucursal_nombre(sucursal) -> str:
    return (getattr(sucursal, "nombreSucursal", None)
            or getattr(sucursal, "nombre", None)
            or f"Sucursal {sucursal_id(sucursal)}")


def sucursal_etiqueta(sucursal) -> str:
    """Nombre + dirección corta, para identificar la sucursal en el encabezado del reporte."""
    direccion = getattr(sucursal, "direccion", None)
    return f"{sucursal_nombre(sucursal)}" + (f" — {direccion}" if direccion else "")


# --------------------------------------------------------------------------- Alcance
@dataclass(slots=True)
class Alcance:
    """Sucursal(es) sobre las que se consulta el reporte."""

    modo: str                                              # "SUCURSAL" | "CONSOLIDADO"
    sucursales: list[Any] = field(default_factory=list)    # objetos Sucursal
    sucursal_id: int | None = None

    @property
    def ids(self) -> list[int]:
        return [sucursal_id(s) for s in self.sucursales]

    @property
    def es_consolidado(self) -> bool:
        return self.modo == "CONSOLIDADO"

    @property
    def nombres(self) -> list[str]:
        return [sucursal_nombre(s) for s in self.sucursales]

    def etiqueta(self) -> str:
        if self.es_consolidado:
            n = len(self.sucursales)
            return f"Consolidado — {n} sucursal{'es' if n != 1 else ''} ({', '.join(self.nombres)})"
        return f"Sucursal {sucursal_etiqueta(self.sucursales[0])}"

    def a_dict(self) -> dict:
        return alcance(self.modo, self.etiqueta(), sucursal_id=self.sucursal_id,
                            sucursales=self.nombres)

    def nombre_de(self, id_sucursal: int) -> str:
        """Nombre de una sucursal por id (para las tablas consolidadas)."""
        for s in self.sucursales:
            if sucursal_id(s) == id_sucursal:
                return sucursal_nombre(s)
        return f"Sucursal {id_sucursal}"

    # --- Aplicación a consultas SQLAlchemy ---
    def filtrar(self, stmt: Select, columna_sucursal) -> Select:
        """Restringe cualquier consulta al alcance resuelto (sucursal individual o consolidado)."""
        if self.es_consolidado:
            return stmt.where(columna_sucursal.in_(self.ids))
        return stmt.where(columna_sucursal == self.sucursal_id)


# --------------------------------------------------------------------------- Parseo de parámetros
def parsear_fecha(valor: str | None, nombre: str) -> date | None:
    """Acepta YYYY-MM-DD y también DD/MM/YYYY, que es como suele escribirlo el usuario."""
    if not valor:
        return None
    for formato in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(str(valor).strip(), formato).date()
        except ValueError:
            continue
    raise ParametroInvalido(
        f"El parámetro '{nombre}' no es una fecha válida: '{valor}'. Use el formato YYYY-MM-DD."
    )


def validar_periodo(desde: str | date | None, hasta: str | date | None) -> tuple[date, date]:
    """Aplica los valores por defecto (mes en curso) y valida el rango consultable."""
    hoy = date.today()
    d1 = desde if isinstance(desde, date) else parsear_fecha(desde, "desde")
    d2 = hasta if isinstance(hasta, date) else parsear_fecha(hasta, "hasta")
    d1 = d1 or hoy.replace(day=1)
    d2 = d2 or hoy

    error = rango_valido(d1, d2, max_anios=current_app.config.get("REPORTES_MAX_ANIOS", 5))
    if error:
        raise RangoInvalido(error)
    return d1, d2


def parsear_sucursal_id(valor: str | None) -> int | None:
    """Devuelve el ID de sucursal pedido, o None si se pidió el consolidado."""
    if valor is None:
        return None
    limpio = str(valor).strip().lower()
    if limpio in VALORES_CONSOLIDADO:
        return None
    if not limpio.isdigit():
        raise ParametroInvalido(
            f"sucursal_id inválido: '{valor}'. Use un número entero o 'todas' para el consolidado."
        )
    return int(limpio)


def agrupacion_valida(valor: str | None, por_defecto: str = "mes") -> str:

    valor = str(valor or por_defecto).strip().lower()
    if valor not in AGRUPACIONES:
        raise ParametroInvalido(f"Agrupación no soportada: '{valor}'. Use una de {', '.join(AGRUPACIONES)}.")
    return valor


def buscar_ilike(columna, texto: str | None):
    """Condición de búsqueda parcial insensible a mayúsculas (None si no hay texto)."""
    if not texto or not str(texto).strip():
        return None
    return columna.ilike(f"%{str(texto).strip()}%")


# --------------------------------------------------------------------------- Permisos
def sucursales_autorizadas(usuario=None) -> list[int] | None:
    """
    IDs de sucursal que el usuario puede consultar, o None si puede verlas todas.

    TODO(proyecto): reemplazar por tu lógica real de roles. Ejemplos:
        ADMIN                       -> None                       (ve todo el consolidado)
        SUPERVISOR de una sucursal  -> [usuario.sucursal_id]
        AUDITOR multi-sucursal      -> [s.idSucursal for s in usuario.sucursales]

    Hoy se apoya en los atributos más comunes para que el módulo funcione ya:
    `usuario.es_admin`, `usuario.rol`, `usuario.sucursal_id` / `usuario.id_sucursal`
    y la relación `usuario.sucursales` (si existe).
    """
    if usuario is None:
        return []
    tipo_usuario = getattr(usuario, "tipo_usuario", None)
    rol = getattr(usuario, "rol", None) or getattr(tipo_usuario, "nombre", "")
    if getattr(usuario, "es_admin", False) or str(rol).upper() in ("ADMIN", "ADMINISTRADOR"):
        return None

    relacionadas = getattr(usuario, "sucursales", None)
    if relacionadas is not None and hasattr(relacionadas, "__iter__") and not isinstance(relacionadas, (str, bytes)):
        ids = [
            getattr(asignacion, "idSucursal", None)
            or sucursal_id(getattr(asignacion, "sucursal", asignacion))
            for asignacion in relacionadas
            if getattr(asignacion, "activo", True)
        ]
        return [id_sucursal for id_sucursal in ids if id_sucursal is not None]

    for atributo in ("sucursal_id", "id_sucursal", "idSucursal"):
        valor = getattr(usuario, atributo, None)
        if valor:
            return [valor]
    return []


def usuario_actual():
    """Carga el usuario asociado al JWT validado por la ruta actual."""
    try:
        identidad = get_jwt_identity()
    except RuntimeError:
        return None
    if identidad is None:
        return None
    return db.session.get(modelo("Usuario"), int(identidad))


def resolver_alcance(db, sucursal_id_valor: str | None, usuario=None) -> Alcance:
    """
    Traduce `?sucursal_id=` en un `Alcance` concreto, aplicando los permisos del usuario.

    `db` es la extensión Flask-SQLAlchemy (`from app.extensions import db`).
    """
    ModeloSucursal = modelo_sucursal()
    autorizadas = sucursales_autorizadas(usuario if usuario is not None else usuario_actual())

    consulta = db.session.query(ModeloSucursal)
    if hasattr(ModeloSucursal, "activa"):
        consulta = consulta.filter(ModeloSucursal.activa.is_(True))
    orden = getattr(ModeloSucursal, "nombreSucursal", None) or getattr(ModeloSucursal, "nombre", None) \
        or getattr(ModeloSucursal, "idSucursal", None) or ModeloSucursal.id  # type: ignore[attr-defined]
    visibles = consulta.order_by(orden).all()

    if autorizadas is not None:
        permitidas = set(autorizadas)
        visibles = [s for s in visibles if sucursal_id(s) in permitidas]

    if not visibles:
        raise SinSucursales("No hay sucursales disponibles para este usuario: no es posible generar reportes.")

    pid = parsear_sucursal_id(sucursal_id_valor)
    if pid is None:
        return Alcance(modo="CONSOLIDADO", sucursales=visibles, sucursal_id=None)

    sucursal = next((s for s in visibles if sucursal_id(s) == pid), None)
    if sucursal is None:
        raise SucursalNoEncontrada(f"La sucursal {pid} no existe o no está autorizada para su usuario.")
    return Alcance(modo="SUCURSAL", sucursales=[sucursal], sucursal_id=pid)


def modelo_sucursal():
    """
    Modelo de sucursales del proyecto.

    Se resuelve con `modelo("Sucursal")` (sección 4), que busca en
    `app.models`, en las rutas habituales (`app.models.sucursal`, ...) o en lo que se
    haya registrado con `fijar_modelos({"Sucursal": ...})`.
    """

    return modelo("Sucursal")

# =============================================================================
# 6. CATÁLOGO DE REPORTES
# =============================================================================

# Parámetros que todo reporte acepta (los resuelve el blueprint).
PARAMS_COMUNES = ["sucursal_id", "desde", "hasta", "formato"]

REPORTES: dict[str, dict] = {
    "ventas": {
        "nombre": "Reporte de ventas",
        "descripcion": "Ventas del periodo (Venta + DetalleVenta) con serie temporal, detalle y resumen por sucursal.",
        "parametros": ["agrupacion", "idTipoVenta", "idMetodoPago", "idCliente", "buscar", "limite"],
        "consolidable": True,
    },
    "facturas": {
        "nombre": "Reporte de facturación",
        "descripcion": "Facturas emitidas y cobertura de facturación frente a las ventas registradas.",
        "parametros": ["agrupacion", "buscar", "limite"],
        "consolidable": True,
    },
    "devoluciones": {
        "nombre": "Reporte de devoluciones",
        "descripcion": "Devoluciones sobre facturas, tasa de devolución y desglose por tipo y sucursal.",
        "parametros": ["idTipoDevolucion", "solo_aprobadas", "limite"],
        "consolidable": True,
    },
    "ventas-por-producto": {
        "nombre": "Reporte de ventas por producto",
        "descripcion": "Ranking de productos vendidos por unidades y valor, con participación sobre el total.",
        "parametros": ["limite", "buscar"],
        "consolidable": True,
    },
    "inventario-existencias": {
        "nombre": "Reporte de existencias de mercancía",
        "descripcion": "Existencias vigentes por producto y sucursal, con resumen por sucursal y categoría.",
        "parametros": ["buscar", "solo_agotados", "limite"],
        "consolidable": True,
    },
    "consolidado-sucursales": {
        "nombre": "Consolidado comparativo por sucursal",
        "descripcion": "Comparativo lado a lado de ventas, devoluciones, netas y cobertura de facturación.",
        "parametros": [],
        "consolidable": False,  # siempre mira todas las sucursales autorizadas
    },
}

# Reportes del requerimiento que requieren tablas que aún no están en el modelo.
REPORTES_PENDIENTES: dict[str, dict] = {
    "ingresos-egresos": {
        "nombre": "Reporte de ingresos y egresos",
        "requiere": "Tabla de tesorería/caja (ingresos y egresos distintos de las ventas: gastos, "
                    "compras, pagos, recaudos). Hoy no existe en el modelo.",
    },
    "estado-resultados": {
        "nombre": "Estado de resultados del periodo",
        "requiere": "Costos de compra (para el costo de ventas) y egresos operacionales por categoría.",
    },
    "inventario-movimientos": {
        "nombre": "Kardex de movimientos de mercancía",
        "requiere": "Tabla de movimientos de inventario (entradas/salidas/ajustes). Hoy `Inventario` "
                    "solo guarda el saldo actual por sucursal y producto.",
    },
    "compras": {
        "nombre": "Reporte de compras a proveedores",
        "requiere": "Tabla de compras y un modelo de proveedor.",
    },
}


def catalogo_listar() -> list[dict]:
    """Contenido del endpoint /reportes/catalogo (para construir el menú de la interfaz)."""
    return [
        {
            "codigo": codigo,
            "nombre": meta["nombre"],
            "descripcion": meta.get("descripcion"),
            "endpoint": f"/api/v1/reportes/{codigo}",
            "parametros": PARAMS_COMUNES + meta.get("parametros", []),
            "consolidable": meta.get("consolidable", True),
        }
        for codigo, meta in REPORTES.items()
    ]


def catalogo_pendientes() -> list[dict]:
    """Reportes del requerimiento que aún no se pueden generar (faltan tablas)."""
    return [
        {"codigo": codigo, "nombre": meta["nombre"], "requiere": meta["requiere"]}
        for codigo, meta in REPORTES_PENDIENTES.items()
    ]


def catalogo_metadatos(codigo: str) -> dict:
    if codigo not in REPORTES:
        if codigo in REPORTES_PENDIENTES:
            raise ReporteNoDisponible(
                f"El reporte '{codigo}' todavía no está disponible: {REPORTES_PENDIENTES[codigo]['requiere']}"
            )
        disponibles = ", ".join(sorted(REPORTES))
        raise ReporteNoDisponible(f"El reporte '{codigo}' no existe. Disponibles: {disponibles}.")
    return REPORTES[codigo]


# =============================================================================
# 7. IMPLEMENTACIÓN DE LOS REPORTES
# =============================================================================

TITULOS = {
    "ventas": "Reporte de ventas",
    "facturas": "Reporte de facturación",
    "devoluciones": "Reporte de devoluciones",
    "ventas-por-producto": "Reporte de ventas por producto",
    "inventario-existencias": "Reporte de existencias de mercancía",
    "consolidado-sucursales": "Consolidado comparativo por sucursal",
}


# --------------------------------------------------------------------------- Utilidades internas
def _config(clave: str, por_defecto=None):
    return current_app.config.get(clave, por_defecto)


def _limite_detalle(limite: int | None = None) -> int:
    return int(limite or _config("REPORTES_MAX_FILAS_DETALLE", 2000))


def _nombre_cliente(Cliente):
    """Columna del nombre del cliente, según cómo se llame en tu modelo."""
    return campo(Cliente, "nombre", "nombreCliente", "razonSocial", "Nombre", "nombreRazonSocial")


def _campos_producto(Producto):
    """(nombre, codigo, categoria, precio) — los que existan en tu modelo Producto."""
    return (
        campo(Producto, "nombre", "nombreProducto", "descripcion", "Nombre"),
        campo(Producto, "codigo", "codigoProducto", "codigoSKU", "referencia", "sku"),
        campo(Producto, "categoria", "categoriaProducto", "linea"),
        campo(Producto, "precioVenta", "precio_venta", "precio", "valorUnitario"),
    )


def totales_por_clave(columnas: list[dict], **valores) -> list:
    """
    Arma la fila de totales alineada con las columnas, por clave.

    Evita el clásico error de contar posiciones a mano cuando un reporte agrega
    o quita columnas (por ejemplo, cuando se incluye o no la columna Sucursal).
    """
    fila = ["" for _ in columnas]
    for clave, valor in valores.items():
        for i, col in enumerate(columnas):
            if col["clave"] == clave:
                fila[i] = valor
                break
    return fila


def _base(codigo, alcance, desde, hasta, secciones, kpis, **kwargs):
    return reporte(
        codigo=codigo,
        titulo=TITULOS.get(codigo, codigo),
        alcance_=alcance.a_dict(),
        desde=desde,
        hasta=hasta,
        secciones=secciones,
        kpis=kpis,
        moneda=_config("REPORTES_MONEDA", "COP"),
        empresa=_config("EMPRESA_NOMBRE"),
        **kwargs,
    )


# =========================================================================== 1. VENTAS
def reporte_ventas(db, alcance, desde, hasta, *, agrupacion="mes", idTipoVenta=None,
                   idMetodoPago=None, idCliente=None, buscar=None, limite=None) -> dict:
    """
    Ventas del periodo: totales, serie por día/semana/mes, detalle y resumen por sucursal.

    Filtros: `idTipoVenta`, `idMetodoPago`, `idCliente`, `buscar` (n.º de factura o cliente)
    y `agrupacion` (dia | semana | mes).
    """
    Venta = modelo("Venta")
    Factura = modelo("Factura")
    Sucursal = modelo("Sucursal")
    Cliente = modelo("Cliente")
    TipoVenta = modelo("TipoVenta")
    MetodoPago = modelo("MetodoPago")
    DetalleVenta = modelo("DetalleVenta")

    ini, fin = rango_datetime(db, desde, hasta)
    condiciones = [Venta.fechaHora.between(ini, fin), Venta.activo.is_(True)]
    if idTipoVenta:
        condiciones.append(Venta.idTipoVenta == idTipoVenta)
    if idMetodoPago:
        condiciones.append(Venta.idMetodoPago == idMetodoPago)
    if idCliente:
        condiciones.append(Venta.idCliente == idCliente)

    col_cliente = _nombre_cliente(Cliente)
    filtro_buscar = buscar_ilike(Factura.numeroFactura, buscar)
    if filtro_buscar is not None and col_cliente is not None:
        filtro_buscar = or_(filtro_buscar, buscar_ilike(col_cliente, buscar))
    if filtro_buscar is not None:
        condiciones.append(filtro_buscar)

    # --- Totales del periodo (calculados en SQL) ---
    stmt_totales = (
        select(
            func.count(Venta.idVenta),
            func.coalesce(func.sum(Venta.subtotal), 0),
            func.coalesce(func.sum(Venta.descuentoTotal), 0),
            func.coalesce(func.sum(Venta.total), 0),
        )
        .outerjoin(Factura, Factura.idVenta == Venta.idVenta)
        .outerjoin(Cliente, Cliente.idCliente == Venta.idCliente)
        .where(and_(*condiciones))
    )
    n_ventas, s_subtotal, s_descuento, s_total = db.session.execute(
        alcance.filtrar(stmt_totales, Venta.idSucursal)
    ).one()
    n_ventas, s_subtotal, s_descuento, s_total = int(n_ventas), d(s_subtotal), d(s_descuento), d(s_total)
    ticket = (s_total / n_ventas) if n_ventas else Decimal("0")

    # --- Unidades vendidas ---
    unidades = d(db.session.execute(
        alcance.filtrar(
            select(func.coalesce(func.sum(DetalleVenta.cantidad), 0))
            .join(Venta, Venta.idVenta == DetalleVenta.idVenta)
            .where(and_(*condiciones), DetalleVenta.activo.is_(True)),
            Venta.idSucursal,
        )
    ).scalar_one())

    # --- Serie por periodo ---
    periodo_col = truncar_periodo(db, Venta.fechaHora, agrupacion)
    serie = db.session.execute(
        alcance.filtrar(
            select(
                periodo_col.label("periodo"),
                func.count(Venta.idVenta),
                func.coalesce(func.sum(Venta.subtotal), 0),
                func.coalesce(func.sum(Venta.descuentoTotal), 0),
                func.coalesce(func.sum(Venta.total), 0),
            )
            .where(and_(*condiciones))
            .group_by(periodo_col)
            .order_by(periodo_col),
            Venta.idSucursal,
        )
    ).all()
    filas_serie = [
        [etiqueta_periodo(p, agrupacion), int(n), d(sub), d(desc), d(tot),
         (d(tot) / int(n)) if n else Decimal("0")]
        for p, n, sub, desc, tot in serie
    ]

    # --- Detalle de ventas ---
    columnas_detalle = [columna("fecha", "Fecha", "fecha", alineacion="centro", ancho=0.9)]
    campos_detalle = [Venta.fechaHora]
    if alcance.es_consolidado:
        columnas_detalle.append(columna("sucursal", "Sucursal", ancho=1.7))
        campos_detalle.append(Sucursal.nombreSucursal)
    columnas_detalle += [
        columna("factura", "Factura", ancho=1.1),
        columna("cliente", "Cliente", ancho=2.0),
        columna("tipo_venta", "Tipo de venta", ancho=1.2),
        columna("metodo_pago", "Método de pago", ancho=1.2),
        col_moneda("subtotal", "Subtotal"),
        col_moneda("descuento", "Descuento"),
        col_moneda("total", "Total"),
    ]
    campos_detalle += [
        Factura.numeroFactura,
        col_cliente if col_cliente is not None else literal(None),
        TipoVenta.nombre,
        MetodoPago.nombre,
        Venta.subtotal,
        Venta.descuentoTotal,
        Venta.total,
    ]

    limite_filas = _limite_detalle(limite)
    filas_detalle = [
        list(fila) for fila in db.session.execute(
            alcance.filtrar(
                select(*campos_detalle)
                .join(Sucursal, Sucursal.idSucursal == Venta.idSucursal)
                .outerjoin(Factura, Factura.idVenta == Venta.idVenta)
                .outerjoin(Cliente, Cliente.idCliente == Venta.idCliente)
                .join(TipoVenta, TipoVenta.idTipoVenta == Venta.idTipoVenta)
                .join(MetodoPago, MetodoPago.idMetodoPago == Venta.idMetodoPago)
                .where(and_(*condiciones))
                .order_by(Venta.fechaHora.desc(), Venta.idVenta.desc())
                .limit(limite_filas),
                Venta.idSucursal,
            )
        ).all()
    ]

    secciones = [
        seccion(
            f"Resumen por {agrupacion}",
            [
                columna("periodo", "Periodo", ancho=1.4),
                col_entero("ventas", "N.º de ventas", ancho=0.9),
                col_moneda("subtotal", "Subtotal"),
                col_moneda("descuento", "Descuentos"),
                col_moneda("total", "Total vendido"),
                col_moneda("ticket", "Ticket promedio", totalizar=False),
            ],
            filas_serie,
            totales=["TOTAL", n_ventas, s_subtotal, s_descuento, s_total, ticket],
            nota=f"Ventas agrupadas por {agrupacion} según la fecha y hora de la venta (zona horaria local).",
        ),
        seccion(
            f"Detalle de ventas ({len(filas_detalle)} de {n_ventas})",
            columnas_detalle,
            filas_detalle,
            totales=totales_por_clave(
                columnas_detalle, fecha="TOTAL DEL PERIODO",
                subtotal=s_subtotal, descuento=s_descuento, total=s_total,
            ),
            nota=(f"Se listan las {limite_filas} ventas más recientes. "
                  "Los totales corresponden a todo el periodo y a los filtros aplicados."),
        ),
    ]

    if alcance.es_consolidado:
        datos_suc = db.session.execute(
            select(
                Sucursal.nombreSucursal,
                func.count(Venta.idVenta),
                func.coalesce(func.sum(Venta.total), 0),
            )
            .join(Sucursal, Sucursal.idSucursal == Venta.idSucursal)
            .where(and_(*condiciones))
            .group_by(Sucursal.nombreSucursal)
            .order_by(func.sum(Venta.total).desc())
        ).all()
        filas_suc = [
            [r[0], int(r[1]), d(r[2]), (d(r[2]) / int(r[1])) if r[1] else Decimal("0"),
             porcentaje(d(r[2]), s_total)]
            for r in datos_suc
        ]
        secciones.append(seccion(
            "Resumen por sucursal",
            [
                columna("sucursal", "Sucursal", ancho=1.8),
                col_entero("ventas", "N.º de ventas", ancho=0.9),
                col_moneda("total", "Total vendido"),
                col_moneda("ticket", "Ticket promedio", totalizar=False),
                col_porcentaje("participacion", "% participación"),
            ],
            filas_suc,
            totales=["TOTAL CONSOLIDADO", sum(f[1] for f in filas_suc), s_total, ticket, 100.0],
            nota="El total consolidado es la suma exacta de las sucursales listadas.",
        ))

    kpis = [
        kpi("Total vendido", float(s_total)),
        kpi("N.º de ventas", n_ventas, tipo="entero"),
        kpi("Ticket promedio", float(round(ticket, 2))),
        kpi("Descuentos otorgados", float(s_descuento)),
        kpi("Unidades vendidas", float(unidades), tipo="decimal"),
    ]
    return _base("ventas", alcance, desde, hasta, secciones, kpis, agrupacion=agrupacion,
                 filtros={"idTipoVenta": idTipoVenta, "idMetodoPago": idMetodoPago,
                          "idCliente": idCliente, "buscar": buscar})


# =========================================================================== 2. FACTURAS
def reporte_facturas(db, alcance, desde, hasta, *, agrupacion="mes", buscar=None, limite=None) -> dict:
    """
    Facturación emitida en el periodo (`Factura` ligada a `Venta`).

    Incluye la **cobertura de facturación**: qué porcentaje de las ventas del periodo
    quedó respaldado con factura (detecta ventas sin documentar).
    """
    Factura = modelo("Factura")
    Venta = modelo("Venta")
    Sucursal = modelo("Sucursal")
    Cliente = modelo("Cliente")

    ini, fin = rango_datetime(db, desde, hasta)
    condiciones = [Factura.fechaEmision.between(ini, fin), Factura.activo.is_(True), Venta.activo.is_(True)]
    filtro_buscar = buscar_ilike(Factura.numeroFactura, buscar)
    if filtro_buscar is not None:
        condiciones.append(filtro_buscar)

    col_cliente = _nombre_cliente(Cliente)

    n_facturas, valor_facturado = db.session.execute(
        alcance.filtrar(
            select(func.count(Factura.idFactura), func.coalesce(func.sum(Factura.valorTotal), 0))
            .join(Venta, Venta.idVenta == Factura.idVenta)
            .where(and_(*condiciones)),
            Venta.idSucursal,
        )
    ).one()
    n_facturas, valor_facturado = int(n_facturas), d(valor_facturado)

    ventas_periodo = d(db.session.execute(
        alcance.filtrar(
            select(func.coalesce(func.sum(Venta.total), 0))
            .where(Venta.fechaHora.between(ini, fin), Venta.activo.is_(True)),
            Venta.idSucursal,
        )
    ).scalar_one())
    cobertura = porcentaje(valor_facturado, ventas_periodo) if ventas_periodo else 0.0

    # --- Detalle de facturas ---
    columnas_detalle = [columna("fecha", "Fecha emisión", "fecha", alineacion="centro", ancho=0.9)]
    campos_detalle = [Factura.fechaEmision]
    if alcance.es_consolidado:
        columnas_detalle.append(columna("sucursal", "Sucursal", ancho=1.7))
        campos_detalle.append(Sucursal.nombreSucursal)
    columnas_detalle += [
        columna("numero", "N.º factura", ancho=1.2),
        columna("cliente", "Cliente", ancho=2.0),
        col_entero("id_venta", "Venta #", totalizar=False, ancho=0.7),
        col_moneda("valor", "Valor facturado"),
    ]
    campos_detalle += [
        Factura.numeroFactura,
        col_cliente if col_cliente is not None else literal(None),
        Venta.idVenta,
        Factura.valorTotal,
    ]

    limite_filas = _limite_detalle(limite)
    filas_detalle = [
        list(f) for f in db.session.execute(
            alcance.filtrar(
                select(*campos_detalle)
                .join(Venta, Venta.idVenta == Factura.idVenta)
                .join(Sucursal, Sucursal.idSucursal == Venta.idSucursal)
                .outerjoin(Cliente, Cliente.idCliente == Venta.idCliente)
                .where(and_(*condiciones))
                .order_by(Factura.fechaEmision.desc(), Factura.idFactura.desc())
                .limit(limite_filas),
                Venta.idSucursal,
            )
        ).all()
    ]

    # --- Serie por periodo ---
    periodo_col = truncar_periodo(db, Factura.fechaEmision, agrupacion)
    filas_serie = [
        [etiqueta_periodo(p, agrupacion), int(n), d(v), (d(v) / int(n)) if n else Decimal("0")]
        for p, n, v in db.session.execute(
            alcance.filtrar(
                select(periodo_col.label("periodo"), func.count(Factura.idFactura),
                       func.coalesce(func.sum(Factura.valorTotal), 0))
                .join(Venta, Venta.idVenta == Factura.idVenta)
                .where(and_(*condiciones))
                .group_by(periodo_col)
                .order_by(periodo_col),
                Venta.idSucursal,
            )
        ).all()
    ]

    secciones = [
        seccion(
            f"Facturación por {agrupacion}",
            [
                columna("periodo", "Periodo", ancho=1.4),
                col_entero("facturas", "N.º facturas", ancho=0.9),
                col_moneda("valor", "Valor facturado"),
                col_moneda("promedio", "Promedio por factura", totalizar=False),
            ],
            filas_serie,
            totales=["TOTAL", n_facturas, valor_facturado,
                     (valor_facturado / n_facturas) if n_facturas else Decimal("0")],
        ),
        seccion(
            f"Detalle de facturas ({len(filas_detalle)} de {n_facturas})",
            columnas_detalle,
            filas_detalle,
            totales=totales_por_clave(columnas_detalle, fecha="TOTAL FACTURADO", valor=valor_facturado),
            nota=("Solo se incluyen facturas y ventas con `activo = True`. "
                  f"Ventas registradas en el mismo periodo: {float(ventas_periodo):,.2f}."),
        ),
    ]

    if alcance.es_consolidado:
        filas_suc = db.session.execute(
            select(Sucursal.nombreSucursal, func.count(Factura.idFactura),
                   func.coalesce(func.sum(Factura.valorTotal), 0))
            .join(Venta, Venta.idVenta == Factura.idVenta)
            .join(Sucursal, Sucursal.idSucursal == Venta.idSucursal)
            .where(and_(*condiciones))
            .group_by(Sucursal.nombreSucursal)
            .order_by(func.sum(Factura.valorTotal).desc())
        ).all()
        secciones.append(seccion(
            "Facturación por sucursal",
            [
                columna("sucursal", "Sucursal", ancho=1.8),
                col_entero("facturas", "N.º facturas", ancho=0.9),
                col_moneda("valor", "Valor facturado"),
                col_porcentaje("participacion", "% participación"),
            ],
            [[r[0], int(r[1]), d(r[2]), porcentaje(d(r[2]), valor_facturado)] for r in filas_suc],
            totales=["TOTAL CONSOLIDADO", n_facturas, valor_facturado, 100.0 if n_facturas else 0.0],
        ))

    kpis = [
        kpi("Valor facturado", float(valor_facturado)),
        kpi("N.º de facturas", n_facturas, tipo="entero"),
        kpi("Promedio por factura", float(round(valor_facturado / n_facturas, 2)) if n_facturas else 0.0),
        kpi("Cobertura sobre ventas", f"{cobertura} %", tipo="texto"),
    ]
    return _base("facturas", alcance, desde, hasta, secciones, kpis, agrupacion=agrupacion,
                 filtros={"buscar": buscar})


# =========================================================================== 3. DEVOLUCIONES
def reporte_devoluciones(db, alcance, desde, hasta, *, idTipoDevolucion=None, solo_aprobadas=False,
                         limite=None) -> dict:
    """
    Devoluciones del periodo (`Devolucion` → `Factura` → `Venta` para llegar a la sucursal).

    Distingue aprobadas de rechazadas: solo las aprobadas reducen la venta neta del
    periodo, pero las rechazadas se listan para trazabilidad. Incluye la **tasa de
    devolución** (monto aprobado sobre ventas del periodo).
    """
    Devolucion = modelo("Devolucion")
    Factura = modelo("Factura")
    Venta = modelo("Venta")
    Sucursal = modelo("Sucursal")
    TipoDevolucion = modelo("TipoDevolucion")

    ini, fin = rango_datetime(db, desde, hasta)
    condiciones = [Devolucion.fecha.between(ini, fin)]
    if idTipoDevolucion:
        condiciones.append(Devolucion.idTipoDevolucion == idTipoDevolucion)
    if solo_aprobadas:
        condiciones.append(Devolucion.aprobada.is_(True))

    n_dev, monto_aprobado, monto_rechazado = db.session.execute(
        alcance.filtrar(
            select(
                func.count(Devolucion.idDevolucion),
                func.coalesce(func.sum(case((Devolucion.aprobada.is_(True), Devolucion.montoTotal), else_=0)), 0),
                func.coalesce(func.sum(case((Devolucion.aprobada.is_(False), Devolucion.montoTotal), else_=0)), 0),
            )
            .join(Factura, Factura.idFactura == Devolucion.idFactura)
            .join(Venta, Venta.idVenta == Factura.idVenta)
            .where(and_(*condiciones)),
            Venta.idSucursal,
        )
    ).one()
    n_dev, monto_aprobado, monto_rechazado = int(n_dev), d(monto_aprobado), d(monto_rechazado)

    ventas_periodo = d(db.session.execute(
        alcance.filtrar(
            select(func.coalesce(func.sum(Venta.total), 0))
            .where(Venta.fechaHora.between(ini, fin), Venta.activo.is_(True)),
            Venta.idSucursal,
        )
    ).scalar_one())
    tasa = porcentaje(monto_aprobado, ventas_periodo) if ventas_periodo else 0.0

    # --- Detalle ---
    columnas = [columna("fecha", "Fecha", "fecha", alineacion="centro", ancho=0.9)]
    campos = [Devolucion.fecha]
    if alcance.es_consolidado:
        columnas.append(columna("sucursal", "Sucursal", ancho=1.7))
        campos.append(Sucursal.nombreSucursal)
    columnas += [
        columna("factura", "Factura", ancho=1.1),
        columna("tipo", "Tipo de devolución", ancho=1.5),
        columna("motivo", "Motivo", ancho=2.6),
        col_moneda("monto", "Monto"),
        columna("estado", "Estado", "texto", alineacion="centro", ancho=0.9),
    ]
    campos += [
        Factura.numeroFactura,
        TipoDevolucion.nombre,
        Devolucion.motivo,
        Devolucion.montoTotal,
        case((Devolucion.aprobada.is_(True), "APROBADA"), else_="RECHAZADA"),
    ]

    limite_filas = _limite_detalle(limite)
    filas = [
        list(f) for f in db.session.execute(
            alcance.filtrar(
                select(*campos)
                .join(Factura, Factura.idFactura == Devolucion.idFactura)
                .join(Venta, Venta.idVenta == Factura.idVenta)
                .join(Sucursal, Sucursal.idSucursal == Venta.idSucursal)
                .join(TipoDevolucion, TipoDevolucion.idTipoDevolucion == Devolucion.idTipoDevolucion)
                .where(and_(*condiciones))
                .order_by(Devolucion.fecha.desc(), Devolucion.idDevolucion.desc())
                .limit(limite_filas),
                Venta.idSucursal,
            )
        ).all()
    ]

    # --- Por tipo de devolución ---
    por_tipo = db.session.execute(
        alcance.filtrar(
            select(
                TipoDevolucion.nombre,
                func.count(Devolucion.idDevolucion),
                func.coalesce(func.sum(Devolucion.montoTotal), 0),
                func.coalesce(func.sum(case((Devolucion.aprobada.is_(True), 1), else_=0)), 0),
            )
            .join(Factura, Factura.idFactura == Devolucion.idFactura)
            .join(Venta, Venta.idVenta == Factura.idVenta)
            .join(TipoDevolucion, TipoDevolucion.idTipoDevolucion == Devolucion.idTipoDevolucion)
            .where(and_(*condiciones))
            .group_by(TipoDevolucion.nombre)
            .order_by(func.sum(Devolucion.montoTotal).desc()),
            Venta.idSucursal,
        )
    ).all()
    total_tipos = sum((d(r[2]) for r in por_tipo), Decimal("0"))

    secciones = [
        seccion(
            "Devoluciones por tipo",
            [
                columna("tipo", "Tipo de devolución", ancho=1.8),
                col_entero("n", "N.º devoluciones", ancho=0.9),
                col_entero("aprobadas", "Aprobadas", ancho=0.9),
                col_moneda("monto", "Monto devuelto"),
                col_porcentaje("participacion", "% del total"),
            ],
            [[r[0], int(r[1]), int(r[3]), d(r[2]), porcentaje(d(r[2]), total_tipos)] for r in por_tipo],
            totales=["TOTAL", n_dev, sum(int(r[3]) for r in por_tipo), total_tipos,
                     100.0 if total_tipos else 0.0],
        ),
        seccion(
            f"Detalle de devoluciones ({len(filas)} de {n_dev})",
            columnas,
            filas,
            totales=totales_por_clave(columnas, fecha="TOTAL DEL PERIODO",
                                      monto=monto_aprobado + monto_rechazado),
            nota=("Solo las devoluciones aprobadas reducen la venta neta del periodo; "
                  "las rechazadas se muestran para trazabilidad."),
        ),
    ]

    if alcance.es_consolidado:
        filas_suc = db.session.execute(
            select(Sucursal.nombreSucursal, func.count(Devolucion.idDevolucion),
                   func.coalesce(func.sum(Devolucion.montoTotal), 0))
            .join(Factura, Factura.idFactura == Devolucion.idFactura)
            .join(Venta, Venta.idVenta == Factura.idVenta)
            .join(Sucursal, Sucursal.idSucursal == Venta.idSucursal)
            .where(and_(*condiciones))
            .group_by(Sucursal.nombreSucursal)
            .order_by(func.sum(Devolucion.montoTotal).desc())
        ).all()
        secciones.append(seccion(
            "Devoluciones por sucursal",
            [
                columna("sucursal", "Sucursal", ancho=1.8),
                col_entero("n", "N.º devoluciones", ancho=0.9),
                col_moneda("monto", "Monto devuelto"),
                col_porcentaje("participacion", "% participación"),
            ],
            [[r[0], int(r[1]), d(r[2]), porcentaje(d(r[2]), total_tipos)] for r in filas_suc],
            totales=["TOTAL CONSOLIDADO", n_dev, total_tipos, 100.0 if total_tipos else 0.0],
        ))

    kpis = [
        kpi("Monto devuelto (aprobadas)", float(monto_aprobado)),
        kpi("N.º de devoluciones", n_dev, tipo="entero"),
        kpi("Tasa de devolución", f"{tasa} %", tipo="texto"),
        kpi("Monto rechazado", float(monto_rechazado)),
    ]
    return _base("devoluciones", alcance, desde, hasta, secciones, kpis,
                 filtros={"idTipoDevolucion": idTipoDevolucion, "solo_aprobadas": solo_aprobadas or None})


# =========================================================================== 4. VENTAS POR PRODUCTO
def reporte_ventas_por_producto(db, alcance, desde, hasta, *, limite=50, buscar=None) -> dict:
    """
    Ranking de productos vendidos (`DetalleVenta` agregado por producto).

    `limite` es cuántos productos lista el reporte (por defecto 50 → top 50).
    El valor vendido usa el `subtotal` de la línea (ya trae los descuentos de línea).
    """
    DetalleVenta = modelo("DetalleVenta")
    Venta = modelo("Venta")
    Producto = modelo("Producto")

    nombre_prod, codigo_prod, categoria_prod, _precio = _campos_producto(Producto)
    ini, fin = rango_datetime(db, desde, hasta)
    condiciones = [Venta.fechaHora.between(ini, fin), Venta.activo.is_(True), DetalleVenta.activo.is_(True)]
    filtro_buscar = buscar_ilike(nombre_prod, buscar)
    if filtro_buscar is not None:
        condiciones.append(filtro_buscar)

    agrupadas = [Producto.idProducto, nombre_prod]
    if codigo_prod is not None:
        agrupadas.append(codigo_prod)
    if categoria_prod is not None:
        agrupadas.append(categoria_prod)

    datos = db.session.execute(
        alcance.filtrar(
            select(
                *agrupadas,
                func.coalesce(func.sum(DetalleVenta.cantidad), 0),
                func.coalesce(func.sum(DetalleVenta.subtotal), 0),
                func.count(func.distinct(Venta.idVenta)),
            )
            .join(Venta, Venta.idVenta == DetalleVenta.idVenta)
            .join(Producto, Producto.idProducto == DetalleVenta.idProducto)
            .where(and_(*condiciones))
            .group_by(*agrupadas)
            .order_by(func.sum(DetalleVenta.subtotal).desc())
            .limit(int(limite or _config("REPORTES_TOP_PRODUCTOS", 50))),
            Venta.idSucursal,
        )
    ).all()

    total_periodo = d(db.session.execute(
        alcance.filtrar(
            select(func.coalesce(func.sum(DetalleVenta.subtotal), 0))
            .join(Venta, Venta.idVenta == DetalleVenta.idVenta)
            .where(and_(*condiciones)),
            Venta.idSucursal,
        )
    ).scalar_one())

    columnas = []
    if codigo_prod is not None:
        columnas.append(columna("codigo", "Código", ancho=0.9))
    columnas.append(columna("producto", "Producto", ancho=2.6))
    if categoria_prod is not None:
        columnas.append(columna("categoria", "Categoría", ancho=1.4))
    columnas += [
        columna("unidades", "Unidades vendidas", "decimal", ancho=1.0),
        col_moneda("valor", "Valor vendido"),
        col_entero("n_ventas", "N.º de ventas", totalizar=False, ancho=0.9),
        col_porcentaje("participacion", "% participación"),
    ]

    filas, unidades_top, valor_top, ventas_top = [], Decimal("0"), Decimal("0"), 0
    for fila in datos:
        pos = 0
        producto_id, nombre = fila[pos], fila[pos + 1]
        pos += 2
        codigo_v = fila[pos] if codigo_prod is not None else None
        pos += 1 if codigo_prod is not None else 0
        categoria_v = fila[pos] if categoria_prod is not None else None
        pos += 1 if categoria_prod is not None else 0
        unidades_v, valor_v, n_ventas_v = d(fila[pos]), d(fila[pos + 1]), int(fila[pos + 2])

        unidades_top += unidades_v
        valor_top += valor_v
        ventas_top += n_ventas_v

        orden = []
        if codigo_prod is not None:
            orden.append(codigo_v)
        orden.append(nombre)
        if categoria_prod is not None:
            orden.append(categoria_v or "Sin categoría")
        orden += [unidades_v, valor_v, n_ventas_v, porcentaje(valor_v, total_periodo)]
        filas.append(orden)

    secciones = [
        seccion(
            f"Top {len(filas)} productos por valor vendido",
            columnas,
            filas,
            totales=totales_por_clave(
                columnas, producto=f"TOTAL TOP {len(filas)}",
                unidades=unidades_top, valor=valor_top, n_ventas=ventas_top,
                participacion=porcentaje(valor_top, total_periodo),
            ),
            nota=("El valor vendido usa el subtotal de cada línea (con descuentos de línea aplicados). "
                  f"Total vendido del periodo: {float(total_periodo):,.2f}."),
        )
    ]

    kpis = [
        kpi("Unidades vendidas (top)", float(unidades_top), tipo="decimal"),
        kpi("Valor vendido (top)", float(round(valor_top, 2))),
        kpi("Productos listados", len(filas), tipo="entero"),
        kpi("Producto más vendido", filas[0][0] if codigo_prod is None and filas else (filas[0][1] if filas else "—"),
            tipo="texto"),
    ]
    return _base("ventas-por-producto", alcance, desde, hasta, secciones, kpis,
                 filtros={"limite": limite, "buscar": buscar})


# =========================================================================== 5. INVENTARIO (EXISTENCIAS)
def reporte_inventario_existencias(db, alcance, desde, hasta, *, buscar=None, solo_agotados=False,
                                   limite=None) -> dict:
    """
    Existencias por producto y sucursal (`Inventario` + `Producto`).

    Nota honesta sobre la valorización: tu modelo `Inventario` guarda cantidades, no
    costos. Si `Producto` expone precio o costo (`precioVenta`, `precio`, `costo`), el
    reporte agrega la columna de valor estimado y su KPI; si no, sale solo con cantidades.
    Se ajusta solo cuando me envíes tu modelo `Producto` real.
    """
    Inventario = modelo("Inventario")
    Producto = modelo("Producto")

    nombre_prod, codigo_prod, categoria_prod, precio_prod = _campos_producto(Producto)

    condiciones = [Inventario.activo.is_(True)]
    if solo_agotados:
        condiciones.append(Inventario.CantidadDisponible <= 0)
    filtro_buscar = buscar_ilike(nombre_prod, buscar)
    if filtro_buscar is not None:
        condiciones.append(filtro_buscar)

    columnas_select = [Inventario.idSucursal]
    if codigo_prod is not None:
        columnas_select.append(codigo_prod)
    columnas_select.append(nombre_prod)
    if categoria_prod is not None:
        columnas_select.append(categoria_prod)
    columnas_select.extend([Inventario.CantidadDisponible, Inventario.fecha_creacion])
    if precio_prod is not None:
        columnas_select.append(precio_prod)

    limite_filas = _limite_detalle(limite)
    filas_sql = db.session.execute(
        alcance.filtrar(
            select(*columnas_select)
            .join(Producto, Producto.idProducto == Inventario.idProducto)
            .where(and_(*condiciones))
            .order_by(Inventario.CantidadDisponible.desc())
            .limit(limite_filas),
            Inventario.idSucursal,
        )
    ).all()

    columnas = []
    if alcance.es_consolidado:
        columnas.append(columna("sucursal", "Sucursal", ancho=1.7))
    if codigo_prod is not None:
        columnas.append(columna("codigo", "Código", ancho=0.9))
    columnas.append(columna("producto", "Producto", ancho=2.6))
    if categoria_prod is not None:
        columnas.append(columna("categoria", "Categoría", ancho=1.3))
    columnas.append(columna("cantidad", "Cantidad disponible", "decimal", ancho=1.0))
    if precio_prod is not None:
        columnas.append(col_moneda("valor", "Valor estimado"))
    columnas.append(columna("actualizado", "Última actualización", "fecha", alineacion="centro", ancho=1.0))

    filas, unidades, valor_total = [], Decimal("0"), Decimal("0")
    for fila_sql in filas_sql:
        fila = list(fila_sql)
        pos = 0
        id_suc = fila[pos]
        pos += 1
        codigo_v = fila[pos] if codigo_prod is not None else None
        pos += 1 if codigo_prod is not None else 0
        nombre_v = fila[pos]
        pos += 1
        categoria_v = fila[pos] if categoria_prod is not None else None
        pos += 1 if categoria_prod is not None else 0
        cantidad = d(fila[pos])
        pos += 1
        actualizado = fila[pos]
        pos += 1
        precio = d(fila[pos]) if precio_prod is not None else None

        unidades += cantidad
        orden = []
        if alcance.es_consolidado:
            orden.append(alcance.nombre_de(id_suc))
        if codigo_prod is not None:
            orden.append(codigo_v)
        orden.append(nombre_v)
        if categoria_prod is not None:
            orden.append(categoria_v or "Sin categoría")
        orden.append(cantidad)
        if precio is not None:
            valor_total += cantidad * precio
            orden.append(cantidad * precio)
        orden.append(actualizado)
        filas.append(orden)

    secciones = [
        seccion(
            f"Existencias por producto ({len(filas)} registros)",
            columnas,
            filas,
            totales=totales_por_clave(columnas, producto="TOTAL", cantidad=unidades,
                                      valor=round(valor_total, 2) if precio_prod is not None else ""),
            nota=("Cantidades vigentes de inventario por sucursal y producto. "
                  + ("El valor estimado usa el precio de venta del producto, porque tu modelo de "
                     "inventario no guarda costo. " if precio_prod is not None else
                     "Tu modelo de producto no expone precio ni costo: el reporte sale sin valorización. ")
                  + "Se excluyen los registros con `activo = False`."),
        )
    ]

    if alcance.es_consolidado:
        resumen = db.session.execute(
            select(
                Inventario.idSucursal,
                func.count(Inventario.idInventario),
                func.coalesce(func.sum(Inventario.CantidadDisponible), 0),
            )
            .join(Producto, Producto.idProducto == Inventario.idProducto)
            .where(and_(*condiciones))
            .group_by(Inventario.idSucursal)
        ).all()
        secciones.append(seccion(
            "Resumen por sucursal",
            [
                columna("sucursal", "Sucursal", ancho=1.8),
                col_entero("referencias", "Referencias", ancho=1.0),
                columna("unidades", "Unidades en existencia", "decimal", ancho=1.2),
                col_porcentaje("participacion", "% de las unidades"),
            ],
            [[alcance.nombre_de(r[0]), int(r[1]), d(r[2]), porcentaje(d(r[2]), unidades)] for r in resumen],
            totales=["TOTAL CONSOLIDADO", sum(int(r[1]) for r in resumen), unidades, 100.0],
        ))

    if categoria_prod is not None:
        por_categoria = db.session.execute(
            alcance.filtrar(
                select(
                    categoria_prod,
                    func.count(func.distinct(Inventario.idProducto)),
                    func.coalesce(func.sum(Inventario.CantidadDisponible), 0),
                )
                .join(Producto, Producto.idProducto == Inventario.idProducto)
                .where(and_(*condiciones))
                .group_by(categoria_prod)
                .order_by(func.sum(Inventario.CantidadDisponible).desc()),
                Inventario.idSucursal,
            )
        ).all()
        secciones.append(seccion(
            "Existencias por categoría",
            [
                columna("categoria", "Categoría", ancho=1.8),
                col_entero("referencias", "Referencias", ancho=1.0),
                columna("unidades", "Unidades", "decimal", ancho=1.2),
            ],
            [[r[0] or "Sin categoría", int(r[1]), d(r[2])] for r in por_categoria],
        ))

    kpis = [
        kpi("Referencias en inventario", len(filas), tipo="entero"),
        kpi("Unidades en existencia", float(unidades), tipo="decimal"),
        kpi("Sucursales incluidas", len(alcance.sucursales), tipo="entero"),
    ]
    if precio_prod is not None:
        kpis.append(kpi("Valor estimado del inventario", float(round(valor_total, 2))))

    return _base("inventario-existencias", alcance, desde, hasta, secciones, kpis,
                 filtros={"buscar": buscar, "solo_agotados": solo_agotados or None},
                 descripcion=("El periodo del encabezado corresponde a la consulta; las existencias "
                              "mostradas son las vigentes a la fecha de generación."))


# =========================================================================== 6. CONSOLIDADO POR SUCURSAL
def reporte_consolidado_sucursales(db, alcance, desde, hasta) -> dict:
    """
    Comparativo lado a lado de todas las sucursales autorizadas.

    Ventas brutas − devoluciones aprobadas = ventas netas. El consolidado equivale a la
    suma exacta de las sucursales listadas (la prueba automática lo verifica).

    Nota: este reporte es **intrínsecamente consolidado**. Si se pide con `sucursal_id`,
    el endpoint lo genera igualmente para todas las sucursales autorizadas.
    """
    Venta = modelo("Venta")
    Devolucion = modelo("Devolucion")
    Factura = modelo("Factura")
    DetalleVenta = modelo("DetalleVenta")

    ini, fin = rango_datetime(db, desde, hasta)
    ids = alcance.ids

    ventas = {
        r[0]: r for r in db.session.execute(
            select(
                Venta.idSucursal,
                func.count(Venta.idVenta),
                func.coalesce(func.sum(Venta.subtotal), 0),
                func.coalesce(func.sum(Venta.descuentoTotal), 0),
                func.coalesce(func.sum(Venta.total), 0),
            )
            .where(Venta.fechaHora.between(ini, fin), Venta.activo.is_(True), Venta.idSucursal.in_(ids))
            .group_by(Venta.idSucursal)
        ).all()
    }

    unidades_por_sucursal = dict(db.session.execute(
        select(Venta.idSucursal, func.coalesce(func.sum(DetalleVenta.cantidad), 0))
        .join(DetalleVenta, DetalleVenta.idVenta == Venta.idVenta)
        .where(Venta.fechaHora.between(ini, fin), Venta.activo.is_(True), Venta.idSucursal.in_(ids))
        .group_by(Venta.idSucursal)
    ).all())

    devoluciones = dict(db.session.execute(
        select(Venta.idSucursal, func.coalesce(func.sum(Devolucion.montoTotal), 0))
        .join(Factura, Factura.idFactura == Devolucion.idFactura)
        .join(Venta, Venta.idVenta == Factura.idVenta)
        .where(Devolucion.fecha.between(ini, fin), Devolucion.aprobada.is_(True),
               Venta.idSucursal.in_(ids))
        .group_by(Venta.idSucursal)
    ).all())

    facturado = dict(db.session.execute(
        select(Venta.idSucursal, func.coalesce(func.sum(Factura.valorTotal), 0))
        .join(Factura, Factura.idVenta == Venta.idVenta)
        .where(Factura.fechaEmision.between(ini, fin), Factura.activo.is_(True),
               Venta.activo.is_(True), Venta.idSucursal.in_(ids))
        .group_by(Venta.idSucursal)
    ).all())

    filas, tot = [], {"n": 0, "unidades": Decimal("0"), "subtotal": Decimal("0"),
                      "descuentos": Decimal("0"), "brutas": Decimal("0"),
                      "devoluciones": Decimal("0"), "netas": Decimal("0")}
    for sucursal in alcance.sucursales:
        sid = sucursal_id(sucursal)
        r = ventas.get(sid)
        n = int(r[1]) if r else 0
        subtotal, descuentos, brutas = (d(r[2]), d(r[3]), d(r[4])) if r else (Decimal("0"),) * 3
        dev = d(devoluciones.get(sid, 0))
        netas = brutas - dev
        unidades = d(unidades_por_sucursal.get(sid, 0))
        fac = d(facturado.get(sid, 0))

        tot["n"] += n
        tot["unidades"] += unidades
        tot["subtotal"] += subtotal
        tot["descuentos"] += descuentos
        tot["brutas"] += brutas
        tot["devoluciones"] += dev
        tot["netas"] += netas

        filas.append([
            sucursal_nombre(sucursal), n, unidades, subtotal, descuentos, brutas, dev, netas, fac,
            (netas / n) if n else Decimal("0"), 0.0,
        ])

    for fila in filas:
        fila[10] = porcentaje(d(fila[7]), tot["netas"])
    filas.sort(key=lambda f: d(f[7]), reverse=True)

    seccion_comparativa = seccion(
        "Comparativo por sucursal",
        [
            columna("sucursal", "Sucursal", ancho=1.8),
            col_entero("ventas", "N.º de ventas", ancho=0.9),
            columna("unidades", "Unidades", "decimal", ancho=0.9),
            col_moneda("subtotal", "Subtotal"),
            col_moneda("descuentos", "Descuentos"),
            col_moneda("brutas", "Ventas brutas"),
            col_moneda("devoluciones", "Devoluciones"),
            col_moneda("netas", "Ventas netas"),
            col_moneda("facturado", "Valor facturado"),
            col_moneda("ticket", "Ticket promedio", totalizar=False),
            col_porcentaje("participacion", "% participación"),
        ],
        filas,
        totales=["TOTAL CONSOLIDADO", tot["n"], tot["unidades"], tot["subtotal"], tot["descuentos"],
                 tot["brutas"], tot["devoluciones"], tot["netas"],
                 sum((d(f[8]) for f in filas), Decimal("0")),
                 (tot["netas"] / tot["n"]) if tot["n"] else Decimal("0"), 100.0],
        nota=("Ventas netas = ventas brutas − devoluciones aprobadas. "
              "El consolidado equivale a la suma de las sucursales listadas."),
    )

    total_facturado = sum((d(f[8]) for f in filas), Decimal("0"))
    seccion_facturacion = seccion(
        "Cobertura de facturación por sucursal",
        [
            columna("sucursal", "Sucursal", ancho=1.8),
            col_moneda("ventas", "Ventas brutas"),
            col_moneda("facturado", "Valor facturado"),
            col_moneda("diferencia", "Diferencia por facturar"),
            col_porcentaje("cobertura", "% cobertura"),
        ],
        [
            [f[0], d(f[5]), d(f[8]), d(f[5]) - d(f[8]),
             porcentaje(d(f[8]), d(f[5])) if d(f[5]) else 0.0]
            for f in filas
        ],
        totales=["TOTAL", tot["brutas"], total_facturado, tot["brutas"] - total_facturado,
                 porcentaje(total_facturado, tot["brutas"]) if tot["brutas"] else 0.0],
        nota="Diferencia positiva = ventas registradas que aún no tienen factura asociada.",
    )

    lider = filas[0] if filas else None
    kpis = [
        kpi("Ventas netas consolidadas", float(tot["netas"])),
        kpi("Devoluciones aprobadas", float(tot["devoluciones"])),
        kpi("N.º de ventas", tot["n"], tipo="entero"),
        kpi("Ticket promedio consolidado", float(round(tot["netas"] / tot["n"], 2)) if tot["n"] else 0.0),
        kpi("Sucursal líder", lider[0] if lider else "—", tipo="texto"),
        kpi("Sucursales incluidas", len(alcance.sucursales), tipo="entero"),
    ]
    return _base("consolidado-sucursales", alcance, desde, hasta,
                 [seccion_comparativa, seccion_facturacion], kpis,
                 descripcion="Todas las sucursales autorizadas, ordenadas por ventas netas.")

# =============================================================================
# 8. REGISTRO DE IMPLEMENTACIONES
# =============================================================================

IMPLEMENTACIONES: dict[str, Any] = {
    "ventas": reporte_ventas,
    "facturas": reporte_facturas,
    "devoluciones": reporte_devoluciones,
    "ventas-por-producto": reporte_ventas_por_producto,
    "inventario-existencias": reporte_inventario_existencias,
    "consolidado-sucursales": reporte_consolidado_sucursales,
}


def catalogo_implementacion(codigo: str):
    """
    Devuelve la función que genera el reporte pedido.

    Valida primero contra el catálogo, así un código inexistente o un reporte
    pendiente (por ejemplo, "ingresos-egresos" mientras no exista la tabla de
    tesorería) devuelve un mensaje claro en lugar de un error del servidor.
    """
    catalogo_metadatos(codigo)
    funcion = IMPLEMENTACIONES.get(codigo)
    if funcion is None:
        raise ReporteNoDisponible(
            f"El reporte '{codigo}' está en el catálogo pero falta implementarlo y registrarlo "
            "en IMPLEMENTACIONES (app/services/reporte_service.py)."
        )
    return funcion
