import { useEffect, useState } from 'react'
import { FiFilter, FiRotateCcw } from 'react-icons/fi'
import { listarCatalogosVenta, listarDevoluciones } from '../../api/vendedor'

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export default function ConsultarDevolucionIntegrada() {
  const [idFacturaTexto, setIdFacturaTexto] = useState('')
  const [filtroIdFactura, setFiltroIdFactura] = useState(undefined)
  const [devoluciones, setDevoluciones] = useState([])
  const [tipos, setTipos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listarCatalogosVenta().then(({ data }) => setTipos(data.tiposDevolucion || []))
      .catch(() => setError('No se pudieron cargar los tipos de devolución.'))
  }, [])

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    const params = filtroIdFactura ? { idFactura: filtroIdFactura } : {}
    listarDevoluciones(params)
      .then(({ data }) => { if (vigente) setDevoluciones(data) })
      .catch((err) => { if (vigente) setError(err.response?.data?.mensaje || 'No se pudieron consultar las devoluciones.') })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [filtroIdFactura])

  function filtrar(evento) {
    evento.preventDefault()
    const valor = idFacturaTexto.trim()
    if (valor && (!/^\d+$/.test(valor) || Number(valor) < 1)) {
      setError('El filtro admite el ID numérico de factura.')
      return
    }
    setFiltroIdFactura(valor ? Number(valor) : undefined)
  }

  function limpiar() {
    setIdFacturaTexto('')
    setFiltroIdFactura(undefined)
  }

  const nombreTipo = (id) => tipos.find((tipo) => tipo.idTipoDevolucion === id)?.nombre || `Tipo #${id}`

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <header>
        <h2 className="text-2xl font-bold text-white">Consultar devoluciones</h2>
        <p className="mt-1 text-sm text-gray-400">Historial visible para la sucursal asociada a la sesión.</p>
      </header>
      <form onSubmit={filtrar} className="flex flex-col gap-3 border-y border-[#2a2a2a] py-5 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs text-gray-400">ID de factura (opcional)
          <input inputMode="numeric" value={idFacturaTexto} onChange={(evento) => setIdFacturaTexto(evento.target.value)} className="mt-1 w-full border border-[#333] bg-[#1f1f1f] px-3 py-2 text-sm text-white" placeholder="ID numérico recibido por la API" />
        </label>
        <button className="flex items-center justify-center gap-2 bg-[#F2B01E] px-5 py-2 text-sm font-semibold text-black"><FiFilter /> Filtrar</button>
        <button type="button" onClick={limpiar} title="Limpiar filtro" className="flex items-center justify-center border border-[#444] px-4 py-2 text-gray-300"><FiRotateCcw /></button>
      </form>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto border-y border-[#2a2a2a]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[#333] text-xs text-gray-400"><tr><th className="py-3">Devolución</th><th>Factura</th><th>Fecha</th><th>Tipo</th><th>Detalles devueltos</th><th>Monto</th><th>Estado</th></tr></thead>
          <tbody className="divide-y divide-[#252525] text-gray-200">
            {cargando && <tr><td colSpan="7" className="py-8 text-center text-gray-400">Cargando devoluciones...</td></tr>}
            {!cargando && devoluciones.length === 0 && <tr><td colSpan="7" className="py-8 text-center text-gray-400">No hay devoluciones para este filtro.</td></tr>}
            {!cargando && devoluciones.map((devolucion) => <tr key={devolucion.idDevolucion}>
              <td className="py-3">#{devolucion.idDevolucion}</td><td>#{devolucion.idFactura}</td>
              <td>{devolucion.fechaDevolucion ? new Date(devolucion.fechaDevolucion).toLocaleString('es-CO') : '—'}</td>
              <td>{nombreTipo(devolucion.idTipoDevolucion)}</td>
              <td>{devolucion.detalles?.map((detalle) => `#${detalle.idDetalleVenta} × ${detalle.cantidadDevuelta}`).join(', ') || '—'}</td>
              <td>{moneda.format(devolucion.montoTotal || 0)}</td><td>{devolucion.aprobada ? 'Aprobada' : 'Pendiente'}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}