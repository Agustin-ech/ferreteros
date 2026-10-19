import { useEffect, useState } from 'react'
import { BarChart2, DollarSign, FileText, Package, ShoppingCart, Store, Truck } from 'lucide-react'
import { listarReportes } from '../api/reportes'

const PAGINAS_REPORTE = {
  ventas: 'reporte-ventas',
  facturas: 'reporte-facturas',
  devoluciones: 'reporte-devoluciones',
  'ventas-por-producto': 'reporte-productos',
  'inventario-existencias': 'reporte-inventario',
  'consolidado-sucursales': 'reporte-consolidado',
  'ingresos-egresos': 'reporte-financiero',
  compras: 'reporte-compras',
  'mercancia-danada': 'reporte-mercancia-danada',
}

const ICONOS_REPORTE = {
  ventas: ShoppingCart,
  facturas: FileText,
  devoluciones: FileText,
  'ventas-por-producto': Package,
  'inventario-existencias': Package,
  'consolidado-sucursales': Store,
  'ingresos-egresos': DollarSign,
  compras: Truck,
  'mercancia-danada': Package,
}

export default function Reportes({ onNavigate }) {
  const [catalogo, setCatalogo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    listarReportes()
      .then((resultado) => {
        if (!cancelado) {
          setCatalogo(resultado)
          setError('')
        }
      })
      .catch((requestError) => {
        if (!cancelado) {
          setError(requestError.response?.data?.mensaje
            || requestError.response?.data?.error
            || 'No se pudo cargar el catálogo de reportes del servidor.')
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => { cancelado = true }
  }, [])

  const reportesDisponibles = catalogo
    ? catalogo.reportes.some((reporte) => reporte.codigo === 'ingresos-egresos')
      ? catalogo.reportes
      : [
        ...catalogo.reportes,
        {
          codigo: 'ingresos-egresos',
          nombre: 'Reporte financiero',
          descripcion: 'Ventas activas y egresos de Tesorería por periodo y sucursal.',
        },
      ]
    : []
  const reportesPendientes = catalogo?.reportes_pendientes
    ?.filter((reporte) => !['ingresos-egresos', 'inventario-movimientos'].includes(reporte.codigo)) || []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
          <BarChart2 size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-white">Reportes</h1>
          <p className="text-sm text-gray-500">Consulta información generada por el backend y sus datos actuales.</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {cargando && <p role="status" className="text-sm text-gray-400">Cargando catálogo de reportes…</p>}

      {catalogo && (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Disponibles</h2>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {reportesDisponibles.map((reporte) => {
                const Icon = ICONOS_REPORTE[reporte.codigo] || BarChart2
                const pagina = PAGINAS_REPORTE[reporte.codigo]
                return (
                  <button
                    key={reporte.codigo}
                    type="button"
                    onClick={() => pagina && onNavigate?.(pagina)}
                    disabled={!pagina}
                    className="text-left bg-panel-card border border-panel-border rounded-xl p-4 flex flex-col gap-3 hover:border-brand-yellow/50 hover:bg-white/5 transition disabled:opacity-60"
                  >
                    <span className="h-9 w-9 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="font-semibold text-white text-sm">{reporte.nombre}</p>
                      <p className="text-xs text-gray-500 mt-1">{reporte.descripcion}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {reportesPendientes.length > 0 && <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">En preparación</h2>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {reportesPendientes.map((reporte) => (
                <article key={reporte.codigo} className="bg-panel-card/60 border border-panel-border rounded-xl p-4">
                  <p className="font-semibold text-gray-300 text-sm">{reporte.nombre}</p>
                  <p className="text-xs text-gray-500 mt-2">{reporte.requiere}</p>
                </article>
              ))}
            </div>
          </section>}
        </>
      )}
    </div>
  )
}
