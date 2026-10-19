import { useMemo, useState } from 'react'
import {
  FileText, Receipt, CalendarCheck, Eye, Download, ChevronLeft, ChevronRight,
} from 'lucide-react'
import StatCard from './StatCard'
import FacturaDetalle from './FacturaDetalle'
import api from '../api/client'
import { normalizarFacturaParaDetalle, obtenerNombreClientePorId } from '../api/ventas'
import { exportarReporte } from '../api/reportes'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function parseFecha(str) {
  const [d, m, y] = String(str || '').split('/').map(Number)
  if (!d || !m || !y) return null
  return new Date(y, m - 1, d)
}

function fechaISO(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export default function FacturasLista({
  facturas = [],
  sucursales = [],
  cargando = false,
  error = '',
  sucursalFija,
  mostrarResumen = false,
  mostrarCheckbox = false,
  itemsPorPagina = 10,
  botonAccion = 'exportar',
  titulo,
  subtitulo,
}) {
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [sucursal, setSucursal] = useState(sucursalFija ?? 'Todas las sucursales')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos los estados')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [exportando, setExportando] = useState(false)
  const [errorExportar, setErrorExportar] = useState('')

  const filas = useMemo(() => {
    let resultado = facturas
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      resultado = resultado.filter((factura) =>
        factura.numero.toLowerCase().includes(q)
        || factura.cliente.toLowerCase().includes(q)
        || factura.vendedor.toLowerCase().includes(q)
      )
    }
    if (sucursal !== 'Todas las sucursales') {
      resultado = resultado.filter((factura) => factura.sucursal === sucursal)
    }
    if (estadoFiltro !== 'Todos los estados') {
      resultado = resultado.filter((factura) => factura.estado === estadoFiltro)
    }
    // `${dia}T00:00:00` se interpreta en hora local, igual que parseFecha;
    // new Date('aaaa-mm-dd') sería medianoche UTC y dejaría fuera el día "hasta".
    if (desde) resultado = resultado.filter((factura) => parseFecha(factura.fecha) >= new Date(`${desde}T00:00:00`))
    if (hasta) resultado = resultado.filter((factura) => parseFecha(factura.fecha) <= new Date(`${hasta}T00:00:00`))
    return resultado
  }, [facturas, busqueda, sucursal, estadoFiltro, desde, hasta])

  const resumenesPorSucursal = useMemo(() => {
    const sucursalesResumen = sucursalFija
      ? [{ nombreSucursal: sucursalFija }]
      : sucursales

    return sucursalesResumen.map(({ nombreSucursal }) => {
      const base = facturas.filter((factura) => factura.sucursal === nombreSucursal)
      const fechas = base.map((factura) => parseFecha(factura.fecha)).filter(Boolean)
      const fechaMasReciente = fechas.length
        ? new Date(Math.max(...fechas.map((fecha) => fecha.getTime())))
        : null
      const facturasDelDia = fechaMasReciente
        ? base.filter((factura) => parseFecha(factura.fecha)?.getTime() === fechaMasReciente.getTime()).length
        : 0

      return {
        nombreSucursal,
        totalFacturas: base.length,
        totalVendido: base.reduce((total, factura) => total + Number(factura.total || 0), 0),
        facturasDelDia,
        fechaMasReciente,
      }
    })
  }, [facturas, sucursales, sucursalFija])

  const totalPaginas = Math.max(1, Math.ceil(filas.length / itemsPorPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * itemsPorPagina
  const filasPagina = filas.slice(inicio, inicio + itemsPorPagina)

  function cambiarFiltro(setter) {
    return (valor) => {
      setter(valor)
      setPagina(1)
    }
  }

  // Exporta el reporte de facturación del backend en PDF con el mismo
  // alcance que los filtros de la lista. Sin fechas elegidas se usa el rango
  // de las facturas visibles (el backend, si no, tomaría solo el mes en curso).
  async function exportarPDF() {
    setExportando(true)
    setErrorExportar('')
    try {
      const params = {}
      const fechas = filas.map((factura) => parseFecha(factura.fecha)).filter(Boolean)
      const masAntigua = fechas.length ? new Date(Math.min(...fechas.map((f) => f.getTime()))) : null
      const masReciente = fechas.length ? new Date(Math.max(...fechas.map((f) => f.getTime()))) : null
      const fechaDesde = desde || (masAntigua && fechaISO(masAntigua))
      const fechaHasta = hasta || (masReciente && fechaISO(masReciente))
      if (fechaDesde) params.desde = fechaDesde
      if (fechaHasta) params.hasta = fechaHasta

      const nombreSucursal = sucursalFija ?? sucursal
      if (nombreSucursal !== 'Todas las sucursales') {
        const encontrada = sucursales.find((item) => item.nombreSucursal === nombreSucursal)
        if (encontrada) params.sucursal_id = encontrada.idSucursal
      }

      await exportarReporte('facturas', params, 'pdf')
    } catch (error) {
      let mensaje = error?.response?.data?.mensaje || error?.response?.data?.error
      // Con responseType 'blob' el cuerpo del error llega como Blob.
      if (!mensaje && error?.response?.data instanceof Blob) {
        try {
          const cuerpo = JSON.parse(await error.response.data.text())
          mensaje = cuerpo?.mensaje || cuerpo?.error
        } catch { /* cuerpo no JSON */ }
      }
      setErrorExportar(mensaje || 'No se pudo exportar las facturas en PDF. Intenta de nuevo.')
    } finally {
      setExportando(false)
    }
  }

  async function abrirFactura(factura) {
    setCargandoDetalle(true)
    setErrorDetalle('')
    try {
      const [respuestaVenta, respuestaFactura] = await Promise.all([
        api.get(`/api/ventas/${factura.idVenta}`),
        api.get(`/api/ventas/${factura.idVenta}/factura`),
      ])
      const idCliente = respuestaVenta.data?.idCliente
      const nombreCliente = idCliente == null
        ? 'Cliente general'
        : await obtenerNombreClientePorId(idCliente)
      setFacturaSeleccionada(normalizarFacturaParaDetalle(
        respuestaVenta.data,
        respuestaFactura.data,
        sucursales,
        factura.vendedor,
        nombreCliente
      ))
    } catch (error) {
      setErrorDetalle(
        error?.response?.data?.mensaje
        || error?.response?.data?.error
        || error.message
        || 'No se pudo cargar el detalle de la factura. Intenta de nuevo.'
      )
    } finally {
      setCargandoDetalle(false)
    }
  }

  if (facturaSeleccionada) {
    return <FacturaDetalle factura={facturaSeleccionada} onVolver={() => setFacturaSeleccionada(null)} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
          <FileText size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">{titulo}</h1>
          <p className="text-sm text-gray-500">{subtitulo}</p>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {errorDetalle && <p role="alert" className="text-sm text-red-400">{errorDetalle}</p>}
      {errorExportar && <p role="alert" className="text-sm text-red-400">{errorExportar}</p>}

      {mostrarResumen && (
        <section className="flex flex-col gap-3" aria-label="Resumen de facturación por sucursal">
          {resumenesPorSucursal.length > 1 && (
            <h2 className="text-base font-semibold text-white">Resumen de facturación por sucursal</h2>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {resumenesPorSucursal.map((resumen) => (
              <article key={resumen.nombreSucursal} className="rounded-xl border border-panel-border bg-panel-card p-4">
                {resumenesPorSucursal.length > 1 && (
                  <h3 className="mb-4 font-semibold text-white">{resumen.nombreSucursal}</h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard
                    icon={FileText}
                    label="Total de facturas"
                    value={cargando ? '…' : error ? '—' : resumen.totalFacturas.toLocaleString('es-CO')}
                  />
                  <StatCard
                    icon={Receipt}
                    label="Total vendido"
                    value={cargando ? '…' : error ? '—' : formatoCOP.format(resumen.totalVendido)}
                    accent="green"
                  />
                  <StatCard
                    icon={CalendarCheck}
                    label="Facturas del día más reciente"
                    value={cargando ? '…' : error ? '—' : resumen.facturasDelDia.toLocaleString('es-CO')}
                    footer={resumen.fechaMasReciente
                      ? resumen.fechaMasReciente.toLocaleDateString('es-CO')
                      : 'Sin facturas registradas'}
                    accent="blue"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => cambiarFiltro(setBusqueda)(e.target.value)}
          placeholder="Buscar factura, cliente o vendedor..."
          className="flex-1 min-w-[200px] bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
        {!sucursalFija && (
          <select
            value={sucursal}
            onChange={(e) => cambiarFiltro(setSucursal)(e.target.value)}
            className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
          >
            <option>Todas las sucursales</option>
            {sucursales.map((item) => <option key={item.idSucursal}>{item.nombreSucursal}</option>)}
          </select>
        )}
        <select
          value={estadoFiltro}
          onChange={(e) => cambiarFiltro(setEstadoFiltro)(e.target.value)}
          className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          <option>Todos los estados</option>
          <option>Emitida</option>
        </select>
        <div className="flex items-center gap-1.5 bg-panel-card border border-panel-border rounded-lg px-3 py-2">
          <input type="date" value={desde} onChange={(e) => cambiarFiltro(setDesde)(e.target.value)} className="bg-transparent text-sm text-gray-300 outline-none" />
          <span className="text-gray-500 text-sm">–</span>
          <input type="date" value={hasta} onChange={(e) => cambiarFiltro(setHasta)(e.target.value)} className="bg-transparent text-sm text-gray-300 outline-none" />
        </div>
        {botonAccion === 'exportar' && (
          <button
            type="button"
            onClick={exportarPDF}
            disabled={exportando || cargando}
            className="ml-auto flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Download size={16} /> {exportando ? 'Exportando…' : 'Exportar PDF'}
          </button>
        )}
      </div>

      <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-panel-border">
              {mostrarCheckbox && <th className="py-3 pl-4 pr-2 w-8"></th>}
              <th className={`py-3 pr-2 font-medium ${mostrarCheckbox ? '' : 'pl-4'}`}>Factura</th>
              <th className="py-3 pr-2 font-medium">Fecha</th>
              <th className="py-3 pr-2 font-medium">Sucursal</th>
              <th className="py-3 pr-2 font-medium">Vendedor</th>
              <th className="py-3 pr-2 font-medium">Cliente</th>
              <th className="py-3 pr-2 font-medium">Total</th>
              <th className="py-3 pr-2 font-medium">Estado</th>
              <th className="py-3 pr-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filasPagina.map((factura) => (
              <tr key={factura.idVenta} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                {mostrarCheckbox && <td className="py-3 pl-4 pr-2"><input type="checkbox" className="accent-brand-yellow" /></td>}
                <td className={`py-3 pr-2 text-gray-200 font-medium whitespace-nowrap ${mostrarCheckbox ? '' : 'pl-4'}`}>
                  #{factura.numero}
                </td>
                <td className="py-3 pr-2 text-gray-300 whitespace-nowrap">{factura.fecha}</td>
                <td className="py-3 pr-2 text-gray-400 whitespace-nowrap">{factura.sucursal}</td>
                <td className="py-3 pr-2 text-gray-300">{factura.vendedor}</td>
                <td className="py-3 pr-2 text-gray-300">{factura.cliente}</td>
                <td className="py-3 pr-2 text-gray-200 font-semibold whitespace-nowrap">{formatoCOP.format(factura.total)}</td>
                <td className="py-3 pr-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-blue-500/15 text-blue-400">
                    {factura.estado}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <button
                    onClick={() => abrirFactura(factura)}
                    disabled={cargandoDetalle}
                    className="text-gray-400 hover:text-white disabled:opacity-50"
                    title="Ver factura"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!cargando && filasPagina.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500 text-sm">
                  Ninguna factura coincide con esos filtros.
                </td>
              </tr>
            )}
            {cargando && (
              <tr><td colSpan={9} className="py-8 text-center text-gray-500">Cargando facturas…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
        <span>
          Mostrando {filas.length === 0 ? 0 : inicio + 1}-{Math.min(inicio + itemsPorPagina, filas.length)} de {filas.length.toLocaleString('es-CO')} facturas
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1} className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5">
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).slice(0, 5).map((n) => (
            <button
              key={n}
              onClick={() => setPagina(n)}
              className={`h-8 w-8 flex items-center justify-center rounded-lg border text-xs font-semibold ${
                n === paginaActual ? 'bg-brand-yellow text-panel-sidebar border-brand-yellow' : 'border-panel-border text-gray-300 hover:bg-white/5'
              }`}
            >
              {n}
            </button>
          ))}
          {totalPaginas > 5 && <span className="px-1">...</span>}
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
