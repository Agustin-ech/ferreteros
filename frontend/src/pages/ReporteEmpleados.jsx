import { useMemo, useState } from 'react'
import { Users, UserCheck, UserX, Clock } from 'lucide-react'
import StatCard from '../components/StatCard'
import BotonExportarPDF from '../components/BotonExportarPDF'
import { empleados, movimientosPersonal, desempenoPorSucursal } from '../data/mockData'
import { parseFecha } from '../utils/fecha'

export default function ReporteEmpleados() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargo, setCargo] = useState('Todos los cargos')

  const cargos = useMemo(() => ['Todos los cargos', ...new Set(empleados.map((e) => e.cargo))], [])

  const empleadosFiltrados = useMemo(
    () => (cargo === 'Todos los cargos' ? empleados : empleados.filter((e) => e.cargo === cargo)),
    [cargo]
  )

  const activos = empleados.filter((e) => e.estado === 'Activo').length
  const inactivos = empleados.length - activos

  const movimientos = useMemo(() => {
    let filas = movimientosPersonal
    if (desde) filas = filas.filter((m) => parseFecha(m.fecha) >= new Date(desde))
    if (hasta) filas = filas.filter((m) => parseFecha(m.fecha) <= new Date(hasta))
    return filas.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha))
  }, [desde, hasta])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <Users size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Reporte de empleados</h1>
            <p className="text-sm text-gray-500">Consulta la productividad y movimientos del personal.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-panel-card border border-panel-border rounded-lg px-3 py-2">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-transparent text-sm text-gray-300 outline-none" />
            <span className="text-gray-500 text-sm">–</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-transparent text-sm text-gray-300 outline-none" />
          </div>
          <select value={cargo} onChange={(e) => setCargo(e.target.value)} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
            {cargos.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="print-area flex flex-col gap-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total empleados" value={empleados.length} footer="Todas las sucursales" />
          <StatCard icon={UserCheck} label="Activos" value={activos} footer="Con turno asignado" accent="green" />
          <StatCard icon={UserX} label="Inactivos" value={inactivos} footer="Sin turno asignado" accent="red" />
          <StatCard icon={Clock} label="A tiempo" value="93%" footer="Puntualidad del periodo" accent="blue" />
        </div>

        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
          <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
            <p className="font-semibold text-white text-sm">Desempeño por sucursal</p>
            {desempenoPorSucursal.map((s) => (
              <div key={s.sucursal}>
                <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                  <span>{s.sucursal}</span>
                  <span>{s.etiqueta && <span className="text-emerald-400 font-semibold mr-1">{s.etiqueta}</span>}{s.porcentaje}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-panel-bg overflow-hidden">
                  <div className="h-full bg-brand-yellow rounded-full" style={{ width: `${s.porcentaje}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
            <p className="px-4 pt-4 pb-1 font-semibold text-white text-sm">Empleados más productivos</p>
            <table className="w-full text-sm min-w-[380px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-2.5 px-4 font-medium">Nombre</th>
                  <th className="py-2.5 pr-2 font-medium text-right">Ventas</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Facturas</th>
                </tr>
              </thead>
              <tbody>
                {empleadosFiltrados.map((e) => (
                  <tr key={e.nombre} className="border-b border-panel-border/60 last:border-0">
                    <td className="py-2.5 px-4 text-gray-200">{e.nombre}</td>
                    <td className="py-2.5 pr-2 text-right text-gray-300">{e.ventas}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-300">{e.facturas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
          <p className="px-4 pt-4 pb-1 font-semibold text-white text-sm">Movimientos de personal</p>
          <table className="w-full text-sm min-w-[380px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-panel-border">
                <th className="py-2.5 px-4 font-medium">Fecha</th>
                <th className="py-2.5 pr-2 font-medium">Empleado</th>
                <th className="py-2.5 pr-4 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m, i) => (
                <tr key={i} className="border-b border-panel-border/60 last:border-0">
                  <td className="py-2.5 px-4 text-gray-300 whitespace-nowrap">{m.fecha}</td>
                  <td className="py-2.5 pr-2 text-gray-200">{m.empleado}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap ${m.accion === 'Entrada' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {m.accion}
                    </span>
                  </td>
                </tr>
              ))}
              {movimientos.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-500 text-xs">
                    Sin movimientos con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <BotonExportarPDF />
      </div>
    </div>
  )
}