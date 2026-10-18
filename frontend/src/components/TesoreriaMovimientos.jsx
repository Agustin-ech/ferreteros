import { useCallback, useEffect, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../api/client'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const ITEMS_POR_PAGINA = 20

function mensajeErrorSolicitud(error, mensaje) {
  const respuesta = error?.response
  const detalle = respuesta?.data?.error || respuesta?.data?.mensaje
  if (detalle) return detalle
  if (respuesta?.status) return `${mensaje} (HTTP ${respuesta.status}).`
  return `${mensaje} Verifica la conexión con el servidor.`
}

function hoyISO() {
  const fecha = new Date()
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function FormularioEgreso({ sucursales, catalogos, onCerrar, onGuardado }) {
  const [datos, setDatos] = useState({
    idSucursal: sucursales[0]?.idSucursal ? String(sucursales[0].idSucursal) : '',
    idMetodoPago: '',
    concepto: catalogos.conceptosEgreso?.[0] || 'Otro',
    descripcion: '',
    tercero: '',
    monto: '',
    fecha: hoyISO(),
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function cambiar(campo, valor) {
    setDatos((previo) => ({ ...previo, [campo]: valor }))
  }

  async function guardar(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    try {
      await api.post('/api/tesoreria/egresos', {
        ...datos,
        idSucursal: Number(datos.idSucursal),
        idMetodoPago: datos.idMetodoPago ? Number(datos.idMetodoPago) : null,
        monto: Number(datos.monto),
      })
      onGuardado()
    } catch (respuesta) {
      const mensaje = respuesta.response?.data?.error || 'No se pudo registrar el egreso.'
      const detalles = Object.values(respuesta.response?.data?.detalles || {}).flat()
      setError(detalles.length ? `${mensaje} ${detalles.join(' ')}` : mensaje)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={guardar} className="w-full max-w-lg rounded-xl border border-panel-border bg-panel-card p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Registrar egreso</h2>
          <p className="text-xs text-gray-500">El movimiento quedará asociado a la sucursal y al usuario autenticado.</p>
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Sucursal
            <select required value={datos.idSucursal} onChange={(evento) => cambiar('idSucursal', evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200">
              <option value="">Selecciona una sucursal</option>
              {sucursales.map((sucursal) => <option key={sucursal.idSucursal} value={sucursal.idSucursal}>{sucursal.nombreSucursal}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Concepto
            <select value={datos.concepto} onChange={(evento) => cambiar('concepto', evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200">
              {(catalogos.conceptosEgreso || []).map((concepto) => <option key={concepto}>{concepto}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400 sm:col-span-2">
            Descripción
            <input required minLength={3} maxLength={255} value={datos.descripcion} onChange={(evento) => cambiar('descripcion', evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Monto
            <input required type="number" min="0.01" step="0.01" value={datos.monto} onChange={(evento) => cambiar('monto', evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Fecha
            <input required type="date" value={datos.fecha} onChange={(evento) => cambiar('fecha', evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Tercero / proveedor
            <input maxLength={150} value={datos.tercero} onChange={(evento) => cambiar('tercero', evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Método de pago
            <select value={datos.idMetodoPago} onChange={(evento) => cambiar('idMetodoPago', evento.target.value)} className="rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-gray-200">
              <option value="">No especificado</option>
              {(catalogos.metodosPago || []).map((metodo) => <option key={metodo.idMetodoPago} value={metodo.idMetodoPago}>{metodo.nombre}</option>)}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="rounded-lg border border-panel-border px-4 py-2 text-sm text-gray-300">Cancelar</button>
          <button type="submit" disabled={guardando || sucursales.length === 0} className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-panel-sidebar disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar egreso'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function TesoreriaMovimientos({
  sucursales = [],
  tipo = '',
  titulo = 'Movimientos de tesorería',
  subtitulo = 'Ingresos generados por ventas y egresos registrados manualmente.',
  onCambio,
  desde: desdeExterno,
  hasta: hastaExterno,
  sucursalId: sucursalExterna,
  onDesde,
  onHasta,
  onSucursal,
  mostrarFiltros = true,
  soloLectura = false,
}) {
  const [desdeLocal, setDesdeLocal] = useState('')
  const [hastaLocal, setHastaLocal] = useState('')
  const [sucursalLocal, setSucursalLocal] = useState('todas')
  const desde = desdeExterno ?? desdeLocal
  const hasta = hastaExterno ?? hastaLocal
  const sucursalId = sucursalExterna ?? sucursalLocal
  const [pagina, setPagina] = useState(1)
  const [actualizacion, setActualizacion] = useState(0)
  const [movimientos, setMovimientos] = useState([])
  const [total, setTotal] = useState(0)
  const [catalogos, setCatalogos] = useState({ conceptosEgreso: [], metodosPago: [] })
  const [cargando, setCargando] = useState(true)
  const [errorMovimientos, setErrorMovimientos] = useState('')
  const [errorCatalogos, setErrorCatalogos] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const cargarMovimientos = useCallback(async () => {
    setCargando(true)
    setErrorMovimientos('')
    try {
      const respuesta = await api.get('/api/tesoreria/movimientos', {
        params: {
          ...(desde ? { desde } : {}),
          ...(hasta ? { hasta } : {}),
          sucursal_id: sucursalId,
          ...(tipo ? { tipo } : {}),
          pagina,
          por_pagina: ITEMS_POR_PAGINA,
        },
      })
      setMovimientos(respuesta.data.data || [])
      setTotal(Number(respuesta.data.paginacion?.total || 0))
    } catch (requestError) {
      setErrorMovimientos(mensajeErrorSolicitud(requestError, 'No se pudieron cargar los movimientos de tesorería.'))
    } finally {
      setCargando(false)
    }
  }, [desde, hasta, sucursalId, tipo, pagina, actualizacion])

  useEffect(() => { cargarMovimientos() }, [cargarMovimientos])
  useEffect(() => {
    if (soloLectura) return undefined
    let cancelado = false
    api.get('/api/tesoreria/catalogos')
      .then((respuesta) => {
        if (!cancelado) {
          setCatalogos(respuesta.data)
          setErrorCatalogos('')
        }
      })
      .catch((requestError) => {
        if (!cancelado) {
          setErrorCatalogos(mensajeErrorSolicitud(requestError, 'No se pudieron cargar los catálogos de tesorería.'))
        }
      })
    return () => { cancelado = true }
  }, [soloLectura])

  const totalPaginas = Math.max(1, Math.ceil(total / ITEMS_POR_PAGINA))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{titulo}</h2>
          <p className="text-sm text-gray-500">{subtitulo}</p>
        </div>
        {tipo !== 'ingreso' && !soloLectura && (
          <button onClick={() => setMostrarFormulario(true)} className="flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-panel-sidebar">
            <Plus size={16} /> Registrar egreso
          </button>
        )}
      </div>

      {mostrarFiltros && (
        <div className="flex flex-wrap items-center gap-3">
          <input aria-label="Desde" type="date" value={desde} onChange={(evento) => { (onDesde || setDesdeLocal)(evento.target.value); setPagina(1) }} className="rounded-lg border border-panel-border bg-panel-card px-3 py-2 text-sm text-gray-300" />
          <input aria-label="Hasta" type="date" value={hasta} onChange={(evento) => { (onHasta || setHastaLocal)(evento.target.value); setPagina(1) }} className="rounded-lg border border-panel-border bg-panel-card px-3 py-2 text-sm text-gray-300" />
          <select aria-label="Sucursal" value={sucursalId} onChange={(evento) => { (onSucursal || setSucursalLocal)(evento.target.value); setPagina(1) }} className="rounded-lg border border-panel-border bg-panel-card px-3 py-2 text-sm text-gray-200">
            <option value="todas">Todas las sucursales</option>
            {sucursales.map((sucursal) => <option key={sucursal.idSucursal} value={sucursal.idSucursal}>{sucursal.nombreSucursal}</option>)}
          </select>
        </div>
      )}

      {errorCatalogos && <p role="alert" className="text-sm text-red-400">{errorCatalogos}</p>}
      {errorMovimientos && <p role="alert" className="text-sm text-red-400">{errorMovimientos}</p>}
      <div className="overflow-x-auto rounded-xl border border-panel-border bg-panel-card">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr className="border-b border-panel-border text-left text-gray-400">
              <th className="py-3 pl-4 pr-2">Fecha</th>
              <th className="py-3 pr-2">Tipo</th>
              <th className="py-3 pr-2">Concepto / descripción</th>
              <th className="py-3 pr-2">Sucursal</th>
              <th className="py-3 pr-2">Tercero</th>
              <th className="py-3 pr-2">Método</th>
              <th className="py-3 pr-4 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((movimiento) => (
              <tr key={movimiento.idMovimiento} className="border-b border-panel-border/60 last:border-0">
                <td className="py-3 pl-4 pr-2 whitespace-nowrap text-gray-300">{new Date(movimiento.fecha).toLocaleDateString('es-CO')}</td>
                <td className="py-3 pr-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${movimiento.tipo === 'ingreso' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {movimiento.tipo === 'ingreso' ? <ArrowDownCircle size={13} /> : <ArrowUpCircle size={13} />}
                    {movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  </span>
                </td>
                <td className="py-3 pr-2 text-gray-200">
                  <span className="font-medium">{movimiento.concepto}</span>
                  <span className="block text-xs text-gray-500">{movimiento.descripcion}</span>
                </td>
                <td className="py-3 pr-2 text-gray-300">{movimiento.sucursal}</td>
                <td className="py-3 pr-2 text-gray-300">{movimiento.tercero || '—'}</td>
                <td className="py-3 pr-2 text-gray-300">{movimiento.metodoPago || '—'}</td>
                <td className={`py-3 pr-4 text-right font-semibold whitespace-nowrap ${movimiento.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {movimiento.tipo === 'egreso' ? '−' : '+'}{formatoCOP.format(movimiento.monto)}
                </td>
              </tr>
            ))}
            {!cargando && movimientos.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">No hay movimientos para los filtros seleccionados.</td></tr>
            )}
            {cargando && <tr><td colSpan={7} className="py-8 text-center text-gray-500">Cargando movimientos…</td></tr>}
          </tbody>
        </table>
      </div>

      <div className={`flex items-center justify-between text-sm text-gray-400 ${soloLectura ? 'print:hidden' : ''}`}>
        <span>{total === 0 ? '0' : `${(pagina - 1) * ITEMS_POR_PAGINA + 1}-${Math.min(pagina * ITEMS_POR_PAGINA, total)}`} de {total} movimientos</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPagina((actual) => Math.max(1, actual - 1))} disabled={pagina <= 1} className="rounded border border-panel-border p-2 disabled:opacity-40"><ChevronLeft size={15} /></button>
          <span>{pagina} / {totalPaginas}</span>
          <button onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))} disabled={pagina >= totalPaginas} className="rounded border border-panel-border p-2 disabled:opacity-40"><ChevronRight size={15} /></button>
        </div>
      </div>

      {mostrarFormulario && (
        <FormularioEgreso
          sucursales={sucursales}
          catalogos={catalogos}
          onCerrar={() => setMostrarFormulario(false)}
          onGuardado={() => {
            setMostrarFormulario(false)
            setPagina(1)
            setActualizacion((valor) => valor + 1)
            onCambio?.()
          }}
        />
      )}
    </div>
  )
}
