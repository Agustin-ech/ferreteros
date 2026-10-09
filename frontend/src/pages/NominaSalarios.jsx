import { useMemo, useState } from 'react'
import { Wallet, Users, ArrowDownCircle, ArrowUpCircle, PiggyBank, Play } from 'lucide-react'
import StatCard from '../components/StatCard'
import { empleados, historialNomina, conceptosNomina } from '../data/mockData'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const AUXILIO_TRANSPORTE = 140000
const PORCENTAJE_DEDUCCION = 0.08 // salud 4% + pensión 4%, a cargo del empleado
const DIAS_PERIODO = 15

const TABS = [
  { id: 'actual', label: 'Nómina actual' },
  { id: 'historial', label: 'Historial de pagos' },
  { id: 'conceptos', label: 'Conceptos' },
  { id: 'configuracion', label: 'Configuración' },
]

export default function NominaSalarios() {
  const [tab, setTab] = useState('actual')

  const nomina = useMemo(
    () =>
      empleados
        .filter((e) => e.estado === 'Activo')
        .map((e) => {
          const devengado = Math.round(e.salarioBase / 2) + e.ventas * 10000 + AUXILIO_TRANSPORTE
          const deducciones = Math.round(devengado * PORCENTAJE_DEDUCCION)
          return {
            ...e,
            diasTrabajados: DIAS_PERIODO,
            devengado,
            deducciones,
            neto: devengado - deducciones,
            estadoPago: e.nombre === 'Ana García' ? 'Pendiente' : 'Pagado',
          }
        }),
    []
  )

  const totalDevengado = nomina.reduce((a, n) => a + n.devengado, 0)
  const totalDeducciones = nomina.reduce((a, n) => a + n.deducciones, 0)
  const totalNeto = totalDevengado - totalDeducciones

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Nómina y salarios</h1>
            <p className="text-sm text-gray-500">Gestiona los pagos y la información salarial del personal.</p>
          </div>
        </div>
        {tab === 'actual' && (
          <div className="flex items-center gap-2">
            <span className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-300 whitespace-nowrap">
              Periodo: 01/09/2026 - 15/09/2026
            </span>
            <button type="button" title="Función de generar nómina: próximamente" className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap">
              <Play size={15} /> Generar nómina
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-panel-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.id ? 'border-brand-yellow text-brand-yellow' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'actual' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total empleados" value={nomina.length} footer="Con nómina activa" />
            <StatCard icon={ArrowDownCircle} label="Total devengado" value={formatoCOP.format(totalDevengado)} footer="Este periodo" />
            <StatCard icon={ArrowUpCircle} label="Total deducciones" value={formatoCOP.format(totalDeducciones)} footer="Salud + pensión" />
            <StatCard icon={PiggyBank} label="Neto a pagar" value={formatoCOP.format(totalNeto)} footer="Este periodo" accent="green" />
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-3 pl-4 pr-2 font-medium">Empleado</th>
                  <th className="py-3 pr-2 font-medium">Cargo</th>
                  <th className="py-3 pr-2 font-medium">Sucursal</th>
                  <th className="py-3 pr-2 font-medium text-right">Días trabajados</th>
                  <th className="py-3 pr-2 font-medium text-right">Devengado</th>
                  <th className="py-3 pr-2 font-medium text-right">Deducciones</th>
                  <th className="py-3 pr-2 font-medium text-right">Neto</th>
                  <th className="py-3 pr-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {nomina.map((n) => (
                  <tr key={n.id} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                    <td className="py-3 pl-4 pr-2 text-gray-200 font-medium">{n.nombre}</td>
                    <td className="py-3 pr-2 text-gray-400">{n.cargo}</td>
                    <td className="py-3 pr-2 text-gray-400 whitespace-nowrap">{n.sucursal}</td>
                    <td className="py-3 pr-2 text-right text-gray-300">{n.diasTrabajados}</td>
                    <td className="py-3 pr-2 text-right text-gray-300">{formatoCOP.format(n.devengado)}</td>
                    <td className="py-3 pr-2 text-right text-red-400">{formatoCOP.format(n.deducciones)}</td>
                    <td className="py-3 pr-2 text-right text-gray-200 font-semibold">{formatoCOP.format(n.neto)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${n.estadoPago === 'Pagado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                        {n.estadoPago}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500">Mostrando 1 - {nomina.length} de {nomina.length} registros</p>
        </div>
      )}

      {tab === 'historial' && (
        <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-panel-border">
                <th className="py-3 pl-4 pr-2 font-medium">Periodo</th>
                <th className="py-3 pr-2 font-medium text-right">Total pagado</th>
                <th className="py-3 pr-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {historialNomina.map((h, i) => (
                <tr key={i} className="border-b border-panel-border/60 last:border-0">
                  <td className="py-3 pl-4 pr-2 text-gray-200">{h.periodo}</td>
                  <td className="py-3 pr-2 text-right text-gray-300">{formatoCOP.format(h.totalPagado)}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${h.estado === 'Pagada' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {h.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'conceptos' && (
        <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-panel-border">
                <th className="py-3 pl-4 pr-2 font-medium">Concepto</th>
                <th className="py-3 pr-2 font-medium">Tipo</th>
                <th className="py-3 pr-4 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {conceptosNomina.map((c) => (
                <tr key={c.concepto} className="border-b border-panel-border/60 last:border-0">
                  <td className="py-3 pl-4 pr-2 text-gray-200">{c.concepto}</td>
                  <td className="py-3 pr-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${c.tipo === 'Devengo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-300">{c.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'configuracion' && (
        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3 max-w-md">
          <p className="font-semibold text-white text-sm">Configuración de nómina</p>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Tipo de nómina
            <select className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none" defaultValue="Quincenal">
              <option>Quincenal</option>
              <option>Mensual</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Día de pago
            <input type="number" min="1" max="31" defaultValue={15} className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Cuenta de nómina
            <input type="text" defaultValue="Bancolombia - 1234567890" className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none" />
          </label>
          <button type="button" title="Función de guardar: próximamente" className="self-start mt-1 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition">
            Guardar cambios
          </button>
        </div>
      )}
    </div>
  )
}