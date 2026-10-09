import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { productosInventario, motivosAjuste } from '../data/mockData'

// Formatea la fecha de hoy como dd/mm/aaaa, igual que el resto de los datos
// de ejemplo, para que un movimiento nuevo se vea consistente con el resto.
function fechaHoy() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function NuevoAjustePanel({ nombreSucursal, onCancelar, onGuardar }) {
  const [producto, setProducto] = useState(productosInventario[0]?.nombre ?? '')
  const [cantidad, setCantidad] = useState(1)
  const [tipo, setTipo] = useState('Entrada') // Entrada (+) o Salida (-)
  const [motivo, setMotivo] = useState(motivosAjuste[0])

  function handleSubmit(e) {
    e.preventDefault()
    const cantidadFinal = tipo === 'Entrada' ? Math.abs(Number(cantidad)) : -Math.abs(Number(cantidad))
    onGuardar({
      fecha: fechaHoy(),
      producto,
      sucursal: nombreSucursal,
      cantidad: cantidadFinal,
      motivo,
      usuario: 'admin',
    })
  }

  return (
    <div className="bg-panel-card border border-brand-yellow/40 rounded-xl p-4 flex flex-col gap-4 h-fit">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-white text-sm">Nuevo Ajuste · {nombreSucursal}</p>
        <button onClick={onCancelar} className="text-gray-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Producto
          <select
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none"
          >
            {productosInventario.map((p) => (
              <option key={p.id}>{p.nombre}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Tipo
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none"
            >
              <option>Entrada</option>
              <option>Salida</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Cantidad
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none"
            />
          </label>
        </div>

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

        <button
          type="submit"
          className="flex items-center justify-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg py-2 hover:brightness-95 transition"
        >
          <Save size={15} /> Guardar Ajuste
        </button>
        <p className="text-[11px] text-gray-500 text-center">
          Se agrega al historial localmente; aún sin backend.
        </p>
      </form>
    </div>
  )
}