import { useMemo, useState } from 'react'
import { BarChart2, ShoppingCart, Package, DollarSign, Store, Users, ArrowDownCircle, ArrowUpCircle, Wallet, FileText } from 'lucide-react'
import StatCard from '../components/StatCard'
import BotonExportarPDF from '../components/BotonExportarPDF'
import {
  facturasCompletas as facturasPorDefecto,
  egresosFinancieros as egresosPorDefecto,
  calcularTotalesFactura,
} from '../data/mockData'
import { parseFecha } from '../utils/fecha'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const reportes = [
  { titulo: 'Reporte de ventas', desc: 'Ventas por fecha, producto, cliente y vendedor.', icon: ShoppingCart, page: 'reporte-ventas' },
  { titulo: 'Reporte de inventario', desc: 'Stock, movimientos y productos.', icon: Package, page: 'reporte-inventario' },
  { titulo: 'Reporte financiero', desc: 'Ingresos, egresos y balance general.', icon: DollarSign, page: 'reporte-financiero' },
  { titulo: 'Reporte por sucursal', desc: 'Comparativo entre sucursales.', icon: Store, page: 'reporte-sucursal' },
  { titulo: 'Reporte de empleados', desc: 'Productividad y movimientos del personal.', icon: Users, page: 'reporte-empleados' },
  { titulo: 'Reporte consolidado', desc: 'Resumen general de toda la ferretería.', icon: BarChart2, page: 'reporte-consolidado' },
]

const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

// TEMPORAL-BACKEND: como los datos de ejemplo están en septiembre de 2026, el
// periodo se calcula contra la fecha MÁS RECIENTE de los datos y no contra "hoy".
// Con backend real, usar la fecha actual (new Date()) y pedir al servidor solo
// las facturas/egresos del rango.
function calcularRango(periodo, referencia) {
  const fin = new Date(referencia)
  let inicio
  if (periodo === 'Últimos 7 días') inicio = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() - 6)
  else if (periodo === 'Últimos 30 días') inicio = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() - 29)
  else if (periodo === 'Este mes') inicio = new Date(fin.getFullYear(), fin.getMonth(), 1)
  else inicio = new Date(fin.getFullYear(), 0, 1)
  return { inicio, fin }
}

export default function Reportes({ onNavigate, facturas = facturasPorDefecto, egresos = egresosPorDefecto }) {
  const [sucursal, setSucursal] = useState('Todas')
  const [periodo, setPeriodo] = useState('Últimos 7 días')
  const [generado, setGenerado] = useState(null) // { sucursal, periodo }

  const reporte = useMemo(() => {
    if (!generado) return null
    const fechas = [...facturas.map((f) => parseFecha(f.fecha)), ...egresos.map((e) => parseFecha(e.fecha))]
    const referencia = fechas.length ? new Date(Math.max(...fechas)) : new Date()
    const { inicio, fin } = calcularRango(generado.periodo, referencia)
    const enRango = (fechaStr) => {
      const f = parseFecha(fechaStr)
      return f >= inicio && f <= fin
    }
    const deSucursal = (s) => generado.sucursal === 'Todas' || s === generado.sucursal

    const facturasRango = facturas
      .filter((f) => enRango(f.fecha) && deSucursal(f.sucursal))
      .map((f) => ({ ...f, total: calcularTotalesFactura(f).total }))
    const pagadas = facturasRango.filter((f) => f.estado === 'Pagada')
    const egresosRango = egresos.filter((e) => enRango(e.fecha) && deSucursal(e.sucursal))

    const ingresos = pagadas.reduce((a, f) => a + f.total, 0)
    const totalEgresos = egresosRango.reduce((a, e) => a + e.monto, 0)
    return {
      inicio, fin, facturasRango, pagadas: pagadas.length,
      ingresos, egresos: totalEgresos, balance: ingresos - totalEgresos,
      cantidadEgresos: egresosRango.length,
    }
  }, [generado, facturas, egresos])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 print:hidden">
        <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
          <BarChart2 size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Reportes</h1>
          <p className="text-sm text-gray-500">Consulta y genera reportes del sistema.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 print:hidden">
        {reportes.map(({ titulo, desc, icon: Icon, page }) => (
          <button
            key={page}
            onClick={() => onNavigate?.(page)}
            className="text-left bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3 hover:border-brand-yellow/50 hover:bg-white/5 transition"
          >
            <span className="h-9 w-9 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center">
              <Icon size={18} />
            </span>
            <div>
              <p className="font-semibold text-white text-sm">{titulo}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Sucursal
          <select
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
            className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none min-w-[160px]"
          >
            <option>Todas</option>
            <option>La Chinita</option>
            <option>Buenavista</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Periodo
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none min-w-[160px]"
          >
            <option>Últimos 7 días</option>
            <option>Últimos 30 días</option>
            <option>Este mes</option>
            <option>Este año</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setGenerado({ sucursal, periodo })}
          title="Genera el reporte con estos filtros"
          className="ml-auto flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-5 py-2.5 hover:brightness-95 transition uppercase tracking-wide"
        >
          <FileText size={16} /> Generar reporte
        </button>
      </div>

      {reporte && (
        <div className="print-area flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Reporte general · {generado.sucursal === 'Todas' ? 'Todas las sucursales' : generado.sucursal}</h2>
              <p className="text-sm text-gray-500">{generado.periodo}: {fmt(reporte.inicio)} a {fmt(reporte.fin)}</p>
            </div>
            <BotonExportarPDF />
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={ShoppingCart} label="Facturas del periodo" value={reporte.facturasRango.length} footer={`${reporte.pagadas} pagadas`} />
            <StatCard icon={ArrowDownCircle} label="Ingresos (pagadas)" value={formatoCOP.format(reporte.ingresos)} accent="green" />
            <StatCard icon={ArrowUpCircle} label="Egresos" value={formatoCOP.format(reporte.egresos)} footer={`${reporte.cantidadEgresos} movimientos`} accent="red" />
            <StatCard icon={Wallet} label="Balance" value={formatoCOP.format(reporte.balance)} accent="blue" />
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
            <p className="px-4 pt-4 pb-1 font-semibold text-white text-sm">Facturas del periodo</p>
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-2.5 px-4 font-medium">Factura</th>
                  <th className="py-2.5 pr-2 font-medium">Fecha</th>
                  <th className="py-2.5 pr-2 font-medium">Sucursal</th>
                  <th className="py-2.5 pr-2 font-medium">Cliente</th>
                  <th className="py-2.5 pr-2 font-medium">Estado</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {reporte.facturasRango.map((f) => (
                  <tr key={f.numero} className="border-b border-panel-border/60 last:border-0">
                    <td className="py-2.5 px-4 text-gray-200">#{f.numero}</td>
                    <td className="py-2.5 pr-2 text-gray-300">{f.fecha}</td>
                    <td className="py-2.5 pr-2 text-gray-400">{f.sucursal}</td>
                    <td className="py-2.5 pr-2 text-gray-300">{f.cliente}</td>
                    <td className="py-2.5 pr-2 text-gray-300">{f.estado}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-white">{formatoCOP.format(f.total)}</td>
                  </tr>
                ))}
                {reporte.facturasRango.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">No hay facturas en este periodo y sucursal.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
