import { cache } from './almacen'

// Consultas que se guardan para poder consultarlas sin internet. Solo lectura:
// la respuesta guardada se usa únicamente cuando el servidor no responde.
const RUTAS_CACHEADAS = [
  /^\/api\/auth\/me$/,
  /^\/api\/productos$/,
  /^\/api\/productos\/catalogos$/,
  /^\/api\/inventario$/,
  /^\/api\/catalogos$/,
  /^\/api\/sucursales(\/\d+)?$/,
  /^\/api\/inventario\/movimientos$/,
  /^\/api\/v1\/mercancia-danada(\/tipos-danio)?$/,
  /^\/api\/v1\/mercancia-recibida$/,
]

function rutaDe(config) {
  const base = config.baseURL || ''
  const url = config.url || ''
  return (url.startsWith(base) ? url.slice(base.length) : url).split('?')[0]
}

// Usuario dueño del token (claim "sub"), para que un dispositivo compartido
// no le muestre a un usuario los datos guardados de otro.
export function usuarioDelToken() {
  try {
    const token = sessionStorage.getItem('access_token')
    return token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub : null
  } catch {
    return null
  }
}

export function claveCache(ruta, params) {
  const orden = Object.keys(params || {}).filter((k) => params[k] !== undefined && params[k] !== null).sort()
  const consulta = orden.map((k) => `${k}=${params[k]}`).join('&')
  return `${usuarioDelToken()}|${ruta}?${consulta}`
}

const esCacheable = (config) => (config.method || 'get').toLowerCase() === 'get' && RUTAS_CACHEADAS.some((r) => r.test(rutaDe(config)))

// Error de red: el servidor no respondió (sin internet, servidor caído o timeout).
export const esErrorDeRed = (error) => Boolean(error) && !error.response && error.code !== 'ERR_CANCELED'

export function instalarCacheConsultas(api) {
  api.interceptors.response.use(
    (respuesta) => {
      window.dispatchEvent(new CustomEvent('offline:con-conexion'))
      if (esCacheable(respuesta.config)) {
        cache.guardar(claveCache(rutaDe(respuesta.config), respuesta.config.params), {
          data: respuesta.data,
          guardado: Date.now(),
        }).catch(() => {})
      }
      return respuesta
    },
    async (error) => {
      if (esErrorDeRed(error) && error.config && esCacheable(error.config)) {
        const guardado = await cache.leer(claveCache(rutaDe(error.config), error.config.params)).catch(() => null)
        if (guardado) {
          window.dispatchEvent(new CustomEvent('offline:sin-conexion'))
          return { data: guardado.data, status: 200, config: error.config, headers: {}, desdeCache: true, guardado: guardado.guardado }
        }
      }
      return Promise.reject(error)
    },
  )
}

// Modifica una respuesta guardada (por ejemplo, descontar el inventario de una
// venta hecha sin conexión, para que la siguiente venta vea el stock correcto).
export async function actualizarCache(ruta, params, actualizar) {
  const clave = claveCache(ruta, params)
  const guardado = await cache.leer(clave).catch(() => null)
  if (!guardado) return
  await cache.guardar(clave, { ...guardado, data: actualizar(guardado.data) }).catch(() => {})
}
