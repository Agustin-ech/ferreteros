import { useMemo, useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { productosInventario } from '../data/mockData'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

// Deriva el estado de stock a partir del total, para no tener que
// mantenerlo sincronizado a mano en los datos de ejemplo.
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

export default function InventoryTable({ onSelectProduct }) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas las Categorías')
  const [sucursal, setSucursal] = useState('Todas las Sucursales')
  const [estadoFiltro, setEstadoFiltro] = useState('Estado de Stock')
  const [orden, setOrden] = useState({ campo: null, dir: 'asc' })

  const categorias = useMemo(
    () => ['Todas las Categorías', ...new Set(productosInventario.map((p) => p.categoria))],
    []
  )

  const filas = useMemo(() => {
    let filas = productosInventario.map((p) => ({
      ...p,
      total: p.laChinita + p.buenaVista,
      estado: getEstado(p.laChinita + p.buenaVista),
    }))

    if (busqueda.trim()) {
      filas = filas.filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    }
    if (categoria !== 'Todas las Categorías') {
      filas = filas.filter((p) => p.categoria === categoria)
    }
    if (sucursal === 'La Chinita') {
      filas = filas.filter((p) => p.laChinita > 0)
    } else if (sucursal === 'Buena Vista') {
      filas = filas.filter((p) => p.buenaVista > 0)
    }
    if (estadoFiltro !== 'Estado de Stock') {
      filas = filas.filter((p) => p.estado === estadoFiltro)
    }

    if (orden.campo) {
      filas.sort((a, b) => {
        const av = a[orden.campo]
        const bv = b[orden.campo]
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv
        return orden.dir === 'asc' ? cmp : -cmp
      })
    }

    return filas
  }, [busqueda, categoria, sucursal, estadoFiltro, orden])

  function toggleOrden(campo) {
    setOrden((o) => ({
      campo,
      dir: o.campo === campo && o.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-1 min-w-[180px] bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          {categorias.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={sucursal}
          onChange={(e) => setSucursal(e.target.value)}
          className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          <option>Todas las Sucursales</option>
          <option>La Chinita</option>
          <option>Buena Vista</option>
        </select>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          <option>Estado de Stock</option>
          <option>Stock Alto</option>
          <option>Stock Bajo</option>
          <option>Agotado</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-panel-border">
              <th className="py-3 pl-4 pr-2 w-8"></th>
              <th className="py-3 pr-2 font-medium">
                <button className="flex items-center gap-1 hover:text-white" onClick={() => toggleOrden('nombre')}>
                  Productos <ChevronsUpDown size={13} />
                </button>
              </th>
              <th className="py-3 pr-2 font-medium">Categoría</th>
              <th className="py-3 pr-2 font-medium">La Chinita</th>
              <th className="py-3 pr-2 font-medium">Buena Vista</th>
              <th className="py-3 pr-2 font-medium">
                <button className="flex items-center gap-1 hover:text-white" onClick={() => toggleOrden('total')}>
                  Total <ChevronsUpDown size={13} />
                </button>
              </th>
              <th className="py-3 pr-2 font-medium">Precio</th>
              <th className="py-3 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className="border-b border-panel-border/60 last:border-0 hover:bg-white/5 cursor-pointer"
              >
                <td className="py-3 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className="accent-brand-yellow" />
                </td>
                <td className="py-3 pr-2 text-gray-200 font-medium">{p.nombre}</td>
                <td className="py-3 pr-2 text-gray-400">{p.categoria}</td>
                <td className="py-3 pr-2 text-gray-300">{p.laChinita}</td>
                <td className="py-3 pr-2 text-gray-300">{p.buenaVista}</td>
                <td className="py-3 pr-2 text-gray-200 font-semibold">{p.total}</td>
                <td className="py-3 pr-2 text-gray-300">{formatoCOP.format(p.precio)}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${estadoStyles[p.estado]}`}>
                    {p.estado}
                  </span>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500 text-sm">
                  Ningún producto coincide con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}