from types import SimpleNamespace

from app.models.sucursal import Sucursal


def test_sucursal_incluye_barrio_en_su_serializacion():
    sucursal = SimpleNamespace(
        idSucursal=1,
        nombreSucursal="Centro",
        direccion="Calle 1",
        barrio="San José",
        telefono=None,
        activa=True,
    )

    assert Sucursal.to_dict(sucursal)["barrio"] == "San José"


def test_barrio_de_sucursal_puede_ser_nulo():
    columna_barrio = Sucursal.__table__.columns["barrio"]

    assert columna_barrio.nullable is True
    assert columna_barrio.type.length == 50