import api from './client'

const MAX_LADO = 800
const MAX_BYTES = 2 * 1024 * 1024

// La API devuelve una ruta relativa (/api/productos/3/imagen?v=...).
// En producción hay que anteponer VITE_API_URL; en desarrollo el proxy de Vite la resuelve.
export function resolverImagen(url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:')) return url
  return `${api.defaults.baseURL || ''}${url}`
}

// Reduce la foto antes de subirla: las fotos de celular pesan varios MB.
async function comprimirImagen(archivo) {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.')
  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff' // evita fondo negro en PNG con transparencia
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (blob) return blob
  } catch {
    // Si el navegador no puede procesarla, se sube el original si cabe.
  }
  if (archivo.size > MAX_BYTES) throw new Error('La foto supera 2 MB y no se pudo reducir. Prueba con otra imagen.')
  return archivo
}

export async function subirImagenProducto(idProducto, archivo) {
  const blob = await comprimirImagen(archivo)
  const formData = new FormData()
  formData.append('imagen', blob, 'producto.jpg')
  const { data } = await api.post(`/api/productos/${idProducto}/imagen`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function quitarImagenProducto(idProducto) {
  const { data } = await api.delete(`/api/productos/${idProducto}/imagen`)
  return data
}
