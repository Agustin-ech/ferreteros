import api from './client'

const BASE_URL = '/api/v1/reportes'

export async function listarReportes() {
  const response = await api.get(`${BASE_URL}/catalogo`)
  return response.data
}

export async function listarSucursalesReporte() {
  const response = await api.get(`${BASE_URL}/sucursales`)
  return response.data
}

export async function obtenerReporte(codigo, params = {}, signal) {
  const response = await api.get(`${BASE_URL}/${codigo}`, { params, signal })
  return response.data
}

export async function exportarReporte(codigo, params, formato) {
  const response = await api.get(`${BASE_URL}/${codigo}`, {
    params: { ...params, formato },
    responseType: 'blob',
  })
  const archivo = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream',
  })
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `reporte-${codigo}.${formato}`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
