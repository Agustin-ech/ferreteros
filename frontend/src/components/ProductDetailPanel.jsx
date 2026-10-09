import { useState } from 'react'
import { ArrowLeft, Package, Boxes, History, ChevronRight, Save } from 'lucide-react'
import { motivosAjuste, historialMovimientosEjemplo } from '../data/mockData'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function getEstado(total) {
  if (total === 0) return 'Agotado'
  if (total <= 15) return 'Stock Bajo'
  return 'Stock Alto'
}

const estadoStyles = {
  'Stock Alto': 'bg-emerald-500/15 text-emerald-400',
  'Stock Bajo': 'bg-amber-500/15 text-amber-400',
  Agotado: 'bg-red-500/15 text-red-400',
}

export default function ProductDetailPanel({ producto, onVolver }) {
  const total = producto.laChinita + producto.buenaVista
  const estado = getEstado(total)
  const valorTotal = producto.precio * total

  const [nuevaCantidad, setNuevaCantidad] = useState(total)
  const [motivo, setMotivo] = useState(motivosAjuste[0])
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [guardado, setGuardado] = useState(false)

  function handleGuardar(e) {
    e.preventDefault()
    // Aquí luego irá la llamada real al backend (PUT/PATCH del inventario).
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  return (
    <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-4 h-fit">
      <button
        onClick={onVolver}
        className="flex items-center gap-1.5 text-sm text-brand-yellow hover:underline w-fit"
      >
        <ArrowLeft size={15} /> Volver a la lista
      </button>

      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-lg bg-panel-bg border border-panel-border flex items-center justify-center shrink-0 overflow-hidden">
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre} className="h-full w-full object-cover" />
          ) : (
            <Package size={26} className="text-gray-500" />
          )}
        </div>
        <div>
          <p className="font-semibold text-white">{producto.nombre}</p>
          <p className="text-xs text-gray-500">Cód: {producto.codigo}</p>
          <p className="text-xs text-gray-500">{producto.categoria}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="border border-panel-border rounded-lg p-3 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <Boxes size={14} className="text-brand-yellow" /> Stock por Sucursal
          </p>
          <div className="grid grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">La Chinita</p>
              <p className="font-semibold text-white">{producto.laChinita}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Buena Vista</p>
              <p className="font-semibold text-white">{producto.buenaVista}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="font-semibold text-white">{total}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 text-sm border-t border-panel-border pt-3">
            <div>
              <p className="text-xs text-gray-500">Precio de venta</p>
              <p className="font-semibold text-white">{formatoCOP.format(producto.precio)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Valor total del inventario</p>
              <p className="font-semibold text-white">{formatoCOP.format(valorTotal)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-panel-border pt-3">
            <span className="text-xs text-gray-400">Estado de stock</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${estadoStyles[estado]}`}>
              {estado}
            </span>
          </div>
        </div>

        <form onSubmit={handleGuardar} className="border border-brand-yellow/40 rounded-lg p-3 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <Boxes size={14} className="text-brand-yellow" /> Ajustar Inventario
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Nueva Cantidad
              <input
                type="number"
                min="0"
                value={nuevaCantidad}
                onChange={(e) => setNuevaCantidad(e.target.value)}
                className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Motivo
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none"
              >
                {motivosAjuste.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg py-2 hover:brightness-95 transition"
          >
            <Save size={15} /> Guardar Ajustes
          </button>
          {guardado && (
            <p className="text-xs text-emerald-400 text-center">Ajuste guardado (localmente, aún sin backend).</p>
          )}
        </form>
      </div>

      <div className="border border-panel-border rounded-lg">
        <button
          onClick={() => setHistorialAbierto((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-300"
        >
          <span className="flex items-center gap-1.5">
            <History size={14} className="text-brand-yellow" /> Historial de Movimientos
          </span>
          <ChevronRight size={15} className={`transition-transform ${historialAbierto ? 'rotate-90' : ''}`} />
        </button>

        {historialAbierto && (
          <div className="border-t border-panel-border px-3 py-2 flex flex-col gap-2">
            {historialMovimientosEjemplo.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{h.fecha}</span>
                <span className="text-gray-300">{h.tipo}</span>
                <span className={h.cantidad < 0 ? 'text-red-400' : 'text-emerald-400'}>
                  {h.cantidad > 0 ? `+${h.cantidad}` : h.cantidad}
                </span>
                <span className="text-gray-500">{h.usuario}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}