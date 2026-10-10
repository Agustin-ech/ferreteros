import { useMemo, useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { productosInventario, historialAjustesEjemplo } from '../data/mockData'
import NuevoAjustePanel from '../components/NuevoAjustePanel'

// Página "Ajustes de inventario" de UNA sucursal: historial de todos los
// movimientos (entradas/salidas/correcciones) con un botón para registrar
// uno nuevo. Reutilizable para La Chinita y Buena Vista via props.
export default function AjustesInventarioSucursal({ nombreSucursal }) {
  const [movimientos, setMovimientos] = useState(() =>
    historialAjustesEjemplo.filter((m) => m.sucursal === nombreSucursal)
  )
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas las Categorías')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [panelAbierto, setPanelAbierto] = useState(false)

  const categorias = useMemo(
    () => ['Todas las Categorías', ...new Set(productosInventario.map((p) => p.categoria))],
    []
  )

  const categoriaPorProducto = useMemo(
    () => Object.fromEntries(productosInventario.map((p) => [p.nombre, p.categoria])),
    []
  )

  const filas = useMemo(() => {
    let filas = movimientos
    if (busqueda.trim()) {
      filas = filas.filter((m) => m.producto.toLowerCase().includes(busqueda.trim().toLowerCase()))
    }
    if (categoria !== 'Todas las Categorías') {
      filas = filas.filter((m) => categoriaPorProducto[m.producto] === categoria)
    }
    if (tipoFiltro === 'Entradas') filas = filas.filter((m) => m.cantidad > 0)
    if (tipoFiltro === 'Salidas') filas = filas.filter((m) => m.cantidad < 0)
    return filas
  }, [movimientos, busqueda, categoria, tipoFiltro, categoriaPorProducto])

  function agregarMovimiento(nuevo) {
    setMovimientos((prev) => [nuevo, ...prev])
    setPanelAbierto(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
          <Package size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Ajuste de Inventario · {nombreSucursal}</h1>
          <p className="text-sm text-gray-500">
            Realizar correcciones o ajustes de stock. Todos los movimientos quedan guardados en el historial.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-1 min-w-[180px] bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          {categorias.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none"
        >
          <option>Todos</option>
          <option>Entradas</option>
          <option>Salidas</option>
        </select>
        <button
          type="button"
          onClick={() => setPanelAbierto(true)}
          className="ml-auto flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap"
        >
          <Plus size={16} /> Ajustar Inventario
        </button>
      </div>

      <div className={`grid gap-4 ${panelAbierto ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'}`}>
        <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin min-w-0">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-panel-border">
                <th className="py-3 pl-4 pr-2 font-medium">Fecha</th>
                <th className="py-3 pr-2 font-medium">Producto</th>
                <th className="py-3 pr-2 font-medium">Sucursal</th>
                <th className="py-3 pr-2 font-medium">Cantidad</th>
                <th className="py-3 pr-2 font-medium">Motivo</th>
                <th className="py-3 pr-4 font-medium">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((m, i) => (
                <tr key={i} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                  <td className="py-3 pl-4 pr-2 text-gray-300 whitespace-nowrap">{m.fecha}</td>
                  <td className="py-3 pr-2 text-gray-200 font-medium">{m.producto}</td>
                  <td className="py-3 pr-2 text-gray-400 whitespace-nowrap">{m.sucursal}</td>
                  <td className={`py-3 pr-2 font-semibold ${m.cantidad > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </td>
                  <td className="py-3 pr-2 text-gray-300">{m.motivo}</td>
                  <td className="py-3 pr-4 text-gray-400">{m.usuario}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                    Ningún movimiento coincide con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {panelAbierto && (
          <NuevoAjustePanel
            nombreSucursal={nombreSucursal}
            onCancelar={() => setPanelAbierto(false)}
            onGuardar={agregarMovimiento}
          />
        )}
      </div>
    </div>
  )
}