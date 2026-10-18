import { useEffect, useState } from 'react'
import Login from './pages/Login'
import AdminApp from './AdminApp'
import BodegaApp from './bodega/BodegaApp'
import VendedorApp from './vendedor/VendedorApp'
import api from './api/client'

const ROLES_VALIDOS = ['admin', 'bodega', 'vendedor']

function normalizarRol(rol) {
  const normalizado = String(rol || '').trim().toLowerCase()
  if (normalizado === 'administrador') return 'admin'
  if (normalizado === 'bodeguero') return 'bodega'
  return normalizado
}

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)
  const [errorVerificacion, setErrorVerificacion] = useState('')
  const [mensajeSesion, setMensajeSesion] = useState('')
  const [intentoVerificacion, setIntentoVerificacion] = useState(0)

  useEffect(() => {
    const expiroSesion = () => {
      setSesion(null)
      setMensajeSesion('Tu sesión expiró. Inicia sesión nuevamente para continuar.')
      setVerificandoSesion(false)
    }
    window.addEventListener('app:session-expired', expiroSesion)

    async function verificarSesion() {
      const token = sessionStorage.getItem('access_token')
      if (!token) {
        setVerificandoSesion(false)
        return
      }

      setVerificandoSesion(true)
      setErrorVerificacion('')
      try {
        const { data } = await api.get('/api/auth/me')
        const usuario = data.usuario
        const rol = normalizarRol(usuario?.rol)
        if (!ROLES_VALIDOS.includes(rol)) {
          sessionStorage.removeItem('access_token')
          setMensajeSesion('La cuenta no tiene un rol compatible con los paneles disponibles.')
          setSesion(null)
          return
        }
        setSesion({ usuario, rol })
        setMensajeSesion('')
      } catch (error) {
        if (error.response?.status !== 401) {
          setErrorVerificacion('No se pudo verificar la sesión. Comprueba tu conexión e inténtalo de nuevo.')
        }
      } finally {
        setVerificandoSesion(false)
      }
    }

    verificarSesion()
    return () => window.removeEventListener('app:session-expired', expiroSesion)
  }, [intentoVerificacion])

  function iniciarSesion(respuesta) {
    const usuario = respuesta.usuario
    const rol = normalizarRol(usuario?.rol)
    if (!respuesta.access_token || !ROLES_VALIDOS.includes(rol)) {
      sessionStorage.removeItem('access_token')
      throw new Error('La cuenta no tiene un rol compatible con los paneles disponibles.')
    }
    sessionStorage.setItem('access_token', respuesta.access_token)
    setErrorVerificacion('')
    setMensajeSesion('')
    setSesion({ usuario, rol })
  }

  function cerrarSesion() {
    sessionStorage.removeItem('access_token')
    setSesion(null)
    setErrorVerificacion('')
    setMensajeSesion('')
  }

  if (verificandoSesion) {
    return <div className="grid min-h-screen place-items-center bg-[#141414] text-white">Verificando sesión...</div>
  }

  if (errorVerificacion) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#141414] p-4 text-white">
        <div role="alert" className="max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-200">{errorVerificacion}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={() => setIntentoVerificacion((intento) => intento + 1)} className="rounded-lg bg-[#F2B01E] px-4 py-2 text-sm font-semibold text-black">Reintentar</button>
            <button type="button" onClick={cerrarSesion} className="rounded-lg border border-white/20 px-4 py-2 text-sm">Volver al inicio</button>
          </div>
        </div>
      </div>
    )
  }

  if (sesion?.rol === 'admin') return <AdminApp onLogout={cerrarSesion} />
  if (sesion?.rol === 'bodega') return <BodegaApp onLogout={cerrarSesion} />
  if (sesion?.rol === 'vendedor') return <VendedorApp usuario={sesion.usuario} onLogout={cerrarSesion} />
  return <Login onLogin={iniciarSesion} mensajeSesion={mensajeSesion} />
}
