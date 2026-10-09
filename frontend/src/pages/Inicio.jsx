import { Package, AlertTriangle, TrendingUp, TrendingDown, Store } from 'lucide-react'
import StatCard from '../components/StatCard'
import InventoryBySucursal from '../components/InventoryBySucursal'
import StockAlerts from '../components/StockAlerts'
import EmployeeSummary from '../components/EmployeeSummary'
import IngresosEgresosChart from '../components/IngresosEgresosChart'
import RecentInvoices from '../components/RecentInvoices'
import { resumenGeneral } from '../data/mockData'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function Inicio() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white">¡Bienvenido, Administrador!</h1>
        <p className="text-sm text-gray-500">Aquí un resumen general de la ferretería.</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={Package}
          label="Productos Totales"
          value={resumenGeneral.productosTotales.toLocaleString('es-CO')}
          footer={`${resumenGeneral.variacionIngresos} / mes`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock Bajo"
          value={resumenGeneral.stockBajo}
          footer="Productos en riesgo"
          accent="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Ingresos del Día"
          value={formatoCOP.format(resumenGeneral.ingresosDelDia)}
          footer={`${resumenGeneral.variacionIngresos} / día`}
          accent="green"
        />
        <StatCard
          icon={TrendingDown}
          label="Egresos del Día"
          value={formatoCOP.format(resumenGeneral.egresosDelDia)}
          footer="vs. día anterior"
          accent="blue"
        />
        <StatCard
          icon={Store}
          label="Sucursales"
          value={resumenGeneral.sucursales}
          footer="La Chinita / Buenavista"
        />
      </div>

      {/* Segunda fila: inventario, alertas, empleados */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <InventoryBySucursal />
        <StockAlerts />
        <EmployeeSummary />
      </div>

      {/* Tercera fila: gráfico y facturas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <IngresosEgresosChart />
        <RecentInvoices />
      </div>
    </div>
  )
}