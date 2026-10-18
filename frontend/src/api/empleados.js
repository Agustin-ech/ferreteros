import api from './client'

function etiquetaRol(nombre = '') {
  const limpio = nombre.trim().toLowerCase()
  if (!limpio) return ''
  if (limpio === 'admin') return 'Administrador'
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

export function normalizarEmpleado(usuario) {
  const nombre = [
    usuario.primerNombre,
    usuario.segundoNombre,
    usuario.primerApellido,
    usuario.segundoApellido,
  ].filter(Boolean).join(' ')
  const rol = etiquetaRol(usuario.rol)
  const fecha = usuario.fecha_creacion ? new Date(usuario.fecha_creacion) : null

  return {
    ...usuario,
    id: String(usuario.idUsuario),
    nombre,
    cedula: usuario.numeroDocumento,
    cargo: rol,
    rolSistema: rol,
    sucursal: usuario.sucursal || 'Sin sucursal',
    estado: usuario.activo ? 'Activo' : 'Inactivo',
    fechaIngreso: fecha && !Number.isNaN(fecha.getTime())
      ? fecha.toLocaleDateString('es-CO')
      : '-',
  }
}

export async function listarEmpleados() {
  const { data } = await api.get('/usuarios')
  if (!Array.isArray(data)) {
    throw new Error('La respuesta de empleados del servidor no tiene el formato esperado.')
  }
  return data.map(normalizarEmpleado)
}

export async function obtenerCatalogosEmpleados() {
  const { data } = await api.get('/usuarios/catalogos')
  if (!Array.isArray(data.roles) || !Array.isArray(data.tiposDocumento) || !Array.isArray(data.sucursales)) {
    throw new Error('La respuesta de catálogos de empleados del servidor no tiene el formato esperado.')
  }
  return data
}

export async function crearEmpleado(datos) {
  const { data } = await api.post('/usuarios', datos)
  if (!data.usuario) throw new Error('El servidor no devolvió el empleado creado.')
  return normalizarEmpleado(data.usuario)
}

export async function actualizarEmpleado(idUsuario, datos) {
  const { data } = await api.patch(`/usuarios/${idUsuario}`, datos)
  if (!data.usuario) throw new Error('El servidor no devolvió el empleado actualizado.')
  return normalizarEmpleado(data.usuario)
}
