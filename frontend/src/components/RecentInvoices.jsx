import { Receipt } from 'lucide-react'
import { facturasRecientes as facturasRecientesEjemplo } from '../data/mockData'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function RecentInvoices({ facturasRecientes = facturasRecientesEjemplo }) {
  return (
    <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Receipt size={16} className="text-brand-yellow" />
        Facturas Recientes
      </h3>

      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="text-gray-500 text-left border-b border-panel-border">
              <th className="pb-2 font-medium"># Factura</th>
              <th className="pb-2 font-medium">Sucursal</th>
              <th className="pb-2 font-medium">Vendedor</th>
              <th className="pb-2 font-medium text-right">Total</th>
              <th className="pb-2 font-medium text-right">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {facturasRecientes.map((f) => (
              <tr key={f.numero} className="border-b border-panel-border/60 last:border-0">
                <td className="py-2 text-gray-300">{f.numero}</td>
                <td className="py-2 text-gray-400">{f.sucursal}</td>
                <td className="py-2 text-gray-400">{f.vendedor}</td>
                <td className="py-2 text-right font-semibold text-white">{formatoCOP.format(f.total)}</td>
                <td className="py-2 text-right text-gray-500">{f.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
