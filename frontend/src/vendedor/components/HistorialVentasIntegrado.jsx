import { useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiEye, FiFilter, FiPrinter, FiRotateCcw } from 'react-icons/fi'
import logo from '../../assets/logo.png'
import { buscarClientes, listarVentas, obtenerFactura, obtenerVenta } from '../../api/vendedor'

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fechaLegible = (valor) => valor ? new Date(valor).toLocaleString('es-CO') : 'Sin fecha'

// Medianoche local del día elegido, enviada en ISO (UTC) al backend, que
// guarda fechaHora en UTC. Usar medianoche UTC corría el día 5 horas.
function fechaISO(dia, sumarDia = false) {
  if (!dia) return undefined
  const fecha = new Date(`${dia}T00:00:00`)
  if (sumarDia) fecha.setDate(fecha.getDate() + 1)
  return fecha.toISOString()
}

function diaLocal(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export default function HistorialVentasIntegrado({ titulo, soloHoy = false, modo = 'ventas', idSucursal }) {
  const hoy = diaLocal(new Date())
  const [fechaDesde, setFechaDesde] = useState(soloHoy ? hoy : '')
  const [fechaHasta, setFechaHasta] = useState(soloHoy ? hoy : '')
  const [metodoPago, setMetodoPago] = useState('')
  const [clienteTexto, setClienteTexto] = useState('')
  const [clienteElegido, setClienteElegido] = useState(null)
  const [clientes, setClientes] = useState([])
  const [filtros, setFiltros] = useState({ desde: soloHoy ? fechaISO(hoy) : undefined, hasta: soloHoy ? fechaISO(hoy, true) : undefined })
  const [pagina, setPagina] = useState(1)
  const [listado, setListado] = useState({ data: [], paginacion: { total: 0, paginas: 0 } })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => {
    let vigente = true
    if (clienteTexto.trim().length < 2 || clienteElegido) {
      setClientes([])
      return () => { vigente = false }
    }
    buscarClientes(clienteTexto.trim())
      .then(({ data }) => { if (vigente) setClientes(data.items || []) })
      .catch((err) => { if (vigente) setError(err.response?.data?.error || 'No se pudo buscar clientes.') })
    return () => { vigente = false }
  }, [clienteTexto, clienteElegido])

  useEffect(() => {
    let vigente = true
    if (!idSucursal) {
      setListado({ data: [], paginacion: { total: 0, paginas: 0 } })
      setError('Tu usuario vendedor no tiene una sucursal activa asignada. Contacta a un administrador para que asigne la sucursal correcta.')
      setCargando(false)
      return () => { vigente = false }
    }
    setCargando(true)
    setError('')
    listarVentas({ pagina, por_pagina: 20, ...filtros })
      .then(({ data }) => { if (vigente) setListado(data) })
      .catch((err) => { if (vigente) setError(err.response?.data?.mensaje || 'No se pudieron cargar las ventas.') })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [idSucursal, pagina, filtros])

  function aplicarFiltros(evento) {
    evento.preventDefault()
    const nuevosFiltros = {
      desde: fechaISO(fechaDesde),
      hasta: fechaISO(fechaHasta, Boolean(fechaHasta)),
      cliente: clienteElegido?.idCliente,
      metodoPago: metodoPago || undefined,
    }
    Object.keys(nuevosFiltros).forEach((clave) => nuevosFiltros[clave] === undefined && delete nuevosFiltros[clave])
    setPagina(1)
    setFiltros(nuevosFiltros)
  }

  function limpiarFiltros() {
    setFechaDesde('')
    setFechaHasta('')
    setMetodoPago('')
    setClienteTexto('')
    setClienteElegido(null)
    setPagina(1)
    setFiltros({})
  }

  async function verDetalle(idVenta) {
    setCargandoDetalle(true)
    setError('')
    try {
      const [respuestaVenta, respuestaFactura] = await Promise.all([obtenerVenta(idVenta), obtenerFactura(idVenta)])
      setDetalle({ venta: respuestaVenta.data, factura: respuestaFactura.data })
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se pudo cargar el detalle o la factura.')
    } finally {
      setCargandoDetalle(false)
    }
  }

  const ventas = listado.data || []
  const paginacion = listado.paginacion || { paginas: 0, total: 0 }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-white"><FiFilter className="text-[#F2B01E]" /> {titulo}</h2>
        <p className="mt-1 text-sm text-gray-400">
          {idSucursal ? `${paginacion.total} ventas encontradas` : 'Consulta no disponible sin sucursal asignada'}
        </p>
      </header>

      {!soloHoy && <form onSubmit={aplicarFiltros} className="grid gap-4 border-y border-[#2a2a2a] py-5 md:grid-cols-4 md:items-end">
        <label className="text-xs text-gray-400">Desde
          <input type="date" value={fechaDesde} onChange={(evento) => setFechaDesde(evento.target.value)} className="mt-1 w-full border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white" />
        </label>
        <label className="text-xs text-gray-400">Hasta
          <input type="date" value={fechaHasta} onChange={(evento) => setFechaHasta(evento.target.value)} className="mt-1 w-full border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white" />
        </label>
        {modo === 'pagos' && <label className="text-xs text-gray-400">Método de pago
          <select value={metodoPago} onChange={(evento) => setMetodoPago(evento.target.value)} className="mt-1 w-full border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white">
            <option value="">Todos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </label>}
        <div className="relative text-xs text-gray-400">
          <label htmlFor="filtro-cliente">Cliente (opcional)</label>
          <input id="filtro-cliente" value={clienteElegido ? `${clienteElegido.primerNombre} ${clienteElegido.primerApellido}` : clienteTexto} onChange={(evento) => { setClienteElegido(null); setClienteTexto(evento.target.value) }} placeholder="Nombre o documento" className="mt-1 w-full border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white" />
          {clientes.length > 0 && !clienteElegido && <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto border border-[#333] bg-[#151515]">
            {clientes.map((cliente) => <li key={cliente.idCliente}><button type="button" onClick={() => { setClienteElegido(cliente); setClienteTexto(''); setClientes([]) }} className="w-full px-3 py-2 text-left hover:bg-[#292929]">{cliente.primerNombre} {cliente.primerApellido} · {cliente.numeroDocumento}</button></li>)}
          </ul>}
        </div>
        <div className="flex gap-2">
          <button className="flex flex-1 items-center justify-center gap-2 bg-[#F2B01E] px-4 py-2 text-sm font-semibold text-black"><FiFilter /> Filtrar</button>
          <button type="button" onClick={limpiarFiltros} title="Limpiar filtros" className="border border-[#444] px-3 text-gray-300 hover:bg-[#252525]"><FiRotateCcw /></button>
        </div>
      </form>}

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto border-y border-[#2a2a2a]">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-[#333] text-xs text-gray-400"><tr>
            <th className="py-3 pr-4">Factura</th><th className="pr-4">Fecha</th><th className="pr-4">Cliente</th>
            {modo !== 'facturas' && <th className="pr-4">Método</th>}<th className="pr-4">Total</th><th className="text-right">Detalle</th>
          </tr></thead>
          <tbody className="divide-y divide-[#252525] text-gray-200">
            {cargando && <tr><td colSpan="6" className="py-8 text-center text-gray-400">Cargando ventas...</td></tr>}
            {!cargando && ventas.length === 0 && <tr><td colSpan="6" className="py-8 text-center text-gray-400">
              {idSucursal ? 'No hay ventas para estos filtros.' : 'Asigna una sucursal al usuario para consultar sus ventas.'}
            </td></tr>}
            {!cargando && ventas.map((venta) => <tr key={venta.idVenta}>
              <td className="py-3 pr-4 font-medium text-white">{venta.factura?.numeroFactura || `Venta #${venta.idVenta}`}</td>
              <td className="pr-4">{fechaLegible(venta.fechaHora)}</td>
              <td className="pr-4">{venta.clienteNombre || (venta.idCliente ? `Cliente #${venta.idCliente}` : 'Venta sin cliente')}</td>
              {modo !== 'facturas' && <td className="pr-4">{venta.metodoPago || '—'}</td>}
              <td className="pr-4 font-semibold">{moneda.format(venta.total || 0)}</td>
              <td className="text-right"><button type="button" title="Ver detalle y factura" onClick={() => verDetalle(venta.idVenta)} className="inline-flex p-2 text-gray-300 hover:text-[#F2B01E]"><FiEye /></button></td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between gap-4 text-sm text-gray-300">
        <span>Página {paginacion.pagina || pagina} de {paginacion.paginas || 1}</span>
        <div className="flex gap-2">
          <button disabled={pagina <= 1 || cargando} onClick={() => setPagina((actual) => actual - 1)} title="Página anterior" className="border border-[#444] p-2 disabled:opacity-40"><FiChevronLeft /></button>
          <button disabled={pagina >= (paginacion.paginas || 1) || cargando} onClick={() => setPagina((actual) => actual + 1)} title="Página siguiente" className="border border-[#444] p-2 disabled:opacity-40"><FiChevronRight /></button>
        </div>
      </footer>

      {(detalle || cargandoDetalle) && <div role="dialog" aria-modal="true" aria-label="Detalle de factura" className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-black/75 p-3 sm:p-6" onClick={() => !cargandoDetalle && setDetalle(null)}>
        <section className="max-h-[94vh] w-full max-w-5xl overflow-auto border border-[#383838] bg-[#171717] p-4 sm:p-6" onClick={(evento) => evento.stopPropagation()}>
          {cargandoDetalle ? <p className="p-8 text-center text-gray-300">Cargando factura...</p> : (() => {
            const factura = detalle.factura
            const venta = detalle.venta
            const items = factura.detalles || venta.detalles || []
            const cliente = factura.cliente
            const sucursal = factura.sucursal
            const vendedor = factura.vendedor
            const subtotal = Number(factura.subtotal ?? venta.subtotal ?? 0)
            const descuento = Number(factura.descuento ?? venta.descuento ?? 0)
            const envio = Number(factura.costoEnvio ?? venta.costoEnvio ?? 0)
            const totalFactura = Number(factura.total ?? venta.total ?? 0)
            return <>
              <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
                <p className="text-sm text-gray-400">Vista de factura</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => window.print()} className="flex items-center gap-2 border border-[#444] px-3 py-2 text-sm text-white hover:border-[#F2B01E]"><FiPrinter /> Imprimir / PDF</button>
                  <button type="button" onClick={() => setDetalle(null)} className="border border-[#444] px-3 py-2 text-sm text-gray-300 hover:text-white">Cerrar</button>
                </div>
              </div>

              <article className="print-invoice bg-white p-5 text-neutral-900 sm:p-8">
                <header className="flex flex-col justify-between gap-5 border-b-2 border-neutral-900 pb-5 sm:flex-row">
                  <div className="flex items-center gap-4">
                    <img src={logo} alt="Ferretería Ferreteros S.A." className="h-16 w-16 object-contain" />
                    <div>
                      <p className="text-xl font-bold">Ferretería Ferreteros S.A.</p>
                      <p className="text-sm text-neutral-600">Comprobante de venta</p>
                      {sucursal?.direccion && <p className="mt-1 text-xs text-neutral-600">{sucursal.direccion}{sucursal.barrio ? `, ${sucursal.barrio}` : ''}</p>}
                      <p className="text-xs text-neutral-600">{sucursal?.telefono ? `Tel. ${sucursal.telefono}` : ''}</p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Factura de venta</p>
                    <h3 className="mt-1 break-all text-xl font-bold">{factura.numeroFactura}</h3>
                    <p className="mt-1 text-sm">Emitida: {fechaLegible(factura.fechaEmision)}</p>
                    <p className="text-xs text-neutral-600">Factura #{factura.idFactura} · Venta #{venta.idVenta}</p>
                  </div>
                </header>

                <section className="grid gap-5 border-b border-neutral-300 py-5 text-sm sm:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Vendido por</h4>
                    <p className="font-semibold">{sucursal?.nombre || `Sucursal #${venta.idSucursal}`}</p>
                    {sucursal?.direccion && <p>{sucursal.direccion}{sucursal.barrio ? `, ${sucursal.barrio}` : ''}</p>}
                    {sucursal?.telefono && <p>Teléfono: {sucursal.telefono}</p>}
                    <p className="mt-1 text-neutral-600">Atendió: {vendedor?.nombre || `Usuario #${venta.idUsuario}`}</p>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Cliente</h4>
                    {cliente ? <>
                      <p className="font-semibold">{cliente.nombre}</p>
                      <p>{cliente.tipoDocumento || 'Documento'}: {cliente.numeroDocumento}</p>
                      {cliente.direccion && <p>{cliente.direccion}{cliente.barrio ? `, ${cliente.barrio}` : ''}</p>}
                      {cliente.telefono && <p>Teléfono: {cliente.telefono}</p>}
                      {cliente.correoElectronico && <p>{cliente.correoElectronico}</p>}
                    </> : <p>Consumidor final</p>}
                  </div>
                </section>

                <section className="border-b border-neutral-300 py-4">
                  <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs text-neutral-600">
                    <span>Fecha de venta: {fechaLegible(factura.fechaVenta || venta.fechaHora)}</span>
                    <span>Tipo: {factura.tipoVenta || `Tipo #${venta.idTipoVenta}`}</span>
                    <span>Pago: {factura.medioPago || venta.metodoPago || 'No especificado'}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead><tr className="border-y border-neutral-300 text-xs uppercase text-neutral-500">
                        <th className="py-2 pr-3">Código</th><th className="py-2 pr-3">Descripción</th><th className="py-2 pr-3 text-right">Cant.</th><th className="py-2 pr-3 text-right">Precio unit.</th><th className="py-2 pr-3 text-right">Desc.</th><th className="py-2 text-right">Importe</th>
                      </tr></thead>
                      <tbody className="divide-y divide-neutral-200">
                        {items.map((item) => <tr key={item.idDetalleVenta}>
                          <td className="py-3 pr-3 text-xs">{item.codigoSKU || `#${item.idProducto}`}</td>
                          <td className="py-3 pr-3 font-medium">{item.nombreProducto || `Producto #${item.idProducto}`}</td>
                          <td className="py-3 pr-3 text-right">{item.cantidad}</td>
                          <td className="py-3 pr-3 text-right">{moneda.format(item.precioUnitario)}</td>
                          <td className="py-3 pr-3 text-right">{moneda.format(item.descuento || 0)}</td>
                          <td className="py-3 text-right font-semibold">{moneda.format(item.subtotal)}</td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ml-auto mt-5 w-full max-w-sm space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span>{moneda.format(subtotal)}</span></div>
                  {descuento > 0 && <div className="flex justify-between"><span className="text-neutral-600">Descuento</span><span>- {moneda.format(descuento)}</span></div>}
                  {envio > 0 && <div className="flex justify-between"><span className="text-neutral-600">Domicilio / envío</span><span>{moneda.format(envio)}</span></div>}
                  <div className="flex justify-between border-t-2 border-neutral-900 pt-3 text-lg font-bold"><span>Total</span><span>{moneda.format(totalFactura)}</span></div>
                </section>

                <footer className="mt-8 border-t border-neutral-300 pt-4 text-center text-xs text-neutral-500">
                  <p>Gracias por su compra en Ferretería Ferreteros S.A.</p>
                  <p className="mt-1">Documento generado por el sistema · No constituye soporte tributario electrónico.</p>
                </footer>
              </article>
            </>
          })()}
        </section>
      </div>}
    </div>
  )
}