import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, AlertTriangle, Wallet, Store, Plus, X } from 'lucide-react'
import StatCard from '../components/StatCard'
import InventoryTable from '../components/InventoryTable'
import ProductDetailPanel from '../components/ProductDetailPanel'
import ApiState from '../components/ApiState'
import api from '../api/client'
import { errorMessage } from '../api/client'

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

export default function InventarioGlobal({ productoParaBusqueda, onProductoAbierto }) {
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [sucursales, setSucursales] = useState([])
  const [productos, setProductos] = useState([])
  const [inventario, setInventario] = useState([])
  const [tiposProducto, setTiposProducto] = useState([])
  const [unidadesMedida, setUnidadesMedida] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrarRegistro, setMostrarRegistro] = useState(false)
  const [guardandoProducto, setGuardandoProducto] = useState(false)
  const [errorRegistro, setErrorRegistro] = useState('')
  const [registro, setRegistro] = useState({
    codigo: '', nombre: '', idTipoProducto: '', idUnidadMedida: '', idSucursal: '',
    stock: '0', venta: '', compra: '', descripcion: '',
  })

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [resSucursales, resProductos, resInventario, resCatalogos] = await Promise.all([
        api.get('/api/sucursales', { params: { solo_activas: true } }),
        api.get('/api/productos'),
        api.get('/api/inventario'),
        api.get('/api/productos/catalogos'),
      ])

      const sucursalesOrdenadas = [...(resSucursales.data || [])].sort((a, b) => a.idSucursal - b.idSucursal)
      const productosOrdenados = [...(resProductos.data || [])].sort((a, b) => a.nombre.localeCompare(b.nombre))
      setSucursales(sucursalesOrdenadas)
      setProductos(productosOrdenados)
      setInventario(resInventario.data || [])
      setTiposProducto(resCatalogos.data?.tipos || [])
      setUnidadesMedida(resCatalogos.data?.unidades || [])
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cargar el inventario real.'))
      setSucursales([])
      setProductos([])
      setInventario([])
      setTiposProducto([])
      setUnidadesMedida([])
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const filas = useMemo(() => {
    if (!sucursales.length) return []

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
        categoria: tiposProducto.find((tipo) => tipo.idTipoProducto === producto.idTipoProducto)?.nombre || 'Sin categoría',
        precio: Number(producto.precio || 0),
        compra: Number(producto.costoUnitario || 0),
        descuentoPorcentaje: Number(producto.descuentoPorcentaje || 0),
        idTipoProducto: producto.idTipoProducto,
        idUnidadMedida: producto.idUnidadMedida,
        total,
        estado: getEstado(total),
        ...stocks,
        ...stockPorNombre,
      }
    })

    return filasBase.sort((a, b) => b.total - a.total)
  }, [sucursales, productos, inventario, tiposProducto])

  useEffect(() => {
    if (!productoParaBusqueda || cargando) return
    const producto = filas.find((fila) => fila.id === productoParaBusqueda)
    if (producto) setProductoSeleccionado(producto)
    onProductoAbierto?.()
  }, [productoParaBusqueda, cargando, filas, onProductoAbierto])

  const totalInventario = filas.reduce((sum, fila) => sum + fila.total, 0)
  const stockBajo = filas.filter((fila) => fila.total <= 15).length
  const valorInventario = filas.reduce((sum, fila) => sum + fila.total * fila.precio, 0)

  function actualizarInventario(inventarioActualizado) {
    setInventario((actual) => {
      const existente = actual.some((item) => item.idInventario === inventarioActualizado.idInventario)
      if (!existente) return [...actual, inventarioActualizado]
      return actual.map((item) => item.idInventario === inventarioActualizado.idInventario
        ? inventarioActualizado
        : item)
    })
  }

  function actualizarProducto(productoActualizado) {
    setProductos((actuales) => actuales.map((producto) =>
      producto.idProducto === productoActualizado.idProducto ? productoActualizado : producto
    ))
    setProductoSeleccionado((actual) => actual?.id === productoActualizado.idProducto
      ? {
        ...actual,
        precio: Number(productoActualizado.precio),
        compra: Number(productoActualizado.costoUnitario),
        descuentoPorcentaje: Number(productoActualizado.descuentoPorcentaje || 0),
      }
      : actual)
  }

  async function registrarProducto(event) {
    event.preventDefault()
    setErrorRegistro('')
    const codigoSKU = registro.codigo.trim().toUpperCase()
    const idTipoProducto = Number(registro.idTipoProducto)
    const idUnidadMedida = Number(registro.idUnidadMedida)
    const idSucursal = Number(registro.idSucursal)
    const stock = Number(registro.stock)
    const precio = Number(registro.venta)
    const costoUnitario = Number(registro.compra)

    if (!codigoSKU || !registro.nombre.trim() || !Number.isInteger(idTipoProducto)
      || !Number.isInteger(idUnidadMedida) || !Number.isInteger(idSucursal)
      || !Number.isFinite(stock) || stock <= 0 || !Number.isFinite(precio) || precio < 0.01
      || !Number.isFinite(costoUnitario) || costoUnitario < 0.01) {
      setErrorRegistro('Completa los campos requeridos con valores válidos. El stock y los precios deben ser mayores que cero.')
      return
    }
    if (productos.some((producto) => producto.codigoSKU.toUpperCase() === codigoSKU)) {
      setErrorRegistro(`Ya existe un producto con el código ${codigoSKU}.`)
      return
    }
    if (!tiposProducto.some((tipo) => tipo.idTipoProducto === idTipoProducto)
      || !unidadesMedida.some((unidad) => unidad.idUnidadMedida === idUnidadMedida)
      || !sucursales.some((sucursal) => sucursal.idSucursal === idSucursal)) {
      setErrorRegistro('Selecciona un tipo, una unidad y una sucursal vigentes.')
      return
    }

    setGuardandoProducto(true)
    try {
      const { data: producto } = await api.post('/api/productos', {
        codigoSKU,
        nombre: registro.nombre.trim(),
        idTipoProducto,
        idUnidadMedida,
        precio,
        costoUnitario,
        descripcion: registro.descripcion.trim() || null,
      })
      setProductos((actuales) => [...actuales, producto].sort((a, b) => a.nombre.localeCompare(b.nombre)))

      if (stock > 0) {
        try {
          const { data } = await api.post('/api/inventario/ajustar', {
            idProducto: producto.idProducto,
            idSucursal,
            cantidad: stock,
            operacion: 'suma',
            motivo: 'Inventario inicial al registrar producto',
          })
          actualizarInventario(data.inventario_actualizado)
        } catch (stockError) {
          setRegistro((actual) => ({ ...actual, codigo: '', stock: '0' }))
          setErrorRegistro(
            `El producto se creó, pero no se pudo registrar el stock inicial: ${
              stockError?.response?.data?.mensaje
              || stockError?.response?.data?.error
              || 'error al guardar el inventario'
            }`
          )
          return
        }
      }

      setRegistro({
        codigo: '', nombre: '', idTipoProducto: '', idUnidadMedida: '',
        idSucursal: String(sucursales[0]?.idSucursal || ''), stock: '0',
        venta: '', compra: '', descripcion: '',
      })
      setMostrarRegistro(false)
    } catch (registroError) {
      setErrorRegistro(
        registroError?.response?.data?.mensaje
        || registroError?.response?.data?.error
        || 'No se pudo registrar el producto.'
      )
    } finally {
      setGuardandoProducto(false)
    }
  }

  if (cargando || error) {
    return <ApiState loading={cargando} error={error} onRetry={cargarDatos} loadingMessage="Cargando inventario real..." />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Inventario Global</h1>
            <p className="text-sm text-gray-500">Consultar y gestionar el inventario de todas las sucursales.</p>
          </div>
          <button
            type="button"
            onClick={() => { setErrorRegistro(''); setMostrarRegistro(true) }}
            className="flex items-center gap-2 rounded-lg bg-brand-yellow px-3 py-2 text-sm font-semibold text-panel-sidebar hover:brightness-95"
          >
            <Plus size={16} /> Registrar producto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <StatCard
          icon={Package}
          label="Productos Totales"
          value={filas.length.toLocaleString('es-CO')}
          footer="Total de SKU activos"
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
        {filas.length === 0
          ? <ApiState empty emptyMessage="No hay productos ni existencias activas para mostrar." />
          : <InventoryTable onSelectProduct={setProductoSeleccionado} filas={filas} sucursales={sucursales} />}

        {productoSeleccionado && (
          <ProductDetailPanel
            producto={productoSeleccionado}
            sucursales={sucursales}
            onAjusteGuardado={actualizarInventario}
            onProductoActualizado={(producto) => actualizarProducto({
              ...producto,
              id: producto.idProducto,
              codigo: producto.codigoSKU,
              compra: Number(producto.costoUnitario),
            })}
            onVolver={() => setProductoSeleccionado(null)}
          />
        )}
      </div>

      {mostrarRegistro && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setMostrarRegistro(false)}>
          <form
            onSubmit={registrarProducto}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-panel-border bg-panel-card p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Registrar producto</h2>
                <p className="text-sm text-gray-400">Los precios y referencias se guardan con los campos del backend.</p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setMostrarRegistro(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">Código del producto *
                <input required maxLength="50" className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-gray-200" value={registro.codigo} onChange={(e) => setRegistro({ ...registro, codigo: e.target.value })} />
              </label>
              <label className="text-sm">Nombre del producto *
                <input required maxLength="150" className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-gray-200" value={registro.nombre} onChange={(e) => setRegistro({ ...registro, nombre: e.target.value })} />
              </label>
              <label className="text-sm">Tipo de producto *
                <select required className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-gray-200" value={registro.idTipoProducto} onChange={(e) => setRegistro({ ...registro, idTipoProducto: e.target.value })}>
                  <option value="">Seleccionar tipo</option>{tiposProducto.map((tipo) => <option key={tipo.idTipoProducto} value={tipo.idTipoProducto}>{tipo.nombre}</option>)}
                </select>
              </label>
              <label className="text-sm">Unidad de medida *
                <select required className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-gray-200" value={registro.idUnidadMedida} onChange={(e) => setRegistro({ ...registro, idUnidadMedida: e.target.value })}>
                  <option value="">Seleccionar unidad</option>{unidadesMedida.map((unidad) => <option key={unidad.idUnidadMedida} value={unidad.idUnidadMedida}>{unidad.nombre}</option>)}
                </select>
              </label>
              <label className="text-sm">Sucursal del inventario inicial *
                <select required className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-gray-200" value={registro.idSucursal} onChange={(e) => setRegistro({ ...registro, idSucursal: e.target.value })}>
                  <option value="">Seleccionar sucursal</option>{sucursales.map((sucursal) => <option key={sucursal.idSucursal} value={sucursal.idSucursal}>{sucursal.nombreSucursal}</option>)}
                </select>
              </label>
              <label className="text-sm">Cantidad inicial *
                <input required type="number" min="0.01" step="0.01" className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-gray-200" value={registro.stock} onChange={(e) => setRegistro({ ...registro, stock: e.target.value })} />
              </label>
              <label className="text-sm">Precio de venta *
                <input required type="number" min="0.01" step="0.01" className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-gray-200" value={registro.venta} onChange={(e) => setRegistro({ ...registro, venta: e.target.value })} />
              </label>
              <label className="text-sm">Precio de compra *
                <input required type="number" min="0.01" step="0.01" className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-gray-200" value={registro.compra} onChange={(e) => setRegistro({ ...registro, compra: e.target.value })} />
              </label>
              <label className="text-sm md:col-span-2">Descripción
                <textarea maxLength="255" className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-gray-200" value={registro.descripcion} onChange={(e) => setRegistro({ ...registro, descripcion: e.target.value })} />
              </label>
            </div>
            {errorRegistro && <p role="alert" className="mt-4 text-sm text-red-300">{errorRegistro}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setMostrarRegistro(false)} className="rounded-lg border border-panel-border px-3 py-2 text-sm text-gray-300 hover:bg-white/5">Cancelar</button>
              <button type="submit" disabled={guardandoProducto || !tiposProducto.length || !unidadesMedida.length || !sucursales.length} className="rounded-lg bg-brand-yellow px-3 py-2 text-sm font-semibold text-panel-sidebar disabled:opacity-50">
                {guardandoProducto ? 'Guardando...' : 'Guardar producto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}