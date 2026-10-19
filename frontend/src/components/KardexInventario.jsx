import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, History, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../api/client'

const formatoCantidad = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 })
const POR_PAGINA = 50

export default function KardexInventario({ sucursales = [], idSucursalFija = null }) {
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [filtros, setFiltros] = useState({
    sucursal: idSucursalFija ? String(idSucursalFija) : '',
    producto: '',
    tipo: '',
    desde: '',
    hasta: '',
  })
  const [cargando, setCargando] = useState(true)
  const [errorProductos, setErrorProductos] = useState('')
  const [errorMovimientos, setErrorMovimientos] = useState('')

  useEffect(() => {
    let cancelado = false
    api.get('/api/productos')
      .then(({ data }) => {
        if (!cancelado) setProductos(data || [])
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorProductos(err?.response?.data?.mensaje || err?.response?.data?.error || 'No se pudieron cargar los productos.')
        }
      })
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    let cancelado = false
    const params = { pagina, por_pagina: POR_PAGINA }
    Object.entries(filtros).forEach(([nombre, valor]) => {
      if (valor) params[nombre] = valor
    })
    if (idSucursalFija) params.sucursal = idSucursalFija

    setCargando(true)
    api.get('/api/inventario/movimientos', { params })
      .then(({ data }) => {
        if (cancelado) return
        setMovimientos(data.movimientos || [])
        setTotal(data.total || 0)
        setErrorMovimientos('')
      })
      .catch((err) => {
        if (!cancelado) {
          setMovimientos([])
          setTotal(0)
          setErrorMovimientos(err?.response?.data?.mensaje || err?.response?.data?.error || 'No se pudo cargar el kardex.')
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => { cancelado = true }
  }, [filtros, pagina, idSucursalFija])

  function cambiarFiltro(nombre, valor) {
    setPagina(1)
    setFiltros((actuales) => ({ ...actuales, [nombre]: valor }))
  }

  const paginasTotales = Math.max(1, Math.ceil(total / POR_PAGINA))

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-yellow/15 text-brand-yellow">
          <History size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Kardex de mercancía</h1>
          <p className="text-sm text-gray-400">Historial de entradas, salidas, ventas, devoluciones y ajustes.</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-panel-border bg-panel-card p-4 sm:grid-cols-2 xl:grid-cols-5">
        {!idSucursalFija && (
          <label className="text-xs text-gray-400">
            Sucursal
            <select className="input mt-1 w-full" value={filtros.sucursal} onChange={(e) => cambiarFiltro('sucursal', e.target.value)}>
              <option value="">Todas las sucursales</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.idSucursal} value={sucursal.idSucursal}>{sucursal.nombreSucursal}</option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs text-gray-400">
          Producto
          <select className="input mt-1 w-full" value={filtros.producto} onChange={(e) => cambiarFiltro('producto', e.target.value)}>
            <option value="">Todos los productos</option>
            {productos.map((producto) => (
              <option key={producto.idProducto} value={producto.idProducto}>
                {producto.codigoSKU} · {producto.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-400">
          Movimiento
          <select className="input mt-1 w-full" value={filtros.tipo} onChange={(e) => cambiarFiltro('tipo', e.target.value)}>
            <option value="">Entradas y salidas</option>
            <option value="Entrada">Entradas</option>
            <option value="Salida">Salidas</option>
          </select>
        </label>
        <label className="text-xs text-gray-400">
          Desde
          <input className="input mt-1 w-full" type="date" value={filtros.desde} onChange={(e) => cambiarFiltro('desde', e.target.value)} />
        </label>
        <label className="text-xs text-gray-400">
          Hasta
          <input className="input mt-1 w-full" type="date" value={filtros.hasta} onChange={(e) => cambiarFiltro('hasta', e.target.value)} />
        </label>
      </div>

      {(errorProductos || errorMovimientos) && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {errorProductos || errorMovimientos}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-panel-border bg-panel-card">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-panel-border text-xs uppercase text-gray-400">
            <tr>
              {['Fecha', 'Sucursal', 'Producto', 'Tipo', 'Cantidad', 'Stock anterior', 'Stock nuevo', 'Origen / motivo'].map((titulo) => (
                <th key={titulo} className="px-4 py-3 font-medium">{titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {movimientos.map((movimiento) => {
              const entrada = movimiento.tipoMovimiento === 'Entrada'
              const nombreSucursal = sucursales.find((s) => s.idSucursal === movimiento.idSucursal)?.nombreSucursal
              return (
                <tr key={movimiento.idTransaccionInventario} className="text-gray-300">
                  <td className="whitespace-nowrap px-4 py-3">{new Date(movimiento.fecha).toLocaleString('es-CO')}</td>
                  <td className="px-4 py-3">{nombreSucursal || `Sucursal ${movimiento.idSucursal}`}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{movimiento.nombreProducto || 'Producto'}</p>
                    <p className="text-xs text-gray-500">{movimiento.codigoProducto || `ID ${movimiento.idProducto}`}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${entrada ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                      {entrada ? <ArrowDownToLine size={13} /> : <ArrowUpFromLine size={13} />}
                      {movimiento.tipoMovimiento}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${entrada ? 'text-emerald-300' : 'text-red-300'}`}>
                    {entrada ? '+' : '-'}{formatoCantidad.format(movimiento.cantidad)}
                  </td>
                  <td className="px-4 py-3">{movimiento.stockAnterior == null ? '—' : formatoCantidad.format(movimiento.stockAnterior)}</td>
                  <td className="px-4 py-3">{movimiento.stockNuevo == null ? '—' : formatoCantidad.format(movimiento.stockNuevo)}</td>
                  <td className="px-4 py-3">
                    <p>{movimiento.referencia}</p>
                    {movimiento.motivo && <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500" title={movimiento.motivo}>{movimiento.motivo}</p>}
                  </td>
                </tr>
              )
            })}
            {!cargando && movimientos.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No hay movimientos para los filtros seleccionados.</td></tr>
            )}
            {cargando && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Cargando movimientos…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{total.toLocaleString('es-CO')} movimientos</span>
        <div className="flex items-center gap-3">
          <span>Página {pagina} de {paginasTotales}</span>
          <button
            type="button"
            aria-label="Página anterior"
            disabled={pagina <= 1 || cargando}
            onClick={() => setPagina((actual) => actual - 1)}
            className="rounded-lg border border-panel-border p-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={pagina >= paginasTotales || cargando}
            onClick={() => setPagina((actual) => actual + 1)}
            className="rounded-lg border border-panel-border p-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}
