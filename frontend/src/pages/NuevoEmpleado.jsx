import { useState } from 'react'
import { UserPlus, Save } from 'lucide-react'

export default function NuevoEmpleado({
  onNavigate,
  onAgregarEmpleado,
  roles = [],
  tiposDocumento = [],
  sucursales = [],
  cargando = false,
  errorCarga = '',
}) {
  const [form, setForm] = useState({
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    numeroDocumento: '',
    idTipoDocumento: '',
    telefono: '',
    correoElectronico: '',
    idTipoUsuario: '',
    idSucursal: '',
    password: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await onAgregarEmpleado?.({
        ...form,
        idTipoDocumento: Number(form.idTipoDocumento),
        idTipoUsuario: Number(form.idTipoUsuario),
        idSucursal: form.idSucursal ? Number(form.idSucursal) : null,
      })
    } catch (err) {
      setError(err?.response?.data?.mensaje || err?.response?.data?.error || err.message || 'No se pudo guardar el empleado.')
    } finally {
      setGuardando(false)
    }
  }

  const rolSeleccionado = roles.find((rol) => String(rol.idTipoUsuario) === form.idTipoUsuario)
  const permiteSinSucursal = rolSeleccionado?.nombre?.trim().toLowerCase() === 'administrador'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-yellow/15 text-brand-yellow">
          <UserPlus size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Nuevo empleado</h1>
          <p className="text-sm text-gray-500">Registra una cuenta y asígnale un rol y una sucursal.</p>
        </div>
      </div>

      {errorCarga && <MensajeError>{errorCarga}</MensajeError>}
      {error && <MensajeError>{error}</MensajeError>}
      {!cargando && (!roles.length || !tiposDocumento.length) && !errorCarga && (
        <MensajeError>Debes configurar roles y tipos de documento activos antes de registrar empleados.</MensajeError>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-panel-border bg-panel-card p-4">
          <p className="text-sm font-semibold text-white">Información personal</p>
          <Campo label="Primer nombre" value={form.primerNombre} onChange={(v) => actualizar('primerNombre', v)} required />
          <Campo label="Segundo nombre" value={form.segundoNombre} onChange={(v) => actualizar('segundoNombre', v)} />
          <Campo label="Primer apellido" value={form.primerApellido} onChange={(v) => actualizar('primerApellido', v)} required />
          <Campo label="Segundo apellido" value={form.segundoApellido} onChange={(v) => actualizar('segundoApellido', v)} />
          <Selector
            label="Tipo de documento"
            value={form.idTipoDocumento}
            onChange={(v) => actualizar('idTipoDocumento', v)}
            opciones={tiposDocumento.map((documento) => ({ value: documento.idTipoDocumento, label: documento.nombre }))}
            placeholder="Selecciona un tipo"
            required
          />
          <Campo label="Número de documento" value={form.numeroDocumento} onChange={(v) => actualizar('numeroDocumento', v)} maxLength={20} required />
          <Campo label="Teléfono" value={form.telefono} onChange={(v) => actualizar('telefono', v)} maxLength={20} />
          <Campo label="Correo electrónico" type="email" value={form.correoElectronico} onChange={(v) => actualizar('correoElectronico', v)} maxLength={150} required />
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-panel-border bg-panel-card p-4">
          <p className="text-sm font-semibold text-white">Acceso laboral</p>
          <Selector
            label="Rol del sistema"
            value={form.idTipoUsuario}
            onChange={(v) => actualizar('idTipoUsuario', v)}
            opciones={roles.map((rol) => ({ value: rol.idTipoUsuario, label: rol.nombre }))}
            placeholder="Selecciona un rol"
            required
          />
          <Selector
            label="Sucursal"
            value={form.idSucursal}
            onChange={(v) => actualizar('idSucursal', v)}
            opciones={sucursales.map((sucursal) => ({ value: sucursal.idSucursal, label: sucursal.nombreSucursal }))}
            placeholder={permiteSinSucursal ? 'Sin sucursal asignada' : 'Selecciona una sucursal'}
            required={!permiteSinSucursal}
          />
          <Campo
            label="Contraseña temporal (mínimo 12 caracteres)"
            type="password"
            value={form.password}
            onChange={(v) => actualizar('password', v)}
            minLength={12}
            maxLength={255}
            autoComplete="new-password"
            required
          />
          <p className="text-xs leading-relaxed text-gray-500">
            La contraseña se guarda cifrada y no podrá consultarse después. Comunícala al empleado por un canal seguro.
          </p>
        </div>

        <div className="flex items-center gap-3 lg:col-span-2">
          <button
            type="submit"
            disabled={guardando || cargando || Boolean(errorCarga) || !roles.length || !tiposDocumento.length}
            className="flex items-center gap-2 rounded-lg bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-panel-sidebar transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar empleado'}
          </button>
          <button type="button" onClick={() => onNavigate?.('empleados')} className="px-4 py-2.5 text-sm text-gray-400 hover:text-white">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

function Campo({ label, value, onChange, type = 'text', required, ...inputProps }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}{required ? ' *' : ''}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        {...inputProps}
        className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200 outline-none placeholder-gray-600"
      />
    </label>
  )
}

function Selector({ label, value, onChange, opciones, placeholder, required }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}{required ? ' *' : ''}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200 outline-none"
      >
        <option value="">{placeholder}</option>
        {opciones.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
        ))}
      </select>
    </label>
  )
}

function MensajeError({ children }) {
  return <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{children}</p>
}
