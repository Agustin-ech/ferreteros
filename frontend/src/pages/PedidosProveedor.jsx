import { useEffect, useMemo, useState } from 'react'
import { Plus, Truck, X } from 'lucide-react'
import api from '../api/client'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 2,
})

const ESTADO_ESTILO = {
  Pendiente: 'text-amber-300 bg-amber-400/10',
  Parcial: 'text-blue-300 bg-blue-400/10',
  Recibido: 'text-green-300 bg-green-400/10',
  Cancelado: 'text-red-300 bg-red-400/10',
}

function nuevoDetalle() {
  return { idProducto: '', cantidadPedida: '1', precioUnitario: '' }
}

function mensajeDeError(error, mensaje) {
  return error.response?.data?.error || `${mensaje} Verifica la conexión con el servidor.`
}

function FormularioPedido({ sucursales, proveedores, productos, onCerrar, onCreado }) {
  const [idProveedor, setIdProveedor] = useState('')
  const [idSucursal, setIdSucursal] = useState('')
  const [detalles, setDetalles] = useState([nuevoDetalle()])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const total = detalles.reduce((suma, detalle) => (
    suma + (Number(detalle.cantidadPedida) || 0) * (Number(detalle.precioUnitario) || 0)
  ), 0)

  function actualizarDetalle(indice, campo, valor) {
    setDetalles((actuales) => actuales.map((detalle, i) => {
      if (i !== indice) return detalle
      if (campo === 'idProducto') {
        const producto = productos.find((item) => String(item.idProducto) === valor)
        return {
          ...detalle,
          idProducto: valor,
          precioUnitario: producto ? String(producto.costoUnitario) : '',
        }
      }
      return { ...detalle, [campo]: valor }
    }))
  }

  async function guardar(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const respuesta = await api.post('/api/proveedores/pedidos', {
        idProveedor: Number(idProveedor),
        idSucursal: Number(idSucursal),
        detalles: detalles.map((detalle) => ({
          idProducto: Number(detalle.idProducto),
          cantidadPedida: Number(detalle.cantidadPedida),
          precioUnitario: Number(detalle.precioUnitario),
        })),
      })
      onCreado(respuesta.data)
    } catch (requestError) {
      const mensaje = mensajeDeError(requestError, 'No se pudo registrar el pedido.')
      const campos = Object.values(requestError.response?.data?.detalles || {}).flat()
      setError(campos.length ? `${mensaje} ${campos.join(' ')}` : mensaje)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={guardar} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-panel-border bg-panel-card p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Registrar orden al proveedor</h2>
            <p className="mt-1 text-xs text-gray-500">El pedido se guardará con estado Pendiente.</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        {error && <p role="alert" className="mb-4 text-sm text-red-400">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Proveedor
            <select required value={idProveedor} onChange={(evento) => setIdProveedor(evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200">
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.idProveedor} value={proveedor.idProveedor}>{proveedor.nombreEmpresa}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Sucursal de entrega
            <select required value={idSucursal} onChange={(evento) => setIdSucursal(evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200">
              <option value="">Selecciona una sucursal</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.idSucursal} value={sucursal.idSucursal}>{sucursal.nombreSucursal}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Productos</h3>
          <button type="button" onClick={() => setDetalles((actuales) => [...actuales, nuevoDetalle()])} className="flex items-center gap-1 text-xs text-brand-yellow hover:underline">
            <Plus size={14} /> Agregar producto
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {detalles.map((detalle, indice) => {
            const seleccionados = detalles
              .filter((_, i) => i !== indice)
              .map((item) => item.idProducto)
            return (
              <div key={indice} className="grid items-end gap-2 rounded-lg border border-panel-border p-3 sm:grid-cols-[minmax(0,1fr)_110px_150px_32px]">
                <label className="flex min-w-0 flex-col gap-1 text-xs text-gray-400">
                  Producto
                  <select required value={detalle.idProducto} onChange={(evento) => actualizarDetalle(indice, 'idProducto', evento.target.value)} className="min-w-0 rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200">
                    <option value="">Selecciona un producto</option>
                    {productos
                      .filter((producto) => !seleccionados.includes(String(producto.idProducto)))
                      .map((producto) => (
                        <option key={producto.idProducto} value={producto.idProducto}>
                          {producto.nombre} ({producto.codigoSKU})
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Cantidad
                  <input required type="number" min="0.01" step="0.01" value={detalle.cantidadPedida} onChange={(evento) => actualizarDetalle(indice, 'cantidadPedida', evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-400">
                  Precio unitario
                  <input required type="number" min="0.01" step="0.01" value={detalle.precioUnitario} onChange={(evento) => actualizarDetalle(indice, 'precioUnitario', evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200" />
                </label>
                <button type="button" aria-label="Quitar producto" disabled={detalles.length === 1} onClick={() => setDetalles((actuales) => actuales.filter((_, i) => i !== indice))} className="mb-2 text-gray-500 hover:text-red-400 disabled:opacity-30">
                  <X size={16} />
                </button>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-panel-border pt-4">
          <p className="text-sm text-gray-300">Total del pedido: <strong className="text-white">{formatoCOP.format(total)}</strong></p>
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="rounded-lg border border-panel-border px-4 py-2 text-sm text-gray-300">Cancelar</button>
            <button type="submit" disabled={guardando || !proveedores.length || !sucursales.length || !productos.length} className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-panel-sidebar disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Registrar orden'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function PedidosProveedor({ sucursales = [], errorSucursales = '' }) {
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [estados, setEstados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    Promise.all([
      api.get('/api/proveedores'),
      api.get('/api/productos'),
      api.get('/api/proveedores/pedidos'),
      api.get('/api/proveedores/estados'),
    ])
      .then(([proveedoresRespuesta, productosRespuesta, pedidosRespuesta, estadosRespuesta]) => {
        if (cancelado) return
        setProveedores(proveedoresRespuesta.data)
        setProductos(productosRespuesta.data.filter((producto) => producto.activo !== false))
        setPedidos(pedidosRespuesta.data)
        setEstados(estadosRespuesta.data.estados)
      })
      .catch((requestError) => {
        if (!cancelado) setError(mensajeDeError(requestError, 'No se pudieron cargar los pedidos a proveedores.'))
      })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [])

  const sucursalesActivas = useMemo(
    () => sucursales.filter((sucursal) => sucursal.activa !== false),
    [sucursales],
  )

  async function actualizarEstado(pedido, estado) {
    if (estado === pedido.estado) return
    setActualizando(pedido.idPedidoProveedor)
    setError('')
    try {
      const respuesta = await api.patch(`/api/proveedores/pedidos/${pedido.idPedidoProveedor}/estado`, { estado })
      setPedidos((actuales) => actuales.map((item) => (
        item.idPedidoProveedor === pedido.idPedidoProveedor ? respuesta.data : item
      )))
    } catch (requestError) {
      setError(mensajeDeError(requestError, 'No se pudo actualizar el estado del pedido.'))
    } finally {
      setActualizando(null)
    }
  }

  function agregarPedido(pedido) {
    setPedidos((actuales) => [pedido, ...actuales])
    setMostrarFormulario(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-yellow/15 text-brand-yellow">
            <Truck size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Órdenes a proveedores</h1>
            <p className="text-sm text-gray-500">Registra pedidos y actualiza su estado.</p>
          </div>
        </div>
        <button type="button" onClick={() => setMostrarFormulario(true)} className="flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-panel-sidebar">
          <Plus size={16} /> Nueva orden
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {errorSucursales && <p role="alert" className="text-sm text-red-400">{errorSucursales}</p>}
      <section className="overflow-hidden rounded-xl border border-panel-border bg-panel-card">
        {cargando ? (
          <p className="p-6 text-sm text-gray-400">Cargando órdenes…</p>
        ) : pedidos.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">Todavía no hay órdenes registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-panel-border text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Sucursal</th>
                  <th className="px-4 py-3">Productos</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {pedidos.map((pedido) => (
                  <tr key={pedido.idPedidoProveedor} className="align-top">
                    <td className="whitespace-nowrap px-4 py-4 text-gray-300">
                      <span className="font-medium text-white">#{pedido.idPedidoProveedor}</span>
                      <span className="mt-1 block text-xs text-gray-500">{new Date(pedido.fechaPedido).toLocaleDateString('es-CO')}</span>
                    </td>
                    <td className="px-4 py-4 text-gray-300">{pedido.proveedor.nombreEmpresa}</td>
                    <td className="px-4 py-4 text-gray-300">{pedido.sucursal.nombreSucursal}</td>
                    <td className="px-4 py-4">
                      <details className="max-w-xs">
                        <summary className="cursor-pointer text-brand-yellow">{pedido.detalles.length} producto(s)</summary>
                        <ul className="mt-2 space-y-1 text-xs text-gray-400">
                          {pedido.detalles.map((detalle) => (
                            <li key={detalle.idDetalleOrdenProveedor}>
                              {detalle.nombreProducto} — {detalle.cantidadPedida} × {formatoCOP.format(detalle.precioUnitario)}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-white">{formatoCOP.format(pedido.total)}</td>
                    <td className="px-4 py-4">
                      <select
                        aria-label={`Estado de la orden ${pedido.idPedidoProveedor}`}
                        value={pedido.estado}
                        disabled={actualizando === pedido.idPedidoProveedor}
                        onChange={(evento) => actualizarEstado(pedido, evento.target.value)}
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-medium outline-none disabled:opacity-50 ${ESTADO_ESTILO[pedido.estado] || 'bg-gray-500/10 text-gray-300'}`}
                      >
                        {estados.map((estado) => <option key={estado} value={estado} className="bg-panel-card text-gray-200">{estado}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mostrarFormulario && (
        <FormularioPedido
          sucursales={sucursalesActivas}
          proveedores={proveedores}
          productos={productos}
          onCerrar={() => setMostrarFormulario(false)}
          onCreado={agregarPedido}
        />
      )}
    </div>
  )
}
