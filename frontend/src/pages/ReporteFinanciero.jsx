import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { DollarSign, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react'
import StatCard from '../components/StatCard'
import FiltroPeriodoSucursal from '../components/FiltroPeriodoSucursal'
import BotonExportarPDF from '../components/BotonExportarPDF'
import {
  facturasCompletas as facturasPorDefecto,
  egresosFinancieros as egresosPorDefecto,
  calcularIngresosFinancieros,
} from '../data/mockData'
import { parseFecha } from '../utils/fecha'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatoCorto = (n) => `${Math.round(n / 1_000_000)}M`

export default function ReporteFinanciero({ facturas = facturasPorDefecto, egresos: egresosFinancieros = egresosPorDefecto }) {
  const ingresosFinancieros = useMemo(() => calcularIngresosFinancieros(facturas), [facturas])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sucursal, setSucursal] = useState('Todas las sucursales')

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

  const movimientos = useMemo(() => {
    const todos = [
      ...ingresosFiltrados.map((m) => ({ fecha: m.fecha, concepto: m.concepto, tipo: 'Ingreso', monto: m.monto })),
      ...egresosFiltrados.map((m) => ({ fecha: m.fecha, concepto: m.concepto, tipo: 'Egreso', monto: m.monto })),
    ]
    return todos.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha)).slice(0, 8)
  }, [ingresosFiltrados, egresosFiltrados])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Reporte financiero</h1>
            <p className="text-sm text-gray-500">Consulta ingresos, egresos y balance del negocio.</p>
          </div>
        </div>
        <FiltroPeriodoSucursal desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} sucursal={sucursal} onSucursal={setSucursal} />
      </div>

      <div className="print-area flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={ArrowDownCircle} label="Total ingresos" value={formatoCOP.format(totalIngresos)} footer="+12% vs. periodo anterior" />
          <StatCard icon={ArrowUpCircle} label="Total egresos" value={formatoCOP.format(totalEgresos)} footer="+5% vs. periodo anterior" />
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

          <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
            <p className="px-4 pt-4 pb-1 font-semibold text-white text-sm">Movimientos recientes</p>
            <table className="w-full text-sm min-w-[380px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-2.5 px-4 font-medium">Fecha</th>
                  <th className="py-2.5 pr-2 font-medium">Concepto</th>
                  <th className="py-2.5 pr-2 font-medium">Tipo</th>
                  <th className="py-2.5 pr-4 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, i) => (
                  <tr key={i} className="border-b border-panel-border/60 last:border-0">
                    <td className="py-2.5 px-4 text-gray-300 whitespace-nowrap">{m.fecha}</td>
                    <td className="py-2.5 pr-2 text-gray-200">{m.concepto}</td>
                    <td className="py-2.5 pr-2">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap ${m.tipo === 'Ingreso' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className={`py-2.5 pr-4 font-semibold whitespace-nowrap ${m.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatoCOP.format(m.monto)}
                    </td>
                  </tr>
                ))}
                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500 text-xs">
                      Sin movimientos con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <BotonExportarPDF />
      </div>
    </div>
  )
}