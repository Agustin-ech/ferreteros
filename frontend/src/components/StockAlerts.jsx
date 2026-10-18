import { AlertTriangle } from 'lucide-react'

export default function StockAlerts({ alertasStock = [] }) {
  return (
    <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <AlertTriangle size={16} className="text-brand-yellow" />
          Alertas de Stock
        </h3>
        <button className="text-xs text-gray-500 hover:text-brand-yellow">ver más...</button>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 text-left border-b border-panel-border">
            <th className="pb-2 font-medium">Producto</th>
            <th className="pb-2 font-medium">Sucursal</th>
            <th className="pb-2 font-medium text-right">Existencia</th>
          </tr>
        </thead>
        <tbody>
          {alertasStock.map((a, index) => (
            <tr key={`${a.producto}-${a.sucursal}-${index}`} className="border-b border-panel-border/60 last:border-0">
              <td className="py-2 text-gray-300">{a.producto}</td>
              <td className="py-2 text-gray-400">{a.sucursal}</td>
              <td className="py-2 text-right font-semibold text-red-400">{a.existencia}</td>
            </tr>
          ))}
          {alertasStock.length === 0 && (
            <tr>
              <td colSpan={3} className="py-5 text-center text-gray-500">
                Sin alertas de stock registradas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
