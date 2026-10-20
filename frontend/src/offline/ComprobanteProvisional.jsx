import { CloudOff, Printer, X } from 'lucide-react'

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

// Comprobante que se entrega al cliente cuando la venta se hace sin internet.
// La factura oficial se genera al sincronizar y queda en "Facturas emitidas".
export default function ComprobanteProvisional({ comprobante, onCerrar }) {
  const { numero, fecha, productos, bruto, descuento, total, metodoPago, cliente } = comprobante

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Comprobante provisional">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] print:hidden">
        <div className="flex items-start justify-between gap-3 border-b border-[#2a2a2a] p-4">
          <div>
            <p className="flex items-center gap-2 font-semibold text-white"><CloudOff size={16} className="text-amber-300" /> Venta guardada sin conexión</p>
            <p className="mt-1 text-xs text-gray-400">Se enviará sola cuando vuelva internet. Entrega este comprobante al cliente.</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-200">
          <p className="text-xs text-gray-400">Comprobante provisional</p>
          <p className="text-lg font-bold text-white">{numero}</p>
          <p className="mb-3 text-xs text-gray-400">{new Date(fecha).toLocaleString('es-CO')}</p>
          <ul className="divide-y divide-[#2a2a2a]">
            {productos.map((p, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 break-words">{p.cantidad} × {p.nombre}{p.descuento > 0 && <span className="block text-xs text-emerald-400">Descuento -{moneda.format(p.descuento)}</span>}</span>
                <span className="whitespace-nowrap">{moneda.format(p.neto)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-[#2a2a2a] pt-3">
            {descuento > 0 && <p className="flex justify-between text-gray-400"><span>Subtotal</span><span>{moneda.format(bruto)}</span></p>}
            {descuento > 0 && <p className="flex justify-between text-emerald-400"><span>Descuentos</span><span>-{moneda.format(descuento)}</span></p>}
            <p className="flex justify-between text-base font-bold text-white"><span>Total</span><span>{moneda.format(total)}</span></p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#2a2a2a] p-4">
          <button type="button" onClick={onCerrar} className="border border-[#444] px-4 py-2 text-sm text-gray-200 hover:bg-[#242424]">Cerrar</button>
          <button type="button" onClick={() => window.print()} className="flex items-center gap-2 bg-[#F2B01E] px-4 py-2 text-sm font-semibold text-black hover:brightness-110">
            <Printer size={15} /> Imprimir
          </button>
        </div>
      </div>

      {/* Versión impresa (ver reglas de @media print en index.css) */}
      <div className="print-invoice hidden print:block text-black">
        <p className="text-center text-lg font-bold">Ferretería Ferreteros S.A.</p>
        <p className="text-center font-bold">COMPROBANTE PROVISIONAL</p>
        <p className="text-center text-sm">No. {numero}</p>
        <p className="text-center text-xs">{new Date(fecha).toLocaleString('es-CO')}</p>
        {cliente && <p className="mt-2 text-sm">Cliente: {cliente}</p>}
        <p className="text-sm">Método de pago: {metodoPago}</p>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="border-b border-black text-left"><th className="py-1">Producto</th><th className="py-1 text-right">Cant.</th><th className="py-1 text-right">Total</th></tr></thead>
          <tbody>
            {productos.map((p, i) => (
              <tr key={i} className="border-b border-gray-300">
                <td className="py-1">{p.nombre}{p.descuento > 0 ? ` (desc. -${moneda.format(p.descuento)})` : ''}</td>
                <td className="py-1 text-right">{p.cantidad}</td>
                <td className="py-1 text-right">{moneda.format(p.neto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {descuento > 0 && <p className="mt-2 flex justify-between text-sm"><span>Subtotal</span><span>{moneda.format(bruto)}</span></p>}
        {descuento > 0 && <p className="flex justify-between text-sm"><span>Descuentos</span><span>-{moneda.format(descuento)}</span></p>}
        <p className="mt-1 flex justify-between border-t-2 border-black pt-1 font-bold"><span>Total</span><span>{moneda.format(total)}</span></p>
        <p className="mt-4 text-xs">
          Venta registrada sin conexión. La factura oficial se generará al restablecerse la conexión
          y podrá solicitarse con este número de comprobante.
        </p>
      </div>
    </div>
  )
}
