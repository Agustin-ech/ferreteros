import { useEffect, useState } from 'react'
import { FiCheck, FiRotateCcw, FiSearch } from 'react-icons/fi'
import { listarCatalogosVenta, listarVentas, registrarDevolucion } from '../../api/vendedor'

function mensajeError(error) {
  return error.response?.data?.mensaje
    || (error.response?.data?.errores_validacion && JSON.stringify(error.response.data.errores_validacion))
    || 'No se pudo completar la operación.'
}

export default function RegistrarDevolucionIntegrada() {
  const [catalogos, setCatalogos] = useState([])
  const [numeroFactura, setNumeroFactura] = useState('')
  const [venta, setVenta] = useState(null)
  const [idTipoDevolucion, setIdTipoDevolucion] = useState('')
  const [motivo, setMotivo] = useState('')
  const [seleccion, setSeleccion] = useState({})
  const [buscando, setBuscando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [confirmacion, setConfirmacion] = useState('')

  useEffect(() => {
    listarCatalogosVenta()
      .then(({ data }) => setCatalogos(data.tiposDevolucion || []))
      .catch((err) => setError(mensajeError(err)))
  }, [])

  async function buscarFactura(evento) {
    evento.preventDefault()
    setError('')
    setConfirmacion('')
    setVenta(null)
    setSeleccion({})
    if (!numeroFactura.trim()) return setError('Escribe el número de factura.')
    setBuscando(true)
    try {
      const { data } = await listarVentas({ factura: numeroFactura.trim(), pagina: 1, por_pagina: 1 })
      if (!data.data?.length) {
        setError('No se encontró una venta visible con ese número de factura.')
        return
      }
      setVenta(data.data[0])
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setBuscando(false)
    }
  }

  async function enviarDevolucion(evento) {
    evento.preventDefault()
    setError('')
    setConfirmacion('')
    if (!venta?.factura?.idFactura) return setError('Busca primero una factura válida.')
    const detalles = Object.entries(seleccion)
      .filter(([, detalle]) => detalle.seleccionado)
      .map(([idDetalleVenta, detalle]) => ({
        idDetalleVenta: Number(idDetalleVenta),
        cantidadDevuelta: Number(detalle.cantidadDevuelta),
        productoApto: detalle.productoApto,
      }))
    if (!detalles.length) return setError('Selecciona al menos un producto para devolver.')
    if (!idTipoDevolucion || motivo.trim().length < 3) return setError('Selecciona un tipo y escribe un motivo de al menos 3 caracteres.')

    setEnviando(true)
    try {
      const { data } = await registrarDevolucion({
        idFactura: Number(venta.factura.idFactura),
        idTipoDevolucion: Number(idTipoDevolucion),
        motivo: motivo.trim(),
        detalles,
      })
      setConfirmacion(`Devolución #${data.data.idDevolucion} registrada. Monto: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.data.montoTotal)}.`)
      setSeleccion({})
      setMotivo('')
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header>
        <h2 className="text-2xl font-bold text-white">Registrar devolución</h2>
        <p className="mt-1 text-sm text-gray-400">Busca la factura para seleccionar los detalles originales de la venta.</p>
      </header>

      <form onSubmit={buscarFactura} className="flex flex-col gap-3 border-y border-[#2a2a2a] py-5 sm:flex-row">
        <label className="flex-1 text-xs text-gray-400">Número de factura
          <input value={numeroFactura} onChange={(evento) => setNumeroFactura(evento.target.value)} className="mt-1 w-full border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white" placeholder="FAC-..." />
        </label>
        <button disabled={buscando} className="mt-auto flex items-center justify-center gap-2 bg-[#F2B01E] px-5 py-2 text-sm font-semibold text-black disabled:opacity-60"><FiSearch /> {buscando ? 'Buscando...' : 'Buscar factura'}</button>
      </form>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {confirmacion && <p role="status" className="border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-200">{confirmacion}</p>}

      {venta && <form onSubmit={enviarDevolucion} className="space-y-5">
        <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-300">
          <span>Factura <strong className="text-white">{venta.factura.numeroFactura}</strong></span>
          <span>Venta #{venta.idVenta} · {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(venta.total)}</span>
        </div>
        <div className="overflow-x-auto border-y border-[#2a2a2a]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[#333] text-xs text-gray-400"><tr><th className="py-3">Devolver</th><th>Producto</th><th>Vendida</th><th>Cantidad a devolver</th><th>Producto apto</th></tr></thead>
            <tbody className="divide-y divide-[#252525] text-gray-200">
              {venta.detalles.map((detalle) => {
                const valor = seleccion[detalle.idDetalleVenta] || { seleccionado: false, cantidadDevuelta: detalle.cantidad, productoApto: false }
                return <tr key={detalle.idDetalleVenta}>
                  <td className="py-3"><input type="checkbox" checked={valor.seleccionado} onChange={(evento) => setSeleccion((actual) => ({ ...actual, [detalle.idDetalleVenta]: { ...valor, seleccionado: evento.target.checked } }))} aria-label={`Devolver ${detalle.nombreProducto}`} /></td>
                  <td>{detalle.nombreProducto} <span className="text-xs text-gray-500">(detalle #{detalle.idDetalleVenta})</span></td>
                  <td>{detalle.cantidad}</td>
                  <td><input type="number" min="0.01" max={detalle.cantidad} step="0.01" value={valor.cantidadDevuelta} onChange={(evento) => setSeleccion((actual) => ({ ...actual, [detalle.idDetalleVenta]: { ...valor, cantidadDevuelta: evento.target.value } }))} className="w-28 border border-[#333] bg-[#1f1f1f] px-2 py-1" /></td>
                  <td><input type="checkbox" checked={valor.productoApto} onChange={(evento) => setSeleccion((actual) => ({ ...actual, [detalle.idDetalleVenta]: { ...valor, productoApto: evento.target.checked } }))} aria-label={`Producto apto: ${detalle.nombreProducto}`} /></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-gray-400">Tipo de devolución
            <select required value={idTipoDevolucion} onChange={(evento) => setIdTipoDevolucion(evento.target.value)} className="mt-1 w-full border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white">
              <option value="">Selecciona</option>
              {catalogos.map((tipo) => <option key={tipo.idTipoDevolucion} value={tipo.idTipoDevolucion}>{tipo.nombre}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400">Motivo
            <input required minLength="3" maxLength="255" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} className="mt-1 w-full border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white" />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-[#2a2a2a] pt-4">
          <button type="button" onClick={() => { setVenta(null); setNumeroFactura(''); setSeleccion({}); setError('') }} className="flex items-center gap-2 border border-[#444] px-4 py-2 text-sm text-gray-200"><FiRotateCcw /> Limpiar</button>
          <button disabled={enviando} className="flex items-center gap-2 bg-[#F2B01E] px-5 py-2 text-sm font-semibold text-black disabled:opacity-60"><FiCheck /> {enviando ? 'Registrando...' : 'Registrar devolución'}</button>
        </div>
      </form>}
    </div>
  )
}