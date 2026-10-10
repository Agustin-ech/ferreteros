import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ShoppingCart, FileText, Receipt } from 'lucide-react'
import StatCard from '../components/StatCard'
import FiltroPeriodoSucursal from '../components/FiltroPeriodoSucursal'
import BotonExportarPDF from '../components/BotonExportarPDF'
import { facturasCompletas as facturasPorDefecto, calcularTotalesFactura } from '../data/mockData'
import { parseFecha } from '../utils/fecha'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatoCorto = (n) => `${Math.round(n / 1_000_000)}M`

export default function ReporteVentas({ facturas = facturasPorDefecto }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sucursal, setSucursal] = useState('Todas las sucursales')

  const dentroDelFiltro = (f) => {
    if (sucursal !== 'Todas las sucursales' && f.sucursal !== sucursal) return false
    const d = parseFecha(f.fecha)
    if (desde && d < new Date(desde)) return false
    if (hasta && d > new Date(hasta)) return false
    return true
  }

  const facturasFiltradas = useMemo(() => facturas.filter(dentroDelFiltro), [facturas, desde, hasta, sucursal])
  const pagadas = useMemo(
    () => facturasFiltradas.filter((f) => f.estado === 'Pagada').map((f) => ({ ...f, ...calcularTotalesFactura(f) })),
    [facturasFiltradas]
  )

  const totalVentas = pagadas.reduce((a, f) => a + f.total, 0)
  const ticketPromedio = pagadas.length === 0 ? 0 : Math.round(totalVentas / pagadas.length)

  const ventasPorDia = useMemo(() => {
    const fechas = [...new Set(pagadas.map((f) => f.fecha))].sort((a, b) => parseFecha(a) - parseFecha(b))
    return fechas.map((fecha) => ({
      fecha: fecha.slice(0, 5),
      ventas: pagadas.filter((f) => f.fecha === fecha).reduce((a, f) => a + f.total, 0),
    }))
  }, [pagadas])

  const productosMasVendidos = useMemo(() => {
    const conteo = {}
    pagadas.forEach((f) => {
      f.productos.forEach((p) => {
        conteo[p.nombre] = (conteo[p.nombre] ?? 0) + p.cantidad
      })
    })
    return Object.entries(conteo)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
  }, [pagadas])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <ShoppingCart size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Reporte de ventas</h1>
            <p className="text-sm text-gray-500">Consulta el comportamiento de las ventas.</p>
          </div>
        </div>
        <FiltroPeriodoSucursal desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} sucursal={sucursal} onSucursal={setSucursal} />
      </div>

      <div className="print-area flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={ShoppingCart} label="Total ventas" value={formatoCOP.format(totalVentas)} footer="+12% vs. periodo anterior" />
          <StatCard icon={FileText} label="Facturas generadas" value={facturasFiltradas.length} footer="+8% vs. periodo anterior" accent="blue" />
          <StatCard icon={Receipt} label="Ticket promedio" value={formatoCOP.format(ticketPromedio)} footer="+5% vs. periodo anterior" accent="green" />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
          <div className="bg-panel-card border border-panel-border rounded-xl p-4">
            <p className="font-semibold text-white text-sm mb-3">Ventas por día</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasPorDia}>
                  <CartesianGrid stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
                  <YAxis tickFormatter={formatoCorto} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    formatter={(value) => formatoCOP.format(value)}
                    contentStyle={{ background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Bar dataKey="ventas" fill="#F2B01E" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl p-4">
            <p className="font-semibold text-white text-sm mb-3">Productos más vendidos</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-2 font-medium">Producto</th>
                  <th className="py-2 font-medium text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {productosMasVendidos.map((p) => (
                  <tr key={p.nombre} className="border-b border-panel-border/60 last:border-0">
                    <td className="py-2 text-gray-200">{p.nombre}</td>
                    <td className="py-2 text-right text-gray-300 font-semibold">{p.cantidad}</td>
                  </tr>
                ))}
                {productosMasVendidos.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-gray-500 text-xs">
                      Sin ventas en este periodo.
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