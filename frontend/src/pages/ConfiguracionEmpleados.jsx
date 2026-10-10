import { useState } from 'react'
import { Settings, Save } from 'lucide-react'
import { modulosSistema } from '../data/mockData'

function Toggle({ activo, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`h-5 w-9 rounded-full transition relative shrink-0 ${activo ? 'bg-brand-yellow' : 'bg-panel-border'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${activo ? 'left-4' : 'left-0.5'}`} />
    </button>
  )
}

export default function ConfiguracionEmpleados() {
  const [parametros, setParametros] = useState({
    requerirAprobacion: true,
    permitirEdicion: false,
    notificarCambios: true,
    controlAsistencia: true,
  })
  const [permisosDefecto, setPermisosDefecto] = useState(
    Object.fromEntries(modulosSistema.map((m) => [m, m !== 'Configuración']))
  )

  function toggleParametro(clave) {
    setParametros((prev) => ({ ...prev, [clave]: !prev[clave] }))
  }
  function togglePermiso(modulo) {
    setPermisosDefecto((prev) => ({ ...prev, [modulo]: !prev[modulo] }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
          <Settings size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Configuración de empleados</h1>
          <p className="text-sm text-gray-500">Ajusta los parámetros generales del módulo de empleados.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-4">
          <p className="font-semibold text-white text-sm">Parámetros generales</p>
          <Fila label="Requerir aprobación para nuevos usuarios" activo={parametros.requerirAprobacion} onChange={() => toggleParametro('requerirAprobacion')} />
          <Fila label="Permitir edición de datos por el mismo usuario" activo={parametros.permitirEdicion} onChange={() => toggleParametro('permitirEdicion')} />
          <Fila label="Notificar por correo cambios de rol" activo={parametros.notificarCambios} onChange={() => toggleParametro('notificarCambios')} />
          <Fila label="Activar control de asistencia" activo={parametros.controlAsistencia} onChange={() => toggleParametro('controlAsistencia')} />
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Configuración de nómina</p>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Tipo de nómina
            <select className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none" defaultValue="Quincenal">
              <option>Quincenal</option>
              <option>Mensual</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Día de pago
            <input type="number" min="1" max="31" defaultValue={15} className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Cuenta de nómina
            <input type="text" defaultValue="Bancolombia - 1234567890" className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none" />
          </label>
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Permisos por defecto</p>
          {modulosSistema.map((modulo) => (
            <Fila key={modulo} label={modulo} activo={permisosDefecto[modulo]} onChange={() => togglePermiso(modulo)} />
          ))}
        </div>
      </div>

      <button
        type="button"
        title="Función de guardar: próximamente"
        className="self-start flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-5 py-2.5 hover:brightness-95 transition"
      >
        <Save size={16} /> Guardar cambios
      </button>
    </div>
  )
}

function Fila({ label, activo, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-gray-300">
      <span>{label}</span>
      <Toggle activo={activo} onChange={onChange} />
    </div>
  )
}