// Filtro de "01/09/2026 - 15/09/2026" + sucursal, reutilizado en las
// páginas del módulo de Finanzas (Finanzas, Ingresos, Egresos, Resumen).
export default function FiltroPeriodoSucursal({
  desde, hasta, onDesde, onHasta, sucursal, onSucursal, mostrarSucursal = true,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 bg-panel-card border border-panel-border rounded-lg px-3 py-2">
        <input
          type="date"
          value={desde}
          onChange={(e) => onDesde(e.target.value)}
          className="bg-transparent text-sm text-gray-300 outline-none"
        />
        <span className="text-gray-500 text-sm">–</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => onHasta(e.target.value)}
          className="bg-transparent text-sm text-gray-300 outline-none"
        />
      </div>
      {mostrarSucursal && (
        <select
          value={sucursal}
          onChange={(e) => onSucursal(e.target.value)}
          className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          <option>Todas las sucursales</option>
          <option>La Chinita</option>
          <option>Buenavista</option>
        </select>
      )}
    </div>
  )
}