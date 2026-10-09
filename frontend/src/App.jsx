import { useEffect, useState } from 'react'
import Login from './pages/Login'
import AdminApp from './AdminApp'
import BodegaApp from './bodega/BodegaApp'
import VendedorApp from './vendedor/VendedorApp'
import api from './api/client'

const ROLES_VALIDOS = ['admin', 'bodega', 'vendedor']

function normalizarRol(rol) {
  const normalizado = String(rol || '').trim().toLowerCase()
  if (normalizado === 'bodeguero') return 'bodega'
  return normalizado
}

export default function App() {
  const [sesion, setSesion] = useState(null)
  const [verificandoSesion, setVerificandoSesion] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('access_token')
    if (!token) {
      setVerificandoSesion(false)
      return
    }

    api.get('/api/auth/me')
      .then(({ data }) => {
        const usuario = data.usuario
        const rol = normalizarRol(usuario?.rol)
        if (!ROLES_VALIDOS.includes(rol)) throw new Error('Rol sin panel asignado')
        setSesion({ usuario, rol })
      })
      .catch(() => sessionStorage.removeItem('access_token'))
      .finally(() => setVerificandoSesion(false))
  }, [])

  function iniciarSesion(respuesta) {
    const usuario = respuesta.usuario
    const rol = normalizarRol(usuario?.rol)
    if (!respuesta.access_token || !ROLES_VALIDOS.includes(rol)) {
      sessionStorage.removeItem('access_token')
      throw new Error('La cuenta no tiene un rol compatible con los paneles disponibles.')
    }
    sessionStorage.setItem('access_token', respuesta.access_token)
    setSesion({ usuario, rol })
  }

  function cerrarSesion() {
    sessionStorage.removeItem('access_token')
    setSesion(null)
  }

  if (verificandoSesion) {
    return <div className="grid min-h-screen place-items-center bg-[#141414] text-white">Verificando sesión...</div>
  }

  if (sesion?.rol === 'admin') return <AdminApp onLogout={cerrarSesion} />
  if (sesion?.rol === 'bodega') return <BodegaApp onLogout={cerrarSesion} />
  if (sesion?.rol === 'vendedor') return <VendedorApp onLogout={cerrarSesion} />
  return <Login onLogin={iniciarSesion} />
}
