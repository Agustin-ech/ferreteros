import { useMemo, useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { PieChart as PieChartIcon, ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import StatCard from '../components/StatCard'
import FiltroPeriodoSucursal from '../components/FiltroPeriodoSucursal'
import {
  facturasCompletas as facturasPorDefecto,
  egresosFinancieros as egresosPorDefecto,
  calcularIngresosFinancieros,
} from '../data/mockData'
import { parseFecha } from '../utils/fecha'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const COLOR_INGRESOS = '#F2B01E'
const COLOR_EGRESOS = '#4B5563'

export default function ResumenFinanciero({ facturas = facturasPorDefecto, egresos: egresosFinancieros = egresosPorDefecto }) {
  const ingresosFinancieros = useMemo(() => calcularIngresosFinancieros(facturas), [facturas])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sucursal, setSucursal] = useState('Todas las sucursales')

  const dentroDelPeriodo = (m) => {
    const f = parseFecha(m.fecha)
    if (desde && f < new Date(desde)) return false
    if (hasta && f > new Date(hasta)) return false
    return true
  }

  const dentroDelFiltro = (m) => {
    if (sucursal !== 'Todas las sucursales' && m.sucursal !== sucursal) return false
    return dentroDelPeriodo(m)
  }

  const ingresosFiltrados = useMemo(() => ingresosFinancieros.filter(dentroDelFiltro), [ingresosFinancieros, desde, hasta, sucursal])
  const egresosFiltrados = useMemo(() => egresosFinancieros.filter(dentroDelFiltro), [egresosFinancieros, desde, hasta, sucursal])

  const totalIngresos = ingresosFiltrados.reduce((a, m) => a + m.monto, 0)
  const totalEgresos = egresosFiltrados.reduce((a, m) => a + m.monto, 0)
  const balance = totalIngresos - totalEgresos
  const totalMovido = totalIngresos + totalEgresos
  const pctIngresos = totalMovido === 0 ? 0 : Math.round((totalIngresos / totalMovido) * 100)
  const pctEgresos = 100 - pctIngresos

  const datosDona = [
    { name: 'Ingresos', value: totalIngresos },
    { name: 'Egresos', value: totalEgresos },
  ]

  // Resumen por sucursal: usa solo el filtro de fecha (no el de sucursal,
  // porque la tabla ya desglosa por sucursal).
  const porSucursal = useMemo(() => {
    const sucursalesLista = ['La Chinita', 'Buenavista']
    const filas = sucursalesLista.map((s) => {
      const ingresos = ingresosFinancieros.filter((m) => m.sucursal === s && dentroDelPeriodo(m)).reduce((a, m) => a + m.monto, 0)
      const egresos = egresosFinancieros.filter((m) => m.sucursal === s && dentroDelPeriodo(m)).reduce((a, m) => a + m.monto, 0)
      return { sucursal: s, ingresos, egresos, balance: ingresos - egresos }
    })
    const total = filas.reduce(
      (acc, f) => ({ ingresos: acc.ingresos + f.ingresos, egresos: acc.egresos + f.egresos, balance: acc.balance + f.balance }),
      { ingresos: 0, egresos: 0, balance: 0 }
    )
    return { filas, total }
  }, [ingresosFinancieros, egresosFinancieros, desde, hasta])

  const balanceEsPositivo = balance >= 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <PieChartIcon size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Resumen financiero</h1>
            <p className="text-sm text-gray-500">Vista general del estado financiero del negocio.</p>
          </div>
        </div>
        <FiltroPeriodoSucursal desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} sucursal={sucursal} onSucursal={setSucursal} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={ArrowDownCircle} label="Total ingresos" value={formatoCOP.format(totalIngresos)} footer="+12% vs. periodo anterior" />
        <StatCard icon={ArrowUpCircle} label="Total egresos" value={formatoCOP.format(totalEgresos)} footer="-5% vs. periodo anterior" />
        <StatCard icon={Wallet} label="Balance" value={formatoCOP.format(balance)} footer="+18% vs. periodo anterior" accent="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-panel-card border border-panel-border rounded-xl p-4">
          <p className="font-semibold text-white text-sm mb-2">Distribución de ingresos y egresos</p>
          <div className="flex items-center gap-4">
            <div className="relative h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={datosDona} dataKey="value" innerRadius={48} outerRadius={70} startAngle={90} endAngle={-270}>
                    <Cell fill={COLOR_INGRESOS} />
                    <Cell fill={COLOR_EGRESOS} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] text-gray-400">Total</p>
                <p className="text-sm font-bold text-white">{formatoCOP.format(totalMovido)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <span className="flex items-center gap-2 text-gray-200">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLOR_INGRESOS }} /> Ingresos {pctIngresos}%
              </span>
              <span className="flex items-center gap-2 text-gray-200">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLOR_EGRESOS }} /> Egresos {pctEgresos}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 overflow-x-auto scroll-thin">
          <p className="font-semibold text-white text-sm mb-2">Resumen por sucursal</p>
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-panel-border">
                <th className="py-2 pr-2 font-medium">Sucursal</th>
                <th className="py-2 pr-2 font-medium">Ingresos</th>
                <th className="py-2 pr-2 font-medium">Egresos</th>
                <th className="py-2 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {porSucursal.filas.map((f) => (
                <tr key={f.sucursal} className="border-b border-panel-border/60">
                  <td className="py-2 pr-2 text-gray-200">{f.sucursal}</td>
                  <td className="py-2 pr-2 text-emerald-400">{formatoCOP.format(f.ingresos)}</td>
                  <td className="py-2 pr-2 text-red-400">{formatoCOP.format(f.egresos)}</td>
                  <td className="py-2 text-gray-200 font-semibold">{formatoCOP.format(f.balance)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 pr-2 font-semibold text-white">Total</td>
                <td className="py-2.5 pr-2 font-semibold text-emerald-400">{formatoCOP.format(porSucursal.total.ingresos)}</td>
                <td className="py-2.5 pr-2 font-semibold text-red-400">{formatoCOP.format(porSucursal.total.egresos)}</td>
                <td className="py-2.5 font-semibold text-white">{formatoCOP.format(porSucursal.total.balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
          balanceEsPositivo ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'
        }`}
      >
        {balanceEsPositivo ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        <span>
          El balance general muestra un resultado {balanceEsPositivo ? 'positivo' : 'negativo'} del 18% en comparación con el periodo anterior.
        </span>
      </div>
    </div>
  )
}