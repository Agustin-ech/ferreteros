import { useMemo, useState } from 'react'
import { ArrowUpCircle, Eye, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import FiltroPeriodoSucursal from '../components/FiltroPeriodoSucursal'
import MenuAcciones from '../components/MenuAcciones'
import DetalleEgreso from './DetalleEgreso'
import { parseFecha } from '../utils/fecha'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const ITEMS_POR_PAGINA = 6

export default function Egresos({ egresos = [], onEliminarEgreso }) {
  const [seleccionado, setSeleccionado] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [sucursal, setSucursal] = useState('Todas las sucursales')
  const [concepto, setConcepto] = useState('Todos los conceptos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)

  function cambiarFiltro(setter) {
    return (valor) => {
      setter(valor)
      setPagina(1)
    }
  }

  const conceptos = useMemo(
    () => ['Todos los conceptos', ...new Set(egresos.map((m) => m.concepto))],
    [egresos]
  )

  const filas = useMemo(() => {
    let filas = egresos
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      filas = filas.filter(
        (m) => m.descripcion.toLowerCase().includes(q) || m.proveedor.toLowerCase().includes(q)
      )
    }
    if (sucursal !== 'Todas las sucursales') filas = filas.filter((m) => m.sucursal === sucursal)
    if (concepto !== 'Todos los conceptos') filas = filas.filter((m) => m.concepto === concepto)
    if (desde) filas = filas.filter((m) => parseFecha(m.fecha) >= new Date(desde))
    if (hasta) filas = filas.filter((m) => parseFecha(m.fecha) <= new Date(hasta))
    return filas.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha))
  }, [egresos, busqueda, sucursal, concepto, desde, hasta])

  const totalPaginas = Math.max(1, Math.ceil(filas.length / ITEMS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
  const filasPagina = filas.slice(inicio, inicio + ITEMS_POR_PAGINA)

  if (seleccionado) {
    return <DetalleEgreso egreso={seleccionado} onVolver={() => setSeleccionado(null)} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <ArrowUpCircle size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Egresos</h1>
            <p className="text-sm text-gray-500">Consulta el detalle de todos los egresos registrados.</p>
          </div>
        </div>
        <button
          type="button"
          title="Función de registrar egreso: próximamente"
          className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap"
        >
          <Plus size={16} /> Registrar egreso
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => cambiarFiltro(setBusqueda)(e.target.value)}
          placeholder="Buscar por descripción, proveedor o factura..."
          className="flex-1 min-w-[200px] bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
        <select value={sucursal} onChange={(e) => cambiarFiltro(setSucursal)(e.target.value)} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
          <option>Todas las sucursales</option>
          <option>La Chinita</option>
          <option>Buenavista</option>
        </select>
        <select value={concepto} onChange={(e) => cambiarFiltro(setConcepto)(e.target.value)} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
          {conceptos.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <FiltroPeriodoSucursal desde={desde} hasta={hasta} onDesde={cambiarFiltro(setDesde)} onHasta={cambiarFiltro(setHasta)} mostrarSucursal={false} />
      </div>

      <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-panel-border">
              <th className="py-3 pl-4 pr-2 w-8"></th>
              <th className="py-3 pr-2 font-medium">Fecha</th>
              <th className="py-3 pr-2 font-medium">Concepto</th>
              <th className="py-3 pr-2 font-medium">Descripción</th>
              <th className="py-3 pr-2 font-medium">Proveedor</th>
              <th className="py-3 pr-2 font-medium">Sucursal</th>
              <th className="py-3 pr-2 font-medium">Monto</th>
              <th className="py-3 pr-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filasPagina.map((m, i) => (
              <tr key={i} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                <td className="py-3 pl-4 pr-2">
                  <input type="checkbox" className="accent-brand-yellow" />
                </td>
                <td className="py-3 pr-2 text-gray-300 whitespace-nowrap">{m.fecha}</td>
                <td className="py-3 pr-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 whitespace-nowrap">{m.concepto}</span>
                </td>
                <td className="py-3 pr-2 text-gray-200 font-medium">{m.descripcion}</td>
                <td className="py-3 pr-2 text-gray-400">{m.proveedor}</td>
                <td className="py-3 pr-2 text-gray-400 whitespace-nowrap">{m.sucursal}</td>
                <td className="py-3 pr-2 text-red-400 font-semibold whitespace-nowrap">{formatoCOP.format(m.monto)}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3 text-gray-400">
                    <button onClick={() => setSeleccionado(m)} className="hover:text-white" title="Ver detalle">
                      <Eye size={16} />
                    </button>
                    <MenuAcciones
                      acciones={[
                        {
                          label: 'Eliminar egreso',
                          destructivo: true,
                          onClick: () => onEliminarEgreso?.(m.fecha, m.descripcion),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filasPagina.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500 text-sm">
                  Ningún egreso coincide con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
        <span>
          Mostrando {filas.length === 0 ? 0 : inicio + 1}-{Math.min(inicio + ITEMS_POR_PAGINA, filas.length)} de {filas.length.toLocaleString('es-CO')} egresos
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1} className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5">
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).slice(0, 6).map((n) => (
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
          {totalPaginas > 6 && <span className="px-1">...</span>}
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}