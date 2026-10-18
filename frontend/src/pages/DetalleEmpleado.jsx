import { useState } from 'react'
import { ArrowLeft, UserRound, Pencil, Save, X } from 'lucide-react'

export default function DetalleEmpleado({
  empleado,
  edicionInicial = false,
  onVolver,
  onGuardar,
  roles = [],
  tiposDocumento = [],
  sucursales = [],
}) {
  const [editando, setEditando] = useState(edicionInicial)
  const [form, setForm] = useState({ ...empleado })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleGuardar(event) {
    event.preventDefault()
    setError('')
    setGuardando(true)
    try {
      const actualizado = await onGuardar({
        idTipoDocumento: Number(form.idTipoDocumento),
        numeroDocumento: form.numeroDocumento,
        primerNombre: form.primerNombre,
        segundoNombre: form.segundoNombre || null,
        primerApellido: form.primerApellido,
        segundoApellido: form.segundoApellido || null,
        correoElectronico: form.correoElectronico,
        telefono: form.telefono || null,
        idTipoUsuario: Number(form.idTipoUsuario),
        idSucursal: form.idSucursal ? Number(form.idSucursal) : null,
        activo: form.estado === 'Activo',
      })
      if (actualizado) setForm(actualizado)
      setEditando(false)
    } catch (err) {
      setError(err?.response?.data?.mensaje || err?.response?.data?.error || err.message || 'No se pudieron guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  function cancelarEdicion() {
    setForm({ ...empleado })
    setError('')
    setEditando(false)
  }

  const rolSeleccionado = roles.find((rol) => Number(rol.idTipoUsuario) === Number(form.idTipoUsuario))
  const permiteSinSucursal = rolSeleccionado?.nombre?.trim().toLowerCase() === 'administrador'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-yellow/15 text-brand-yellow">
            <UserRound size={20} />
          </span>
          <div>
            <button type="button" onClick={onVolver} className="mb-1 flex w-fit items-center gap-1.5 text-xs text-brand-yellow hover:underline">
              <ArrowLeft size={13} /> Volver a empleados
            </button>
            <h1 className="text-xl font-bold text-white">{form.nombre}</h1>
            <p className="text-sm text-gray-500">{form.cargo} · {form.sucursal}</p>
          </div>
        </div>
        {!editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-panel-sidebar transition hover:brightness-95"
          >
            <Pencil size={15} /> Editar
          </button>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <form onSubmit={handleGuardar} className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-panel-border bg-panel-card p-4">
          <p className="text-sm font-semibold text-white">Información personal</p>
          <Campo label="Primer nombre" value={form.primerNombre} editando={editando} onChange={(v) => actualizar('primerNombre', v)} required />
          <Campo label="Segundo nombre" value={form.segundoNombre} editando={editando} onChange={(v) => actualizar('segundoNombre', v)} />
          <Campo label="Primer apellido" value={form.primerApellido} editando={editando} onChange={(v) => actualizar('primerApellido', v)} required />
          <Campo label="Segundo apellido" value={form.segundoApellido} editando={editando} onChange={(v) => actualizar('segundoApellido', v)} />
          <Selector
            label="Tipo de documento"
            value={form.idTipoDocumento}
            editando={editando}
            onChange={(v) => actualizar('idTipoDocumento', v)}
            opciones={tiposDocumento.map((documento) => ({ value: documento.idTipoDocumento, label: documento.nombre }))}
          />
          <Campo label="Número de documento" value={form.numeroDocumento} editando={editando} onChange={(v) => actualizar('numeroDocumento', v)} required maxLength={20} />
          <Campo label="Teléfono" value={form.telefono} editando={editando} onChange={(v) => actualizar('telefono', v)} maxLength={20} />
          <Campo label="Correo electrónico" value={form.correoElectronico} editando={editando} onChange={(v) => actualizar('correoElectronico', v)} type="email" required maxLength={150} />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-panel-border bg-panel-card p-4">
          <p className="text-sm font-semibold text-white">Acceso laboral</p>
          <Selector
            label="Rol del sistema"
            value={form.idTipoUsuario}
            editando={editando}
            onChange={(v) => actualizar('idTipoUsuario', v)}
            opciones={roles.map((rol) => ({ value: rol.idTipoUsuario, label: rol.nombre }))}
          />
          <Selector
            label="Sucursal"
            value={form.idSucursal ?? ''}
            editando={editando}
            onChange={(v) => actualizar('idSucursal', v)}
            opciones={sucursales.map((sucursal) => ({ value: sucursal.idSucursal, label: sucursal.nombreSucursal }))}
            placeholder={permiteSinSucursal ? 'Sin sucursal asignada' : undefined}
            required={!permiteSinSucursal}
          />
          <Campo label="Fecha de registro" value={form.fechaIngreso} editando={false} />
          <div className="flex flex-col gap-1 text-xs text-gray-400">
            Estado
            {editando ? (
              <select
                value={form.estado}
                onChange={(event) => actualizar('estado', event.target.value)}
                className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200 outline-none"
              >
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            ) : (
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${form.estado === 'Activo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {form.estado}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">La cuenta no guarda ni muestra la contraseña. Para cambiarla se necesita un flujo separado de restablecimiento.</p>
        </div>

        {editando && (
          <div className="flex items-center gap-3 lg:col-span-2">
            <button type="submit" disabled={guardando} className="flex items-center gap-2 rounded-lg bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-panel-sidebar transition hover:brightness-95 disabled:opacity-50">
              <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={cancelarEdicion} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white">
              <X size={15} /> Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

function Campo({ label, value, editando, onChange, type = 'text', ...inputProps }) {
  if (!editando) {
    return (
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="break-words text-sm text-gray-200">{value || '-'}</p>
      </div>
    )
  }
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      <input
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
        className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200 outline-none"
      />
    </label>
  )
}

function Selector({ label, value, editando, onChange, opciones, placeholder, required }) {
  const texto = opciones.find((opcion) => String(opcion.value) === String(value))?.label
  if (!editando) {
    return (
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200">{texto || 'Sin asignar'}</p>
      </div>
    )
  }
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200 outline-none"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {opciones.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
        ))}
      </select>
    </label>
  )
}
