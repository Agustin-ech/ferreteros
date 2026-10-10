import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { Store } from 'lucide-react'
import StatCard from '../components/StatCard'
import BotonExportarPDF from '../components/BotonExportarPDF'
import {
  facturasCompletas as facturasPorDefecto,
  egresosFinancieros as egresosPorDefecto,
  calcularIngresosFinancieros,
  calcularTotalesFactura,
} from '../data/mockData'
import { parseFecha } from '../utils/fecha'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatoCorto = (n) => `${Math.round(n / 1_000_000)}M`
const SUCURSALES = ['La Chinita', 'Buenavista']

// Según la métrica elegida, arma una lista plana de { fecha, sucursal, monto }
// para poder agrupar por fecha y por sucursal de la misma manera.
function movimientosPorMetrica(metrica, facturas, ingresos, egresos) {
  if (metrica === 'Ventas') {
    return facturas
      .filter((f) => f.estado === 'Pagada')
      .map((f) => ({ fecha: f.fecha, sucursal: f.sucursal, monto: calcularTotalesFactura(f).total }))
  }
  if (metrica === 'Ingresos') {
    return ingresos.map((m) => ({ fecha: m.fecha, sucursal: m.sucursal, monto: m.monto }))
  }
  return egresos.map((m) => ({ fecha: m.fecha, sucursal: m.sucursal, monto: m.monto }))
}

export default function ReporteSucursal({ facturas = facturasPorDefecto, egresos: egresosFinancieros = egresosPorDefecto }) {
  const ingresosFinancieros = useMemo(() => calcularIngresosFinancieros(facturas), [facturas])
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [metrica, setMetrica] = useState('Ventas')

  const movimientos = useMemo(() => {
    let filas = movimientosPorMetrica(metrica, facturas, ingresosFinancieros, egresosFinancieros)
    if (desde) filas = filas.filter((m) => parseFecha(m.fecha) >= new Date(desde))
    if (hasta) filas = filas.filter((m) => parseFecha(m.fecha) <= new Date(hasta))
    return filas
  }, [metrica, facturas, ingresosFinancieros, egresosFinancieros, desde, hasta])

  const porSucursal = useMemo(
    () =>
      SUCURSALES.map((s) => ({
        sucursal: s,
        total: movimientos.filter((m) => m.sucursal === s).reduce((a, m) => a + m.monto, 0),
      })),
    [movimientos]
  )
  const totalGeneral = porSucursal.reduce((a, s) => a + s.total, 0) || 1

  const datosGrafica = useMemo(() => {
    const fechas = [...new Set(movimientos.map((m) => m.fecha))].sort((a, b) => parseFecha(a) - parseFecha(b))
    return fechas.map((fecha) => ({
      fecha: fecha.slice(0, 5),
      'La Chinita': movimientos.filter((m) => m.fecha === fecha && m.sucursal === 'La Chinita').reduce((a, m) => a + m.monto, 0),
      Buenavista: movimientos.filter((m) => m.fecha === fecha && m.sucursal === 'Buenavista').reduce((a, m) => a + m.monto, 0),
    }))
  }, [movimientos])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <Store size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Reporte por sucursal</h1>
            <p className="text-sm text-gray-500">Compara el rendimiento entre las sucursales.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-panel-card border border-panel-border rounded-lg px-3 py-2">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-transparent text-sm text-gray-300 outline-none" />
            <span className="text-gray-500 text-sm">–</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-transparent text-sm text-gray-300 outline-none" />
          </div>
          <select value={metrica} onChange={(e) => setMetrica(e.target.value)} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
            <option>Ventas</option>
            <option>Ingresos</option>
            <option>Egresos</option>
          </select>
        </div>
      </div>

      <div className="print-area flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {porSucursal.map((s) => (
            <StatCard key={s.sucursal} icon={Store} label={s.sucursal} value={formatoCOP.format(s.total)} footer="+10% vs. periodo anterior" />
          ))}
          <StatCard icon={Store} label={`Total general (${metrica})`} value={formatoCOP.format(totalGeneral)} footer="-9% vs. periodo anterior" accent="green" />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
          <div className="bg-panel-card border border-panel-border rounded-xl p-4">
            <p className="font-semibold text-white text-sm mb-3">{metrica} por sucursal</p>
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
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="La Chinita" fill="#F2B01E" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Buenavista" fill="#6B7280" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl p-4">
            <p className="font-semibold text-white text-sm mb-3">Comparativo de sucursales</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-2 font-medium">Sucursal</th>
                  <th className="py-2 font-medium text-right">{metrica}</th>
                  <th className="py-2 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {porSucursal.map((s) => (
                  <tr key={s.sucursal} className="border-b border-panel-border/60">
                    <td className="py-2 text-gray-200">{s.sucursal}</td>
                    <td className="py-2 text-right text-gray-300">{formatoCOP.format(s.total)}</td>
                    <td className="py-2 text-right text-gray-400">{Math.round((s.total / totalGeneral) * 100)}%</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2.5 font-semibold text-white">Total</td>
                  <td className="py-2.5 text-right font-semibold text-white">{formatoCOP.format(totalGeneral)}</td>
                  <td className="py-2.5 text-right font-semibold text-white">100%</td>
                </tr>
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