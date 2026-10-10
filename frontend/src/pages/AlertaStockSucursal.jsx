import { useMemo, useState } from 'react'
import { AlertTriangle, PackageX, Eye } from 'lucide-react'
import StatCard from '../components/StatCard'
import ProductDetailPanel from '../components/ProductDetailPanel'
import { productosInventario } from '../data/mockData'

function getEstado(total) {
  if (total === 0) return 'Agotado'
  if (total <= 15) return 'Stock Bajo'
  return 'Stock Alto'
}

const estadoStyles = {
  'Stock Bajo': 'bg-amber-500/15 text-amber-400',
  Agotado: 'bg-red-500/15 text-red-400',
}

// Página "Alerta de Stock" de UNA sucursal: solo muestra productos en
// Stock Bajo o Agotado. Reutilizable para La Chinita y Buena Vista.
export default function AlertaStockSucursal({ sucursalKey, nombreSucursal }) {
  const [sucursalFiltro, setSucursalFiltro] = useState(nombreSucursal)
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)

  const claveActiva = sucursalFiltro === 'La Chinita' ? 'laChinita' : 'buenaVista'

  // Tarjetas de resumen: siempre sobre TODAS las alertas de la sucursal
  // elegida, sin importar la búsqueda o el filtro de tipo de la tabla.
  const resumen = useMemo(() => {
    const estados = productosInventario.map((p) => getEstado(p[claveActiva]))
    const stockBajo = estados.filter((e) => e === 'Stock Bajo').length
    const agotado = estados.filter((e) => e === 'Agotado').length
    return { total: stockBajo + agotado, stockBajo, agotado }
  }, [claveActiva])

  const filas = useMemo(() => {
    let filas = productosInventario
      .map((p) => ({ ...p, stock: p[claveActiva], estado: getEstado(p[claveActiva]) }))
      .filter((p) => p.estado !== 'Stock Alto')

    if (busqueda.trim()) {
      filas = filas.filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    }
    if (tipoFiltro !== 'Todos') {
      filas = filas.filter((p) => p.estado === tipoFiltro)
    }
    return filas
  }, [claveActiva, busqueda, tipoFiltro])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
          <AlertTriangle size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Alerta de Stock · {nombreSucursal}</h1>
          <p className="text-sm text-gray-500">Productos que se encuentran agotados o mínimos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={AlertTriangle} label="Total Alertas" value={resumen.total} footer="Stock bajo + agotados" />
        <StatCard icon={AlertTriangle} label="Stock Bajo" value={resumen.stockBajo} accent="yellow" />
        <StatCard icon={PackageX} label="Agotado" value={resumen.agotado} accent="red" />
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-panel-card border border-panel-border rounded-xl p-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-1 min-w-[180px] bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
        <select
          value={sucursalFiltro}
          onChange={(e) => setSucursalFiltro(e.target.value)}
          className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          <option>La Chinita</option>
          <option>Buena Vista</option>
        </select>
        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          <option>Todos</option>
          <option>Stock Bajo</option>
          <option>Agotado</option>
        </select>
      </div>

      <div className={`grid gap-4 ${productoSeleccionado ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
        <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin min-w-0">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-panel-border">
                <th className="py-3 pl-4 pr-2 font-medium">Producto</th>
                <th className="py-3 pr-2 font-medium">Categoría</th>
                <th className="py-3 pr-2 font-medium">Sucursal</th>
                <th className="py-3 pr-2 font-medium">Stock actual</th>
                <th className="py-3 pr-2 font-medium">Estado</th>
                <th className="py-3 pr-4 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.id} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                  <td className="py-3 pl-4 pr-2 text-gray-200 font-medium">{p.nombre}</td>
                  <td className="py-3 pr-2 text-gray-400">{p.categoria}</td>
                  <td className="py-3 pr-2 text-gray-400 whitespace-nowrap">{sucursalFiltro}</td>
                  <td className="py-3 pr-2 text-gray-200 font-semibold">{p.stock}</td>
                  <td className="py-3 pr-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${estadoStyles[p.estado]}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => setProductoSeleccionado(p)}
                      className="flex items-center gap-1.5 text-xs font-semibold border border-panel-border rounded-lg px-3 py-1.5 text-gray-300 hover:text-white hover:border-gray-500 transition"
                    >
                      <Eye size={13} /> Ver
                    </button>
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                    Sin alertas de stock con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {productoSeleccionado && (
          <ProductDetailPanel producto={productoSeleccionado} onVolver={() => setProductoSeleccionado(null)} />
        )}
      </div>
    </div>
  )
}