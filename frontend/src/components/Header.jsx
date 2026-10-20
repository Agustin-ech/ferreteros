import { useEffect, useState } from 'react'
import { Search, MapPin, User, LogOut } from 'lucide-react'
import api from '../api/client'
import CambiarPassword from './CambiarPassword'

export default function Header({ onLogout, onSelectProduct }) {
  const [perfil, setPerfil] = useState(null)
  const [sucursal, setSucursal] = useState('')
  const [errorPerfil, setErrorPerfil] = useState('')
  const [errorSucursal, setErrorSucursal] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [mostrarResultados, setMostrarResultados] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function cargarPerfil() {
      try {
        const { data } = await api.get('/api/auth/me')
        const usuario = data?.usuario
        if (!usuario) throw new Error('La API no devolvió los datos del usuario.')

        if (!cancelado) {
          setPerfil(usuario)
          setErrorPerfil('')
        }

        if (!usuario.idSucursal) {
          if (!cancelado) {
            setSucursal('Sin sucursal asignada')
            setErrorSucursal('')
          }
          return
        }

        try {
          const { data: datosSucursal } = await api.get(`/api/sucursales/${usuario.idSucursal}`)
          if (!cancelado) {
            setSucursal(datosSucursal?.nombreSucursal || 'Sucursal sin nombre')
            setErrorSucursal('')
          }
        } catch (error) {
          if (!cancelado) {
            setSucursal('')
            setErrorSucursal(
              error?.response?.data?.mensaje
              || error?.response?.data?.error
              || 'No se pudo cargar la sucursal.'
            )
          }
        }
      } catch (error) {
        if (!cancelado) {
          setPerfil(null)
          setErrorPerfil(
            error?.response?.data?.mensaje
            || error?.response?.data?.error
            || error.message
            || 'No se pudo cargar la información del usuario.'
          )
        }
      }
    }

    cargarPerfil()
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    const consulta = busqueda.trim()
    if (!consulta) {
      setResultados([])
      setErrorBusqueda('')
      setBuscando(false)
      return undefined
    }

    let cancelado = false
    const temporizador = setTimeout(async () => {
      setBuscando(true)
      setErrorBusqueda('')
      try {
        const { data } = await api.get('/api/productos', { params: { q: consulta } })
        if (!cancelado) setResultados((data || []).slice(0, 8))
      } catch (error) {
        if (!cancelado) {
          setResultados([])
          setErrorBusqueda(
            error?.response?.data?.mensaje
            || error?.response?.data?.error
            || 'No se pudieron buscar productos.'
          )
        }
      } finally {
        if (!cancelado) setBuscando(false)
      }
    }, 300)

    return () => {
      cancelado = true
      clearTimeout(temporizador)
    }
  }, [busqueda])

  function seleccionarProducto(producto) {
    onSelectProduct?.(producto)
    setBusqueda('')
    setResultados([])
    setMostrarResultados(false)
  }

  function manejarTeclaBusqueda(event) {
    if (event.key === 'Escape') {
      setMostrarResultados(false)
    } else if (event.key === 'Enter' && resultados.length) {
      event.preventDefault()
      seleccionarProducto(resultados[0])
    }
  }

  const primerNombre = String(perfil?.nombre || '').trim().split(/\s+/)[0]

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-panel-border bg-panel-bg">
      <div className="relative flex-1 max-w-md">
        <div className="flex items-center gap-2 bg-panel-card border border-panel-border rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(event) => {
              setBusqueda(event.target.value)
              setResultados([])
              setErrorBusqueda('')
              setBuscando(Boolean(event.target.value.trim()))
              setMostrarResultados(true)
            }}
            onFocus={() => setMostrarResultados(true)}
            onKeyDown={manejarTeclaBusqueda}
            role="combobox"
            aria-expanded={mostrarResultados && Boolean(busqueda.trim())}
            aria-controls="resultados-busqueda-productos"
            placeholder="Buscar productos,facturas o empleados..."
            className="bg-transparent outline-none text-sm text-gray-200 placeholder-gray-500 w-full"
          />
        </div>
        {mostrarResultados && busqueda.trim() && (
          <div
            id="resultados-busqueda-productos"
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-panel-border bg-panel-card shadow-xl"
          >
            {buscando && <p className="px-3 py-3 text-sm text-gray-400">Buscando productos...</p>}
            {!buscando && errorBusqueda && <p role="alert" className="px-3 py-3 text-sm text-red-300">{errorBusqueda}</p>}
            {!buscando && !errorBusqueda && resultados.length === 0 && (
              <p className="px-3 py-3 text-sm text-gray-400">No se encontraron productos.</p>
            )}
            {!buscando && resultados.map((producto) => (
              <button
                key={producto.idProducto}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => seleccionarProducto(producto)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-panel-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-white/5"
              >
                <span className="text-sm font-medium text-gray-200">{producto.nombre}</span>
                <span className="text-xs text-gray-500">{producto.codigoSKU}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-400">
          <MapPin size={15} />
          Local: <span className="text-gray-200 font-medium">
            {perfil ? (errorSucursal ? 'No disponible' : sucursal) : errorPerfil ? 'No disponible' : 'Cargando...'}
          </span>
        </div>

        <button className="relative text-gray-400 hover:text-white transition-colors">
        </button>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-brand-yellow/20 flex items-center justify-center text-brand-yellow">
            <User size={16} />
          </div>
          <span
            className="hidden sm:block text-sm text-gray-200 font-medium"
            title={errorPerfil || perfil?.nombre || ''}
          >
            {perfil ? primerNombre : errorPerfil ? 'Perfil no disponible' : 'Cargando perfil...'}
          </span>
        </div>

        <CambiarPassword />

        {onLogout && (
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 rounded-lg border border-panel-border px-3 py-1.5 text-sm text-gray-300 hover:text-brand-yellow hover:border-brand-yellow transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        )}
      </div>
    </header>
  )
}
