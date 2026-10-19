import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Wallet, ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react'
import StatCard from '../components/StatCard'
import TesoreriaMovimientos from '../components/TesoreriaMovimientos'
import BotonExportarPDF from '../components/BotonExportarPDF'
import api from '../api/client'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const formatoCorto = (valor) => `${Math.round(valor / 1_000_000)}M`

export default function Finanzas({
  onNavigate,
  sucursales = [],
  resumen = false,
  titulo = resumen ? 'Resumen financiero' : 'Finanzas',
  modoReporte = false,
}) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sucursalId, setSucursalId] = useState('todas')
  const [actualizacion, setActualizacion] = useState(0)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError('')
    api.get('/api/tesoreria/resumen', {
      params: {
        sucursal_id: sucursalId,
        ...(desde ? { desde } : {}),
        ...(hasta ? { hasta } : {}),
      },
    })
      .then((respuesta) => { if (!cancelado) setDatos(respuesta.data) })
      .catch((requestError) => {
        if (!cancelado) {
          setDatos(null)
          setError(requestError.response?.data?.error || 'No se pudo cargar el resumen de tesorería.')
        }
      })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [desde, hasta, sucursalId, actualizacion])

  const serie = useMemo(() => datos?.serie || [], [datos])
  const totales = datos?.resumen

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center">
            <Wallet size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">{titulo}</h1>
            <p className="text-sm text-gray-500">Ingresos por ventas activas y egresos registrados en Tesorería.</p>
          </div>
        </div>
        <div className={`flex flex-wrap gap-2 ${modoReporte ? 'print:hidden' : ''}`}>
          <input aria-label="Desde" type="date" value={desde} onChange={(evento) => setDesde(evento.target.value)} className="rounded-lg border border-panel-border bg-panel-card px-3 py-2 text-sm text-gray-300" />
          <input aria-label="Hasta" type="date" value={hasta} onChange={(evento) => setHasta(evento.target.value)} className="rounded-lg border border-panel-border bg-panel-card px-3 py-2 text-sm text-gray-300" />
          <select aria-label="Sucursal" value={sucursalId} onChange={(evento) => setSucursalId(evento.target.value)} className="rounded-lg border border-panel-border bg-panel-card px-3 py-2 text-sm text-gray-200">
            <option value="todas">Todas las sucursales</option>
            {sucursales.map((sucursal) => <option key={sucursal.idSucursal} value={sucursal.idSucursal}>{sucursal.nombreSucursal}</option>)}
          </select>
          {modoReporte && <BotonExportarPDF />}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className={`flex flex-col gap-6 ${modoReporte ? 'print-area' : ''}`}>
      {modoReporte && (
        <div className="hidden print:block">
          <h1 className="text-xl font-bold">{titulo}</h1>
          <p className="text-sm text-gray-500">
            Periodo: {desde || 'Inicio del mes'} a {hasta || 'hoy'} · Sucursal:{' '}
            {sucursalId === 'todas'
              ? 'Todas las sucursales'
              : sucursales.find((sucursal) => String(sucursal.idSucursal) === String(sucursalId))?.nombreSucursal || `Sucursal #${sucursalId}`}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={ArrowDownCircle} label="Ingresos por ventas" value={cargando ? '…' : totales ? formatoCOP.format(totales.ingresos) : '—'} footer="Ventas activas del periodo" accent="green" />
        <StatCard icon={ArrowUpCircle} label="Egresos registrados" value={cargando ? '…' : totales ? formatoCOP.format(totales.egresos) : '—'} footer="Egresos manuales del periodo" accent="red" />
        <StatCard icon={Scale} label="Balance de caja" value={cargando ? '…' : totales ? formatoCOP.format(totales.balance) : '—'} footer="Ingresos por ventas menos egresos registrados" accent="blue" />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="bg-panel-card border border-panel-border rounded-xl p-4">
          <div className="mb-3 flex flex-wrap items-center gap-4">
            <p className="font-semibold text-white text-sm">Ingresos y egresos por día</p>
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="h-2.5 w-2.5 rounded-full bg-brand-yellow" /> Ingresos</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="h-2.5 w-2.5 rounded-full bg-gray-500" /> Egresos</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} barGap={3}>
                <CartesianGrid stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#2a2a2a' }} tickLine={false} />
                <YAxis tickFormatter={formatoCorto} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip formatter={(valor) => formatoCOP.format(valor)} contentStyle={{ background: '#1f1f1f', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#E5E7EB' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#F2B01E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="egresos" name="Egresos" fill="#6B7280" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!cargando && serie.length === 0 && <p className="text-center text-xs text-gray-500">No hay movimientos en el periodo seleccionado.</p>}
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white text-sm">Movimientos recientes</p>
            <button onClick={() => onNavigate?.('egresos')} className={`text-xs text-brand-yellow hover:underline ${modoReporte ? 'print:hidden' : ''}`}>Ver egresos</button>
          </div>
          {(datos?.movimientosRecientes || []).slice(0, 6).map((movimiento) => (
            <div key={movimiento.idMovimiento} className="flex items-center gap-3">
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap ${movimiento.tipo === 'ingreso' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs text-gray-200">{movimiento.concepto} · {movimiento.sucursal}</p>
                <p className="text-[11px] text-gray-500">{new Date(movimiento.fecha).toLocaleDateString('es-CO')}</p>
              </div>
              <p className={`text-xs font-semibold ${movimiento.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                {movimiento.tipo === 'egreso' ? '−' : '+'}{formatoCOP.format(movimiento.monto)}
              </p>
            </div>
          ))}
          {!cargando && (datos?.movimientosRecientes || []).length === 0 && <p className="text-xs text-gray-500">No hay movimientos para este periodo.</p>}
        </div>
      </div>

      <TesoreriaMovimientos
        sucursales={sucursales}
        desde={desde}
        hasta={hasta}
        sucursalId={sucursalId}
        onDesde={setDesde}
        onHasta={setHasta}
        onSucursal={setSucursalId}
        mostrarFiltros={false}
        soloLectura={modoReporte}
        onCambio={() => setActualizacion((valor) => valor + 1)}
      />
      </div>
    </div>
  )
}
