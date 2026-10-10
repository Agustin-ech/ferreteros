import { useEffect, useMemo, useState } from 'react'
import { Package, AlertTriangle, Wallet, Store } from 'lucide-react'
import StatCard from '../components/StatCard'
import InventoryTable from '../components/InventoryTable'
import ProductDetailPanel from '../components/ProductDetailPanel'
import api from '../api/client'

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

export default function InventarioGlobal() {
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [sucursales, setSucursales] = useState([])
  const [productos, setProductos] = useState([])
  const [inventario, setInventario] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false

    async function cargarDatos() {
      try {
        const [resSucursales, resProductos, resInventario] = await Promise.all([
          api.get('/api/sucursales'),
          api.get('/api/productos'),
          api.get('/api/inventario'),
        ])

        if (cancelado) return

        const sucursalesOrdenadas = [...(resSucursales.data || [])].sort((a, b) => a.idSucursal - b.idSucursal)
        const productosOrdenados = [...(resProductos.data || [])].sort((a, b) => a.nombre.localeCompare(b.nombre))

        setSucursales(sucursalesOrdenadas)
        setProductos(productosOrdenados)
        setInventario(resInventario.data || [])
        setError('')
      } catch (err) {
        if (!cancelado) {
          setError(err?.response?.data?.mensaje || err?.response?.data?.error || 'No se pudo cargar el inventario real.')
          setSucursales([])
          setProductos([])
          setInventario([])
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargarDatos()
    return () => { cancelado = true }
  }, [])

  const filas = useMemo(() => {
    if (!sucursales.length || !productos.length) return []

    const stockPorProducto = {}
    inventario.forEach((item) => {
      if (!stockPorProducto[item.idProducto]) stockPorProducto[item.idProducto] = {}
      stockPorProducto[item.idProducto][item.idSucursal] = Number(item.cantidadDisponible || 0)
    })

    const filasBase = productos.map((producto) => {
      const stocks = Object.fromEntries(
        sucursales.map((sucursal) => [sucursal.idSucursal, Number(stockPorProducto[producto.idProducto]?.[sucursal.idSucursal] || 0)])
      )

      const stockPorNombre = Object.fromEntries(
        sucursales.map((sucursal) => [sucursal.nombreSucursal, Number(stockPorProducto[producto.idProducto]?.[sucursal.idSucursal] || 0)])
      )

      const total = Object.values(stocks).reduce((sum, valor) => sum + valor, 0)

      return {
        id: producto.idProducto,
        codigo: producto.codigoSKU,
        nombre: producto.nombre,
        categoria: producto.tipo_producto?.nombre || producto.tipo || 'Sin categoría',
        precio: Number(producto.precio || 0),
        total,
        estado: getEstado(total),
        ...stocks,
        ...stockPorNombre,
      }
    })

    return filasBase.sort((a, b) => b.total - a.total)
  }, [sucursales, productos, inventario])

  const totalInventario = filas.reduce((sum, fila) => sum + fila.total, 0)
  const stockBajo = filas.filter((fila) => fila.total <= 15).length
  const valorInventario = filas.reduce((sum, fila) => sum + fila.total * fila.precio, 0)

  if (cargando) {
    return <div className="text-sm text-gray-400">Cargando inventario real...</div>
  }

  if (error) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white">Inventario Global</h1>
        <p className="text-sm text-gray-500">Consultar y gestionar el inventario real de todas las sucursales.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Productos Totales"
          value={filas.length.toLocaleString('es-CO')}
          footer="Total de SKU activos"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock Bajo"
          value={stockBajo}
          footer="Productos en mínimo"
          accent="red"
        />
        <StatCard
          icon={Wallet}
          label="Valor del Inventario"
          value={formatoCOP.format(valorInventario)}
          footer={`${totalInventario.toLocaleString('es-CO')} unidades en total`}
          accent="green"
        />
        <StatCard
          icon={Store}
          label="Sucursales"
          value={sucursales.length}
          footer={sucursales.map((s) => s.nombreSucursal).join(' / ')}
        />
      </div>

      <div className={`grid gap-4 ${productoSeleccionado ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
        <InventoryTable onSelectProduct={setProductoSeleccionado} filas={filas} sucursales={sucursales} />

        {productoSeleccionado && (
          <ProductDetailPanel
            producto={productoSeleccionado}
            sucursales={sucursales}
            onVolver={() => setProductoSeleccionado(null)}
          />
        )}
      </div>
    </div>
  )
}