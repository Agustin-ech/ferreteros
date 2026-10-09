import { useState } from 'react'
import { Package, AlertTriangle, Wallet, Store } from 'lucide-react'
import StatCard from '../components/StatCard'
import InventoryTable from '../components/InventoryTable'
import ProductDetailPanel from '../components/ProductDetailPanel'
import { resumenInventarioGlobal } from '../data/mockData'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function InventarioGlobal() {
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white">Inventario Global</h1>
        <p className="text-sm text-gray-500">Consultar y gestionar el inventario de ambas sucursales.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Productos Totales"
          value={resumenInventarioGlobal.productosTotales.toLocaleString('es-CO')}
          footer="+12 este mes"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock Bajo"
          value={resumenInventarioGlobal.stockBajo}
          footer="Productos en mínimo"
          accent="red"
        />
        <StatCard
          icon={Wallet}
          label="Valor del Inventario"
          value={formatoCOP.format(resumenInventarioGlobal.valorInventario)}
          footer={`${resumenInventarioGlobal.variacionValor} / mes anterior`}
          accent="green"
        />
        <StatCard
          icon={Store}
          label="Sucursales"
          value={resumenInventarioGlobal.sucursales}
          footer="La Chinita / Buena Vista"
        />
      </div>

      <div className={`grid gap-4 ${productoSeleccionado ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
        <InventoryTable onSelectProduct={setProductoSeleccionado} />

        {productoSeleccionado && (
          <ProductDetailPanel
            producto={productoSeleccionado}
            onVolver={() => setProductoSeleccionado(null)}
          />
        )}
      </div>
    </div>
  )
}