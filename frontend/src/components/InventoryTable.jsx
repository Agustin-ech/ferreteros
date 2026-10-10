import { useMemo, useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { productosInventario } from '../data/mockData'

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

export default function InventoryTable({ onSelectProduct, filas: filasProp, sucursales: sucursalesProp = [] }) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas las Categorías')
  const [sucursal, setSucursal] = useState('Todas las Sucursales')
  const [estadoFiltro, setEstadoFiltro] = useState('Estado de Stock')
  const [orden, setOrden] = useState({ campo: null, dir: 'asc' })

  const sucursalOptions = useMemo(() => {
    const nombres = (sucursalesProp.length ? sucursalesProp : [{ nombreSucursal: 'La Chinita' }, { nombreSucursal: 'Buena Vista' }])
      .map((s) => s.nombreSucursal || s.nombre || s)
    return ['Todas las Sucursales', ...nombres]
  }, [sucursalesProp])

  const sucursalLookup = useMemo(
    () => Object.fromEntries((sucursalesProp || []).map((s) => [s.nombreSucursal, s.idSucursal])),
    [sucursalesProp]
  )

  const filasBase = useMemo(() => {
    const source = filasProp && filasProp.length ? filasProp : productosInventario.map((p) => ({
      ...p,
      total: Number(p.laChinita || 0) + Number(p.buenaVista || 0),
      estado: getEstado(Number(p.laChinita || 0) + Number(p.buenaVista || 0)),
      laChinita: Number(p.laChinita || 0),
      buenaVista: Number(p.buenaVista || 0),
    }))

    return source.map((p) => ({
      ...p,
      total: Number(p.total ?? ((p.laChinita || 0) + (p.buenaVista || 0))),
      estado: p.estado || getEstado(Number(p.total ?? ((p.laChinita || 0) + (p.buenaVista || 0)))),
    }))
  }, [filasProp])

  const categorias = useMemo(
    () => ['Todas las Categorías', ...new Set(filasBase.map((p) => p.categoria))],
    [filasBase]
  )

  const filas = useMemo(() => {
    let filas = [...filasBase]

    if (busqueda.trim()) {
      filas = filas.filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    }
    if (categoria !== 'Todas las Categorías') {
      filas = filas.filter((p) => p.categoria === categoria)
    }
    if (sucursal !== 'Todas las Sucursales') {
      const sucursalId = sucursalLookup[sucursal]
      filas = filas.filter((p) => {
        const valor = Number(p[sucursalId] ?? p[sucursal] ?? 0)
        return valor > 0
      })
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
  }, [busqueda, categoria, sucursal, estadoFiltro, orden, filasBase, sucursalLookup])

  function toggleOrden(campo) {
    setOrden((o) => ({
      campo,
      dir: o.campo === campo && o.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  return (
    <div className="flex flex-col gap-4 min-w-0">
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
          {sucursalOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
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

      <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-panel-border">
              <th className="py-3 pl-6 pr-2 font-medium">
                <button className="flex items-center gap-1 hover:text-white" onClick={() => toggleOrden('nombre')}>
                  Productos <ChevronsUpDown size={13} />
                </button>
              </th>
              <th className="py-3 pr-2 font-medium">Categoría</th>
              {sucursalOptions.slice(1).map((nombreSucursal) => (
                <th key={nombreSucursal} className="py-3 pr-2 font-medium">{nombreSucursal}</th>
              ))}
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
                <td className="py-3 pl-6 pr-2 text-gray-200 font-medium">{p.nombre}</td>
                <td className="py-3 pr-2 text-gray-400">{p.categoria}</td>
                {sucursalOptions.slice(1).map((nombreSucursal) => {
                  const sucursalId = sucursalLookup[nombreSucursal]
                  const valor = Number(p[sucursalId] ?? p[nombreSucursal] ?? 0)
                  return <td key={`${p.id}-${nombreSucursal}`} className="py-3 pr-2 text-gray-300">{valor}</td>
                })}
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
                <td colSpan={sucursalOptions.length + 4} className="py-8 text-center text-gray-500 text-sm">
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