_ALIAS_ROLES = {
    "admin": "admin",
    "administrador": "admin",
    "vendedor": "vendedor",
    "bodega": "bodega",
    "bodeguero": "bodega",
}


def normalizar_rol(rol: str | None) -> str | None:
    """Convierte nombres de rol persistidos o heredados al contrato de la API."""
    if rol is None:
        return None
    return _ALIAS_ROLES.get(str(rol).strip().casefold())


def sucursal_autorizada(rol: str | None, sucursal_usuario, sucursal_solicitada) -> bool:
    """Los usuarios no administradores solo operan en su sucursal asignada."""
    if normalizar_rol(rol) == "admin":
        return True
    if sucursal_usuario is None or sucursal_solicitada is None:
        return False
    try:
        return int(sucursal_usuario) == int(sucursal_solicitada)
    except (TypeError, ValueError):
        return False
