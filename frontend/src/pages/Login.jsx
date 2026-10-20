import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import logo from '../assets/logo.png'
import api from '../api/client'
import { errorMessage } from '../api/client'

export default function Login({ onLogin, mensajeSesion = '' }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)

    try {
      const respuesta = await api.post('/api/auth/login', {
        usuario: usuario.trim(),
        password: clave,
      })
      onLogin(respuesta.data)
    } catch (err) {
      const mensaje = errorMessage(err, 'No se pudo iniciar sesión.')
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos.')
      } else if (err.response?.status === 403 || err.response?.status === 400) {
        setError(mensaje || 'No se pudo iniciar sesión. Revisa los datos ingresados.')
      } else if (err.response) {
        setError(mensaje || 'El servidor no pudo completar el inicio de sesión.')
      } else if (err.request) {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté iniciado.')
      } else {
        setError(err.message || 'No se pudo iniciar sesión.')
      }
    } finally {
      setEnviando(false)
    }
  }

  const campo = 'w-full rounded-md border border-black bg-[#c9d1dc] px-3 py-1.5 text-black outline-none focus:ring-2 focus:ring-[#F2B01E]'

  return (
    <div className="grid min-h-screen place-items-center bg-[#141414] p-4 sm:p-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white md:grid-cols-[1fr_auto_1fr]">
        <div className="grid place-items-center p-8 md:p-14">
          <img src={logo} alt="Ferretería Ferreteros S.A." className="w-56 max-w-full object-contain md:w-80" />
        </div>

        <div className="mx-8 h-px bg-neutral-700 md:mx-0 md:my-auto md:h-72 md:w-px" />

        <form onSubmit={enviar} className="mx-auto w-full max-w-sm space-y-5 p-8 md:p-14">
          <h1 className="text-center text-2xl font-bold text-black">Iniciar sesión</h1>

          <label className="block text-black">
            Correo o número de documento
            <input
              type="text"
              value={usuario}
              onChange={(e) => { setUsuario(e.target.value); setError('') }}
              placeholder="correo@ejemplo.com o 1234567890"
              autoComplete="username"
              required
              className={`${campo} mt-1`}
            />
          </label>

          <label className="block text-black">
            Contraseña
            {/* Único botón para ver la contraseña: el propio de Edge se oculta en index.css. */}
            <div className="relative mt-1">
              <input
                type={verClave ? 'text' : 'password'}
                value={clave}
                onChange={(e) => { setClave(e.target.value); setError('') }}
                placeholder="********"
                autoComplete="current-password"
                required
                className={`${campo} pr-10`}
              />
              <button type="button" onClick={() => setVerClave((v) => !v)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-black">
                {verClave ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {(error || mensajeSesion) && <p role="alert" className="text-sm text-red-600">{error || mensajeSesion}</p>}

          <button disabled={enviando} type="submit" className="w-full rounded-md bg-[#F2B01E] py-2 font-semibold text-black hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
            {enviando ? 'Conectando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
