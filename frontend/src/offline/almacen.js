// Almacenamiento local en IndexedDB para trabajar sin internet.
// - "cache": últimas respuestas del servidor (productos, inventario, catálogos…)
// - "cola": ventas registradas sin conexión, pendientes de enviar
// IndexedDB sobrevive a recargas y cierres del navegador, a diferencia de la memoria.

const NOMBRE_BD = 'ferreteros-offline'
const VERSION = 1

let conexion = null

function abrir() {
  if (conexion) return conexion
  conexion = new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BD, VERSION)
    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result
      if (!bd.objectStoreNames.contains('cache')) bd.createObjectStore('cache')
      if (!bd.objectStoreNames.contains('cola')) bd.createObjectStore('cola', { keyPath: 'idOperacion' })
    }
    solicitud.onsuccess = () => resolve(solicitud.result)
    solicitud.onerror = () => { conexion = null; reject(solicitud.error) }
  })
  return conexion
}

async function transaccion(almacen, modo, operacion) {
  const bd = await abrir()
  return new Promise((resolve, reject) => {
    const tx = bd.transaction(almacen, modo)
    const resultado = operacion(tx.objectStore(almacen))
    tx.oncomplete = () => resolve(resultado?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export const cache = {
  leer: (clave) => transaccion('cache', 'readonly', (s) => s.get(clave)),
  guardar: (clave, valor) => transaccion('cache', 'readwrite', (s) => s.put(valor, clave)),
}

export const cola = {
  todas: () => transaccion('cola', 'readonly', (s) => s.getAll()),
  guardar: (operacion) => transaccion('cola', 'readwrite', (s) => s.put(operacion)),
  borrar: (idOperacion) => transaccion('cola', 'readwrite', (s) => s.delete(idOperacion)),
}
