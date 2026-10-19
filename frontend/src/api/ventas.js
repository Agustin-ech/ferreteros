import api from './client'

function leerPaginaVentas(respuesta, paginaSolicitada) {
  const payload = respuesta?.data
  if (Array.isArray(payload)) {
    return { ventas: payload, paginas: 1 }
  }

  if (!Array.isArray(payload?.data)) {
    throw new Error(`La respuesta de ventas para la página ${paginaSolicitada} no es válida.`)
  }

  const paginas = Number(payload.paginacion?.paginas)
  if (!Number.isInteger(paginas) || paginas < 1) {
    throw new Error('La respuesta de ventas no incluye una paginación válida.')
  }

  return { ventas: payload.data, paginas }
}

function obtenerNombreCliente(venta) {
  const cliente = venta.cliente
  const nombres = [
    venta.nombreCliente,
    cliente?.nombre,
    [
      cliente?.primerNombre,
      cliente?.segundoNombre,
      cliente?.primerApellido,
      cliente?.segundoApellido,
    ].filter(Boolean).join(' '),
  ]
  return nombres
    .map((nombre) => nombre?.trim())
    .find((nombre) => (
      nombre
      && !/^(?:Usuario|Cliente) #\d+$/i.test(nombre)
      && !(venta.idCliente != null && nombre === 'Cliente general')
    ))
    || ''
}

function obtenerNombreDeRespuestaCliente(cliente) {
  const nombres = [
    cliente?.nombre,
    cliente?.nombreCliente,
    [
      cliente?.primerNombre,
      cliente?.segundoNombre,
      cliente?.primerApellido,
      cliente?.segundoApellido,
    ].filter(Boolean).join(' '),
  ]
  return nombres
    .map((nombre) => nombre?.trim())
    .find((nombre) => nombre && !/^(?:Usuario|Cliente) #\d+$/i.test(nombre) && nombre !== 'Cliente general')
    || ''
}

export async function obtenerNombreClientePorId(idCliente) {
  const { data } = await api.get(`/api/clientes/${idCliente}`)
  const nombre = obtenerNombreDeRespuestaCliente(data)
  if (!nombre) {
    throw new Error(`El cliente #${idCliente} no tiene un nombre disponible.`)
  }
  return nombre
}

export async function listarVentas() {
  const porPagina = 100
  const primeraPagina = await api.get('/api/ventas', {
    params: { pagina: 1, por_pagina: porPagina },
  })
  const primera = leerPaginaVentas(primeraPagina, 1)
  const ventas = [...primera.ventas]

  // Las páginas restantes se piden en paralelo: en serie, con ~1,5 s por
  // página, 800 ventas tardaban más de 10 s en cargar.
  const restantes = Array.from({ length: primera.paginas - 1 }, (_, i) => i + 2)
  const respuestas = await Promise.all(restantes.map((pagina) => api.get('/api/ventas', {
    params: { pagina, por_pagina: porPagina },
  })))
  respuestas.forEach((respuesta, i) => {
    ventas.push(...leerPaginaVentas(respuesta, restantes[i]).ventas)
  })
  const ventasActivas = ventas.filter((venta) => venta.activo !== false)
  let ventasConNombresVendedor = ventasActivas
  let errorNombres = ''

  if (ventasActivas.some((venta) => !venta.nombreVendedor?.trim() && venta.idUsuario != null)) {
    let respuestaUsuarios
    try {
      respuestaUsuarios = await api.get('/api/usuarios/nombres')
    } catch {
      try {
        respuestaUsuarios = await api.get('/usuarios')
      } catch {
        errorNombres = 'No se pudieron cargar los nombres de los vendedores.'
      }
    }

    const usuarios = Array.isArray(respuestaUsuarios?.data)
      ? respuestaUsuarios.data
      : respuestaUsuarios?.data?.data ?? respuestaUsuarios?.data?.usuarios
    if (Array.isArray(usuarios)) {
      const nombresPorUsuario = new Map(
        usuarios.map((usuario) => [
          usuario.idUsuario,
          usuario.nombre || [
            usuario.primerNombre,
            usuario.segundoNombre,
            usuario.primerApellido,
            usuario.segundoApellido,
          ].filter(Boolean).join(' '),
        ])
      )
      ventasConNombresVendedor = ventasActivas.map((venta) => ({
        ...venta,
        nombreVendedor: venta.nombreVendedor?.trim()
          || nombresPorUsuario.get(venta.idUsuario)
          || '',
      }))
    } else if (!errorNombres) {
      errorNombres = 'No se pudieron cargar los nombres de los vendedores.'
    }
  }

  const idsClienteSinNombre = [...new Set(
    ventasConNombresVendedor
      .filter((venta) => !obtenerNombreCliente(venta) && venta.idCliente != null)
      .map((venta) => venta.idCliente)
  )]
  const nombresPorCliente = new Map()
  const respuestasClientes = await Promise.allSettled(
    idsClienteSinNombre.map(async (idCliente) => {
      return [idCliente, await obtenerNombreClientePorId(idCliente)]
    })
  )
  let errorNombreCliente = false
  respuestasClientes.forEach((resultado) => {
    if (resultado.status === 'fulfilled' && resultado.value[1]) {
      nombresPorCliente.set(...resultado.value)
    } else if (resultado.status === 'rejected') {
      errorNombreCliente = true
    }
  })

  if (errorNombreCliente) {
    errorNombres = [errorNombres, 'No se pudieron cargar algunos nombres de clientes.'].filter(Boolean).join(' ')
  }
  return {
    ventas: ventasConNombresVendedor.map((venta) => ({
      ...venta,
      nombreCliente: obtenerNombreCliente(venta) || nombresPorCliente.get(venta.idCliente) || '',
    })),
    errorNombres,
  }
}

export function normalizarVenta(venta, sucursales = []) {
  const fecha = new Date(venta.fechaHora)
  const fechaLocal = Number.isNaN(fecha.getTime()) ? null : fecha
  const sucursal = sucursales.find((item) => item.idSucursal === venta.idSucursal)
  const factura = venta.factura

  return {
    idVenta: venta.idVenta,
    idFactura: factura?.idFactura,
    numero: factura?.numeroFactura || `Venta ${venta.idVenta}`,
    fecha: fechaLocal
      ? fechaLocal.toLocaleDateString('es-CO')
      : 'Fecha no disponible',
    fechaHora: fechaLocal,
    hora: fechaLocal
      ? fechaLocal.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
      : '',
    sucursal: sucursal?.nombreSucursal || `Sucursal #${venta.idSucursal}`,
    idSucursal: venta.idSucursal,
    vendedor: venta.nombreVendedor || `Usuario #${venta.idUsuario}`,
    cliente: obtenerNombreCliente(venta)
      || (venta.idCliente == null ? 'Cliente general' : `Cliente #${venta.idCliente}`),
    metodoPago: venta.metodoPago || `Método #${venta.idMetodoPago}`,
    estado: 'Emitida',
    subtotal: Number(venta.subtotal || 0),
    descuento: Number(venta.descuento ?? venta.descuentoTotal ?? 0),
    costoEnvio: Number(venta.costoEnvio || 0),
    total: Number(factura?.total ?? venta.total ?? 0),
    productos: (venta.detalles || []).map((detalle) => ({
      nombre: detalle.nombreProducto || `Producto #${detalle.idProducto}`,
      cantidad: Number(detalle.cantidad || 0),
      precioUnitario: Number(detalle.precioUnitario || 0),
      total: Number(detalle.subtotal || 0),
    })),
  }
}

export function normalizarFacturaParaDetalle(
  venta,
  factura,
  sucursales = [],
  nombreVendedor = '',
  nombreCliente = ''
) {
  return normalizarVenta({
    ...venta,
    factura,
    nombreVendedor: venta.nombreVendedor || nombreVendedor,
    nombreCliente: obtenerNombreCliente(venta) || nombreCliente,
  }, sucursales)
}
