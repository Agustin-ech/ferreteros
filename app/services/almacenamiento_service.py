"""Subida de fotos a Supabase Storage (API REST).

Variables de entorno necesarias (solo en el backend, nunca en el frontend):
    SUPABASE_URL          https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY  clave service_role (secreta)
    SUPABASE_BUCKET       nombre del bucket público (por defecto "productos")
"""
import os
import time

import requests


class AlmacenamientoError(Exception):
    pass


def _config():
    url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    clave = os.getenv("SUPABASE_SERVICE_KEY")
    bucket = os.getenv("SUPABASE_BUCKET", "productos")
    if not url or not clave:
        raise AlmacenamientoError("El almacenamiento de fotos no está configurado en el servidor.")
    return url, clave, bucket


def _cabeceras(clave, extra=None):
    cabeceras = {"Authorization": f"Bearer {clave}", "apikey": clave}
    cabeceras.update(extra or {})
    return cabeceras


def subir_foto(id_producto, contenido, mime):
    """Sube la foto y devuelve su URL pública."""
    url, clave, bucket = _config()
    extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[mime]
    # Nombre nuevo en cada subida: así el navegador nunca muestra la foto vieja en caché.
    ruta = f"producto-{id_producto}-{int(time.time())}.{extension}"
    try:
        r = requests.post(
            f"{url}/storage/v1/object/{bucket}/{ruta}",
            data=contenido,
            headers=_cabeceras(clave, {"Content-Type": mime}),
            timeout=20,
        )
    except requests.RequestException as error:
        raise AlmacenamientoError("No se pudo conectar con el almacenamiento de fotos.") from error
    if r.status_code >= 400:
        try:
            detalle = r.json().get("message") or r.json().get("error") or ""
        except ValueError:
            detalle = (r.text or "")[:150]
        raise AlmacenamientoError(f"El almacenamiento rechazó la foto ({r.status_code}): {detalle}".rstrip(": "))
    return f"{url}/storage/v1/object/public/{bucket}/{ruta}"


def borrar_foto(url_publica):
    """Borra el archivo anterior. Es de mejor esfuerzo: si falla no se interrumpe la operación."""
    if not url_publica:
        return
    try:
        url, clave, bucket = _config()
        prefijo = f"{url}/storage/v1/object/public/{bucket}/"
        if not url_publica.startswith(prefijo):
            return
        ruta = url_publica[len(prefijo):]
        requests.delete(f"{url}/storage/v1/object/{bucket}/{ruta}", headers=_cabeceras(clave), timeout=10)
    except (AlmacenamientoError, requests.RequestException):
        pass
