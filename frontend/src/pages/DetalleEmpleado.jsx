import { useState } from 'react'
import { ArrowLeft, UserRound, Pencil, Save, X } from 'lucide-react'
import { errorMessage } from '../api/client'

// Vista de un empleado: por defecto solo lectura, con un botón "Editar"
// que activa el formulario en el sitio (no navega a otra pantalla). Al
// entrar desde el lápiz de la lista, `edicionInicial` llega en true.
const ETIQUETAS_ROL = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodeguero' }

function aFormulario(empleado) {
  return {
    ...empleado,
    idSucursal: empleado.idSucursal ? String(empleado.idSucursal) : '',
    idTipoUsuario: empleado.idTipoUsuario ? String(empleado.idTipoUsuario) : '',
  }
}

// Solo los campos que acepta PUT /api/usuarios/<id>; el backend rechaza
// cualquier campo desconocido.
function aPayload(form) {
  const payload = {
    primerNombre: form.primerNombre,
    segundoNombre: form.segundoNombre || null,
    primerApellido: form.primerApellido,
    segundoApellido: form.segundoApellido || null,
    numeroDocumento: form.cedula,
    telefono: form.telefono || null,
    correoElectronico: form.correo,
    activo: form.estado === 'Activo',
  }
  if (form.idTipoUsuario) payload.idTipoUsuario = Number(form.idTipoUsuario)
  if (form.idSucursal) payload.idSucursal = Number(form.idSucursal)
  return payload
}

export default function DetalleEmpleado({
  empleado,
  edicionInicial = false,
  sucursales = [],
  roles = [],
  onVolver,
  onGuardar,
}) {
  const [editando, setEditando] = useState(edicionInicial)
  const [form, setForm] = useState(() => aFormulario(empleado))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleGuardar(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const actualizado = await onGuardar(aPayload(form))
      if (actualizado) setForm(aFormulario(actualizado))
      setEditando(false)
    } catch (saveError) {
      setError(errorMessage(saveError, 'No se pudo guardar el empleado.'))
    } finally {
      setGuardando(false)
    }
  }

  function cancelarEdicion() {
    setForm(aFormulario(empleado))
    setError('')
    setEditando(false)
  }

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
            <h1 className="text-xl font-bold text-white">{form.nombre}</h1>
            <p className="text-sm text-gray-500">{empleado.rolSistema} · {empleado.sucursal || 'Sin sucursal'}</p>
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
          <Campo label="Primer nombre" value={form.primerNombre} editando={editando} onChange={(v) => actualizar('primerNombre', v)} />
          <Campo label="Segundo nombre" value={form.segundoNombre} editando={editando} onChange={(v) => actualizar('segundoNombre', v)} />
          <Campo label="Primer apellido" value={form.primerApellido} editando={editando} onChange={(v) => actualizar('primerApellido', v)} />
          <Campo label="Segundo apellido" value={form.segundoApellido} editando={editando} onChange={(v) => actualizar('segundoApellido', v)} />
          <Campo label="Cédula" value={form.cedula} editando={editando} onChange={(v) => actualizar('cedula', v)} />
          <Campo label="Teléfono" value={form.telefono} editando={editando} onChange={(v) => actualizar('telefono', v)} />
          <Campo label="Correo electrónico" value={form.correo} editando={editando} onChange={(v) => actualizar('correo', v)} type="email" />
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Información laboral</p>
          <Selector
            label="Sucursal"
            value={form.idSucursal}
            texto={empleado.sucursal}
            editando={editando}
            onChange={(v) => actualizar('idSucursal', v)}
            opciones={sucursales.map((item) => ({ value: String(item.idSucursal), label: item.nombreSucursal }))}
          />
          <Selector
            label="Rol en el sistema"
            value={form.idTipoUsuario}
            texto={empleado.rolSistema}
            editando={editando}
            onChange={(v) => actualizar('idTipoUsuario', v)}
            opciones={roles.map((item) => ({ value: String(item.idTipoUsuario), label: ETIQUETAS_ROL[item.rol] || item.nombre }))}
          />
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
          <p className="font-semibold text-white text-sm">Funciones del rol</p>
          {(empleado.permisos || []).length === 0 && <p className="text-xs text-gray-500">Este rol no tiene funciones asignadas.</p>}
          {(empleado.permisos || []).map((permiso) => (
            <span key={permiso} className="w-fit rounded-full bg-brand-yellow/15 px-2.5 py-1 text-xs font-semibold text-brand-yellow">
              {permiso}
            </span>
          ))}
        </div>

        {error && <p role="alert" className="lg:col-span-3 text-sm text-red-400">{error}</p>}
        {editando && (
          <div className="lg:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={guardando} className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-5 py-2.5 hover:brightness-95 transition disabled:opacity-50">
              <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" disabled={guardando} onClick={cancelarEdicion} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-4 py-2.5 disabled:opacity-50">
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
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
      />
    </label>
  )
}

function Selector({ label, value, texto, editando, onChange, opciones }) {
  if (!editando) {
    return (
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200">{texto || '-'}</p>
      </div>
    )
  }
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
        {!value && <option value="">Selecciona una opción</option>}
        {opciones.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
    </label>
  )
}