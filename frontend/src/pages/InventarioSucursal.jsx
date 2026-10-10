import { useEffect, useMemo, useState } from 'react'
import {
  Package, AlertTriangle, Wallet, Store, Pencil, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import ProductDetailPanel from '../components/ProductDetailPanel'
import api from '../api/client'

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

const ITEMS_POR_PAGINA = 7

export default function InventarioSucursal({ idSucursal, nombreSucursal }) {
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [productos, setProductos] = useState([])
  const [inventario, setInventario] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas las Categorías')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    let cancelado = false
    setCargando(true)

    Promise.all([
      api.get('/api/productos'),
      api.get('/api/inventario', { params: { sucursal: idSucursal } }),
    ]).then(([productosResponse, inventarioResponse]) => {
      if (cancelado) return
      setProductos(productosResponse.data || [])
      setInventario(inventarioResponse.data || [])
      setError('')
    }).catch((err) => {
      if (cancelado) return
      setError(err?.response?.data?.mensaje || err?.response?.data?.error || 'No se pudo cargar el inventario de esta sucursal.')
      setProductos([])
      setInventario([])
    }).finally(() => {
      if (!cancelado) setCargando(false)
    })

    return () => { cancelado = true }
  }, [idSucursal])

  const filasBase = useMemo(() => {
    const stockPorProducto = Object.fromEntries(
      inventario.map((item) => [item.idProducto, Number(item.cantidadDisponible || 0)])
    )

    return productos.map((producto) => {
      const stock = stockPorProducto[producto.idProducto] || 0
      return {
        id: producto.idProducto,
        codigo: producto.codigoSKU,
        nombre: producto.nombre,
        categoria: producto.tipo_producto?.nombre || producto.tipo || 'Sin categoría',
        precio: Number(producto.precio || 0),
        stock,
        total: stock,
        estado: getEstado(stock),
        [idSucursal]: stock,
        [nombreSucursal]: stock,
      }
    })
  }, [productos, inventario, idSucursal, nombreSucursal])

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
    if (estadoFiltro !== 'Todos') {
      filas = filas.filter((p) => p.estado === estadoFiltro)
    }
    return filas
  }, [busqueda, categoria, estadoFiltro, filasBase])

  const totalPaginas = Math.max(1, Math.ceil(filas.length / ITEMS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
  const filasPagina = filas.slice(inicio, inicio + ITEMS_POR_PAGINA)

  // Resumen de las tarjetas de arriba, calculado solo con el stock de esta
  // sucursal (no con el total combinado, como en Inventario Global).
  const resumen = useMemo(() => {
    const valor = filasBase.reduce((acc, p) => acc + p.precio * p.stock, 0)
    const stockBajo = filasBase.filter((p) => getEstado(p.stock) === 'Stock Bajo').length
    const agotados = filasBase.filter((p) => p.stock === 0).length
    return {
      productosTotales: filasBase.length,
      stockBajo,
      valorInventario: valor,
      agotados,
    }
  }, [filasBase])

  function cambiarFiltro(setter) {
    return (valor) => {
      setter(valor)
      setPagina(1)
    }
  }

  function actualizarInventario(inventarioActualizado) {
    setInventario((actual) => {
      const existente = actual.some((item) => item.idInventario === inventarioActualizado.idInventario)
      if (!existente) return [...actual, inventarioActualizado]
      return actual.map((item) => item.idInventario === inventarioActualizado.idInventario
        ? inventarioActualizado
        : item)
    })
  }

  if (cargando) return <div className="text-sm text-gray-400">Cargando inventario de {nombreSucursal}...</div>
  if (error) return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white">Inventario {nombreSucursal}</h1>
        <p className="text-sm text-gray-500">Consultar y gestionar el inventario de la sucursal {nombreSucursal}.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Productos Totales"
          value={resumen.productosTotales.toLocaleString('es-CO')}
          footer="Catálogo en esta sucursal"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock Bajo"
          value={resumen.stockBajo}
          footer="Productos en mínimo"
          accent="red"
        />
        <StatCard
          icon={Wallet}
          label="Valor del Inventario"
          value={formatoCOP.format(resumen.valorInventario)}
          footer="Solo esta sucursal"
          accent="green"
        />
        <StatCard
          icon={Store}
          label="Agotados"
          value={resumen.agotados}
          footer={nombreSucursal}
        />
      </div>

      <div className={`grid gap-4 ${productoSeleccionado ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-4 min-w-0">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => cambiarFiltro(setBusqueda)(e.target.value)}
              placeholder="Buscar producto..."
              className="flex-1 min-w-[180px] bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
            />
            <select
              value={categoria}
              onChange={(e) => cambiarFiltro(setCategoria)(e.target.value)}
              className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
            >
              {categorias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={estadoFiltro}
              onChange={(e) => cambiarFiltro(setEstadoFiltro)(e.target.value)}
              className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
            >
              <option>Todos</option>
              <option>Stock Alto</option>
              <option>Stock Bajo</option>
              <option>Agotado</option>
            </select>
            <button
              type="button"
              onClick={() => filas[0] && setProductoSeleccionado(filas[0])}
              className="ml-auto flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap"
            >
              <Plus size={16} /> Ajustar Inventario
            </button>
          </div>

          {/* Tabla */}
          <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-3 pl-4 pr-2 w-8"></th>
                  <th className="py-3 pr-2 font-medium">Productos</th>
                  <th className="py-3 pr-2 font-medium">Categoría</th>
                  <th className="py-3 pr-2 font-medium">Stock</th>
                  <th className="py-3 pr-2 font-medium">Precio</th>
                  <th className="py-3 pr-2 font-medium">Estado</th>
                  <th className="py-3 pr-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filasPagina.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-panel-border/60 last:border-0 hover:bg-white/5"
                  >
                    <td className="py-3 pl-4 pr-2">
                      <input type="checkbox" className="accent-brand-yellow" />
                    </td>
                    <td className="py-3 pr-2 text-gray-200 font-medium">{p.nombre}</td>
                    <td className="py-3 pr-2 text-gray-400">{p.categoria}</td>
                    <td className="py-3 pr-2 text-gray-300 font-semibold">{p.stock}</td>
                    <td className="py-3 pr-2 text-gray-300">{formatoCOP.format(p.precio)}</td>
                    <td className="py-3 pr-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${estadoStyles[p.estado]}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3 text-gray-400">
                        <button onClick={() => setProductoSeleccionado(p)} className="hover:text-white" title="Ver y ajustar inventario" aria-label={`Ver y ajustar ${p.nombre}`}>
                          <Pencil size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filasPagina.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500 text-sm">
                      Ningún producto coincide con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
            <span>
              Mostrando {filas.length === 0 ? 0 : inicio + 1}-{Math.min(inicio + ITEMS_POR_PAGINA, filas.length)} de{' '}
              {filas.length.toLocaleString('es-CO')} productos
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).slice(0, 5).map((n) => (
                <button
                  key={n}
                  onClick={() => setPagina(n)}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg border text-xs font-semibold ${
                    n === paginaActual
                      ? 'bg-brand-yellow text-panel-sidebar border-brand-yellow'
                      : 'border-panel-border text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {n}
                </button>
              ))}
              {totalPaginas > 5 && <span className="px-1">...</span>}
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {productoSeleccionado && (
          <ProductDetailPanel
            producto={productoSeleccionado}
            sucursales={[{ idSucursal, nombreSucursal }]}
            onAjusteGuardado={actualizarInventario}
            onVolver={() => setProductoSeleccionado(null)}
          />
        )}
      </div>
    </div>
  )
}