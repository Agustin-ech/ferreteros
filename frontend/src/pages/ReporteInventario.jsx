import { useMemo, useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Package, AlertTriangle } from 'lucide-react'
import StatCard from '../components/StatCard'
import FiltroPeriodoSucursal from '../components/FiltroPeriodoSucursal'
import BotonExportarPDF from '../components/BotonExportarPDF'
import { productosInventario, historialAjustesEjemplo } from '../data/mockData'
import { parseFecha } from '../utils/fecha'

function getEstado(total) {
  if (total === 0) return 'Agotado'
  if (total <= 15) return 'Stock Bajo'
  return 'Stock Alto'
}

const COLORES = { 'Stock Alto': '#10B981', 'Stock Bajo': '#F2B01E', Agotado: '#EF4444' }

export default function ReporteInventario() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sucursal, setSucursal] = useState('Todas las sucursales')

  // Cada producto cuenta una vez por sucursal (o solo la elegida, si hay filtro).
  const estados = useMemo(() => {
    const claves = sucursal === 'Todas las sucursales' ? ['laChinita', 'buenaVista'] : [sucursal === 'La Chinita' ? 'laChinita' : 'buenaVista']
    return productosInventario.flatMap((p) => claves.map((c) => getEstado(p[c])))
  }, [sucursal])

  const totalProductos = productosInventario.length
  const stockAlto = estados.filter((e) => e === 'Stock Alto').length
  const stockBajo = estados.filter((e) => e === 'Stock Bajo').length
  const agotados = estados.filter((e) => e === 'Agotado').length

  const datosDona = [
    { name: 'En stock', estado: 'Stock Alto', value: stockAlto },
    { name: 'Stock bajo', estado: 'Stock Bajo', value: stockBajo },
    { name: 'Agotados', estado: 'Agotado', value: agotados },
  ]
  const totalEstados = stockAlto + stockBajo + agotados || 1

  const movimientos = useMemo(() => {
    let filas = historialAjustesEjemplo
    if (sucursal !== 'Todas las sucursales') filas = filas.filter((m) => m.sucursal === sucursal)
    if (desde) filas = filas.filter((m) => parseFecha(m.fecha) >= new Date(desde))
    if (hasta) filas = filas.filter((m) => parseFecha(m.fecha) <= new Date(hasta))
    return filas.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha)).slice(0, 8)
  }, [desde, hasta, sucursal])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <Package size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Reporte de inventario</h1>
            <p className="text-sm text-gray-500">Consulta el estado del inventario y movimientos de las sucursales.</p>
          </div>
        </div>
        <FiltroPeriodoSucursal desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} sucursal={sucursal} onSucursal={setSucursal} />
      </div>

      <div className="print-area flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={Package} label="Total productos" value={totalProductos.toLocaleString('es-CO')} footer="Catálogo activo" />
          <StatCard icon={AlertTriangle} label="Stock bajo o agotando" value={stockBajo + agotados} footer="Requiere reposición" accent="red" />
        </div>

        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
          <div className="bg-panel-card border border-panel-border rounded-xl p-4">
            <p className="font-semibold text-white text-sm mb-3">Estado del stock</p>
            <div className="flex items-center gap-4">
              <div className="relative h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={datosDona} dataKey="value" innerRadius={38} outerRadius={58} startAngle={90} endAngle={-270}>
                      {datosDona.map((d) => (
                        <Cell key={d.estado} fill={COLORES[d.estado]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-sm font-bold text-white">{totalProductos}</p>
                  <p className="text-[10px] text-gray-400">productos</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                {datosDona.map((d) => (
                  <span key={d.estado} className="flex items-center gap-2 text-gray-300">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORES[d.estado] }} />
                    {d.name} {Math.round((d.value / totalEstados) * 100)}% ({d.value})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
            <p className="px-4 pt-4 pb-1 font-semibold text-white text-sm">Movimientos recientes</p>
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-2.5 px-4 font-medium">Fecha</th>
                  <th className="py-2.5 pr-2 font-medium">Producto</th>
                  <th className="py-2.5 pr-2 font-medium">Sucursal</th>
                  <th className="py-2.5 pr-4 font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m, i) => (
                  <tr key={i} className="border-b border-panel-border/60 last:border-0">
                    <td className="py-2.5 px-4 text-gray-300 whitespace-nowrap">{m.fecha}</td>
                    <td className="py-2.5 pr-2 text-gray-200">{m.producto}</td>
                    <td className="py-2.5 pr-2 text-gray-400 whitespace-nowrap">{m.sucursal}</td>
                    <td className={`py-2.5 pr-4 font-semibold ${m.cantidad > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
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