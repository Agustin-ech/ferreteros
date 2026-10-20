import api from '../api/client'
import { cola } from './almacen'
import { esErrorDeRed, usuarioDelToken } from './cacheConsultas'

// Estados de una venta guardada sin conexión:
// - "pendiente": espera a que vuelva internet
// - "revision": el servidor la rechazó (p. ej. ya no hay stock); alguien debe revisarla
export const ESTADO = { pendiente: 'pendiente', revision: 'revision' }

const avisar = () => window.dispatchEvent(new CustomEvent('offline:cola'))

// UUID para identificar la operación; el servidor lo usa para no duplicarla.
export function nuevoIdOperacion() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`
}

// Número para el comprobante provisional: OFF-<sucursal>-<usuario>-<consecutivo>.
// El consecutivo es por usuario y dispositivo.
export function nuevoComprobanteProvisional(idSucursal, idUsuario) {
  const clave = `ferreteros:consecutivo-offline:${idUsuario}`
  let siguiente = 1
  try {
    siguiente = Number(localStorage.getItem(clave) || 0) + 1
    localStorage.setItem(clave, String(siguiente))
  } catch { /* almacenamiento bloqueado: el idOperacion sigue evitando duplicados */ }
  return `OFF-${idSucursal}-${idUsuario}-${String(siguiente).padStart(4, '0')}`
}

export async function encolarVenta({ payload, resumen }) {
  await cola.guardar({
    idOperacion: payload.idOperacion,
    tipo: 'venta',
    // Solo se envía con la sesión de quien la hizo (dispositivos compartidos).
    idUsuario: usuarioDelToken(),
    payload,
    resumen, // datos para mostrar en la lista y en el comprobante
    estado: ESTADO.pendiente,
    intentos: 0,
    mensaje: '',
    creada: new Date().toISOString(),
  })
  avisar()
}

// Ventas del usuario con sesión iniciada, de la más antigua a la más nueva.
export const listarCola = () => cola.todas().then((items) => items
  .filter((item) => String(item.idUsuario) === String(usuarioDelToken()))
  .sort((a, b) => a.creada.localeCompare(b.creada)))

export async function descartar(idOperacion) {
  await cola.borrar(idOperacion)
  avisar()
}

export async function reintentar(idOperacion) {
  const item = (await cola.todas()).find((x) => x.idOperacion === idOperacion)
  if (!item) return
  await cola.guardar({ ...item, estado: ESTADO.pendiente, mensaje: '' })
  avisar()
  return sincronizar()
}

let sincronizando = null

// Envía las ventas pendientes en el orden en que se hicieron. Se detiene al
// primer error de red (se reintenta luego); los rechazos del servidor quedan
// en "revision" y no bloquean a las demás.
export function sincronizar() {
  if (sincronizando) return sincronizando
  sincronizando = (async () => {
    let enviadas = 0
    try {
      for (const item of await listarCola()) {
        if (item.estado !== ESTADO.pendiente) continue
        if (!sessionStorage.getItem('access_token')) break
        try {
          await api.post('/api/ventas', item.payload)
          await cola.borrar(item.idOperacion)
          enviadas += 1
        } catch (error) {
          const status = error.response?.status
          if (esErrorDeRed(error) || status >= 500 || status === 401) break
          const datos = error.response?.data || {}
          const mensaje = datos.mensaje || datos.error
            || (datos.errores_validacion ? 'Los datos de la venta no son válidos.' : `El servidor rechazó la venta (${status}).`)
          await cola.guardar({ ...item, estado: ESTADO.revision, mensaje, intentos: item.intentos + 1 })
        }
        avisar()
      }
    } finally {
      sincronizando = null
      avisar()
    }
    if (enviadas) window.dispatchEvent(new CustomEvent('offline:sincronizadas', { detail: { enviadas } }))
    return enviadas
  })()
  return sincronizando
}

let iniciado = false

// Reintenta al recuperar la conexión, al volver a la pestaña y cada 30 s.
export function iniciarSincronizacion() {
  if (iniciado) return
  iniciado = true
  window.addEventListener('online', () => { sincronizar() })
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sincronizar() })
  setInterval(() => { if (navigator.onLine) sincronizar() }, 30000)
  sincronizar()
}
