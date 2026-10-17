import { useEffect, useMemo, useState } from 'react'
import { FiPlus, FiShoppingCart, FiTrash2 } from 'react-icons/fi'
import {
  buscarClientePorDocumento,
  buscarProductos,
  listarCatalogosVenta,
  obtenerFactura,
  registrarCliente,
  registrarDomicilio,
  registrarVenta,
} from '../../api/vendedor'

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

function mensajeError(error) {
  return error.response?.data?.mensaje || error.response?.data?.error || 'No se pudo completar la operación.'
}

export default function NuevaVentaIntegrada({ idSucursal }) {
  const [catalogos, setCatalogos] = useState({ tiposVenta: [], metodosPago: [], tiposDocumento: [] })
  const [productosEncontrados, setProductosEncontrados] = useState([])
  const [consultaProducto, setConsultaProducto] = useState('')
  const [consultaCliente, setConsultaCliente] = useState('')
  const [seleccionCliente, setSeleccionCliente] = useState(null)
  const [estadoBusquedaCliente, setEstadoBusquedaCliente] = useState('inicial')
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    idTipoDocumento: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    direccion: '',
    barrio: '',
    telefono: '',
    correoElectronico: '',
  })
  const [carrito, setCarrito] = useState([])
  const [tipoVenta, setTipoVenta] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
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

  const total = useMemo(
    () => carrito.reduce((suma, item) => suma + Number(item.precio) * Number(item.cantidad), 0),
    [carrito],
  )
  const tipoVentaSeleccionado = catalogos.tiposVenta.find(
    (tipo) => Number(tipo.idTipoVenta) === Number(tipoVenta),
  )
  const esDomicilio = tipoVentaSeleccionado?.nombre.trim().toLowerCase() === 'domicilio'

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

  async function buscarCliente() {
    const documento = consultaCliente.trim()
    setError('')
    setSeleccionCliente(null)
    setEstadoBusquedaCliente('buscando')
    if (!documento) {
      setEstadoBusquedaCliente('inicial')
      return setError('Escribe la cédula o documento del cliente.')
    }

    try {
      const { data } = await buscarClientePorDocumento(documento)
      const cliente = data.items?.[0]
      if (cliente) {
        setSeleccionCliente(cliente)
        setDireccionEntrega(cliente.direccion || '')
        setEstadoBusquedaCliente('encontrado')
      } else {
        setNuevoCliente((actual) => ({ ...actual, idTipoDocumento: '', primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '', direccion: '', barrio: '', telefono: '', correoElectronico: '' }))
        setEstadoBusquedaCliente('no-encontrado')
      }
    } catch (err) {
      setEstadoBusquedaCliente('inicial')
      setError(mensajeError(err))
    }
  }

  function cambiarCampoCliente(evento) {
    const { name, value } = evento.target
    setNuevoCliente((actual) => ({ ...actual, [name]: value }))
  }

  async function guardarCliente() {
    setError('')
    if (!consultaCliente.trim()) return setError('Escribe la cédula del cliente antes de guardarlo.')
    const payload = {
      idTipoDocumento: Number(nuevoCliente.idTipoDocumento),
      numeroDocumento: consultaCliente.trim(),
      primerNombre: nuevoCliente.primerNombre.trim(),
      segundoNombre: nuevoCliente.segundoNombre.trim() || null,
      primerApellido: nuevoCliente.primerApellido.trim(),
      segundoApellido: nuevoCliente.segundoApellido.trim() || null,
      direccion: nuevoCliente.direccion.trim() || null,
      barrio: nuevoCliente.barrio.trim() || null,
      telefono: nuevoCliente.telefono.trim() || null,
      correoElectronico: nuevoCliente.correoElectronico.trim() || null,
    }
    if (!payload.idTipoDocumento || !payload.primerNombre || !payload.primerApellido) {
      return setError('Selecciona el tipo de documento e ingresa el primer nombre y apellido.')
    }
    setGuardandoCliente(true)
    try {
      const { data } = await registrarCliente(payload)
      setSeleccionCliente(data)
      setDireccionEntrega(data.direccion || '')
      setEstadoBusquedaCliente('encontrado')
    } catch (err) {
      if (err.response?.status === 409) {
        try {
          const { data } = await buscarClientePorDocumento(payload.numeroDocumento)
          const clienteExistente = data.items?.[0]
          if (clienteExistente) {
            setSeleccionCliente(clienteExistente)
            setEstadoBusquedaCliente('encontrado')
            setError('Ese documento ya estaba registrado; se seleccionó el cliente existente.')
            return
          }
        } catch {
          setError('El documento ya está registrado, pero no se pudo recuperar el cliente. Vuelve a buscarlo.')
          return
        }
      }
      setError(mensajeError(err))
    } finally {
      setGuardandoCliente(false)
    }
  }

  async function procesarVenta(evento) {
    evento.preventDefault()
    setError('')
    setResultado(null)
    if (!idSucursal) return setError('La sesión no tiene una sucursal asignada.')
    if (!carrito.length) return setError('Agrega al menos un producto.')
    if (!tipoVenta || !metodoPago) return setError('Selecciona el tipo de venta y el método de pago.')
    if (consultaCliente.trim() && !seleccionCliente) return setError('Busca y selecciona el cliente, o completa su registro antes de procesar la venta.')
    if (esDomicilio && !seleccionCliente) return setError('Selecciona un cliente para el domicilio.')

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
      const respuesta = esDomicilio
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
      setResultado({ factura, total: venta.total ?? venta.totalVenta, idVenta, domicilio: esDomicilio })
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex-1 text-xs text-gray-400" htmlFor="cliente-venta">Cédula o número de documento
            <input
              id="cliente-venta"
              className={`${campo} mt-1`}
              value={consultaCliente}
              onChange={(evento) => {
                setConsultaCliente(evento.target.value)
                setSeleccionCliente(null)
                setEstadoBusquedaCliente('inicial')
              }}
              onKeyDown={(evento) => { if (evento.key === 'Enter') { evento.preventDefault(); buscarCliente() } }}
              placeholder="Escribe el documento y busca"
              disabled={Boolean(seleccionCliente)}
            />
          </label>
          {!seleccionCliente && <button type="button" onClick={buscarCliente} disabled={estadoBusquedaCliente === 'buscando'} className="mt-auto h-10 border border-[#444] px-4 text-sm text-white hover:border-[#F2B01E] disabled:opacity-60">
            {estadoBusquedaCliente === 'buscando' ? 'Buscando...' : 'Buscar cliente'}
          </button>}
        </div>
        {seleccionCliente && <div className="flex flex-wrap items-center justify-between gap-3 border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-100">
          <div><strong>{seleccionCliente.primerNombre} {seleccionCliente.segundoNombre || ''} {seleccionCliente.primerApellido} {seleccionCliente.segundoApellido || ''}</strong><div className="text-xs text-emerald-200/70">Documento {seleccionCliente.numeroDocumento} · {seleccionCliente.telefono || 'Sin teléfono'} · {seleccionCliente.correoElectronico || 'Sin correo'}</div></div>
          <button type="button" onClick={() => { setSeleccionCliente(null); setConsultaCliente(''); setEstadoBusquedaCliente('inicial') }} className="text-xs text-[#F2B01E]">Cambiar cliente</button>
        </div>}
        {estadoBusquedaCliente === 'no-encontrado' && <div className="space-y-4 border border-[#333] p-4">
          <div><h4 className="text-sm font-semibold text-white">Cliente no encontrado</h4><p className="mt-1 text-xs text-gray-400">Completa estos datos para guardarlo y asociarlo a la venta.</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-gray-400">Tipo de documento
              <select required name="idTipoDocumento" value={nuevoCliente.idTipoDocumento} onChange={cambiarCampoCliente} className={campo}>
                <option value="">Selecciona</option>
                {catalogos.tiposDocumento.map((tipo) => <option key={tipo.idTipoDocumento} value={tipo.idTipoDocumento}>{tipo.acronimo} · {tipo.nombre}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-400">Cédula / documento
              <input readOnly value={consultaCliente} className={`${campo} opacity-70`} />
            </label>
            <label className="text-xs text-gray-400">Primer nombre
              <input required maxLength="150" name="primerNombre" value={nuevoCliente.primerNombre} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Segundo nombre
              <input maxLength="150" name="segundoNombre" value={nuevoCliente.segundoNombre} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Primer apellido
              <input required maxLength="150" name="primerApellido" value={nuevoCliente.primerApellido} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Segundo apellido
              <input maxLength="150" name="segundoApellido" value={nuevoCliente.segundoApellido} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Dirección
              <input maxLength="50" name="direccion" value={nuevoCliente.direccion} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Barrio
              <input maxLength="50" name="barrio" value={nuevoCliente.barrio} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400">Teléfono
              <input maxLength="20" name="telefono" value={nuevoCliente.telefono} onChange={cambiarCampoCliente} className={campo} />
            </label>
            <label className="text-xs text-gray-400 md:col-span-2">Correo electrónico
              <input type="email" maxLength="100" name="correoElectronico" value={nuevoCliente.correoElectronico} onChange={cambiarCampoCliente} className={campo} />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="button" disabled={guardandoCliente || !catalogos.tiposDocumento.length} onClick={guardarCliente} className="bg-[#F2B01E] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
              {guardandoCliente ? 'Guardando cliente...' : 'Guardar y usar en esta venta'}
            </button>
          </div>
        </div>}
        {!seleccionCliente && estadoBusquedaCliente === 'inicial' && <p className="text-xs text-gray-500">Cliente opcional para venta de mostrador. Si lo identificas por documento, sus datos quedan guardados para futuras compras.</p>}
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
        {esDomicilio && <label className="text-xs text-gray-400 md:col-span-3">Dirección de entrega
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
            <FiPlus /> {cargando ? 'Procesando...' : esDomicilio ? 'Registrar domicilio' : 'Procesar venta'}
          </button>
        </div>
      </div>
    </form>
  )
}