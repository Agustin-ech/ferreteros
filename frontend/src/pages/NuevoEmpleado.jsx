import { useState } from 'react'
import { UserPlus, Save } from 'lucide-react'
import { errorMessage } from '../api/client'

const ETIQUETAS_ROL = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodeguero' }
const FORMULARIO_VACIO = {
  idTipoDocumento: '',
  numeroDocumento: '',
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  correoElectronico: '',
  telefono: '',
  idSucursal: '',
  idTipoUsuario: '',
  password: '',
}

export default function NuevoEmpleado({
  onNavigate,
  onAgregarEmpleado,
  catalogosPersonal = {},
  roles = [],
  cargandoPersonal = false,
}) {
  const [form, setForm] = useState(FORMULARIO_VACIO)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const rolSeleccionado = roles.find((rol) => rol.idTipoUsuario === Number(form.idTipoUsuario))

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await onAgregarEmpleado?.({
        ...form,
        idTipoDocumento: Number(form.idTipoDocumento),
        idTipoUsuario: Number(form.idTipoUsuario),
        idSucursal: Number(form.idSucursal),
      })
      setForm(FORMULARIO_VACIO)
    } catch (submitError) {
      setError(errorMessage(submitError, 'No se pudo registrar el empleado.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
          <UserPlus size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Nuevo empleado</h1>
          <p className="text-sm text-gray-500">Registra una cuenta de usuario y asígnale sucursal y rol.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-4">
        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Información personal</p>
          <Selector
            label="Tipo de documento *"
            value={form.idTipoDocumento}
            onChange={(value) => actualizar('idTipoDocumento', value)}
            opciones={(catalogosPersonal.tiposDocumento || []).map((tipo) => ({
              value: tipo.idTipoDocumento,
              label: `${tipo.acronimo} · ${tipo.nombre}`,
            }))}
            required
          />
          <Campo label="Número de documento *" value={form.numeroDocumento} onChange={(value) => actualizar('numeroDocumento', value)} required />
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo label="Primer nombre *" value={form.primerNombre} onChange={(value) => actualizar('primerNombre', value)} required />
            <Campo label="Segundo nombre" value={form.segundoNombre} onChange={(value) => actualizar('segundoNombre', value)} />
            <Campo label="Primer apellido *" value={form.primerApellido} onChange={(value) => actualizar('primerApellido', value)} required />
            <Campo label="Segundo apellido" value={form.segundoApellido} onChange={(value) => actualizar('segundoApellido', value)} />
          </div>
          <Campo label="Teléfono" value={form.telefono} onChange={(value) => actualizar('telefono', value)} />
          <Campo label="Correo electrónico *" type="email" value={form.correoElectronico} onChange={(value) => actualizar('correoElectronico', value)} required />
          <Campo label="Contraseña inicial *" type="password" minLength={8} value={form.password} onChange={(value) => actualizar('password', value)} required />
          <p className="text-xs text-gray-500">La contraseña debe tener al menos 8 caracteres. No se mostrará nuevamente.</p>
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Acceso al sistema</p>
          <Selector
            label="Sucursal *"
            value={form.idSucursal}
            onChange={(value) => actualizar('idSucursal', value)}
            opciones={(catalogosPersonal.sucursales || []).map((sucursal) => ({
              value: sucursal.idSucursal,
              label: sucursal.nombreSucursal,
            }))}
            required
          />
          <Selector
            label="Rol del sistema *"
            value={form.idTipoUsuario}
            onChange={(value) => actualizar('idTipoUsuario', value)}
            opciones={roles.map((rol) => ({
              value: rol.idTipoUsuario,
              label: ETIQUETAS_ROL[rol.rol] || rol.nombre,
            }))}
            required
          />
          <div className="rounded-lg border border-panel-border bg-panel-bg p-3">
            <p className="mb-2 text-xs font-semibold text-gray-400">Funciones incluidas en el rol</p>
            {!rolSeleccionado && <p className="text-sm text-gray-500">Selecciona un rol para consultar sus funciones.</p>}
            {rolSeleccionado && rolSeleccionado.permisos.length === 0 && (
              <p className="text-sm text-gray-500">Este rol no tiene funciones asignadas.</p>
            )}
            {rolSeleccionado?.permisos.map((permiso) => (
              <span key={permiso} className="mr-2 mb-2 inline-flex rounded-full bg-brand-yellow/15 px-2 py-1 text-xs font-semibold text-brand-yellow">
                {permiso}
              </span>
            ))}
            <p className="mt-2 text-xs text-gray-500">Los permisos se configuran en la sección Roles y permisos.</p>
          </div>
        </div>

        {error && <p role="alert" className="lg:col-span-2 text-sm text-red-400">{error}</p>}
        <div className="lg:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={guardando || cargandoPersonal || !catalogosPersonal.roles?.length || !catalogosPersonal.sucursales?.length}
            className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-5 py-2.5 hover:brightness-95 transition disabled:opacity-50"
          >
            <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar empleado'}
          </button>
          <button type="button" onClick={() => onNavigate?.('empleados')} className="text-sm text-gray-400 hover:text-white px-4 py-2.5">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

function Campo({ label, value, onChange, type = 'text', required, minLength }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        minLength={minLength}
        className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none"
      />
    </label>
  )
}

function Selector({ label, value, onChange, opciones, required }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
      >
        <option value="">Selecciona una opción</option>
        {opciones.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
        ))}
      </select>
    </label>
  )
}
