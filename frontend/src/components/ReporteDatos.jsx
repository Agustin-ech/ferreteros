import { useEffect, useState } from 'react'
import { BarChart2, FileSpreadsheet } from 'lucide-react'
import BotonExportarPDF from './BotonExportarPDF'
import { exportarReporte, listarSucursalesReporte, obtenerReporte } from '../api/reportes'
import api from '../api/client'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 2,
})
const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

function mostrarValor(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (tipo === 'moneda' && typeof valor === 'number') return formatoCOP.format(valor)
  if (tipo === 'porcentaje' && typeof valor === 'number') return `${formatoNumero.format(valor)} %`
  if ((tipo === 'entero' || tipo === 'decimal') && typeof valor === 'number') return formatoNumero.format(valor)
  return String(valor)
}

function mensajeError(error, mensaje) {
  return error?.response?.data?.mensaje
    || error?.response?.data?.error
    || error?.message
    || mensaje
}

function parametrosReporte(desde, hasta, sucursalId, proveedorId) {
  const params = {}
  if (desde) params.desde = desde
  if (hasta) params.hasta = hasta
  if (sucursalId) params.sucursal_id = sucursalId
  if (proveedorId) params.idProveedor = proveedorId
  return params
}

function TablaSeccion({ seccion }) {
  return (
    <section className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
      <div className="px-4 pt-4 pb-2">
        <h2 className="font-semibold text-white text-sm">{seccion.nombre}</h2>
        {seccion.nota && <p className="text-xs text-gray-500 mt-1">{seccion.nota}</p>}
      </div>
      <table className="w-full text-sm min-w-max">
        <thead>
          <tr className="text-left text-gray-400 border-b border-panel-border">
            {seccion.columnas.map((columna) => (
              <th
                key={columna.clave}
                className={`py-2.5 px-4 font-medium ${columna.alineacion === 'der' ? 'text-right' : ''}`}
              >
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {seccion.filas.map((fila, indice) => (
            <tr key={indice} className="border-b border-panel-border/60 last:border-0">
              {seccion.columnas.map((columna, index) => (
                <td
                  key={columna.clave}
                  className={`py-2.5 px-4 text-gray-300 ${columna.alineacion === 'der' ? 'text-right' : ''}`}
                >
                  {mostrarValor(fila[index], columna.tipo)}
                </td>
              ))}
            </tr>
          ))}
          {seccion.totales && (
            <tr className="border-t border-panel-border bg-white/[0.02]">
              {seccion.columnas.map((columna, index) => (
                <td
                  key={columna.clave}
                  className={`py-2.5 px-4 font-semibold text-white ${columna.alineacion === 'der' ? 'text-right' : ''}`}
                >
                  {mostrarValor(seccion.totales[index], columna.tipo)}
                </td>
              ))}
            </tr>
          )}
          {seccion.filas.length === 0 && (
            <tr>
              <td colSpan={seccion.columnas.length} className="py-6 text-center text-gray-500 text-xs">
                No hay datos para este periodo y alcance.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

export default function ReporteDatos({
  codigo,
  titulo,
  descripcion,
  mostrarSucursal = true,
  mostrarProveedor = false,
}) {
  const [sucursales, setSucursales] = useState([])
  const [errorSucursales, setErrorSucursales] = useState('')
  const [proveedores, setProveedores] = useState([])
  const [errorProveedores, setErrorProveedores] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exportando, setExportando] = useState('')

  useEffect(() => {
    if (!mostrarSucursal) return undefined

    let cancelado = false
    listarSucursalesReporte()
      .then((resultado) => {
        if (!cancelado) {
          setSucursales(resultado)
          setErrorSucursales('')
        }
      })
      .catch((requestError) => {
        if (!cancelado) {
          setErrorSucursales(mensajeError(requestError, 'No se pudieron cargar las sucursales autorizadas.'))
        }
      })

    return () => { cancelado = true }
  }, [mostrarSucursal])

  useEffect(() => {
    if (!mostrarProveedor) return undefined

    let cancelado = false
    api.get('/api/proveedores')
      .then((respuesta) => {
        if (!cancelado) {
          setProveedores(respuesta.data)
          setErrorProveedores('')
        }
      })
      .catch((requestError) => {
        if (!cancelado) {
          setErrorProveedores(mensajeError(requestError, 'No se pudieron cargar los proveedores.'))
        }
      })

    return () => { cancelado = true }
  }, [mostrarProveedor])

  useEffect(() => {
    const controller = new AbortController()
    setCargando(true)
    setError('')
    setReporte(null)
    obtenerReporte(
      codigo,
      parametrosReporte(
        desde,
        hasta,
        mostrarSucursal ? sucursalId : '',
        mostrarProveedor ? proveedorId : ''
      ),
      controller.signal
    )
      .then(setReporte)
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError' && requestError.code !== 'ERR_CANCELED') {
          setError(mensajeError(requestError, 'No se pudo generar el reporte.'))
          setReporte(null)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })

    return () => controller.abort()
  }, [codigo, desde, hasta, sucursalId, proveedorId, mostrarSucursal, mostrarProveedor])

  async function descargar(formato) {
    setExportando(formato)
    setError('')
    try {
      await exportarReporte(
        codigo,
        parametrosReporte(
          desde,
          hasta,
          mostrarSucursal ? sucursalId : '',
          mostrarProveedor ? proveedorId : ''
        ),
        formato
      )
    } catch (requestError) {
      setError(mensajeError(requestError, `No se pudo exportar el reporte en ${formato.toUpperCase()}.`))
    } finally {
      setExportando('')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <BarChart2 size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">{reporte?.titulo || titulo}</h1>
            <p className="text-sm text-gray-500">{reporte?.descripcion || descripcion}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="sr-only" htmlFor={`${codigo}-desde`}>Desde</label>
          <input
            id={`${codigo}-desde`}
            type="date"
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
            className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
          />
          <span className="text-gray-500">–</span>
          <label className="sr-only" htmlFor={`${codigo}-hasta`}>Hasta</label>
          <input
            id={`${codigo}-hasta`}
            type="date"
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
            className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
          />
          {mostrarSucursal && (
            <>
              <label className="sr-only" htmlFor={`${codigo}-sucursal`}>Sucursal</label>
              <select
                id={`${codigo}-sucursal`}
                value={sucursalId}
                onChange={(event) => setSucursalId(event.target.value)}
                className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>
                ))}
              </select>
            </>
          )}
          {mostrarProveedor && (
            <>
              <label className="sr-only" htmlFor={`${codigo}-proveedor`}>Proveedor</label>
              <select
                id={`${codigo}-proveedor`}
                value={proveedorId}
                onChange={(event) => setProveedorId(event.target.value)}
                className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
              >
                <option value="">Todos los proveedores</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.idProveedor} value={proveedor.idProveedor}>
                    {proveedor.nombreEmpresa}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {(error || errorSucursales || errorProveedores) && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error || errorSucursales || errorProveedores}
        </p>
      )}

      {reporte && (
        <div className="print-area flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-400">
              {reporte.alcance.etiqueta} · {reporte.periodo.desde} a {reporte.periodo.hasta}
            </p>
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => descargar('csv')}
                disabled={Boolean(exportando) || cargando}
                className="flex items-center gap-2 rounded-lg border border-panel-border px-3 py-2 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50"
              >
                <FileSpreadsheet size={16} />
                {exportando === 'csv' ? 'Exportando…' : 'Exportar CSV'}
              </button>
              <BotonExportarPDF
                onExport={() => descargar('pdf')}
                disabled={Boolean(exportando) || cargando}
                label={exportando === 'pdf' ? 'Exportando…' : 'Exportar PDF'}
              />
            </div>
          </div>

          {reporte.kpis.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {reporte.kpis.map((kpi) => (
                <div key={kpi.etiqueta} className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{kpi.etiqueta}</span>
                    <span className="h-8 w-8 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center">
                      <BarChart2 size={16} />
                    </span>
                  </div>
                  <p className="text-xl font-bold text-white">{mostrarValor(kpi.valor, kpi.tipo)}</p>
                  {kpi.variacion !== null && kpi.variacion !== undefined && (
                    <p className="text-xs text-gray-500">{formatoNumero.format(kpi.variacion)} % frente al periodo anterior</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {reporte.secciones.map((seccion) => (
            <TablaSeccion key={seccion.nombre} seccion={seccion} />
          ))}
          <p className="text-xs text-gray-500">Generado: {reporte.generado_en}</p>
        </div>
      )}

      {cargando && <p role="status" className="text-sm text-gray-400">Cargando reporte…</p>}
      {!cargando && !error && !reporte && (
        <p className="text-sm text-gray-400">No se recibió información del reporte.</p>
      )}
    </div>
  )
}
