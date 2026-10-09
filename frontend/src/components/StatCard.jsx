export default function StatCard({ icon: Icon, label, value, footer, accent = 'yellow' }) {
  const accentClasses = {
    yellow: 'bg-brand-yellow/15 text-brand-yellow',
    red: 'bg-red-500/15 text-red-400',
    green: 'bg-emerald-500/15 text-emerald-400',
    blue: 'bg-blue-500/15 text-blue-400',
  }

  return (
    <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${accentClasses[accent]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {footer && <p className="text-xs text-gray-500">{footer}</p>}
    </div>
  )
}
