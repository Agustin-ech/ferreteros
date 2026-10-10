"""
Pruebas del módulo de mercancía dañada.

    python -m pytest tests/test_mercancia_danada_api.py -v

Lo que se verifica:

  · registrar un daño descuenta el inventario, y anularlo lo devuelve (una sola vez)
  · el valor de la pérdida se congela con el costo del momento
  · las transiciones de estado inválidas se rechazan (409), no rompen el servidor
  · el alcance individual/consolidado y los permisos por sucursal
  · el reporte: consolidado = suma de las sucursales, y exportación CSV/PDF
"""

from __future__ import annotations

import sys
from decimal import Decimal
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.extensions import db
from app.services.inventario_service import existencias
from tests.app_pruebas import crear_app_con_datos

PERIODO = {"desde": "2026-01-01", "hasta": "2026-12-31"}


@pytest.fixture(scope="module")
def app():
    return crear_app_con_datos()


@pytest.fixture(scope="module")
def cliente(app):
    return app.test_client()


@pytest.fixture(scope="module")
def tipos(cliente):
    return cliente.get("/api/v1/mercancia-danada/tipos-danio").get_json()


def _existencias(app, id_producto: int, id_sucursal: int) -> Decimal:
    with app.app_context():
        return existencias(db, id_producto, id_sucursal)


def _registrar(cliente, **cambios):
    cuerpo = {"idProducto": 5, "idSucursal": 1, "idUsuario": 2, "idTipoDanio": 1, "cantidad": 4}
    cuerpo.update(cambios)
    return cliente.post("/api/v1/mercancia-danada", json=cuerpo)


# --------------------------------------------------------------------------- Catálogo
def test_catalogo_de_tipos_de_danio(tipos):
    assert len(tipos) >= 4
    nombres = {t["nombre"] for t in tipos}
    assert "Defecto de fábrica" in nombres
    # los imputables al proveedor vienen marcados: habilitan el reclamo
    assert any(t["imputableProveedor"] for t in tipos)


def test_crear_tipo_de_danio_repetido_es_conflicto(cliente):
    assert cliente.post("/api/v1/mercancia-danada/tipos-danio",
                        json={"nombre": "Corrosión"}).status_code == 201
    r = cliente.post("/api/v1/mercancia-danada/tipos-danio", json={"nombre": "corrosión"})
    assert r.status_code == 409


# --------------------------------------------------------------------------- Registro
def test_registrar_descuenta_el_inventario(app, cliente):
    antes = _existencias(app, 5, 1)
    r = _registrar(cliente, cantidad=4)
    assert r.status_code == 201

    cuerpo = r.get_json()
    assert cuerpo["estado"] == "Registrada"
    assert cuerpo["descontadoDeInventario"] is True
    assert Decimal(str(cuerpo["existenciasRestantes"])) == antes - 4
    assert _existencias(app, 5, 1) == antes - 4


def test_el_valor_de_la_perdida_es_cantidad_por_costo(cliente):
    cuerpo = _registrar(cliente, cantidad=3, costoUnitario=12500).get_json()
    assert cuerpo["costoUnitario"] == 12500
    assert cuerpo["valorPerdida"] == pytest.approx(3 * 12500)


def test_registrar_sin_existencias_suficientes_no_deja_rastro(app, cliente):
    antes = _existencias(app, 6, 1)
    r = _registrar(cliente, idProducto=6, cantidad=999999)
    assert r.status_code == 409
    assert r.get_json()["error"] == "stock_insuficiente"
    # la transacción se revierte completa: ni registro ni movimiento de inventario
    assert _existencias(app, 6, 1) == antes


@pytest.mark.parametrize("cuerpo, campo", [
    ({"cantidad": -2}, "cantidad"),
    ({"cantidad": 0}, "cantidad"),
    ({"idProducto": "abc"}, "idProducto"),
])
def test_datos_invalidos_devuelven_422(cliente, cuerpo, campo):
    r = _registrar(cliente, **cuerpo)
    assert r.status_code == 422
    assert campo in r.get_json()["campos"]


def test_producto_o_tipo_inexistente_devuelve_404(cliente):
    assert _registrar(cliente, idProducto=9999).status_code == 404
    assert _registrar(cliente, idTipoDanio=9999).status_code == 404


def test_sucursal_no_autorizada_devuelve_404(cliente):
    assert _registrar(cliente, idSucursal=99).status_code == 404


# --------------------------------------------------------------------------- Estados
def test_anular_devuelve_el_inventario_una_sola_vez(app, cliente):
    antes = _existencias(app, 7, 2)
    registro = _registrar(cliente, idProducto=7, idSucursal=2, cantidad=6).get_json()
    assert _existencias(app, 7, 2) == antes - 6

    r = cliente.delete(f"/api/v1/mercancia-danada/{registro['idMercanciaDanada']}")
    assert r.status_code == 200
    assert _existencias(app, 7, 2) == antes

    # Anulada es estado final: no se puede volver a anular ni devolver dos veces
    r2 = cliente.delete(f"/api/v1/mercancia-danada/{registro['idMercanciaDanada']}")
    assert r2.status_code == 409
    assert _existencias(app, 7, 2) == antes


def test_recuperar_devuelve_el_inventario(app, cliente):
    antes = _existencias(app, 8, 1)
    registro = _registrar(cliente, idProducto=8, cantidad=2).get_json()
    r = cliente.patch(f"/api/v1/mercancia-danada/{registro['idMercanciaDanada']}/estado",
                      json={"estado": "Recuperada", "observacion": "Se reparó el empaque"})
    assert r.status_code == 200
    assert r.get_json()["estado"] == "Recuperada"
    assert _existencias(app, 8, 1) == antes


def test_dar_de_baja_no_devuelve_inventario_y_es_estado_final(app, cliente):
    antes = _existencias(app, 9, 1)
    registro = _registrar(cliente, idProducto=9, cantidad=3).get_json()
    idr = registro["idMercanciaDanada"]

    assert cliente.patch(f"/api/v1/mercancia-danada/{idr}/estado",
                         json={"estado": "Dada de baja"}).status_code == 200
    assert _existencias(app, 9, 1) == antes - 3          # la pérdida se confirma

    r = cliente.patch(f"/api/v1/mercancia-danada/{idr}/estado", json={"estado": "Recuperada"})
    assert r.status_code == 409
    assert "estado final" in r.get_json()["detalle"]


def test_reclamar_exige_pedido_asociado(cliente):
    registro = _registrar(cliente, cantidad=1).get_json()
    r = cliente.patch(f"/api/v1/mercancia-danada/{registro['idMercanciaDanada']}/estado",
                      json={"estado": "Reclamada"})
    assert r.status_code == 409
    assert "idPedidoProveedor" in r.get_json()["mensaje"]


def test_estado_inexistente_devuelve_422(cliente):
    registro = _registrar(cliente, cantidad=1).get_json()
    r = cliente.patch(f"/api/v1/mercancia-danada/{registro['idMercanciaDanada']}/estado",
                      json={"estado": "Perdida en el espacio"})
    assert r.status_code == 422


def test_registro_inexistente_devuelve_404(cliente):
    assert cliente.get("/api/v1/mercancia-danada/999999").status_code == 404


# --------------------------------------------------------------------------- Listado y resumen
def test_listado_respeta_el_alcance_por_sucursal(cliente):
    datos = cliente.get("/api/v1/mercancia-danada", query_string={"sucursal_id": 2, **PERIODO}).get_json()
    assert datos["alcance"]["modo"] == "SUCURSAL"
    assert {d["idSucursal"] for d in datos["datos"]} <= {2}


def test_listado_pagina_los_resultados(cliente):
    pagina1 = cliente.get("/api/v1/mercancia-danada",
                          query_string={**PERIODO, "pagina": 1, "por_pagina": 5}).get_json()
    assert len(pagina1["datos"]) <= 5
    assert pagina1["paginacion"]["total"] >= len(pagina1["datos"])

    pagina2 = cliente.get("/api/v1/mercancia-danada",
                          query_string={**PERIODO, "pagina": 2, "por_pagina": 5}).get_json()
    ids1 = {d["idMercanciaDanada"] for d in pagina1["datos"]}
    ids2 = {d["idMercanciaDanada"] for d in pagina2["datos"]}
    assert not (ids1 & ids2)


def test_resumen_cuadra_con_sus_desgloses(cliente):
    datos = cliente.get("/api/v1/mercancia-danada/resumen", query_string=PERIODO).get_json()
    total = datos["totales"]["valorPerdida"]
    for bloque in ("por_motivo", "por_sucursal", "por_estado"):
        suma = sum(x["valor"] for x in datos[bloque])
        assert suma == pytest.approx(total, rel=1e-6), bloque
    # el top de productos es un subconjunto: nunca puede superar el total
    assert sum(x["valor"] for x in datos["por_producto"]) <= total + 0.01


def test_resumen_consolidado_es_la_suma_de_las_sucursales(cliente):
    consolidado = cliente.get("/api/v1/mercancia-danada/resumen", query_string=PERIODO).get_json()
    sucursales = cliente.get("/api/v1/reportes/sucursales").get_json()

    suma = 0.0
    for s in sucursales:
        r = cliente.get("/api/v1/mercancia-danada/resumen",
                        query_string={**PERIODO, "sucursal_id": s["id"]}).get_json()
        suma += r["totales"]["valorPerdida"]
    assert suma == pytest.approx(consolidado["totales"]["valorPerdida"], rel=1e-6)


# --------------------------------------------------------------------------- Reporte
def test_reporte_consolidado_es_la_suma_de_las_sucursales(cliente):
    consolidado = cliente.get("/api/v1/reportes/mercancia-danada", query_string=PERIODO).get_json()
    sucursales = cliente.get("/api/v1/reportes/sucursales").get_json()

    def valor(datos):
        return next(k["valor"] for k in datos["kpis"] if k["etiqueta"].startswith("Valor de la"))

    suma = sum(
        valor(cliente.get("/api/v1/reportes/mercancia-danada",
                          query_string={**PERIODO, "sucursal_id": s["id"]}).get_json())
        for s in sucursales
    )
    assert suma == pytest.approx(valor(consolidado), rel=1e-6)


def test_el_reporte_trae_las_secciones_esperadas(cliente):
    datos = cliente.get("/api/v1/reportes/mercancia-danada", query_string=PERIODO).get_json()
    nombres = [s["nombre"] for s in datos["secciones"]]
    assert any("motivo" in n.lower() for n in nombres)
    assert any("sucursal" in n.lower() for n in nombres)          # consolidado
    assert any("detalle" in n.lower() for n in nombres)
    # cada tabla cuadra con sus columnas
    for seccion in datos["secciones"]:
        for fila in seccion["filas"]:
            assert len(fila) == len(seccion["columnas"])


@pytest.mark.parametrize("formato, firma", [("csv", b"MERCANC"), ("pdf", b"%PDF")])
def test_el_reporte_se_exporta(cliente, formato, firma):
    r = cliente.get("/api/v1/reportes/mercancia-danada",
                    query_string={**PERIODO, "formato": formato})
    assert r.status_code == 200
    assert firma in r.data[:2000].upper()
    assert "mercancia-danada" in r.headers["Content-Disposition"]
