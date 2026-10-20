import { useState } from 'react'
import { ArrowLeft, ShieldCheck, Pencil, Save, X } from 'lucide-react'
import { errorMessage } from '../api/client'

// Vista de un rol: sirve para ver, editar (edicionInicial=true) o crear
// uno nuevo (esCreacion=true, arranca directo en modo edición).
export default function DetalleRol({
  rol,
  funciones = [],
  rolesDisponibles = [],
  edicionInicial = false,
  esCreacion = false,
  onVolver,
  onGuardar,
}) {
  const [editando, setEditando] = useState(edicionInicial || esCreacion)
  const [form, setForm] = useState({ ...rol })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function togglePermiso(modulo) {
    setForm((prev) => ({
      ...prev,
      permisos: prev.permisos.includes(modulo) ? prev.permisos.filter((p) => p !== modulo) : [...prev.permisos, modulo],
    }))
  }

  async function handleGuardar(e) {
    e.preventDefault()
    if (esCreacion && !form.rol) return
    setError('')
    setGuardando(true)
    try {
      await onGuardar({
        nombre: esCreacion ? form.rol : rol.nombre,
        descripcion: form.descripcion,
        idFunciones: funciones
          .filter((funcion) => form.permisos.includes(funcion.nombre))
          .map((funcion) => funcion.idFuncion),
      })
    } catch (saveError) {
      setError(errorMessage(saveError, 'No se pudo guardar el rol.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </span>
          <div>
            <button onClick={onVolver} className="flex items-center gap-1.5 text-xs text-brand-yellow hover:underline w-fit mb-1">
              <ArrowLeft size={13} /> Volver a roles
            </button>
            <h1 className="text-xl font-bold text-white">{esCreacion ? 'Nuevo rol' : rol.rol}</h1>
            <p className="text-sm text-gray-500">{esCreacion ? 'Define un nuevo rol y sus permisos.' : rol.descripcion}</p>
          </div>
        </div>
        {!editando && !esCreacion && (
          <button onClick={() => setEditando(true)} className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition">
            <Pencil size={15} /> Editar
          </button>
        )}
      </div>

      <form onSubmit={handleGuardar} className="grid lg:grid-cols-2 gap-4">
        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Información del rol</p>
          {editando ? (
            <>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Nombre del rol
                {esCreacion ? (
                  <select
                    value={form.rol}
                    onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
                    required
                    className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
                  >
                    <option value="">Selecciona un rol compatible</option>
                    {rolesDisponibles.map((opcion) => (
                      <option key={opcion.rol} value={opcion.rol}>
                        {{ admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodeguero' }[opcion.rol] || opcion.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={rol.rol}
                    disabled
                    className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none disabled:opacity-60"
                  />
                )}
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                Descripción
                <input
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
                />
              </label>
            </>
          ) : (
            <div>
              <p className="text-xs text-gray-500">Usuarios con este rol</p>
              <p className="text-sm text-gray-200">{rol.usuarios}</p>
            </div>
          )}
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <p className="font-semibold text-white text-sm">Permisos por módulo</p>
          {(rol.nombre || form.rol || '').toLowerCase().startsWith('admin') && (
            <p className="rounded-lg bg-brand-yellow/10 px-3 py-2 text-xs text-brand-yellow">
              El administrador siempre tiene acceso total; estos permisos se aplican a vendedores y bodega.
            </p>
          )}
          {funciones.map((funcion) => {
            const activo = form.permisos.includes(funcion.nombre)
            return (
              <label key={funcion.idFuncion} className="flex items-center justify-between text-sm text-gray-300">
                {funcion.nombre}
                {editando ? (
                  <button
                    type="button"
                    onClick={() => togglePermiso(funcion.nombre)}
                    className={`h-5 w-9 rounded-full transition relative shrink-0 ${activo ? 'bg-brand-yellow' : 'bg-panel-border'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${activo ? 'left-4' : 'left-0.5'}`} />
                  </button>
                ) : (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-panel-border text-gray-500'}`}>
                    {activo ? 'Sí' : 'No'}
                  </span>
                )}
              </label>
            )
          })}
        </div>

        {error && <p role="alert" className="lg:col-span-2 text-sm text-red-400">{error}</p>}
        {editando && (
          <div className="lg:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={guardando} className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-5 py-2.5 hover:brightness-95 transition disabled:opacity-50">
              <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={onVolver} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-4 py-2.5">
              <X size={15} /> Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  )
}