import { ArrowLeft, FileText, Printer, Download } from 'lucide-react'
import logo from '../assets/logo.png'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function FacturaDetalle({ factura, onVolver }) {
  const productos = factura.productos || []
  const subtotal = Number(factura.subtotal || 0)
  const descuento = Number(factura.descuento || 0)
  const costoEnvio = Number(factura.costoEnvio || 0)
  const total = Number(factura.total || 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <FileText size={20} />
          </span>
          <div>
            <button onClick={onVolver} className="flex items-center gap-1.5 text-xs text-brand-yellow hover:underline w-fit mb-1">
              <ArrowLeft size={13} /> Volver a facturas
            </button>
            <h1 className="text-xl font-bold text-white">Factura #{factura.numero}</h1>
            <p className="text-sm text-gray-500">{factura.sucursal} · {factura.fecha} {factura.hora}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 border border-panel-border rounded-lg px-4 py-2 text-sm text-gray-200 hover:bg-white/5 transition">
            <Printer size={15} /> Imprimir
          </button>
          <button
            type="button"
            disabled
            title="La descarga estará disponible próximamente."
            className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 opacity-60 cursor-not-allowed"
          >
            <Download size={15} /> Descargar PDF
          </button>
        </div>
      </div>

      <div className="print:hidden grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">Factura #{factura.numero}</p>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400">Emitida</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm border-t border-panel-border pt-4">
              <div><p className="text-xs text-gray-500">Fecha</p><p className="text-gray-200">{factura.fecha} - {factura.hora}</p></div>
              <div><p className="text-xs text-gray-500">Sucursal</p><p className="text-gray-200">{factura.sucursal}</p></div>
              <div><p className="text-xs text-gray-500">Vendedor</p><p className="text-gray-200">{factura.vendedor}</p></div>
              <div><p className="text-xs text-gray-500">Cliente</p><p className="text-gray-200">{factura.cliente}</p></div>
              <div><p className="text-xs text-gray-500">Método de pago</p><p className="text-gray-200">{factura.metodoPago}</p></div>
            </div>
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
            <p className="px-4 pt-4 pb-1 font-semibold text-white text-sm">Productos</p>
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-panel-border">
                  <th className="py-2.5 px-4 font-medium">Producto</th>
                  <th className="py-2.5 pr-4 font-medium">Cantidad</th>
                  <th className="py-2.5 pr-4 font-medium">Precio unitario</th>
                  <th className="py-2.5 pr-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto, index) => (
                  <tr key={`${producto.nombre}-${index}`} className="border-b border-panel-border/60 last:border-0">
                    <td className="py-2.5 px-4 text-gray-200 font-medium">{producto.nombre}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{producto.cantidad}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{formatoCOP.format(producto.precioUnitario)}</td>
                    <td className="py-2.5 pr-4 text-gray-200 font-semibold">{formatoCOP.format(producto.total)}</td>
                  </tr>
                ))}
                {productos.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-500">La venta no contiene detalles de productos.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3 h-fit">
          <p className="font-semibold text-white text-sm">Resumen de la factura</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Subtotal:</span>
            <span className="text-gray-200">{formatoCOP.format(subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Descuento:</span>
              <span className="text-gray-200">-{formatoCOP.format(descuento)}</span>
            </div>
          )}
          {costoEnvio > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Costo de envío:</span>
              <span className="text-gray-200">{formatoCOP.format(costoEnvio)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-brand-yellow/40 pt-3">
            <span className="font-semibold text-white">Total:</span>
            <span className="font-bold text-brand-yellow text-lg">{formatoCOP.format(total)}</span>
          </div>
          <p className="text-xs text-gray-500">El backend no registra historial de pagos ni notas de factura.</p>
        </div>
      </div>

      <div className="print-invoice hidden print:block text-black">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Ferretería" className="h-14 w-14 object-contain" />
            <div><p className="font-bold text-lg leading-tight">Ferretería</p></div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">FACTURA DE VENTA</p>
            <p className="text-sm">No. {factura.numero}</p>
            <p className="text-xs text-gray-700">{factura.fecha} - {factura.hora}</p>
            <p className="text-xs text-gray-700">Sucursal: {factura.sucursal}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm py-4 border-b border-gray-400">
          <div><p className="text-xs uppercase text-gray-500 font-semibold">Cliente</p><p>{factura.cliente}</p></div>
          <div><p className="text-xs uppercase text-gray-500 font-semibold">Atendido por</p><p>{factura.vendedor}</p></div>
          <div><p className="text-xs uppercase text-gray-500 font-semibold">Método de pago</p><p>{factura.metodoPago}</p></div>
        </div>
        <table className="w-full text-sm mt-4">
          <thead><tr className="border-b-2 border-black text-left">
            <th className="py-2 font-semibold">Producto</th>
            <th className="py-2 font-semibold text-right">Cantidad</th>
            <th className="py-2 font-semibold text-right">Precio unitario</th>
            <th className="py-2 font-semibold text-right">Total</th>
          </tr></thead>
          <tbody>
            {productos.map((producto, index) => (
              <tr key={`${producto.nombre}-${index}`} className="border-b border-gray-300">
                <td className="py-2">{producto.nombre}</td>
                <td className="py-2 text-right">{producto.cantidad}</td>
                <td className="py-2 text-right">{formatoCOP.format(producto.precioUnitario)}</td>
                <td className="py-2 text-right">{formatoCOP.format(producto.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-4">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-1"><span>Subtotal:</span><span>{formatoCOP.format(subtotal)}</span></div>
            {descuento > 0 && <div className="flex justify-between py-1"><span>Descuento:</span><span>-{formatoCOP.format(descuento)}</span></div>}
            {costoEnvio > 0 && <div className="flex justify-between py-1"><span>Envío:</span><span>{formatoCOP.format(costoEnvio)}</span></div>}
            <div className="flex justify-between py-2 border-t-2 border-black font-bold text-base mt-1"><span>Total:</span><span>{formatoCOP.format(total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
