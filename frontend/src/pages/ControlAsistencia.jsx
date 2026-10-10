import { useMemo, useState } from 'react'
import { ClipboardCheck, Users, UserCheck, UserX, ShieldCheck, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import StatCard from '../components/StatCard'
import { asistencia, empleados } from '../data/mockData'
import { parseFecha } from '../utils/fecha'

const estadoStyles = {
  Presente: 'bg-emerald-500/15 text-emerald-400',
  Ausente: 'bg-red-500/15 text-red-400',
}

const ITEMS_POR_PAGINA = 5

export default function ControlAsistencia() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sucursal, setSucursal] = useState('Todas las sucursales')
  const [rol, setRol] = useState('Todos los roles')
  const [pagina, setPagina] = useState(1)

  const roles = useMemo(() => ['Todos los roles', ...new Set(asistencia.map((a) => a.cargo))], [])

  const filas = useMemo(() => {
    let filas = asistencia
    if (sucursal !== 'Todas las sucursales') filas = filas.filter((a) => a.sucursal === sucursal)
    if (rol !== 'Todos los roles') filas = filas.filter((a) => a.cargo === rol)
    if (desde) filas = filas.filter((a) => parseFecha(a.fecha) >= new Date(desde))
    if (hasta) filas = filas.filter((a) => parseFecha(a.fecha) <= new Date(hasta))
    return filas.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha))
  }, [desde, hasta, sucursal, rol])

  const totalPaginas = Math.max(1, Math.ceil(filas.length / ITEMS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
  const filasPagina = filas.slice(inicio, inicio + ITEMS_POR_PAGINA)

  const presentes = filas.filter((a) => a.estado === 'Presente').length
  const ausentes = filas.filter((a) => a.estado === 'Ausente').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <ClipboardCheck size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Control de asistencia</h1>
            <p className="text-sm text-gray-500">Registra y consulta la asistencia del personal.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-panel-card border border-panel-border rounded-lg px-3 py-2">
            <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPagina(1) }} className="bg-transparent text-sm text-gray-300 outline-none" />
            <span className="text-gray-500 text-sm">–</span>
            <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPagina(1) }} className="bg-transparent text-sm text-gray-300 outline-none" />
          </div>
          <select value={sucursal} onChange={(e) => { setSucursal(e.target.value); setPagina(1) }} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
            <option>Todas las sucursales</option>
            <option>La Chinita</option>
            <option>Buenavista</option>
          </select>
          <select value={rol} onChange={(e) => { setRol(e.target.value); setPagina(1) }} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button type="button" onClick={() => window.print()} title="Genera el reporte con los filtros actuales (Guardar como PDF o imprimir)" className="print:hidden flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap">
            <FileText size={16} /> Generar reporte
          </button>
        </div>
      </div>

      <div className="print-area flex flex-col gap-6">
      {/* Encabezado que solo aparece en el reporte impreso / PDF */}
      <div className="hidden print:block">
        <h2 className="text-xl font-bold">Reporte de asistencia · Ferretería Ferreteros S.A.</h2>
        <p className="text-sm">
          Sucursal: {sucursal} · Cargo: {rol} · Periodo: {desde || 'inicio'} a {hasta || 'hoy'} · Generado: {new Date().toLocaleDateString('es-CO')}
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total de empleados" value={empleados.length} footer="Todas las sucursales" />
        <StatCard icon={UserCheck} label="Presentes" value={presentes} footer="En el periodo filtrado" accent="green" />
        <StatCard icon={UserX} label="Ausentes" value={ausentes} footer="En el periodo filtrado" accent="red" />
        <StatCard icon={ShieldCheck} label="Permisos" value={0} footer="Sin permisos registrados" accent="blue" />
      </div>

      <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-panel-border">
              <th className="py-3 pl-4 pr-2 font-medium">Fecha</th>
              <th className="py-3 pr-2 font-medium">Empleado</th>
              <th className="py-3 pr-2 font-medium">Cargo</th>
              <th className="py-3 pr-2 font-medium">Sucursal</th>
              <th className="py-3 pr-2 font-medium">Hora entrada</th>
              <th className="py-3 pr-2 font-medium">Hora salida</th>
              <th className="py-3 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="print:hidden">
            {filasPagina.map((a, i) => (
              <tr key={i} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                <td className="py-3 pl-4 pr-2 text-gray-300 whitespace-nowrap">{a.fecha}</td>
                <td className="py-3 pr-2 text-gray-200 font-medium">{a.empleado}</td>
                <td className="py-3 pr-2 text-gray-400">{a.cargo}</td>
                <td className="py-3 pr-2 text-gray-400 whitespace-nowrap">{a.sucursal}</td>
                <td className="py-3 pr-2 text-gray-300 whitespace-nowrap">{a.horaEntrada}</td>
                <td className="py-3 pr-2 text-gray-300 whitespace-nowrap">{a.horaSalida}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${estadoStyles[a.estado]}`}>{a.estado}</span>
                </td>
              </tr>
            ))}
            {filasPagina.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500 text-sm">Sin registros con esos filtros.</td></tr>
            )}
          </tbody>
          {/* Solo se ve al imprimir: el reporte incluye TODAS las filas filtradas, no solo la página */}
          <tbody className="hidden print:table-row-group">
            {filas.map((a, i) => (
              <tr key={i} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                <td className="py-3 pl-4 pr-2 text-gray-300 whitespace-nowrap">{a.fecha}</td>
                <td className="py-3 pr-2 text-gray-200 font-medium">{a.empleado}</td>
                <td className="py-3 pr-2 text-gray-400">{a.cargo}</td>
                <td className="py-3 pr-2 text-gray-400 whitespace-nowrap">{a.sucursal}</td>
                <td className="py-3 pr-2 text-gray-300 whitespace-nowrap">{a.horaEntrada}</td>
                <td className="py-3 pr-2 text-gray-300 whitespace-nowrap">{a.horaSalida}</td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${estadoStyles[a.estado]}`}>{a.estado}</span>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>

      </div>

      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
        <span>Mostrando {filas.length === 0 ? 0 : inicio + 1}-{Math.min(inicio + ITEMS_POR_PAGINA, filas.length)} de {filas.length} registros</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1} className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5">
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setPagina(n)} className={`h-8 w-8 flex items-center justify-center rounded-lg border text-xs font-semibold ${n === paginaActual ? 'bg-brand-yellow text-panel-sidebar border-brand-yellow' : 'border-panel-border text-gray-300 hover:bg-white/5'}`}>
              {n}
            </button>
          ))}
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}