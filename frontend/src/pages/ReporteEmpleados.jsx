import { Users } from 'lucide-react'

export default function ReporteEmpleados() {
  return (
    <section className="bg-panel-card border border-panel-border rounded-xl p-6 flex flex-col items-start gap-3">
      <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center">
        <Users size={20} />
      </span>
      <h1 className="text-xl font-bold text-white">Reporte de empleados</h1>
      <p className="max-w-2xl text-sm text-gray-400">
        Este reporte no está disponible todavía: el backend no cuenta con API de reportes de personal,
        productividad ni asistencia. No se muestran datos simulados como si fueran reales.
      </p>
    </section>
  )
}
