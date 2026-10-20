import { useEffect, useState } from 'react'
import { Image, ImageOff, X } from 'lucide-react'

// Botón de la columna "Acciones" que abre la foto del producto en grande.
// `producto` necesita `nombre` e `imagen` (URL ya resuelta) o `codigo`.
export default function VerFotoProducto({ producto }) {
  const [abierta, setAbierta] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!abierta) return undefined
    setError(false)
    const alPresionar = (e) => { if (e.key === 'Escape') setAbierta(false) }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [abierta])

  if (!producto.imagen) {
    return (
      <span className="text-gray-600 cursor-not-allowed" title="Sin foto">
        <ImageOff size={15} />
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        // Las filas de inventario abren el detalle al hacer clic; esto no debe hacerlo.
        onClick={(e) => { e.stopPropagation(); setAbierta(true) }}
        className="hover:text-white"
        title="Ver foto"
        aria-label={`Ver foto de ${producto.nombre}`}
      >
        <Image size={15} />
      </button>

      {abierta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${producto.nombre}`}
          onClick={(e) => { e.stopPropagation(); setAbierta(false) }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-default"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-xl border border-panel-border bg-panel-card p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-white break-words">{producto.nombre}</p>
                {producto.codigo && <p className="text-xs text-gray-500">{producto.codigo}</p>}
              </div>
              <button type="button" onClick={() => setAbierta(false)} aria-label="Cerrar" className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            {error ? (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                No se pudo cargar la foto. Puede que se haya borrado del almacenamiento.
              </p>
            ) : (
              <img
                src={producto.imagen}
                alt={`Foto de ${producto.nombre}`}
                onError={() => setError(true)}
                className="mx-auto max-h-[70vh] w-full rounded-lg bg-black object-contain"
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
