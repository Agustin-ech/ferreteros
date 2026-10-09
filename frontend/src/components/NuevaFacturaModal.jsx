import { useMemo, useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { productosInventario, empleados, calcularTotalesFactura } from '../data/mockData'

// =====================================================================
// TEMPORAL-BACKEND: crear factura sin backend.
// Hoy la factura solo se agrega a la lista en memoria (estado de AdminApp).
// Cuando exista el backend:
//  - El NÚMERO de factura lo debe generar el backend (aquí se calcula como
//    "el mayor + 1", que solo sirve para pruebas).
//  - El backend debe descontar el stock de cada producto vendido.
//  - Enviar la factura con api.post('/facturas', ...) en vez de onCrear().
// =====================================================================

const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia']
const VENDEDORES = empleados.filter((e) => e.estado === 'Activo').map((e) => e.nombre)

function fechaHoy() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
function horaAhora() {
  const d = new Date()
  const h = d.getHours()
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h % 12 || 12}:${min} ${h < 12 ? 'a.m.' : 'p.m.'}`
}

const campo = 'w-full bg-panel-bg border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand-yellow'

export default function NuevaFacturaModal({ facturas, sucursalInicial, onCrear, onCerrar }) {
  const [sucursal, setSucursal] = useState(sucursalInicial ?? 'La Chinita')
  const [vendedor, setVendedor] = useState(VENDEDORES[0] ?? '')
  const [cliente, setCliente] = useState('Cliente general')
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  const [estado, setEstado] = useState('Pagada')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([{ nombre: '', cantidad: 1 }])
  const [error, setError] = useState('')

  const claveStock = sucursal === 'La Chinita' ? 'laChinita' : 'buenaVista'
  const stockDe = (nombre) => productosInventario.find((p) => p.nombre === nombre)?.[claveStock] ?? 0

  const itemsValidos = items.filter((i) => i.nombre && Number(i.cantidad) > 0).map((i) => ({ nombre: i.nombre, cantidad: Number(i.cantidad) }))
  const totales = useMemo(() => calcularTotalesFactura({ productos: itemsValidos }), [items])

  function cambiarItem(idx, cambios) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...cambios } : it)))
    setError('')
  }

  function guardar(e) {
    e.preventDefault()
    if (!cliente.trim()) return setError('Escribe el nombre del cliente.')
    if (itemsValidos.length === 0) return setError('Agrega al menos un producto con cantidad mayor a 0.')
    const repetido = itemsValidos.find((it, i) => itemsValidos.findIndex((x) => x.nombre === it.nombre) !== i)
    if (repetido) return setError(`"${repetido.nombre}" está repetido. Suma la cantidad en una sola fila.`)
    const sinStock = itemsValidos.find((it) => it.cantidad > stockDe(it.nombre))
    if (sinStock) return setError(`Solo hay ${stockDe(sinStock.nombre)} de "${sinStock.nombre}" en ${sucursal}.`)

    const siguiente = Math.max(0, ...facturas.map((f) => parseInt(f.numero, 10) || 0)) + 1
    const fecha = fechaHoy()
    const hora = horaAhora()
    onCrear({
      numero: String(siguiente).padStart(5, '0'),
      fecha, hora, sucursal, vendedor,
      cliente: cliente.trim(), metodoPago, estado,
      productos: itemsValidos,
      historialPagos: estado === 'Pagada' ? [{ fecha: `${fecha} - ${hora}`, metodo: metodoPago }] : [],
      notas: notas.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onCerrar}>
      <form onSubmit={guardar} onClick={(e) => e.stopPropagation()} className="my-6 w-full max-w-2xl rounded-xl border border-panel-border bg-panel-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Nueva factura</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-gray-400">Sucursal
            <select className={`${campo} mt-1`} value={sucursal} onChange={(e) => setSucursal(e.target.value)}>
              <option>La Chinita</option><option>Buenavista</option>
            </select>
          </label>
          <label className="text-xs text-gray-400">Vendedor
            <select className={`${campo} mt-1`} value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
              {VENDEDORES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-400">Cliente
            <input className={`${campo} mt-1`} value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-gray-400">Método de pago
              <select className={`${campo} mt-1`} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-400">Estado
              <select className={`${campo} mt-1`} value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option>Pagada</option><option>Pendiente</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-white">Productos</p>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select className={campo} value={it.nombre} onChange={(e) => cambiarItem(idx, { nombre: e.target.value })}>
                  <option value="">Seleccionar producto</option>
                  {productosInventario.map((p) => (
                    <option key={p.id} value={p.nombre}>{p.nombre} · {formatoCOP.format(p.precio)} (stock {p[claveStock]})</option>
                  ))}
                </select>
                <input type="number" min="1" className={`${campo} w-24`} value={it.cantidad} onChange={(e) => cambiarItem(idx, { cantidad: e.target.value })} />
                <button type="button" title="Quitar" disabled={items.length === 1}
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-gray-400 hover:text-red-400 disabled:opacity-30"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setItems((prev) => [...prev, { nombre: '', cantidad: 1 }])}
            className="mt-2 flex items-center gap-1 text-sm text-brand-yellow hover:brightness-110">
            <Plus size={14} /> Agregar producto
          </button>
        </div>

        <label className="mt-4 block text-xs text-gray-400">Notas (opcional)
          <textarea className={`${campo} mt-1 h-16`} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>

        <div className="mt-4 rounded-lg bg-panel-bg p-3 text-sm">
          <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{formatoCOP.format(totales.subtotal)}</span></div>
          <div className="flex justify-between text-gray-400"><span>IVA (19%)</span><span>{formatoCOP.format(totales.iva)}</span></div>
          <div className="mt-1 flex justify-between font-bold text-white"><span>Total</span><span>{formatoCOP.format(totales.total)}</span></div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="rounded-lg border border-panel-border px-4 py-2 text-sm text-gray-300 hover:bg-white/5">Cancelar</button>
          <button type="submit" className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-panel-sidebar hover:brightness-95">Guardar factura</button>
        </div>
      </form>
    </div>
  )
}
