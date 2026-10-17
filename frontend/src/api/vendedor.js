import api from './client'

export const listarCatalogosVenta = () => api.get('/api/catalogos')
export const buscarProductos = (q) => api.get('/api/productos', { params: { q } })
export const buscarClientes = (q) => api.get('/api/clientes', { params: { q, pagina: 1, por_pagina: 10 } })
export const listarVentas = (params) => api.get('/api/ventas', { params })
export const obtenerVenta = (id) => api.get(`/api/ventas/${id}`)
export const obtenerFactura = (id) => api.get(`/api/ventas/${id}/factura`)
export const registrarVenta = (payload) => api.post('/api/ventas', payload)
export const registrarDomicilio = (payload) => api.post('/api/domicilios', payload)
export const listarDevoluciones = (params) => api.get('/api/devoluciones', { params })
export const obtenerDevolucion = (id) => api.get(`/api/devoluciones/${id}`)
export const registrarDevolucion = (payload) => api.post('/api/devoluciones', payload)