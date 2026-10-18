function extraerMensajes(valor) {
  if (typeof valor === 'string') return [valor]
  if (Array.isArray(valor)) return valor.flatMap(extraerMensajes)
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([campo, mensaje]) =>
      extraerMensajes(mensaje).map((texto) => `${campo}: ${texto}`),
    )
  }
  return []
}

export default function errorMessage(error, fallback) {
  const data = error?.response?.data
  const validaciones = data?.errores || data?.errores_validacion || data?.detalles
  const mensajes = extraerMensajes(validaciones)
  if (mensajes.length) return mensajes.join(' · ')

  const mensaje = data?.mensaje || data?.error || data?.message
  if (mensaje) return String(mensaje)

  return error?.message || fallback
}
