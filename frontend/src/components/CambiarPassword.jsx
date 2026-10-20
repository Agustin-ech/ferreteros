import { useState } from 'react'
import { KeyRound, X } from 'lucide-react'
import api, { errorMessage } from '../api/client'

const VACIO = { passwordActual: '', passwordNueva: '', confirmacion: '' }

// Botón + ventana para que el usuario autenticado cambie su contraseña.
export default function CambiarPassword() {
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  function cerrar() {
    setAbierto(false)
    setForm(VACIO)
    setError('')
    setExito('')
  }

  function actualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setError('')
  }

  async function guardar(evento) {
    evento.preventDefault()
    if (form.passwordNueva.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres.')
    if (form.passwordNueva !== form.confirmacion) return setError('La confirmación no coincide con la nueva contraseña.')
    setGuardando(true)
    try {
      const { data } = await api.post('/api/auth/cambiar-password', {
        passwordActual: form.passwordActual,
        passwordNueva: form.passwordNueva,
      })
      setForm(VACIO)
      setExito(data?.mensaje || 'Contraseña actualizada correctamente.')
    } catch (guardarError) {
      setError(errorMessage(guardarError, 'No se pudo cambiar la contraseña.'))
    } finally {
      setGuardando(false)
    }
  }

  const campo = 'bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand-yellow'

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Cambiar contraseña"
        className="flex items-center gap-1.5 rounded-lg border border-panel-border px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:border-brand-yellow hover:text-brand-yellow sm:px-3"
      >
        <KeyRound size={15} />
        <span className="hidden lg:inline">Contraseña</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Cambiar contraseña">
          <form onSubmit={guardar} className="w-full max-w-sm rounded-xl border border-panel-border bg-panel-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold text-white"><KeyRound size={16} className="text-brand-yellow" /> Cambiar contraseña</p>
              <button type="button" onClick={cerrar} aria-label="Cerrar" className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Contraseña actual
              <input type="password" autoComplete="current-password" required value={form.passwordActual} onChange={(e) => actualizar('passwordActual', e.target.value)} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Nueva contraseña (mínimo 8 caracteres)
              <input type="password" autoComplete="new-password" required minLength={8} value={form.passwordNueva} onChange={(e) => actualizar('passwordNueva', e.target.value)} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Confirmar nueva contraseña
              <input type="password" autoComplete="new-password" required value={form.confirmacion} onChange={(e) => actualizar('confirmacion', e.target.value)} className={campo} />
            </label>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            {exito && <p role="status" className="text-sm text-emerald-400">{exito}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={cerrar} className="px-4 py-2 text-sm text-gray-400 hover:text-white">{exito ? 'Cerrar' : 'Cancelar'}</button>
              {!exito && (
                <button type="submit" disabled={guardando} className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-panel-sidebar hover:brightness-95 disabled:opacity-50">
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </>
  )
}
