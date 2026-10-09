import { useMemo, useState } from 'react'
import {
  FileText, Receipt, CalendarCheck, DollarSign, Eye, Plus, Download, ChevronLeft, ChevronRight,
} from 'lucide-react'
import StatCard from './StatCard'
import FacturaDetalle from './FacturaDetalle'
import NuevaFacturaModal from './NuevaFacturaModal'
import MenuAcciones from './MenuAcciones'
import { facturasCompletas as facturasPorDefecto, calcularTotalesFactura } from '../data/mockData'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const estadoStyles = {
  Pagada: 'bg-emerald-500/15 text-emerald-400',
  Pendiente: 'bg-amber-500/15 text-amber-400',
  Anulada: 'bg-red-500/15 text-red-400',
}

// dd/mm/aaaa -> Date, para poder comparar con los filtros de fecha.
function parseFecha(str) {
  const [d, m, y] = str.split('/').map(Number)
  return new Date(y, m - 1, d)
}

// Listado de facturas configurable: lo usan las 4 páginas del módulo
// (Facturas, Todas las facturas, Facturas La Chinita, Facturas Buenavista)
// para no repetir la tabla, los filtros ni la paginación cuatro veces.
export default function FacturasLista({
  facturas = facturasPorDefecto, // lo pasa App.jsx (estado compartido); si no llega, usa el mock fijo
  onAnularFactura,
  onAgregarFactura,      // crea una factura nueva (botón "Nueva factura")
  sucursalFija,          // 'La Chinita' | 'Buenavista' | undefined (todas)
  mostrarResumen = false, // muestra las 4 tarjetas de arriba
  mostrarCheckbox = false,
  itemsPorPagina = 10,
  botonAccion = 'exportar', // 'nueva' | 'exportar' | null
  titulo,
  subtitulo,
}) {
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [sucursal, setSucursal] = useState(sucursalFija ?? 'Todas las sucursales')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos los estados')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [creandoFactura, setCreandoFactura] = useState(false)

  const filas = useMemo(() => {
    let filas = facturas.map((f) => ({ ...f, total: calcularTotalesFactura(f).total }))

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      filas = filas.filter(
        (f) => f.numero.includes(q) || f.cliente.toLowerCase().includes(q) || f.vendedor.toLowerCase().includes(q)
      )
    }
    if (sucursal !== 'Todas las sucursales') {
      filas = filas.filter((f) => f.sucursal === sucursal)
    }
    if (estadoFiltro !== 'Todos los estados') {
      filas = filas.filter((f) => f.estado === estadoFiltro)
    }
    if (desde) filas = filas.filter((f) => parseFecha(f.fecha) >= new Date(desde))
    if (hasta) filas = filas.filter((f) => parseFecha(f.fecha) <= new Date(hasta))

    return filas
  }, [facturas, busqueda, sucursal, estadoFiltro, desde, hasta])

  const resumen = useMemo(() => {
    const base = sucursalFija ? facturas.filter((f) => f.sucursal === sucursalFija) : facturas
    const totales = base.map((f) => calcularTotalesFactura(f).total)
    const fechaMasReciente = base.reduce((max, f) => {
      const d = parseFecha(f.fecha)
      return d > max ? d : max
    }, new Date(0))
    const facturasDelDia = base.filter((f) => parseFecha(f.fecha).getTime() === fechaMasReciente.getTime()).length
    return {
      totalFacturas: base.length,
      totalVendido: totales.reduce((a, b) => a + b, 0),
      facturasDelDia,
      pendientes: base.filter((f) => f.estado === 'Pendiente').length,
    }
  }, [facturas, sucursalFija])

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

      {mostrarResumen && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Total de facturas" value={resumen.totalFacturas.toLocaleString('es-CO')} footer="+12% vs. mes anterior" />
          <StatCard icon={Receipt} label="Total vendido" value={formatoCOP.format(resumen.totalVendido)} footer="+15% vs. mes anterior" accent="green" />
          <StatCard icon={CalendarCheck} label="Facturas del día" value={resumen.facturasDelDia} footer="+8% vs. día anterior" accent="blue" />
          <StatCard icon={DollarSign} label="Pendientes de pago" value={resumen.pendientes} footer="-2% vs. mes anterior" accent="red" />
        </div>
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
            <option>La Chinita</option>
            <option>Buenavista</option>
          </select>
        )}
        <select
          value={estadoFiltro}
          onChange={(e) => cambiarFiltro(setEstadoFiltro)(e.target.value)}
          className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          <option>Todos los estados</option>
          <option>Pagada</option>
          <option>Pendiente</option>
          <option>Anulada</option>
        </select>
        <div className="flex items-center gap-1.5 bg-panel-card border border-panel-border rounded-lg px-3 py-2">
          <input
            type="date"
            value={desde}
            onChange={(e) => cambiarFiltro(setDesde)(e.target.value)}
            className="bg-transparent text-sm text-gray-300 outline-none"
          />
          <span className="text-gray-500 text-sm">–</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => cambiarFiltro(setHasta)(e.target.value)}
            className="bg-transparent text-sm text-gray-300 outline-none"
          />
        </div>

        {botonAccion === 'nueva' && (
          <button
            type="button"
            onClick={() => setCreandoFactura(true)}
            className="ml-auto flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap"
          >
            <Plus size={16} /> Nueva factura
          </button>
        )}
        {botonAccion === 'exportar' && (
          <button
            type="button"
            title="Función de exportar: próximamente"
            className="ml-auto flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap"
          >
            <Download size={16} /> Exportar
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
            {filasPagina.map((f) => (
              <tr key={f.numero} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                {mostrarCheckbox && (
                  <td className="py-3 pl-4 pr-2">
                    <input type="checkbox" className="accent-brand-yellow" />
                  </td>
                )}
                <td className={`py-3 pr-2 text-gray-200 font-medium whitespace-nowrap ${mostrarCheckbox ? '' : 'pl-4'}`}>
                  #{f.numero}
                </td>
                <td className="py-3 pr-2 text-gray-300 whitespace-nowrap">{f.fecha}</td>
                <td className="py-3 pr-2 text-gray-400 whitespace-nowrap">{f.sucursal}</td>
                <td className="py-3 pr-2 text-gray-300">{f.vendedor}</td>
                <td className="py-3 pr-2 text-gray-300">{f.cliente}</td>
                <td className="py-3 pr-2 text-gray-200 font-semibold whitespace-nowrap">{formatoCOP.format(f.total)}</td>
                <td className="py-3 pr-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${estadoStyles[f.estado]}`}>
                    {f.estado}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3 text-gray-400">
                    <button onClick={() => setFacturaSeleccionada(f)} className="hover:text-white" title="Ver factura">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => setFacturaSeleccionada(f)} className="hover:text-white" title="Ver documento">
                      <FileText size={15} />
                    </button>
                    <MenuAcciones
                      acciones={[
                        {
                          label: f.estado === 'Anulada' ? 'Reactivar factura' : 'Anular factura',
                          destructivo: f.estado !== 'Anulada',
                          onClick: () => onAnularFactura?.(f.numero),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filasPagina.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500 text-sm">
                  Ninguna factura coincide con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creandoFactura && (
        <NuevaFacturaModal
          facturas={facturas}
          sucursalInicial={sucursalFija}
          onCerrar={() => setCreandoFactura(false)}
          onCrear={(factura) => {
            onAgregarFactura?.(factura)
            setCreandoFactura(false)
            setPagina(1)
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
        <span>
          Mostrando {filas.length === 0 ? 0 : inicio + 1}-{Math.min(inicio + itemsPorPagina, filas.length)} de{' '}
          {filas.length.toLocaleString('es-CO')} facturas
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).slice(0, 5).map((n) => (
            <button
              key={n}
              onClick={() => setPagina(n)}
              className={`h-8 w-8 flex items-center justify-center rounded-lg border text-xs font-semibold ${
                n === paginaActual
                  ? 'bg-brand-yellow text-panel-sidebar border-brand-yellow'
                  : 'border-panel-border text-gray-300 hover:bg-white/5'
              }`}
            >
              {n}
            </button>
          ))}
          {totalPaginas > 5 && <span className="px-1">...</span>}
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}