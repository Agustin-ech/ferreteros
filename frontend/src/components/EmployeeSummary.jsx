import { UserCheck, Store, Warehouse } from 'lucide-react'

export default function EmployeeSummary() {
  return (
    <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <UserCheck size={16} className="text-brand-yellow" />
          Resumen de Empleados
        </h3>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-brand-yellow/15 flex items-center justify-center text-brand-yellow font-bold text-lg">
          —
        </div>
        <div>
          <p className="text-xs text-gray-500">Personal</p>
          <p className="text-sm font-semibold text-white">Sin datos disponibles</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t border-panel-border">
        <span className="flex items-center gap-1.5 text-gray-400">
          <Store size={14} className="text-brand-yellow" /> Vendedores
        </span>
        <span className="font-semibold text-white">—</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-gray-400">
          <Warehouse size={14} className="text-brand-yellow" /> Bodega
        </span>
        <span className="font-semibold text-white">—</span>
      </div>

      <p className="text-xs text-gray-500">El backend no ofrece un resumen de empleados activos.</p>
    </div>
  )
}
