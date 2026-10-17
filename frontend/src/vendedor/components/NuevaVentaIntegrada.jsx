import { useEffect, useMemo, useState } from 'react'
import { FiPlus, FiShoppingCart, FiTrash2 } from 'react-icons/fi'
import {
  buscarClientes,
  buscarProductos,
  listarCatalogosVenta,
  obtenerFactura,
  registrarDomicilio,
  registrarVenta,
} from '../../api/vendedor'

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

function mensajeError(error) {
  return error.response?.data?.mensaje || error.response?.data?.error || 'No se pudo completar la operación.'
}

export default function NuevaVentaIntegrada({ idSucursal }) {
  const [catalogos, setCatalogos] = useState({ tiposVenta: [], metodosPago: [] })
  const [productosEncontrados, setProductosEncontrados] = useState([])
  const [clientesEncontrados, setClientesEncontrados] = useState([])
  const [consultaProducto, setConsultaProducto] = useState('')
  const [consultaCliente, setConsultaCliente] = useState('')
  const [seleccionCliente, setSeleccionCliente] = useState(null)
  const [carrito, setCarrito] = useState([])
  const [tipoVenta, setTipoVenta] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [domicilio, setDomicilio] = useState(false)
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    let vigente = true
    listarCatalogosVenta()
      .then(({ data }) => {
        if (vigente) setCatalogos(data)
      })
      .catch((err) => {
        if (vigente) setError(mensajeError(err))
      })
    return () => { vigente = false }
  }, [])

  useEffect(() => {
    let vigente = true
    if (!consultaProducto.trim()) {
      setProductosEncontrados([])
      return () => { vigente = false }
    }
    buscarProductos(consultaProducto.trim())
      .then(({ data }) => {
        if (vigente) setProductosEncontrados(data.filter((producto) => producto.activo !== false))
      })
      .catch((err) => {
        if (vigente) setError(mensajeError(err))
      })
    return () => { vigente = false }
  }, [consultaProducto])

  useEffect(() => {
    let vigente = true
    if (consultaCliente.trim().length < 2) {
      setClientesEncontrados([])
      return () => { vigente = false }
    }
    buscarClientes(consultaCliente.trim())
      .then(({ data }) => {
        if (vigente) setClientesEncontrados(data.items || [])
      })
      .catch((err) => {
        if (vigente) setError(mensajeError(err))
      })
    return () => { vigente = false }
  }, [consultaCliente])

  const total = useMemo(
    () => carrito.reduce((suma, item) => suma + Number(item.precio) * Number(item.cantidad), 0),
    [carrito],
  )

  function agregarProducto(producto) {
    setCarrito((actual) => {
      const existente = actual.find((item) => item.idProducto === producto.idProducto)
      if (existente) {
        return actual.map((item) => item.idProducto === producto.idProducto
          ? { ...item, cantidad: Number(item.cantidad) + 1 }
          : item)
      }
      return [...actual, { ...producto, cantidad: 1 }]
    })
    setConsultaProducto('')
    setProductosEncontrados([])
    setError('')
  }

  function cambiarCantidad(idProducto, cantidad) {
    setCarrito((actual) => actual.map((item) => item.idProducto === idProducto
      ? { ...item, cantidad }
      : item))
  }

  async function procesarVenta(evento) {
    evento.preventDefault()
    setError('')
    setResultado(null)
    if (!idSucursal) return setError('La sesión no tiene una sucursal asignada.')
    if (!carrito.length) return setError('Agrega al menos un producto.')
    if (!tipoVenta || !metodoPago) return setError('Selecciona el tipo de venta y el método de pago.')
    if (domicilio && !seleccionCliente) return setError('Selecciona un cliente para el domicilio.')

    const payload = {
      idSucursal: Number(idSucursal),
      idTipoVenta: Number(tipoVenta),
      metodoPago,
      detalles: carrito.map(({ idProducto, cantidad }) => ({
        idProducto: Number(idProducto),
        cantidad: Number(cantidad),
      })),
    }

    setCargando(true)
    try {
      const respuesta = domicilio
        ? await registrarDomicilio({
          ...payload,
          idCliente: Number(seleccionCliente.idCliente),
          direccionEntrega: direccionEntrega.trim() || null,
        })
        : await registrarVenta({
          ...payload,
          idCliente: seleccionCliente ? Number(seleccionCliente.idCliente) : null,
        })
      const venta = respuesta.data.data
      const idVenta = venta.idVenta
      const factura = idVenta ? (await obtenerFactura(idVenta)).data : venta.factura
      setResultado({ factura, total: venta.total ?? venta.totalVenta, idVenta, domicilio })
      setCarrito([])
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  const campo = 'w-full rounded-md border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none focus:border-[#F2B01E]'

  return (
    <form onSubmit={procesarVenta} className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-white"><FiShoppingCart className="text-[#F2B01E]" /> Nueva venta</h2>
        <p className="mt-1 text-sm text-gray-400">Los precios, el inventario y la factura se confirman en el servidor.</p>
      </header>

      <section className="space-y-4 border-y border-[#2a2a2a] py-5">
        <h3 className="text-sm font-semibold text-gray-200">Cliente</h3>
        <div className="relative">
          <label className="mb-1 block text-xs text-gray-400" htmlFor="cliente-venta">Buscar por nombre o documento</label>
          <input
            id="cliente-venta"
            className={campo}
            value={seleccionCliente ? `${seleccionCliente.primerNombre} ${seleccionCliente.primerApellido} (${seleccionCliente.numeroDocumento})` : consultaCliente}
            onChange={(evento) => { setSeleccionCliente(null); setConsultaCliente(evento.target.value) }}
            placeholder="Escribe al menos dos caracteres"
          />
          {clientesEncontrados.length > 0 && !seleccionCliente && (
            <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-auto border border-[#333] bg-[#151515] shadow-lg">
              {clientesEncontrados.map((cliente) => (
                <li key={cliente.idCliente}>
                  <button type="button" onClick={() => { setSeleccionCliente(cliente); setConsultaCliente(''); setClientesEncontrados([]) }} className="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#292929]">
                    {cliente.primerNombre} {cliente.segundoNombre || ''} {cliente.primerApellido} {cliente.segundoApellido || ''} · {cliente.numeroDocumento}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {seleccionCliente && <button type="button" onClick={() => setSeleccionCliente(null)} className="text-xs text-[#F2B01E]">Quitar cliente seleccionado</button>}
      </section>

      <section className="grid gap-4 border-b border-[#2a2a2a] pb-5 md:grid-cols-3">
        <label className="text-xs text-gray-400">Tipo de venta
          <select required value={tipoVenta} onChange={(evento) => setTipoVenta(evento.target.value)} className={`${campo} mt-1`}>
            <option value="">Selecciona</option>
            {catalogos.tiposVenta.map((tipo) => <option key={tipo.idTipoVenta} value={tipo.idTipoVenta}>{tipo.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-400">Método de pago
          <select required value={metodoPago} onChange={(evento) => setMetodoPago(evento.target.value)} className={`${campo} mt-1`}>
            <option value="">Selecciona</option>
            {catalogos.metodosPago.map((metodo) => <option key={metodo.idMetodoPago} value={metodo.nombre}>{metodo.nombre}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-200">
          <input type="checkbox" checked={domicilio} onChange={(evento) => setDomicilio(evento.target.checked)} /> Entrega a domicilio
        </label>
        {domicilio && <label className="text-xs text-gray-400 md:col-span-3">Dirección de entrega
          <input className={`${campo} mt-1`} value={direccionEntrega} onChange={(evento) => setDireccionEntrega(evento.target.value)} placeholder="Usa la dirección del cliente o escribe otra" />
        </label>}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Productos</h3>
        <div className="relative flex gap-2">
          <input className={campo} value={consultaProducto} onChange={(evento) => setConsultaProducto(evento.target.value)} placeholder="Buscar por código o nombre" />
          {productosEncontrados.length > 0 && (
            <ul className="absolute left-0 top-full z-10 mt-1 max-h-56 w-full overflow-auto border border-[#333] bg-[#151515] shadow-lg">
              {productosEncontrados.map((producto) => (
                <li key={producto.idProducto}>
                  <button type="button" onClick={() => agregarProducto(producto)} className="flex w-full justify-between gap-4 px-3 py-2 text-left text-sm text-white hover:bg-[#292929]">
                    <span>{producto.codigoSKU} · {producto.nombre}</span><span>{moneda.format(producto.precio)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-[#333] text-xs text-gray-400"><tr><th className="py-2">Código</th><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>Subtotal</th><th /></tr></thead>
            <tbody className="divide-y divide-[#292929] text-gray-200">
              {carrito.map((item) => (
                <tr key={item.idProducto}>
                  <td className="py-3">{item.codigoSKU}</td><td>{item.nombre}</td>
                  <td><input aria-label={`Cantidad de ${item.nombre}`} type="number" min="0.01" step="0.01" value={item.cantidad} onChange={(evento) => cambiarCantidad(item.idProducto, evento.target.value)} className="w-24 rounded border border-[#333] bg-[#1f1f1f] px-2 py-1" /></td>
                  <td>{moneda.format(item.precio)}</td><td>{moneda.format(Number(item.precio) * Number(item.cantidad || 0))}</td>
                  <td><button type="button" title="Quitar producto" onClick={() => setCarrito((actual) => actual.filter((producto) => producto.idProducto !== item.idProducto))} className="p-2 text-gray-400 hover:text-red-400"><FiTrash2 /></button></td>
                </tr>
              ))}
              {carrito.length === 0 && <tr><td colSpan="6" className="py-6 text-center text-gray-500">Busca y agrega productos a la venta.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col items-end gap-4 border-t border-[#2a2a2a] pt-5">
        <p className="text-lg font-semibold text-white">Total estimado: <span className="text-[#F2B01E]">{moneda.format(total)}</span></p>
        {error && <p role="alert" className="w-full text-sm text-red-400">{error}</p>}
        {resultado && <div role="status" className="w-full border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          {resultado.domicilio ? 'Domicilio registrado' : 'Venta registrada'} · Factura {resultado.factura?.numeroFactura || resultado.factura?.idFactura || 'generada'} · Total {moneda.format(resultado.factura?.total ?? resultado.total ?? 0)}
        </div>}
        <div className="flex gap-3">
          <button type="button" onClick={() => { setCarrito([]); setResultado(null); setError('') }} className="border border-[#444] px-4 py-2 text-sm text-gray-200 hover:bg-[#242424]">Vaciar</button>
          <button disabled={cargando || !idSucursal} type="submit" className="flex items-center gap-2 bg-[#F2B01E] px-5 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
            <FiPlus /> {cargando ? 'Procesando...' : domicilio ? 'Registrar domicilio' : 'Procesar venta'}
          </button>
        </div>
      </div>
    </form>
  )
}