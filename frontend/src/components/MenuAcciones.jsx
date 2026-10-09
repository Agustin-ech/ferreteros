import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'

// Menú "⋮" reutilizable: recibe una lista de acciones {label, onClick,
// destructivo?} y las muestra en un menú flotante. Se cierra solo al
// hacer clic afuera. Usado en Empleados, Facturas, Ingresos y Egresos.
export default function MenuAcciones({ acciones }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickAfuera(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', handleClickAfuera)
    return () => document.removeEventListener('mousedown', handleClickAfuera)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setAbierto((v) => !v)} className="hover:text-white" title="Más acciones">
        <MoreVertical size={15} />
      </button>
      {abierto && (
        <div className="absolute right-0 top-6 z-10 w-48 bg-panel-card border border-panel-border rounded-lg shadow-xl py-1 text-left">
          {acciones.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                a.onClick()
                setAbierto(false)
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition ${
                a.destructivo ? 'text-red-400' : 'text-gray-200'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}