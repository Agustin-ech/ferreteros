import { useMemo, useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { BarChart2, ShoppingCart, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react'
import StatCard from '../components/StatCard'
import BotonExportarPDF from '../components/BotonExportarPDF'
import {
  facturasCompletas as facturasPorDefecto,
  egresosFinancieros as egresosPorDefecto,
  calcularIngresosFinancieros,
  productosInventario,
  calcularTotalesFactura,
} from '../data/mockData'
import { parseFecha } from '../utils/fecha'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const SUCURSALES = ['La Chinita', 'Buenavista']
const COLORES_DISTRIBUCION = ['#F2B01E', '#6B7280', '#374151']

export default function ReporteConsolidado({ facturas = facturasPorDefecto, egresos: egresosFinancieros = egresosPorDefecto }) {
  const ingresosFinancieros = useMemo(() => calcularIngresosFinancieros(facturas), [facturas])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [modulo, setModulo] = useState('Todos los módulos')

  const dentroDelPeriodo = (fechaStr) => {
    const f = parseFecha(fechaStr)
    if (desde && f < new Date(desde)) return false
    if (hasta && f > new Date(hasta)) return false
    return true
  }

  const ventasFiltradas = useMemo(
    () => facturas.filter((f) => f.estado === 'Pagada' && dentroDelPeriodo(f.fecha)).map((f) => ({ ...f, total: calcularTotalesFactura(f).total })),
    [facturas, desde, hasta]
  )
  const ingresosFiltrados = useMemo(() => ingresosFinancieros.filter((m) => dentroDelPeriodo(m.fecha)), [ingresosFinancieros, desde, hasta])
  const egresosFiltrados = useMemo(() => egresosFinancieros.filter((m) => dentroDelPeriodo(m.fecha)), [egresosFinancieros, desde, hasta])

  const totalVentas = ventasFiltradas.reduce((a, f) => a + f.total, 0)
  const totalIngresos = ingresosFiltrados.reduce((a, m) => a + m.monto, 0)
  const totalEgresos = egresosFiltrados.reduce((a, m) => a + m.monto, 0)
  const balance = totalIngresos - totalEgresos

  const porSucursal = useMemo(
    () =>
      SUCURSALES.map((s) => {
        const claveInventario = s === 'La Chinita' ? 'laChinita' : 'buenaVista'
        const ventas = ventasFiltradas.filter((f) => f.sucursal === s).reduce((a, f) => a + f.total, 0)
        const ingresos = ingresosFiltrados.filter((m) => m.sucursal === s).reduce((a, m) => a + m.monto, 0)
        const egresos = egresosFiltrados.filter((m) => m.sucursal === s).reduce((a, m) => a + m.monto, 0)
        const inventario = productosInventario.reduce((a, p) => a + p.precio * p[claveInventario], 0)
        return { sucursal: s, ventas, inventario, balance: ingresos - egresos }
      }),
    [ventasFiltradas, ingresosFiltrados, egresosFiltrados]
  )
  const totales = porSucursal.reduce(
    (acc, s) => ({ ventas: acc.ventas + s.ventas, inventario: acc.inventario + s.inventario, balance: acc.balance + s.balance }),
    { ventas: 0, inventario: 0, balance: 0 }
  )

  // Desglose ilustrativo (no hay categorías de ingreso más allá de "Venta"
  // en los datos de ejemplo todavía).
  const distribucion = [
    { name: 'Ventas', value: 78 },
    { name: 'Servicios', value: 12 },
    { name: 'Otros', value: 10 },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <BarChart2 size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Reporte consolidado</h1>
            <p className="text-sm text-gray-500">Resumen general de toda la ferretería.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-panel-card border border-panel-border rounded-lg px-3 py-2">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-transparent text-sm text-gray-300 outline-none" />
            <span className="text-gray-500 text-sm">–</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-transparent text-sm text-gray-300 outline-none" />
          </div>
          <select value={modulo} onChange={(e) => setModulo(e.target.value)} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
            <option>Todos los módulos</option>
            <option>Ventas</option>
            <option>Inventario</option>
            <option>Finanzas</option>
          </select>
        </div>
      </div>

      <div className="print-area flex flex-col gap-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={ShoppingCart} label="Ventas" value={formatoCOP.format(totalVentas)} footer="+9% vs. periodo anterior" />
          <StatCard icon={ArrowDownCircle} label="Ingresos" value={formatoCOP.format(totalIngresos)} footer="+12% vs. periodo anterior" />
          <StatCard icon={ArrowUpCircle} label="Egresos" value={formatoCOP.format(totalEgresos)} footer="-5% vs. periodo anterior" />
          <StatCard icon={Wallet} label="Balance" value={formatoCOP.format(balance)} footer="+18% vs. periodo anterior" accent="green" />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
          <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
            <p className="px-4 pt-4 pb-1 font-semibold text-white text-sm">Resumen por sucursal</p>
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-2.5 px-4 font-medium">Sucursal</th>
                  <th className="py-2.5 pr-2 font-medium text-right">Ventas</th>
                  <th className="py-2.5 pr-2 font-medium text-right">Inventario</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {porSucursal.map((s) => (
                  <tr key={s.sucursal} className="border-b border-panel-border/60">
                    <td className="py-2.5 px-4 text-gray-200">{s.sucursal}</td>
                    <td className="py-2.5 pr-2 text-right text-gray-300">{formatoCOP.format(s.ventas)}</td>
                    <td className="py-2.5 pr-2 text-right text-gray-300">{formatoCOP.format(s.inventario)}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-white">{formatoCOP.format(s.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Total</td>
                  <td className="py-3 pr-2 text-right font-semibold text-white">{formatoCOP.format(totales.ventas)}</td>
                  <td className="py-3 pr-2 text-right font-semibold text-white">{formatoCOP.format(totales.inventario)}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-white">{formatoCOP.format(totales.balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl p-4">
            <p className="font-semibold text-white text-sm mb-3">Distribución de ingresos</p>
            <div className="flex items-center gap-4">
              <div className="relative h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribucion} dataKey="value" innerRadius={38} outerRadius={58} startAngle={90} endAngle={-270}>
                      {distribucion.map((d, i) => (
                        <Cell key={d.name} fill={COLORES_DISTRIBUCION[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-sm font-bold text-white">{formatoCOP.format(totalIngresos)}</p>
                  <p className="text-[10px] text-gray-400">total</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                {distribucion.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-2 text-gray-300">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORES_DISTRIBUCION[i] }} />
                    {d.name} {d.value}%
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-3">
              * Desglose ilustrativo; hoy todos los ingresos vienen de ventas.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <BotonExportarPDF />
      </div>
    </div>
  )
}