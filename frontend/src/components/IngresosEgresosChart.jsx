import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} style={{ color: item.fill }}>
          {item.dataKey === 'ingresos' ? 'Ingresos' : 'Egresos'}: {formatoCOP.format(item.value)}
        </p>
      ))}
    </div>
  )
}

export default function IngresosEgresosChart({ ingresosEgresos = [] }) {
  return (
    <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <TrendingUp size={16} className="text-brand-yellow" />
          Ingresos y egresos · últimos 7 días
        </h3>
        <span className="text-xs text-gray-500">Tesorería</span>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ingresosEgresos} barGap={4}>
            <XAxis dataKey="dia" stroke="#5B6274" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <YAxis hide />
            <Bar dataKey="ingresos" name="Ingresos" fill="#F2B01E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egresos" name="Egresos" fill="#333333" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-yellow" /> Ingresos</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#333333]" /> Egresos</span>
      </div>
    </div>
  )
}
