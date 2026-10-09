import { Boxes } from 'lucide-react'
import { sucursales as sucursalesEjemplo } from '../data/mockData'

export default function InventoryBySucursal({ sucursales = sucursalesEjemplo }) {
  return (
    <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Boxes size={16} className="text-brand-yellow" />
          Inventario por Sucursal
        </h3>
        <button className="text-xs text-gray-500 hover:text-brand-yellow">ver más...</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sucursales.map((s) => (
          <div key={s.nombre} className="bg-panel-bg border border-panel-border rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">{s.nombre}</p>
            <p className="text-lg font-bold text-white mb-2">{s.productos} Productos</p>
            <div className="h-1.5 w-full rounded-full bg-panel-border overflow-hidden">
              <div
                className="h-full bg-brand-yellow rounded-full"
                style={{ width: `${s.porcentaje}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
