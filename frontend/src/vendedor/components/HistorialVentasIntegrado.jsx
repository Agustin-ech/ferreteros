import { useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiEye, FiFilter, FiRotateCcw } from 'react-icons/fi'
import { buscarClientes, listarVentas, obtenerFactura, obtenerVenta } from '../../api/vendedor'

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fechaLegible = (valor) => valor ? new Date(valor).toLocaleString('es-CO') : 'Sin fecha'

function fechaISO(dia, sumarDia = false) {
  if (!dia) return undefined
  const fecha = new Date(`${dia}T00:00:00.000Z`)
  if (sumarDia) fecha.setUTCDate(fecha.getUTCDate() + 1)
  return fecha.toISOString()
}

export default function HistorialVentasIntegrado({ titulo, soloHoy = false, modo = 'ventas', idSucursal }) {
  const hoy = new Date().toISOString().slice(0, 10)
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const [fechaDesde, setFechaDesde] = useState(soloHoy ? hoy : '')
  const [fechaHasta, setFechaHasta] = useState(soloHoy ? manana : '')
  const [clienteTexto, setClienteTexto] = useState('')
  const [clienteElegido, setClienteElegido] = useState(null)
  const [clientes, setClientes] = useState([])
  const [filtros, setFiltros] = useState({ desde: soloHoy ? fechaISO(hoy) : undefined, hasta: soloHoy ? fechaISO(manana) : undefined })
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
    }
    Object.keys(nuevosFiltros).forEach((clave) => nuevosFiltros[clave] === undefined && delete nuevosFiltros[clave])
    setPagina(1)
    setFiltros(nuevosFiltros)
  }

  function limpiarFiltros() {
    setFechaDesde('')
    setFechaHasta('')
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
              <td className="pr-4">{venta.idCliente ? `Cliente #${venta.idCliente}` : 'Venta sin cliente'}</td>
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

      {(detalle || cargandoDetalle) && <div role="dialog" aria-modal="true" className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4" onClick={() => !cargandoDetalle && setDetalle(null)}>
        <section className="max-h-[85vh] w-full max-w-2xl overflow-auto border border-[#383838] bg-[#171717] p-6" onClick={(evento) => evento.stopPropagation()}>
          {cargandoDetalle ? <p className="text-gray-300">Cargando detalle...</p> : <>
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-lg font-semibold text-white">Factura {detalle.factura.numeroFactura}</h3><p className="mt-1 text-sm text-gray-400">{fechaLegible(detalle.factura.fechaEmision)}</p></div>
              <button type="button" onClick={() => setDetalle(null)} className="text-sm text-gray-300 hover:text-white">Cerrar</button>
            </div>
            <div className="mt-5 divide-y divide-[#333]">
              {detalle.venta.detalles?.map((item) => <div key={item.idDetalleVenta} className="flex justify-between gap-4 py-3 text-sm text-gray-200"><span>{item.nombreProducto} · {item.cantidad}</span><span>{moneda.format(item.subtotal)}</span></div>)}
            </div>
            <div className="mt-4 flex justify-between border-t border-[#333] pt-4 font-semibold text-white"><span>Total factura</span><span>{moneda.format(detalle.factura.total)}</span></div>
            <p className="mt-2 text-xs text-gray-400">ID de factura: {detalle.factura.idFactura} · ID de venta: {detalle.venta.idVenta}</p>
          </>}
        </section>
      </div>}
    </div>
  )
}