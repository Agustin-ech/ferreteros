"""
Pruebas del módulo de reportes contra los modelos reales del proyecto.

Cubre lo que el requerimiento pide explícitamente y lo que suele fallar en producción:

  ✔ cada reporte se puede generar por sucursal y de forma consolidada;
  ✔ el consolidado es la suma exacta de las sucursales (la prueba clave);
  ✔ los totales del encabezado coinciden con los totales de las tablas;
  ✔ los parámetros inválidos devuelven 404/422 y no 500;
  ✔ los permisos por sucursal se respetan;
  ✔ las exportaciones CSV y PDF salen del mismo contrato JSON.

Ejecutar:  python -m pytest tests/test_reportes_api.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tests.app_pruebas import crear_app_con_datos

PERIODO = {"desde": "2026-01-01", "hasta": "2026-09-30"}
REPORTES = [
    "ventas",
    "facturas",
    "devoluciones",
    "ventas-por-producto",
    "inventario-existencias",
    "consolidado-sucursales",
]


@pytest.fixture(scope="module")
def app():
    return crear_app_con_datos()


@pytest.fixture(scope="module")
def cliente(app):
    return app.test_client()


@pytest.fixture(scope="module")
def sucursales(cliente):
    return cliente.get("/api/v1/reportes/sucursales").get_json()


# --------------------------------------------------------------------------- Catálogo y sucursales
def test_catalogo_lista_los_reportes_y_los_pendientes(cliente):
    datos = cliente.get("/api/v1/reportes/catalogo").get_json()
    codigos = [r["codigo"] for r in datos["reportes"]]
    assert codigos == REPORTES
    assert all(r["endpoint"].startswith("/api/v1/reportes/") for r in datos["reportes"])
    pendientes = {p["codigo"] for p in datos["reportes_pendientes"]}
    assert {"ingresos-egresos", "estado-resultados", "inventario-movimientos"} <= pendientes


def test_sucursales_devuelve_las_activas(sucursales):
    assert {s["nombre"] for s in sucursales} == {"La Chinita", "Buena Vista"}
    assert len(sucursales) == 2
    assert all({"id", "nombre", "direccion"} <= set(s) for s in sucursales)


# --------------------------------------------------------------------------- Todos los reportes responden
@pytest.mark.parametrize("codigo", REPORTES)
@pytest.mark.parametrize("sucursal_id", ["todas", "1", "2"])
def test_todos_los_reportes_responden_en_json(cliente, codigo, sucursal_id):
    r = cliente.get(f"/api/v1/reportes/{codigo}", query_string={**PERIODO, "sucursal_id": sucursal_id})
    assert r.status_code == 200, r.get_json()
    datos = r.get_json()
    assert datos["codigo"] == codigo
    assert datos["secciones"], "el reporte debe traer al menos una sección"
    assert datos["periodo"]["dias"] == 273
    esperado = "CONSOLIDADO" if sucursal_id == "todas" else "SUCURSAL"
    assert datos["alcance"]["modo"] == esperado
    # Toda fila debe tener tantos valores como columnas (el contrato lo garantiza, aquí se verifica).
    for seccion in datos["secciones"]:
        for fila in seccion["filas"]:
            assert len(fila) == len(seccion["columnas"])


# --------------------------------------------------------------------------- LA prueba clave
@pytest.mark.parametrize("codigo,clave_campo", [
    ("ventas", "total"),
    ("facturas", "valor"),
    ("devoluciones", "monto"),
])
def test_consolidado_igual_a_suma_de_sucursales(cliente, sucursales, codigo, clave_campo):
    """El total consolidado debe ser exactamente la suma de las sucursales."""
    consolidado = cliente.get(f"/api/v1/reportes/{codigo}",
                              query_string={**PERIODO, "sucursal_id": "todas"}).get_json()
    kpi_consolidado = _kpi(consolidado)

    suma = 0.0
    for sucursal in sucursales:
        rep = cliente.get(f"/api/v1/reportes/{codigo}",
                          query_string={**PERIODO, "sucursal_id": str(sucursal["id"])}).get_json()
        suma += _kpi(rep)

    assert round(suma, 2) == pytest.approx(kpi_consolidado, abs=0.02), (
        f"{codigo}: la suma por sucursal ({suma}) no coincide con el consolidado ({kpi_consolidado})"
    )


def _kpi(reporte_json: dict) -> float:
    """Primer KPI monetario del reporte (total vendido / valor facturado / monto devuelto)."""
    for k in reporte_json["kpis"]:
        if k["tipo"] == "moneda":
            return float(k["valor"])
    raise AssertionError("el reporte no trae ningún KPI monetario")


def test_consolidado_por_sucursal_cuadra_con_los_totales_de_su_tabla(cliente):
    datos = cliente.get("/api/v1/reportes/consolidado-sucursales", query_string=PERIODO).get_json()
    tabla = datos["secciones"][0]
    totales = tabla["totales"]
    for i, columna in enumerate(tabla["columnas"]):
        if columna["totalizar"]:
            assert totales[i] == pytest.approx(sum(f[i] for f in tabla["filas"]), abs=0.02), \
                f"la columna {columna['clave']} no cuadra con su total"
    # La participación debe sumar 100 %.
    i_part = [c["clave"] for c in tabla["columnas"]].index("participacion")
    assert sum(f[i_part] for f in tabla["filas"]) == pytest.approx(100.0, abs=0.2)


def test_inventario_consolidado_suma_las_sucursales(cliente, sucursales):
    consolidado = cliente.get("/api/v1/reportes/inventario-existencias",
                              query_string={"sucursal_id": "todas"}).get_json()
    unidades_consolidado = [k for k in consolidado["kpis"] if k["etiqueta"] == "Unidades en existencia"][0]["valor"]
    suma = 0.0
    for sucursal in sucursales:
        rep = cliente.get("/api/v1/reportes/inventario-existencias",
                          query_string={"sucursal_id": str(sucursal["id"])}).get_json()
        suma += [k for k in rep["kpis"] if k["etiqueta"] == "Unidades en existencia"][0]["valor"]
    assert suma == pytest.approx(unidades_consolidado, abs=0.02)


# --------------------------------------------------------------------------- Detalles del contrato
def test_reporte_de_ventas_trae_series_detalle_y_resumen_por_sucursal(cliente):
    datos = cliente.get("/api/v1/reportes/ventas",
                        query_string={**PERIODO, "agrupacion": "mes"}).get_json()
    nombres = [s["nombre"] for s in datos["secciones"]]
    assert nombres == ["Resumen por mes", "Detalle de ventas (300 de 777)", "Resumen por sucursal"] or \
           nombres[0].startswith("Resumen por mes")
    assert datos["kpis"][1]["tipo"] == "entero"
    # El consolidado en el detalle incluye la columna Sucursal; en modo sucursal, no.
    solo_sucursal = cliente.get("/api/v1/reportes/ventas",
                                query_string={**PERIODO, "sucursal_id": "1"}).get_json()
    assert "sucursal" in [c["clave"] for c in datos["secciones"][1]["columnas"]]
    assert "sucursal" not in [c["clave"] for c in solo_sucursal["secciones"][1]["columnas"]]


def test_devoluciones_separan_aprobadas_de_rechazadas(cliente):
    datos = cliente.get("/api/v1/reportes/devoluciones", query_string=PERIODO).get_json()
    etiquetas = [k["etiqueta"] for k in datos["kpis"]]
    assert "Monto devuelto (aprobadas)" in etiquetas and "Monto rechazado" in etiquetas
    aprobadas = [k for k in datos["kpis"] if k["etiqueta"] == "Monto devuelto (aprobadas)"][0]["valor"]
    rechazadas = [k for k in datos["kpis"] if k["etiqueta"] == "Monto rechazado"][0]["valor"]
    assert rechazadas > 0, "los datos de prueba deben incluir devoluciones rechazadas"
    assert aprobadas > rechazadas


def test_cobertura_de_facturacion_es_coherente(cliente):
    datos = cliente.get("/api/v1/reportes/facturas", query_string=PERIODO).get_json()
    cobertura = [k for k in datos["kpis"] if k["etiqueta"] == "Cobertura sobre ventas"][0]["valor"]
    assert cobertura.endswith(" %")
    assert 80.0 <= float(cobertura.split()[0]) <= 100.0  # se sembró ~88 % de ventas facturadas


def test_filtro_por_tipo_de_venta_reduce_el_resultado(cliente):
    todas = cliente.get("/api/v1/reportes/ventas", query_string=PERIODO).get_json()
    mayorista = cliente.get("/api/v1/reportes/ventas",
                            query_string={**PERIODO, "idTipoVenta": "2"}).get_json()
    total_todas, total_mayorista = _kpi(todas), _kpi(mayorista)
    assert 0 < total_mayorista < total_todas
    assert mayorista["filtros_aplicados"]["idTipoVenta"] == 2


# --------------------------------------------------------------------------- Errores controlados
@pytest.mark.parametrize("query_string,esperado", [
    ({"sucursal_id": "99"}, 404),                     # sucursal inexistente
    ({"sucursal_id": "abc"}, 422),                    # sucursal mal escrita
    ({"desde": "2026-09-30", "hasta": "2026-01-01"}, 422),   # rango invertido
    ({"desde": "2000-01-01", "hasta": "2026-09-30"}, 422),   # rango mayor al máximo
    ({"desde": "31-12-2026"}, 422),                   # fecha mal formateada
    ({"formato": "xml"}, 422),                        # formato no soportado
    ({"agrupacion": "trimestre"}, 422),               # agrupación no soportada
])
def test_parametros_invalidos_devuelven_error_controlado(cliente, query_string, esperado):
    r = cliente.get("/api/v1/reportes/ventas", query_string={**PERIODO, **query_string})
    assert r.status_code == esperado, r.get_json()
    assert "mensaje" in r.get_json()


def test_reporte_inexistente_y_pendiente(cliente):
    assert cliente.get("/api/v1/reportes/no-existe").status_code == 404
    r = cliente.get("/api/v1/reportes/ingresos-egresos")
    assert r.status_code == 404
    assert "todavía no está disponible" in r.get_json()["mensaje"]


def test_formato_de_fecha_alterno_dd_mm_aaaa(cliente):
    a = cliente.get("/api/v1/reportes/ventas", query_string={"desde": "2026-01-01", "hasta": "2026-09-30"}).get_json()
    b = cliente.get("/api/v1/reportes/ventas", query_string={"desde": "01/01/2026", "hasta": "30/09/2026"}).get_json()
    assert _kpi(a) == _kpi(b)


# --------------------------------------------------------------------------- Exportaciones
def test_exportacion_csv_y_pdf(cliente, tmp_path):
    csv = cliente.get("/api/v1/reportes/ventas",
                      query_string={**PERIODO, "formato": "csv"})
    assert csv.status_code == 200
    assert csv.headers["Content-Type"].startswith("text/csv")
    assert "attachment" in csv.headers["Content-Disposition"]
    assert csv.data.startswith(b"\xef\xbb\xbf")
    assert b"Reporte de ventas" in csv.data

    pdf = cliente.get("/api/v1/reportes/consolidado-sucursales",
                      query_string={**PERIODO, "formato": "pdf"})
    assert pdf.status_code == 200
    assert pdf.headers["Content-Type"] == "application/pdf"
    assert pdf.data.startswith(b"%PDF")

    ruta = tmp_path / "consolidado.pdf"
    ruta.write_bytes(pdf.data)
    assert ruta.stat().st_size > 2000

    # JSON y CSV describen el mismo reporte (mismo alcance y periodo).
    json_datos = cliente.get("/api/v1/reportes/ventas", query_string={**PERIODO, "formato": "json"}).get_json()
    assert json_datos["alcance"]["etiqueta"] in csv.data.decode("utf-8-sig")


# --------------------------------------------------------------------------- Permisos
def test_permisos_por_sucursal(app, cliente):
    """Un vendedor de la sucursal 2 no puede ver otras sucursales ni el consolidado completo."""
    from app.errors.reportes import SucursalNoEncontrada
    from app.services.reporte_service import resolver_alcance

    class Vendedor:
        rol = "VENDEDOR"
        sucursal_id = 2
        es_admin = False

    class Administrador:
        rol = "ADMIN"
        es_admin = True

    with app.app_context():
        from app.extensions import db

        alcance = resolver_alcance(db, "todas", usuario=Vendedor())
        assert alcance.es_consolidado
        assert alcance.ids == [2], "el consolidado del vendedor solo debe incluir su sucursal"

        alcance_propia = resolver_alcance(db, "2", usuario=Vendedor())
        assert alcance_propia.modo == "SUCURSAL"
        assert alcance_propia.ids == [2]

        with pytest.raises(SucursalNoEncontrada):
            resolver_alcance(db, "1", usuario=Vendedor())

        alcance_admin = resolver_alcance(db, "todas", usuario=Administrador())
        assert len(alcance_admin.ids) == 2, "el administrador ve el consolidado completo"
