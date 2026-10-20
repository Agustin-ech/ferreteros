// Service worker: guarda la aplicación (HTML, JS, CSS, imágenes) para que
// abra aunque no haya internet. Los datos (/api) los maneja src/offline.
const CACHE = 'ferreteros-app'

// Al instalarse descarga todos los archivos del build listados en el manifest
// de Vite, para que las pantallas que aún no se abrieron también funcionen offline.
self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll(['/', '/index.html'])
    try {
      const manifest = await (await fetch('/.vite/manifest.json', { cache: 'no-store' })).json()
      const archivos = new Set()
      for (const entrada of Object.values(manifest)) {
        archivos.add(`/${entrada.file}`)
        for (const css of entrada.css || []) archivos.add(`/${css}`)
        for (const recurso of entrada.assets || []) archivos.add(`/${recurso}`)
      }
      await cache.addAll([...archivos])
    } catch { /* sin manifest: los archivos se guardan a medida que se usan */ }
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // La API nunca se sirve desde aquí.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api')) return

  // Páginas: primero la red (para tener siempre la última versión) y, sin
  // internet, la copia guardada.
  if (request.mode === 'navigate') {
    evento.respondWith((async () => {
      try {
        const respuesta = await fetch(request)
        const cache = await caches.open(CACHE)
        cache.put('/index.html', respuesta.clone())
        return respuesta
      } catch {
        return (await caches.match('/index.html')) || Response.error()
      }
    })())
    return
  }

  // Archivos del build (nombres con hash, nunca cambian) y fuentes: primero la
  // copia guardada.
  const esPropio = url.origin === self.location.origin
  const esFuente = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  if (!esPropio && !esFuente) return
  evento.respondWith((async () => {
    const guardada = await caches.match(request)
    if (guardada) return guardada
    const respuesta = await fetch(request)
    if (respuesta.ok || respuesta.type === 'opaque') {
      const cache = await caches.open(CACHE)
      cache.put(request, respuesta.clone())
    }
    return respuesta
  })())
})
