import { ArrowLeft, ArrowUpCircle, Printer } from 'lucide-react'

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export default function DetalleEgreso({ egreso, onVolver }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <ArrowUpCircle size={20} />
          </span>
          <div>
            <button onClick={onVolver} className="flex items-center gap-1.5 text-xs text-brand-yellow hover:underline w-fit mb-1">
              <ArrowLeft size={13} /> Volver a egresos
            </button>
            <h1 className="text-xl font-bold text-white">Detalle del egreso</h1>
            <p className="text-sm text-gray-500">{egreso.descripcion}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 border border-panel-border rounded-lg px-4 py-2 text-sm text-gray-200 hover:bg-white/5 transition"
        >
          <Printer size={15} /> Imprimir
        </button>
      </div>

      <div className="print-area bg-panel-card border border-panel-border rounded-xl p-4 max-w-lg flex flex-col gap-3">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Fecha</p>
            <p className="text-gray-200">{egreso.fecha}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Sucursal</p>
            <p className="text-gray-200">{egreso.sucursal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Concepto</p>
            <p className="text-gray-200">{egreso.concepto}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Proveedor</p>
            <p className="text-gray-200">{egreso.proveedor}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500">Descripción</p>
            <p className="text-gray-200">{egreso.descripcion}</p>
          </div>
        </div>
        <div className="border-t border-panel-border pt-3 flex items-center justify-between">
          <span className="font-semibold text-white">Monto:</span>
          <span className="font-bold text-red-400 text-lg">{formatoCOP.format(egreso.monto)}</span>
        </div>
      </div>
    </div>
  )
}