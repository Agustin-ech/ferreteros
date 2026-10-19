import { UserCheck, Store, Warehouse, ShieldCheck } from 'lucide-react'

// Resumen del personal activo, calculado con los empleados de /api/usuarios
// que AdminApp ya carga (cada uno trae su rol normalizado en `rol`).
export default function EmployeeSummary({ empleados = [], cargando = false, onVerEmpleados }) {
  const activos = empleados.filter((empleado) => empleado.activo)
  const contar = (rol) => activos.filter((empleado) => empleado.rol === rol).length
  const filas = [
    { label: 'Vendedores', icon: Store, total: contar('vendedor') },
    { label: 'Bodega', icon: Warehouse, total: contar('bodega') },
    { label: 'Administradores', icon: ShieldCheck, total: contar('admin') },
  ]
  const valor = (numero) => (cargando ? '…' : numero)

  return (
    <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <UserCheck size={16} className="text-brand-yellow" />
          Resumen de Empleados
        </h3>
        {onVerEmpleados && (
          <button type="button" onClick={onVerEmpleados} className="text-xs text-brand-yellow hover:underline">
            Ver todos
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-brand-yellow/15 flex items-center justify-center text-brand-yellow font-bold text-lg">
          {valor(activos.length)}
        </div>
        <div>
          <p className="text-xs text-gray-500">Personal activo</p>
          <p className="text-sm font-semibold text-white">
            {cargando ? 'Cargando...' : `${empleados.length - activos.length} inactivos`}
          </p>
        </div>
      </div>

      {filas.map(({ label, icon: Icon, total }, indice) => (
        <div
          key={label}
          className={`flex items-center justify-between text-xs ${indice === 0 ? 'pt-2 border-t border-panel-border' : ''}`}
        >
          <span className="flex items-center gap-1.5 text-gray-400">
            <Icon size={14} className="text-brand-yellow" /> {label}
          </span>
          <span className="font-semibold text-white">{valor(total)}</span>
        </div>
      ))}
    </div>
  )
}
