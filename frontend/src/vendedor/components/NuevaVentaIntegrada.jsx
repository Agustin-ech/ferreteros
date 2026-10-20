import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiPlus, FiShoppingCart, FiTrash2 } from 'react-icons/fi'
import {
  buscarClientePorDocumento,
  buscarProductos,
  listarCatalogosVenta,
  listarInventarioSucursal,
  obtenerFactura,
  registrarCliente,
  registrarDomicilio,
  registrarVenta,
} from '../../api/vendedor'
import api from '../../api/client'
import { actualizarCache, esErrorDeRed } from '../../offline/cacheConsultas'
import { encolarVenta, ESTADO, listarCola, nuevoComprobanteProvisional, nuevoIdOperacion } from '../../offline/colaVentas'
import ComprobanteProvisional from '../../offline/ComprobanteProvisional'

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const redondear = (valor) => Math.round(valor * 100) / 100

// Misma cuenta que hace el backend al registrar la venta: el descuento del
// producto se aplica sobre el valor bruto de cada línea.
function calcularLinea(item) {
  const bruto = redondear(Number(item.precio) * Number(item.cantidad || 0))
  const descuento = redondear(bruto * Number(item.descuentoPorcentaje || 0) / 100)
  return { bruto, descuento, neto: bruto - descuento }
}

function PrecioProducto({ producto }) {
  const porcentaje = Number(producto.descuentoPorcentaje || 0)
  if (porcentaje <= 0) return <span>{moneda.format(producto.precio)}</span>
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-xs text-gray-500 line-through">{moneda.format(producto.precio)}</span>
      <span className="font-semibold text-emerald-400">{moneda.format(producto.precioConDescuento ?? producto.precio * (1 - porcentaje / 100))}</span>
      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-400">-{porcentaje}%</span>
    </span>
  )
}

function mensajeError(error) {
  if (esErrorDeRed(error)) return 'Sin conexión con el servidor.'
  return error.response?.data?.mensaje || error.response?.data?.error || 'No se pudo completar la operación.'
}

export default function NuevaVentaIntegrada({ idSucursal, idUsuario, puedeDomicilio = true }) {
  const [catalogos, setCatalogos] = useState({ tiposVenta: [], metodosPago: [], tiposDocumento: [] })
  const [productosEncontrados, setProductosEncontrados] = useState([])
  const [consultaProducto, setConsultaProducto] = useState('')
  const [consultaCliente, setConsultaCliente] = useState('')
  const [seleccionCliente, setSeleccionCliente] = useState(null)
  const [estadoBusquedaCliente, setEstadoBusquedaCliente] = useState('inicial')
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    idTipoDocumento: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    direccion: '',
    barrio: '',
    telefono: '',
    correoElectronico: '',
  })
  const [carrito, setCarrito] = useState([])
  const [tipoVenta, setTipoVenta] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)
  // idProducto -> cantidad disponible en la sucursal del vendedor.
  const [existencias, setExistencias] = useState(null)
  const [versionInventario, setVersionInventario] = useState(0)
  // Catálogo completo guardado: sin internet la búsqueda se hace aquí.
  const [catalogoProductos, setCatalogoProductos] = useState([])
  const [comprobante, setComprobante] = useState(null)

  useEffect(() => {
    let vigente = true
    api.get('/api/productos')
      .then(({ data }) => { if (vigente) setCatalogoProductos(data.filter((producto) => producto.activo !== false)) })
      .catch(() => {})
    return () => { vigente = false }
  }, [])

  // Disponibilidad en la sucursal. Otro vendedor puede vender lo mismo mientras
  // tanto, así que se vuelve a consultar periódicamente y antes de cobrar.
  const consultarExistencias = useCallback(async () => {
    const respuesta = await listarInventarioSucursal(idSucursal)
    const mapa = new Map(
      respuesta.data
        .filter((item) => item.activo !== false)
        .map((item) => [item.idProducto, Number(item.cantidadDisponible || 0)]),
    )
    // Ventas de este dispositivo aún sin enviar: el servidor todavía no las
    // descontó. (La copia guardada sin conexión ya las tiene descontadas.)
    if (!respuesta.desdeCache) {
      for (const item of await listarCola().catch(() => [])) {
        if (item.estado !== ESTADO.pendiente || Number(item.payload.idSucursal) !== Number(idSucursal)) continue
        for (const { idProducto, cantidad } of item.payload.detalles) {
          if (mapa.has(idProducto)) mapa.set(idProducto, mapa.get(idProducto) - Number(cantidad))
        }
      }
    }
    setExistencias(mapa)
    return mapa
  }, [idSucursal])

  useEffect(() => {
    if (!idSucursal) return undefined
    consultarExistencias().catch((err) => setError(mensajeError(err)))
    const refrescar = () => { consultarExistencias().catch(() => {}) }
    const intervalo = setInterval(refrescar, 30000)
    const alVolver = () => { if (!document.hidden) refrescar() }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('offline:sincronizadas', refrescar)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('offline:sincronizadas', refrescar)
    }
  }, [idSucursal, versionInventario, consultarExistencias])

  useEffect(() => {
    let vigente = true
    listarCatalogosVenta()
      .then(({ data }) => {
        if (vigente) setCatalogos(data)
      })
      .catch((err) => {
        if (vigente) setError(mensajeError(err))
      })
    return () => { vigente = false }
  }, [])

  useEffect(() => {
    let vigente = true
    if (!consultaProducto.trim()) {
      setProductosEncontrados([])
      return () => { vigente = false }
    }
    const texto = consultaProducto.trim()
    buscarProductos(texto)
      .then(({ data }) => {
        if (vigente) setProductosEncontrados(data.filter((producto) => producto.activo !== false))
      })
      .catch((err) => {
        if (!vigente) return
        if (esErrorDeRed(err)) {
          const t = texto.toLowerCase()
          setProductosEncontrados(catalogoProductos.filter((p) => p.nombre.toLowerCase().includes(t) || p.codigoSKU.toLowerCase().includes(t)))
        } else {
          setError(mensajeError(err))
        }
      })
    return () => { vigente = false }
  }, [consultaProducto, catalogoProductos])

  // Solo se ofrecen los productos con existencias en la sucursal del vendedor.
  const productosDisponibles = useMemo(
    () => (existencias
      ? productosEncontrados
        .map((producto) => ({ ...producto, disponible: existencias.get(producto.idProducto) ?? 0 }))
        .filter((producto) => producto.disponible > 0)
      : []),
    [productosEncontrados, existencias],
  )

  // Productos del carrito que ya no alcanzan (p. ej. otro vendedor vendió mientras tanto).
  const faltantes = useMemo(
    () => (existencias
      ? carrito.filter((item) => Number(item.cantidad) > (existencias.get(item.idProducto) ?? 0))
      : []),
    [carrito, existencias],
  )

  const resumen = useMemo(
    () => carrito.reduce((acumulado, item) => {
      const linea = calcularLinea(item)
      return {
        bruto: acumulado.bruto + linea.bruto,
        descuento: acumulado.descuento + linea.descuento,
        total: acumulado.total + linea.neto,
      }
    }, { bruto: 0, descuento: 0, total: 0 }),
    [carrito],
  )
  const tipoVentaSeleccionado = catalogos.tiposVenta.find(
    (tipo) => Number(tipo.idTipoVenta) === Number(tipoVenta),
  )
  const esDomicilio = tipoVentaSeleccionado?.nombre.trim().toLowerCase() === 'domicilio'

  function agregarProducto(producto) {
    setCarrito((actual) => {
      const existente = actual.find((item) => item.idProducto === producto.idProducto)
      if (existente) {
        return actual.map((item) => item.idProducto === producto.idProducto
          ? { ...item, cantidad: Math.min(Number(item.cantidad) + 1, producto.disponible) }
          : item)
      }
      return [...actual, { ...producto, cantidad: Math.min(1, producto.disponible) }]
    })
    setConsultaProducto('')
    setProductosEncontrados([])
    setError('')
  }

  function cambiarCantidad(idProducto, cantidad) {
    setCarrito((actual) => actual.map((item) => item.idProducto === idProducto
      ? { ...item, cantidad }
      : item))
  }

  async function buscarCliente() {
    const documento = consultaCliente.trim()
    setError('')
    setSeleccionCliente(null)
    setEstadoBusquedaCliente('buscando')
    if (!documento) {
      setEstadoBusquedaCliente('inicial')
      return setError('Escribe la cédula o documento del cliente.')
    }

    try {
      const { data } = await buscarClientePorDocumento(documento)
      const cliente = data.items?.[0]
      if (cliente) {
        setSeleccionCliente(cliente)
        setDireccionEntrega(cliente.direccion || '')
        setEstadoBusquedaCliente('encontrado')
      } else {
        setNuevoCliente((actual) => ({ ...actual, idTipoDocumento: '', primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '', direccion: '', barrio: '', telefono: '', correoElectronico: '' }))
        setEstadoBusquedaCliente('no-encontrado')
      }
    } catch (err) {
      setEstadoBusquedaCliente('inicial')
      setError(mensajeError(err))
    }
  }

  function cambiarCampoCliente(evento) {
    const { name, value } = evento.target
    setNuevoCliente((actual) => ({ ...actual, [name]: value }))
  }

  async function guardarCliente() {
    setError('')
    if (!consultaCliente.trim()) return setError('Escribe la cédula del cliente antes de guardarlo.')
    const payload = {
      idTipoDocumento: Number(nuevoCliente.idTipoDocumento),
      numeroDocumento: consultaCliente.trim(),
      primerNombre: nuevoCliente.primerNombre.trim(),
      segundoNombre: nuevoCliente.segundoNombre.trim() || null,
      primerApellido: nuevoCliente.primerApellido.trim(),
      segundoApellido: nuevoCliente.segundoApellido.trim() || null,
      direccion: nuevoCliente.direccion.trim() || null,
      barrio: nuevoCliente.barrio.trim() || null,
      telefono: nuevoCliente.telefono.trim() || null,
      correoElectronico: nuevoCliente.correoElectronico.trim() || null,
    }
    if (!payload.idTipoDocumento || !payload.primerNombre || !payload.primerApellido) {
      return setError('Selecciona el tipo de documento e ingresa el primer nombre y apellido.')
    }
    setGuardandoCliente(true)
    try {
      const { data } = await registrarCliente(payload)
      setSeleccionCliente(data)
      setDireccionEntrega(data.direccion || '')
      setEstadoBusquedaCliente('encontrado')
    } catch (err) {
      if (err.response?.status === 409) {
        try {
          const { data } = await buscarClientePorDocumento(payload.numeroDocumento)
          const clienteExistente = data.items?.[0]
          if (clienteExistente) {
            setSeleccionCliente(clienteExistente)
            setEstadoBusquedaCliente('encontrado')
            setError('Ese documento ya estaba registrado; se seleccionó el cliente existente.')
            return
          }
        } catch {
          setError('El documento ya está registrado, pero no se pudo recuperar el cliente. Vuelve a buscarlo.')
          return
        }
      }
      setError(mensajeError(err))
    } finally {
      setGuardandoCliente(false)
    }
  }

  async function procesarVenta(evento) {
    evento.preventDefault()
    setError('')
    setResultado(null)
    if (!idSucursal) return setError('La sesión no tiene una sucursal asignada.')
    if (!carrito.length) return setError('Agrega al menos un producto.')
    // Consulta la disponibilidad real justo antes de cobrar.
    let disponibles = existencias
    try {
      disponibles = await consultarExistencias()
    } catch { /* sin respuesta: se valida con lo último conocido y el servidor confirma */ }
    const sinStock = carrito.find((item) => Number(item.cantidad) > (disponibles?.get(item.idProducto) ?? 0))
    if (sinStock) {
      const quedan = Math.max(0, disponibles?.get(sinStock.idProducto) ?? 0)
      return setError(quedan > 0
        ? `Solo quedan ${quedan} unidades de '${sinStock.nombre}' en tu sucursal. Ajusta la cantidad antes de cobrar.`
        : `'${sinStock.nombre}' ya no tiene existencias en tu sucursal (otra venta lo agotó). Quítalo del carrito antes de cobrar.`)
    }
    if (!tipoVenta || !metodoPago) return setError('Selecciona el tipo de venta y el método de pago.')
    if (consultaCliente.trim() && !seleccionCliente) return setError('Busca y selecciona el cliente, o completa su registro antes de procesar la venta.')
    if (esDomicilio && !seleccionCliente) return setError('Selecciona un cliente para el domicilio.')

    const payload = {
      idSucursal: Number(idSucursal),
      idTipoVenta: Number(tipoVenta),
      metodoPago,
      detalles: carrito.map(({ idProducto, cantidad }) => ({
        idProducto: Number(idProducto),
        cantidad: Number(cantidad),
      })),
    }

    if (esDomicilio && !navigator.onLine) {
      return setError('Los domicilios necesitan conexión. Sin internet solo se pueden registrar ventas de mostrador.')
    }
    // Identifica la venta: si la conexión se corta a mitad de camino y se
    // reintenta, el servidor no la registra dos veces.
    const datosVenta = {
      ...payload,
      idCliente: seleccionCliente ? Number(seleccionCliente.idCliente) : null,
      idOperacion: nuevoIdOperacion(),
    }

    setCargando(true)
    if (!esDomicilio && !navigator.onLine) {
      await guardarSinConexion(datosVenta)
      setCargando(false)
      return
    }
    try {
      const respuesta = esDomicilio
        ? await registrarDomicilio({
          ...payload,
          idCliente: Number(seleccionCliente.idCliente),
          direccionEntrega: direccionEntrega.trim() || null,
        })
        : await registrarVenta(datosVenta)
      const venta = respuesta.data.data
      const idVenta = venta.idVenta
      const factura = idVenta ? (await obtenerFactura(idVenta).then((r) => r.data).catch(() => venta.factura)) : venta.factura
      setResultado({ factura, total: venta.total ?? venta.totalVenta, idVenta, domicilio: esDomicilio })
      setCarrito([])
      setVersionInventario((version) => version + 1)
    } catch (err) {
      if (esErrorDeRed(err) && !esDomicilio) await guardarSinConexion(datosVenta)
      else setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  // Guarda la venta en el dispositivo, descuenta el inventario local y entrega
  // un comprobante provisional. Se envía sola al volver la conexión.
  async function guardarSinConexion(datosVenta) {
    const numero = nuevoComprobanteProvisional(idSucursal, idUsuario ?? 'u')
    const fecha = new Date().toISOString()
    const productos = carrito.map((item) => ({
      nombre: item.nombre,
      cantidad: Number(item.cantidad),
      ...calcularLinea(item),
    }))
    const datos = {
      payload: { ...datosVenta, comprobanteProvisional: numero, fechaOffline: fecha },
      resumen: {
        productos,
        bruto: resumen.bruto,
        descuento: resumen.descuento,
        total: resumen.total,
        metodoPago,
        cliente: seleccionCliente
          ? [seleccionCliente.primerNombre, seleccionCliente.primerApellido].filter(Boolean).join(' ') || seleccionCliente.nombre
          : '',
      },
    }
    try {
      await encolarVenta(datos)
    } catch {
      setError('No se pudo guardar la venta en este dispositivo. Revisa que el navegador permita guardar datos.')
      return
    }
    // El inventario guardado se descuenta para que la siguiente venta vea el stock real.
    const vendido = new Map()
    for (const { idProducto, cantidad } of datosVenta.detalles) vendido.set(idProducto, (vendido.get(idProducto) || 0) + cantidad)
    setExistencias((actual) => new Map([...(actual || new Map())].map(([id, cant]) => [id, cant - (vendido.get(id) || 0)])))
    await actualizarCache('/api/inventario', { sucursal: idSucursal }, (filas) => filas.map((fila) => (
      vendido.has(fila.idProducto) ? { ...fila, cantidadDisponible: Number(fila.cantidadDisponible) - vendido.get(fila.idProducto) } : fila
    )))
    setComprobante({ numero, fecha, ...datos.resumen })
    setCarrito([])
  }

  const campo = 'w-full rounded-md border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none focus:border-[#F2B01E]'

  return (
    <form onSubmit={procesarVenta} className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-white"><FiShoppingCart className="text-[#F2B01E]" /> Nueva venta</h2>
        <p className="mt-1 text-sm text-gray-400">Los precios, el inventario y la factura se confirman en el servidor.</p>
      </header>

      <section className="space-y-4 border-y border-[#2a2a2a] py-5">
        <h3 className="text-sm font-semibold text-gray-200">Cliente</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex-1 text-xs text-gray-400" htmlFor="cliente-venta">Cédula o número de documento
            <input
              id="cliente-venta"
              className={`${campo} mt-1`}
              value={consultaCliente}
              onChange={(evento) => {
                setConsultaCliente(evento.target.value)
                setSeleccionCliente(null)
                setEstadoBusquedaCliente('inicial')
              }}
              onKeyDown={(evento) => { if (evento.key === 'Enter') { evento.preventDefault(); buscarCliente() } }}
              placeholder="Escribe el documento y busca"
              disabled={Boolean(seleccionCliente)}
            />
          </label>
          {!seleccionCliente && <button type="button" onClick={buscarCliente} disabled={estadoBusquedaCliente === 'buscando'} className="mt-auto h-10 border border-[#444] px-4 text-sm text-white hover:border-[#F2B01E] disabled:opacity-60">
            {estadoBusquedaCliente === 'buscando' ? 'Buscando...' : 'Buscar cliente'}
          </button>}
        </div>
        {seleccionCliente && <div className="flex flex-wrap items-center justify-between gap-3 border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-100">
          <div><strong>{seleccionCliente.primerNombre} {seleccionCliente.segundoNombre || ''} {seleccionCliente.primerApellido} {seleccionCliente.segundoApellido || ''}</strong><div className="text-xs text-emerald-200/70">Documento {seleccionCliente.numeroDocumento} · {seleccionCliente.telefono || 'Sin teléfono'} · {seleccionCliente.correoElectronico || 'Sin correo'}</div></div>
          <button type="button" onClick={() => { setSeleccionCliente(null); setConsultaCliente(''); setEstadoBusquedaCliente('inicial') }} className="text-xs text-[#F2B01E]">Cambiar cliente</button>
        </div>}
        {estadoBusquedaCliente === 'no-encontrado' && <div className="space-y-4 border border-[#333] p-4">
          <div><h4 className="text-sm font-semibold text-white">Cliente no encontrado</h4><p className="mt-1 text-xs text-gray-400">Completa estos datos para guardarlo y asociarlo a la venta.</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-gray-400">Tipo de documento
              <select required name="idTipoDocumento" value={nuevoCliente.idTipoDocumento} onChange={cambiarCampoCliente} className={campo}>
                <option value="">Selecciona</option>
                {catalogos.tiposDocumento.map((tipo) => <option key={tipo.idTipoDocumento} value={tipo.idTipoDocumento}>{tipo.acronimo} · {tipo.nombre}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-400">Cédula / documento
              <input readOnly value={consultaCliente} className={`${campo} opacity-70`} />
            </label>
            <label className="text-xs text-gray-400">Primer nombre
              <input required maxLength="150" name="primerNombre" value={nuevoCliente.primerNombre} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Segundo nombre
              <input maxLength="150" name="segundoNombre" value={nuevoCliente.segundoNombre} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Primer apellido
              <input required maxLength="150" name="primerApellido" value={nuevoCliente.primerApellido} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Segundo apellido
              <input maxLength="150" name="segundoApellido" value={nuevoCliente.segundoApellido} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Dirección
              <input maxLength="50" name="direccion" value={nuevoCliente.direccion} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Barrio
              <input maxLength="50" name="barrio" value={nuevoCliente.barrio} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Teléfono
              <input maxLength="20" name="telefono" value={nuevoCliente.telefono} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400 md:col-span-2">Correo electrónico
              <input type="email" maxLength="100" name="correoElectronico" value={nuevoCliente.correoElectronico} onChange={cambiarCampoCliente} className={campo} />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="button" disabled={guardandoCliente || !catalogos.tiposDocumento.length} onClick={guardarCliente} className="bg-[#F2B01E] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
              {guardandoCliente ? 'Guardando cliente...' : 'Guardar y usar en esta venta'}
            </button>
          </div>
        </div>}
        {!seleccionCliente && estadoBusquedaCliente === 'inicial' && <p className="text-xs text-gray-500">Cliente opcional para venta de mostrador. Si lo identificas por documento, sus datos quedan guardados para futuras compras.</p>}
      </section>

      <section className="grid gap-4 border-b border-[#2a2a2a] pb-5 md:grid-cols-3">
        <label className="text-xs text-gray-400">Tipo de venta
          <select required value={tipoVenta} onChange={(evento) => setTipoVenta(evento.target.value)} className={`${campo} mt-1`}>
            <option value="">Selecciona</option>
            {catalogos.tiposVenta.filter((tipo) => puedeDomicilio || tipo.nombre.trim().toLowerCase() !== 'domicilio').map((tipo) => <option key={tipo.idTipoVenta} value={tipo.idTipoVenta}>{tipo.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-400">Método de pago
          <select required value={metodoPago} onChange={(evento) => setMetodoPago(evento.target.value)} className={`${campo} mt-1`}>
            <option value="">Selecciona</option>
            {catalogos.metodosPago.map((metodo) => <option key={metodo.idMetodoPago} value={metodo.nombre}>{metodo.nombre}</option>)}
          </select>
        </label>
        {esDomicilio && <label className="text-xs text-gray-400 md:col-span-3">Dirección de entrega
          <input className={`${campo} mt-1`} value={direccionEntrega} onChange={(evento) => setDireccionEntrega(evento.target.value)} placeholder="Usa la dirección del cliente o escribe otra" />
        </label>}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Productos</h3>
        <div className="relative flex gap-2">
          <input className={campo} value={consultaProducto} onChange={(evento) => setConsultaProducto(evento.target.value)} placeholder="Buscar por código o nombre" />
          {productosDisponibles.length > 0 && (
            <ul className="absolute left-0 top-full z-10 mt-1 max-h-56 w-full overflow-auto border border-[#333] bg-[#151515] shadow-lg">
              {productosDisponibles.map((producto) => (
                <li key={producto.idProducto}>
                  <button type="button" onClick={() => agregarProducto(producto)} className="flex w-full flex-col gap-1 px-3 py-2 text-left text-sm text-white hover:bg-[#292929] sm:flex-row sm:justify-between sm:gap-4">
                    <span className="min-w-0 break-words">{producto.codigoSKU} · {producto.nombre}</span>
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="text-gray-400">Disp: {producto.disponible}</span><PrecioProducto producto={producto} /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {consultaProducto.trim() && productosEncontrados.length > 0 && existencias && productosDisponibles.length === 0 && (
            <p className="absolute left-0 top-full z-10 mt-1 w-full border border-[#333] bg-[#151515] px-3 py-2 text-sm text-gray-400">
              No hay existencias de ese producto en tu sucursal.
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-[#333] text-xs text-gray-400"><tr><th className="py-2">Código</th><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>Descuento</th><th>Subtotal</th><th /></tr></thead>
            <tbody className="divide-y divide-[#292929] text-gray-200">
              {carrito.map((item) => (
                <tr key={item.idProducto}>
                  <td className="py-3">{item.codigoSKU}</td><td>{item.nombre}</td>
                  <td><input aria-label={`Cantidad de ${item.nombre}`} type="number" min="0.01" step="0.01" max={existencias?.get(item.idProducto) ?? undefined} value={item.cantidad} onChange={(evento) => cambiarCantidad(item.idProducto, evento.target.value)} className="w-24 rounded border border-[#333] bg-[#1f1f1f] px-2 py-1" /></td>
                  <td><PrecioProducto producto={item} /></td>
                  <td className={calcularLinea(item).descuento > 0 ? 'text-emerald-400' : 'text-gray-500'}>{calcularLinea(item).descuento > 0 ? `-${moneda.format(calcularLinea(item).descuento)}` : '—'}</td>
                  <td>{moneda.format(calcularLinea(item).neto)}</td>
                  <td><button type="button" title="Quitar producto" onClick={() => setCarrito((actual) => actual.filter((producto) => producto.idProducto !== item.idProducto))} className="p-2 text-gray-400 hover:text-red-400"><FiTrash2 /></button></td>
                </tr>
              ))}
              {carrito.length === 0 && <tr><td colSpan="7" className="py-6 text-center text-gray-500">Busca y agrega productos a la venta.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col items-end gap-4 border-t border-[#2a2a2a] pt-5">
        {resumen.descuento > 0 && (
          <div className="text-right text-sm text-gray-400">
            <p>Subtotal: {moneda.format(resumen.bruto)}</p>
            <p className="text-emerald-400">Descuentos aplicados: -{moneda.format(resumen.descuento)}</p>
          </div>
        )}
        <p className="text-lg font-semibold text-white">Total estimado: <span className="text-[#F2B01E]">{moneda.format(resumen.total)}</span></p>
        {faltantes.length > 0 && (
          <div role="alert" className="w-full border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
            La disponibilidad cambió (otra venta en tu sucursal):{' '}
            {faltantes.map((item) => {
              const quedan = Math.max(0, existencias.get(item.idProducto) ?? 0)
              return `${item.nombre}: ${quedan > 0 ? `quedan ${quedan}` : 'agotado'}`
            }).join(' · ')}
          </div>
        )}
        {error && <p role="alert" className="w-full text-sm text-red-400">{error}</p>}
        {comprobante && <ComprobanteProvisional comprobante={comprobante} onCerrar={() => setComprobante(null)} />}
        {resultado && <div role="status" className="w-full border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          {resultado.domicilio ? 'Domicilio registrado' : 'Venta registrada'} · Factura {resultado.factura?.numeroFactura || resultado.factura?.idFactura || 'generada'} · Total {moneda.format(resultado.factura?.total ?? resultado.total ?? 0)}
        </div>}
        <div className="flex gap-3">
          <button type="button" onClick={() => { setCarrito([]); setResultado(null); setError('') }} className="border border-[#444] px-4 py-2 text-sm text-gray-200 hover:bg-[#242424]">Vaciar</button>
          <button disabled={cargando || !idSucursal} type="submit" className="flex items-center gap-2 bg-[#F2B01E] px-5 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
            <FiPlus /> {cargando ? 'Procesando...' : esDomicilio ? 'Registrar domicilio' : 'Procesar venta'}
          </button>
        </div>
      </div>
    </form>
  )
}