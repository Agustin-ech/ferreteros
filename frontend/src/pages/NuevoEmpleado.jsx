import { useState } from 'react'
import { UserPlus, Save } from 'lucide-react'
import { modulosSistema } from '../data/mockData'

const CARGOS = ['Vendedor', 'Cajero', 'Bodega', 'Administrador']
const ROLES_SISTEMA = ['Administrador', 'Cajero', 'Vendedor', 'Bodeguero']

export default function NuevoEmpleado({ onNavigate, onAgregarEmpleado, empleados = [] }) {
  const [form, setForm] = useState({
    nombre: '', cedula: '', telefono: '', correo: '', fechaNacimiento: '',
    cargo: '', sucursal: '', rolSistema: '', fechaIngreso: '', estado: 'Activo',
  })
  const [accesos, setAccesos] = useState(Object.fromEntries(modulosSistema.map((m) => [m, true])))

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function toggleAcceso(modulo) {
    setAccesos((prev) => ({ ...prev, [modulo]: !prev[modulo] }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.cedula.trim() || !form.cargo || !form.sucursal || !form.rolSistema) return

    const siguienteId = String(
      Math.max(0, ...empleados.map((emp) => Number(emp.id) || 0)) + 1
    ).padStart(3, '0')

    onAgregarEmpleado?.({
      id: siguienteId,
      nombre: form.nombre.trim(),
      cedula: form.cedula.trim(),
      cargo: form.cargo,
      sucursal: form.sucursal,
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
      fechaIngreso: form.fechaIngreso || '-',
      rolSistema: form.rolSistema,
      estado: form.estado,
      salarioBase: 0,
      ventas: 0,
      facturas: 0,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
          <UserPlus size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Nuevo empleado</h1>
          <p className="text-sm text-gray-500">Registra un nuevo integrante del equipo.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-4">
        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Información personal</p>
          <Campo label="Nombre completo *" placeholder="Ej: María López" value={form.nombre} onChange={(v) => actualizar('nombre', v)} required />
          <Campo label="Cédula *" placeholder="Ej: 1234567890" value={form.cedula} onChange={(v) => actualizar('cedula', v)} required />
          <Campo label="Teléfono *" placeholder="Ej: 3001234567" value={form.telefono} onChange={(v) => actualizar('telefono', v)} />
          <Campo label="Correo electrónico" placeholder="Ej: correo@ejemplo.com" value={form.correo} onChange={(v) => actualizar('correo', v)} type="email" />
          <Campo label="Fecha de nacimiento" value={form.fechaNacimiento} onChange={(v) => actualizar('fechaNacimiento', v)} type="date" />
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Información laboral</p>
          <Selector label="Cargo *" value={form.cargo} onChange={(v) => actualizar('cargo', v)} opciones={CARGOS} placeholder="Selecciona un cargo" required />
          <Selector label="Sucursal *" value={form.sucursal} onChange={(v) => actualizar('sucursal', v)} opciones={['La Chinita', 'Buenavista']} placeholder="Selecciona una sucursal" required />
          <Selector label="Rol en el sistema *" value={form.rolSistema} onChange={(v) => actualizar('rolSistema', v)} opciones={ROLES_SISTEMA} placeholder="Selecciona un rol" required />
          <Campo label="Fecha de ingreso" value={form.fechaIngreso} onChange={(v) => actualizar('fechaIngreso', v)} type="date" />
          <div className="flex flex-col gap-1 text-xs text-gray-400">
            Estado
            <div className="flex gap-2">
              {['Activo', 'Inactivo'].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => actualizar('estado', op)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    form.estado === op ? 'bg-brand-yellow text-panel-sidebar' : 'bg-panel-bg border border-panel-border text-gray-300'
                  }`}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Accesos al sistema</p>
          {modulosSistema.map((modulo) => (
            <label key={modulo} className="flex items-center justify-between text-sm text-gray-300">
              {modulo}
              <button
                type="button"
                onClick={() => toggleAcceso(modulo)}
                className={`h-5 w-9 rounded-full transition relative shrink-0 ${accesos[modulo] ? 'bg-brand-yellow' : 'bg-panel-border'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${accesos[modulo] ? 'left-4' : 'left-0.5'}`} />
              </button>
            </label>
          ))}
        </div>

        <div className="lg:col-span-3 flex items-center gap-3">
          <button type="submit" className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-5 py-2.5 hover:brightness-95 transition">
            <Save size={16} /> Guardar empleado
          </button>
          <button type="button" onClick={() => onNavigate?.('empleados')} className="text-sm text-gray-400 hover:text-white px-4 py-2.5">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none"
      />
    </label>
  )
}

function Selector({ label, value, onChange, opciones, placeholder, required }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
      >
        <option value="">{placeholder}</option>
        {opciones.map((op) => (
          <option key={op}>{op}</option>
        ))}
      </select>
    </label>
  )
}