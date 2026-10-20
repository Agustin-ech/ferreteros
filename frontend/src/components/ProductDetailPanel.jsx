import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Package, Boxes, History, ChevronRight, Save } from 'lucide-react'
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

const estadoStyles = {
  'Stock Alto': 'bg-emerald-500/15 text-emerald-400',
  'Stock Bajo': 'bg-amber-500/15 text-amber-400',
  Agotado: 'bg-red-500/15 text-red-400',
}

export default function ProductDetailPanel({
  producto,
  sucursales = [],
  onAjusteGuardado,
  onProductoActualizado,
  onVolver,
}) {
  const stockPorSucursal = (sucursales || []).map((sucursal) => ({
    nombre: sucursal.nombreSucursal,
    id: sucursal.idSucursal,
    valor: Number(producto[sucursal.idSucursal] ?? producto[sucursal.nombreSucursal] ?? 0),
  }))

  const total = stockPorSucursal.reduce((sum, item) => sum + item.valor, 0)
  const estado = getEstado(total)
  const valorTotal = producto.precio * total
  const [idSucursal, setIdSucursal] = useState(sucursales[0]?.idSucursal ?? '')
  const sucursalSeleccionada = sucursales.find((sucursal) => sucursal.idSucursal === Number(idSucursal))
  const stockActual = Number(
    producto[idSucursal] ?? producto[sucursalSeleccionada?.nombreSucursal] ?? producto.stock ?? 0
  )

  const [nuevaCantidad, setNuevaCantidad] = useState(stockActual)
  const [motivo, setMotivo] = useState('Corrección de stock')
  const [historialAbierto, setHistorialAbierto] = useState(false)
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [errorHistorial, setErrorHistorial] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardandoProducto, setGuardandoProducto] = useState(false)
  const [precioVenta, setPrecioVenta] = useState(String(producto.precio))
  const [costoCompra, setCostoCompra] = useState(String(producto.compra ?? 0))
  const [descuento, setDescuento] = useState(String(producto.descuentoPorcentaje ?? 0))
  const [mensaje, setMensaje] = useState('')
  const [esError, setEsError] = useState(false)

  useEffect(() => {
    if (!sucursales.some((sucursal) => sucursal.idSucursal === Number(idSucursal))) {
      setIdSucursal(sucursales[0]?.idSucursal ?? '')
    }
  }, [sucursales, idSucursal])

  useEffect(() => {
    setNuevaCantidad(stockActual)
  }, [producto.id, idSucursal, stockActual])

  useEffect(() => {
    setPrecioVenta(String(producto.precio))
    setCostoCompra(String(producto.compra ?? 0))
    setDescuento(String(producto.descuentoPorcentaje ?? 0))
  }, [producto.id, producto.precio, producto.compra, producto.descuentoPorcentaje])

  const cargarHistorial = useCallback(async () => {
    if (!producto.id || !idSucursal) {
      setHistorial([])
      return
    }

    setCargandoHistorial(true)
    setErrorHistorial('')
    try {
      const response = await api.get('/api/inventario/ajustes', {
        params: { producto: producto.id, sucursal: idSucursal },
      })
      setHistorial(response.data || [])
    } catch (error) {
      setErrorHistorial(errorMessage(error, 'No se pudo cargar el historial.'))
      setHistorial([])
    } finally {
      setCargandoHistorial(false)
    }
  }, [producto.id, idSucursal])

  async function handleGuardarPrecios(e) {
    e.preventDefault()
    setMensaje('')
    const precio = Number(precioVenta)
    const costoUnitario = Number(costoCompra)
    const descuentoPorcentaje = Number(descuento || 0)
    if (!Number.isFinite(precio) || precio < 0.01 || !Number.isFinite(costoUnitario) || costoUnitario < 0.01) {
      setEsError(true)
      setMensaje('Los precios de compra y venta deben ser mayores que cero.')
      return
    }
    if (!Number.isFinite(descuentoPorcentaje) || descuentoPorcentaje < 0 || descuentoPorcentaje > 100) {
      setEsError(true)
      setMensaje('El descuento debe estar entre 0 y 100 %.')
      return
    }

    setGuardandoProducto(true)
    try {
      const { data } = await api.put(`/api/productos/${producto.id}`, {
        idTipoProducto: producto.idTipoProducto,
        idUnidadMedida: producto.idUnidadMedida,
        precio,
        costoUnitario,
        descuentoPorcentaje,
      })
      onProductoActualizado?.(data)
      setEsError(false)
      setMensaje('Precios y descuento del producto actualizados.')
    } catch (error) {
      setEsError(true)
      setMensaje(error?.response?.data?.mensaje || error?.response?.data?.error || 'No se pudieron actualizar los precios.')
    } finally {
      setGuardandoProducto(false)
    }
  }
  useEffect(() => { cargarHistorial() }, [cargarHistorial])

  async function handleGuardar(e) {
    e.preventDefault()
    setMensaje('')
    const objetivo = Number(nuevaCantidad)
    const diferencia = objetivo - stockActual

    if (!Number.isFinite(objetivo) || objetivo < 0) {
      setEsError(true)
      setMensaje('Ingresa una cantidad válida, igual o mayor que cero.')
      return
    }
    if (diferencia === 0) {
      setEsError(true)
      setMensaje('La cantidad nueva debe ser diferente al stock actual.')
      return
    }
    if (!motivo.trim()) {
      setEsError(true)
      setMensaje('El motivo es obligatorio.')
      return
    }

    setGuardando(true)
    try {
      const response = await api.post('/api/inventario/ajustar', {
        idProducto: producto.id,
        idSucursal: Number(idSucursal),
        cantidad: Math.abs(diferencia),
        operacion: diferencia > 0 ? 'suma' : 'resta',
        motivo: motivo.trim(),
      })
      onAjusteGuardado?.(response.data.inventario_actualizado)
      setEsError(false)
      setMensaje('Ajuste guardado y registrado en el historial.')
      await cargarHistorial()
    } catch (error) {
      setEsError(true)
      setMensaje(errorMessage(error, 'No se pudo guardar el ajuste.'))
    } finally {
      setGuardando(false)
    }
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
          <div className="grid grid-cols-2 sm:grid-cols-3 text-sm gap-2">
            {stockPorSucursal.map((sucursal) => (
              <div key={sucursal.nombre} className="min-w-0">
                <p className="text-xs text-gray-500 break-words">{sucursal.nombre}</p>
                <p className="font-semibold text-white">{sucursal.valor}</p>
              </div>
            ))}
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
              <p className="text-xs text-gray-500">Precio de compra</p>
              <p className="font-semibold text-white">{formatoCOP.format(producto.compra)}</p>
            </div>
            {Number(producto.descuentoPorcentaje) > 0 && (
              <div>
                <p className="text-xs text-gray-500">Con descuento ({Number(producto.descuentoPorcentaje)} %)</p>
                <p className="font-semibold text-emerald-400">{formatoCOP.format(producto.precio * (1 - Number(producto.descuentoPorcentaje) / 100))}</p>
              </div>
            )}
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

        <form onSubmit={handleGuardarPrecios} className="border border-panel-border rounded-lg p-3 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-300">Editar precios y descuento del producto</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Precio de venta
              <input type="number" min="0.01" step="0.01" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Precio de compra
              <input type="number" min="0.01" step="0.01" value={costoCompra} onChange={(e) => setCostoCompra(e.target.value)} className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none" />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-xs text-gray-400">
              Descuento (%) · se aplica automáticamente en las ventas
              <input type="number" min="0" max="100" step="0.01" value={descuento} onChange={(e) => setDescuento(e.target.value)} className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none" />
            </label>
          </div>
          <button type="submit" disabled={guardandoProducto} className="flex items-center justify-center gap-2 bg-panel-bg border border-panel-border text-gray-200 font-semibold text-sm rounded-lg py-2 hover:bg-white/5 disabled:opacity-50">
            <Save size={15} /> {guardandoProducto ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {mensaje && (
            <p role="status" className={`text-xs text-center ${esError ? 'text-red-400' : 'text-emerald-400'}`}>
              {mensaje}
            </p>
          )}
        </form>

        <form onSubmit={handleGuardar} className="border border-brand-yellow/40 rounded-lg p-3 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <Boxes size={14} className="text-brand-yellow" /> Ajustar Inventario
          </p>

          {sucursales.length > 1 && (
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Sucursal
              <select
                value={idSucursal}
                onChange={(e) => setIdSucursal(Number(e.target.value))}
                className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none"
              >
                {sucursales.map((sucursal) => (
                  <option key={sucursal.idSucursal} value={sucursal.idSucursal}>{sucursal.nombreSucursal}</option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Stock final
              <input
                type="number"
                step="0.01"
                min="0"
                value={nuevaCantidad}
                onChange={(e) => setNuevaCantidad(e.target.value)}
                className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Motivo (se guarda en la base)
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={255}
                className="bg-panel-bg border border-panel-border rounded-lg px-2.5 py-2 text-sm text-gray-200 outline-none"
                placeholder="Ej. Corrección de stock"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="flex items-center justify-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg py-2 hover:brightness-95 transition"
          >
            <Save size={15} /> {guardando ? 'Guardando...' : 'Guardar Ajustes'}
          </button>
          {mensaje && (
            <p role="status" className={`text-xs text-center ${esError ? 'text-red-400' : 'text-emerald-400'}`}>
              {mensaje}
            </p>
          )}
        </form>
      </div>

      <div className="border border-panel-border rounded-lg">
        <button
          onClick={() => setHistorialAbierto((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-300"
        >
          <span className="flex items-center gap-1.5">
            <History size={14} className="text-brand-yellow" /> Historial de Ajustes
          </span>
          <ChevronRight size={15} className={`transition-transform ${historialAbierto ? 'rotate-90' : ''}`} />
        </button>

        {historialAbierto && (
          <div className="border-t border-panel-border px-3 py-2 flex flex-col gap-2">
            {cargandoHistorial && <p className="text-xs text-gray-500">Cargando historial...</p>}
            {errorHistorial && (
              <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-red-400">
                <span>{errorHistorial}</span>
                <button type="button" className="underline" onClick={cargarHistorial}>Reintentar</button>
              </div>
            )}
            {!cargandoHistorial && !errorHistorial && historial.length === 0 && (
              <p className="text-xs text-gray-500">No hay ajustes registrados para esta sucursal.</p>
            )}
            {historial.map((ajuste) => {
              const entrada = ajuste.esEntrada
              const cantidad = Number(ajuste.cantidadAjustada)
              return (
                <div key={ajuste.idAjusteInventario} className="flex flex-col gap-1 border-b border-panel-border/60 pb-2 last:border-0 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">{new Date(ajuste.fecha).toLocaleString('es-CO')}</span>
                    <span className={entrada ? 'text-emerald-400' : 'text-red-400'}>
                      {entrada ? '+' : '-'}{cantidad}
                    </span>
                  </div>
                  <span className="text-gray-300">{ajuste.motivo}</span>
                  <span className="text-gray-500">{ajuste.nombreUsuario} · {ajuste.tipoMovimiento}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}