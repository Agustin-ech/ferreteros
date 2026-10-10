import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Plus } from 'lucide-react'
import StatCard from '../components/StatCard'
import FiltroPeriodoSucursal from '../components/FiltroPeriodoSucursal'
import {
  facturasCompletas as facturasPorDefecto,
  egresosFinancieros as egresosPorDefecto,
  calcularIngresosFinancieros,
} from '../data/mockData'
import { parseFecha } from '../utils/fecha'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatoCorto = (n) => `${Math.round(n / 1_000_000)}M`

// Vista general de Finanzas: tarjetas de resumen, gráfica de ingresos vs.
// egresos y los movimientos más recientes de ambos. `facturas` y `egresos`
// los pasa App.jsx (estado compartido); los ingresos se recalculan aquí a
// partir de las facturas para que anular una se refleje al instante.
export default function Finanzas({ onNavigate, facturas = facturasPorDefecto, egresos: egresosFinancieros = egresosPorDefecto }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sucursal, setSucursal] = useState('Todas las sucursales')

  const ingresosFinancieros = useMemo(() => calcularIngresosFinancieros(facturas), [facturas])

  const dentroDelFiltro = (m) => {
    if (sucursal !== 'Todas las sucursales' && m.sucursal !== sucursal) return false
    const f = parseFecha(m.fecha)
    if (desde && f < new Date(desde)) return false
    if (hasta && f > new Date(hasta)) return false
    return true
  }

  const ingresosFiltrados = useMemo(() => ingresosFinancieros.filter(dentroDelFiltro), [ingresosFinancieros, desde, hasta, sucursal])
  const egresosFiltrados = useMemo(() => egresosFinancieros.filter(dentroDelFiltro), [egresosFinancieros, desde, hasta, sucursal])

  const totalIngresos = ingresosFiltrados.reduce((a, m) => a + m.monto, 0)
  const totalEgresos = egresosFiltrados.reduce((a, m) => a + m.monto, 0)
  const balance = totalIngresos - totalEgresos

  // Datos para la gráfica: una barra de ingresos y otra de egresos por
  // cada fecha en la que hubo al menos un movimiento.
  const datosGrafica = useMemo(() => {
    const fechas = new Set([...ingresosFiltrados, ...egresosFiltrados].map((m) => m.fecha))
    return [...fechas]
      .sort((a, b) => parseFecha(a) - parseFecha(b))
      .map((fecha) => ({
        fecha: fecha.slice(0, 5),
        ingresos: ingresosFiltrados.filter((m) => m.fecha === fecha).reduce((a, m) => a + m.monto, 0),
        egresos: egresosFiltrados.filter((m) => m.fecha === fecha).reduce((a, m) => a + m.monto, 0),
      }))
  }, [ingresosFiltrados, egresosFiltrados])

  const movimientosRecientes = useMemo(() => {
    const todos = [
      ...ingresosFiltrados.map((m) => ({ ...m, tipo: 'Ingreso', etiqueta: `${m.concepto} en ${m.sucursal}` })),
      ...egresosFiltrados.map((m) => ({ ...m, tipo: 'Egreso', etiqueta: m.concepto })),
    ]
    return todos.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha)).slice(0, 5)
  }, [ingresosFiltrados, egresosFiltrados])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Finanzas</h1>
            <p className="text-sm text-gray-500">Consulta y gestiona los ingresos, egresos y el balance del negocio.</p>
          </div>
        </div>
        <FiltroPeriodoSucursal desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} sucursal={sucursal} onSucursal={setSucursal} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={ArrowDownCircle} label="Ingresos" value={formatoCOP.format(totalIngresos)} footer="+12% vs. periodo anterior" />
        <StatCard icon={ArrowUpCircle} label="Egresos" value={formatoCOP.format(totalEgresos)} footer="+5% vs. periodo anterior" />
        <StatCard icon={Wallet} label="Balance" value={formatoCOP.format(balance)} footer="+18% vs. periodo anterior" accent="green" />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="bg-panel-card border border-panel-border rounded-xl p-4">
          <div className="flex items-center gap-4 mb-3">
            <p className="font-semibold text-white text-sm">Ingresos vs. Egresos</p>
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="h-2.5 w-2.5 rounded-full bg-brand-yellow" /> Ingresos</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="h-2.5 w-2.5 rounded-full bg-gray-500" /> Egresos</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafica} barGap={3}>
                <CartesianGrid stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
                <YAxis tickFormatter={formatoCorto} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  formatter={(value) => formatoCOP.format(value)}
                  contentStyle={{ background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#E5E7EB' }}
                />
                <Bar dataKey="ingresos" fill="#F2B01E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="egresos" fill="#6B7280" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white text-sm">Movimientos recientes</p>
            <button onClick={() => onNavigate?.('finanzas')} className="text-xs text-brand-yellow hover:underline">
              Ver todos
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {movimientosRecientes.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap ${
                    m.tipo === 'Ingreso' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {m.tipo}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 truncate">{m.etiqueta}</p>
                  <p className="text-[11px] text-gray-500">{m.fecha.slice(0, 5)}</p>
                </div>
                <p className={`text-xs font-semibold ${m.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatoCOP.format(m.monto)}
                </p>
              </div>
            ))}
            {movimientosRecientes.length === 0 && (
              <p className="text-xs text-gray-500">Sin movimientos con esos filtros.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onNavigate?.('ingresos')}
          className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition"
        >
          <Plus size={16} /> Registrar ingreso
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('egresos')}
          className="flex items-center gap-2 bg-panel-card border border-panel-border text-gray-200 font-semibold text-sm rounded-lg px-4 py-2 hover:bg-white/5 transition"
        >
          <Plus size={16} /> Registrar egreso
        </button>
      </div>
    </div>
  )
}