import { useState } from 'react'
import { ArrowLeft, UserRound, Pencil, Save, X } from 'lucide-react'
import { modulosSistema, asistencia } from '../data/mockData'

const CARGOS = ['Vendedor', 'Cajero', 'Bodega', 'Administrador']
const ROLES_SISTEMA = ['Administrador', 'Cajero', 'Vendedor', 'Bodeguero']

// Vista de un empleado: por defecto solo lectura, con un botón "Editar"
// que activa el formulario en el sitio (no navega a otra pantalla). Al
// entrar desde el lápiz de la lista, `edicionInicial` llega en true.
export default function DetalleEmpleado({ empleado, edicionInicial = false, onVolver, onGuardar }) {
  const [editando, setEditando] = useState(edicionInicial)
  const [form, setForm] = useState({ ...empleado })

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function handleGuardar(e) {
    e.preventDefault()
    onGuardar(form)
    setEditando(false)
  }

  function cancelarEdicion() {
    setForm({ ...empleado })
    setEditando(false)
  }

  const asistenciaReciente = asistencia.filter((a) => a.empleado === empleado.nombre).slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <UserRound size={20} />
          </span>
          <div>
            <button onClick={onVolver} className="flex items-center gap-1.5 text-xs text-brand-yellow hover:underline w-fit mb-1">
              <ArrowLeft size={13} /> Volver a empleados
            </button>
            <h1 className="text-xl font-bold text-white">{empleado.nombre}</h1>
            <p className="text-sm text-gray-500">{empleado.cargo} · {empleado.sucursal}</p>
          </div>
        </div>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition"
          >
            <Pencil size={15} /> Editar
          </button>
        )}
      </div>

      <form onSubmit={handleGuardar} className="grid lg:grid-cols-3 gap-4">
        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Información personal</p>
          <Campo label="Nombre completo" value={form.nombre} editando={editando} onChange={(v) => actualizar('nombre', v)} />
          <Campo label="Cédula" value={form.cedula} editando={editando} onChange={(v) => actualizar('cedula', v)} />
          <Campo label="Teléfono" value={form.telefono} editando={editando} onChange={(v) => actualizar('telefono', v)} />
          <Campo label="Correo electrónico" value={form.correo} editando={editando} onChange={(v) => actualizar('correo', v)} type="email" />
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Información laboral</p>
          <Selector label="Cargo" value={form.cargo} editando={editando} onChange={(v) => actualizar('cargo', v)} opciones={CARGOS} />
          <Selector label="Sucursal" value={form.sucursal} editando={editando} onChange={(v) => actualizar('sucursal', v)} opciones={['La Chinita', 'Buenavista']} />
          <Selector label="Rol en el sistema" value={form.rolSistema} editando={editando} onChange={(v) => actualizar('rolSistema', v)} opciones={ROLES_SISTEMA} />
          <Campo label="Fecha de ingreso" value={form.fechaIngreso} editando={false} onChange={() => {}} />
          <div className="flex flex-col gap-1 text-xs text-gray-400">
            Estado
            {editando ? (
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
            ) : (
              <span className={`w-fit text-xs font-semibold px-2.5 py-1 rounded-full ${form.estado === 'Activo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {form.estado}
              </span>
            )}
          </div>
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Asistencia reciente</p>
          {asistenciaReciente.length === 0 && <p className="text-xs text-gray-500">Sin registros de asistencia.</p>}
          {asistenciaReciente.map((a, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-300">{a.fecha}</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full ${a.estado === 'Presente' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {a.estado}
              </span>
            </div>
          ))}
        </div>

        {editando && (
          <div className="lg:col-span-3 flex items-center gap-3">
            <button type="submit" className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-5 py-2.5 hover:brightness-95 transition">
              <Save size={16} /> Guardar cambios
            </button>
            <button type="button" onClick={cancelarEdicion} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-4 py-2.5">
              <X size={15} /> Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

function Campo({ label, value, editando, onChange, type = 'text' }) {
  if (!editando) {
    return (
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200">{value || '-'}</p>
      </div>
    )
  }
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
      />
    </label>
  )
}

function Selector({ label, value, editando, onChange, opciones }) {
  if (!editando) {
    return (
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200">{value || '-'}</p>
      </div>
    )
  }
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
        {opciones.map((op) => (
          <option key={op}>{op}</option>
        ))}
      </select>
    </label>
  )
}