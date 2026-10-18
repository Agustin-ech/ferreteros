import { useEffect, useMemo, useState } from 'react'
import { Package, AlertTriangle, TrendingUp, TrendingDown, Store } from 'lucide-react'
import StatCard from '../components/StatCard'
import InventoryBySucursal from '../components/InventoryBySucursal'
import StockAlerts from '../components/StockAlerts'
import EmployeeSummary from '../components/EmployeeSummary'
import IngresosEgresosChart from '../components/IngresosEgresosChart'
import RecentInvoices from '../components/RecentInvoices'
import api from '../api/client'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function fechaLocal(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

export default function Inicio({
  ventas = [],
  ventasCargando = false,
  errorVentas = '',
  errorSucursales = '',
  sucursales = [],
}) {
  const [productos, setProductos] = useState([])
  const [inventario, setInventario] = useState([])
  const [inventarioCargando, setInventarioCargando] = useState(true)
  const [errorInventario, setErrorInventario] = useState('')
  const [tesoreria, setTesoreria] = useState(null)
  const [tesoreriaCargando, setTesoreriaCargando] = useState(true)
  const [errorTesoreria, setErrorTesoreria] = useState('')

  useEffect(() => {
    let cancelado = false
    const hasta = new Date()
    const desde = new Date()
    desde.setDate(desde.getDate() - 6)
    Promise.allSettled([
      api.get('/api/productos'),
      api.get('/api/inventario'),
      api.get('/api/tesoreria/resumen', {
        params: { desde: fechaLocal(desde), hasta: fechaLocal(hasta) },
      }),
    ])
      .then(([respuestaProductos, respuestaInventario, respuestaTesoreria]) => {
        if (cancelado) return
        if (respuestaProductos.status === 'fulfilled' && respuestaInventario.status === 'fulfilled') {
          setProductos((respuestaProductos.value.data || []).filter((producto) => producto.activo !== false))
          setInventario(respuestaInventario.value.data || [])
        } else {
          setErrorInventario('No se pudo cargar el inventario desde el servidor.')
        }
        if (respuestaTesoreria.status === 'fulfilled') {
          setTesoreria(respuestaTesoreria.value.data)
        } else {
          setErrorTesoreria('No se pudo cargar Tesorería desde el servidor.')
        }
      })
      .finally(() => {
        if (!cancelado) {
          setInventarioCargando(false)
          setTesoreriaCargando(false)
        }
      })
    return () => { cancelado = true }
  }, [])

  const inventarioPorSucursal = useMemo(() => sucursales.map((sucursal) => {
    const productosEnSucursal = new Set(
      inventario
        .filter((fila) => fila.idSucursal === sucursal.idSucursal)
        .map((fila) => fila.idProducto)
    )
    return { nombre: sucursal.nombreSucursal, productos: productosEnSucursal.size, porcentaje: 0 }
  }), [inventario, sucursales])
  const mayorInventario = Math.max(0, ...inventarioPorSucursal.map((fila) => fila.productos))
  const sucursalesParaMostrar = inventarioPorSucursal.map((fila) => ({
    ...fila,
    porcentaje: mayorInventario ? Math.round((fila.productos / mayorInventario) * 100) : 0,
  }))

  const stockAlerts = useMemo(() => {
    const stockMinimo = new Map(productos.map((producto) => [producto.idProducto, producto.stockMinimo]))
    const nombreSucursal = new Map(sucursales.map((sucursal) => [sucursal.idSucursal, sucursal.nombreSucursal]))
    return inventario
      .filter((fila) => {
        const minimo = stockMinimo.get(fila.idProducto)
        return minimo != null && Number(fila.cantidadDisponible) <= Number(minimo)
      })
      .map((fila) => ({
        producto: fila.nombreProducto || `Producto #${fila.idProducto}`,
        sucursal: nombreSucursal.get(fila.idSucursal) || `Sucursal #${fila.idSucursal}`,
        existencia: Number(fila.cantidadDisponible),
      }))
  }, [inventario, productos, sucursales])

  const ventasUltimosSieteDias = useMemo(() => {
    const porFecha = new Map((tesoreria?.serie || []).map((dia) => [dia.fecha, dia]))
    return Array.from({ length: 7 }, (_, index) => {
      const fecha = new Date()
      fecha.setDate(fecha.getDate() - (6 - index))
      const clave = fechaLocal(fecha)
      const movimientos = porFecha.get(clave)
      return {
        dia: fecha.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''),
        ingresos: Number(movimientos?.ingresos || 0),
        egresos: Number(movimientos?.egresos || 0),
      }
    })
  }, [tesoreria])

  const hoy = fechaLocal(new Date())
  const movimientosHoy = (tesoreria?.serie || []).find((dia) => dia.fecha === hoy)
  const ingresosDelDia = Number(movimientosHoy?.ingresos || 0)
  const egresosDelDia = Number(movimientosHoy?.egresos || 0)

  const facturasRecientes = useMemo(() => ventas
    .filter((venta) => venta.factura && venta.factura.activo !== false)
    .slice(0, 5)
    .map((venta) => ({
      numero: venta.factura.numeroFactura,
      sucursal: sucursales.find((s) => s.idSucursal === venta.idSucursal)?.nombreSucursal || `Sucursal #${venta.idSucursal}`,
      vendedor: venta.nombreVendedor || `Usuario #${venta.idUsuario}`,
      total: Number(venta.factura.total ?? venta.total ?? 0),
      fecha: new Date(venta.fechaHora).toLocaleDateString('es-CO'),
    })), [ventas, sucursales])

  const error = errorVentas || errorSucursales || errorInventario || errorTesoreria

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-white">¡Bienvenido, Administrador!</h1>
        <p className="text-sm text-gray-500">Aquí un resumen general de la ferretería.</p>
        {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={Package}
          label="Productos Totales"
          value={inventarioCargando ? '…' : errorInventario ? '—' : productos.length.toLocaleString('es-CO')}
          footer={inventarioCargando ? 'Cargando datos…' : 'Productos activos'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock Bajo"
          value={inventarioCargando ? '…' : errorInventario ? '—' : stockAlerts.length}
          footer="Productos en o bajo su mínimo"
          accent="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Ingresos del Día"
          value={tesoreriaCargando ? '…' : errorTesoreria ? '—' : formatoCOP.format(ingresosDelDia)}
          footer="Total de ventas registradas hoy"
          accent="green"
        />
        <StatCard
          icon={TrendingDown}
          label="Egresos del Día"
          value={tesoreriaCargando ? '…' : errorTesoreria ? '—' : formatoCOP.format(egresosDelDia)}
          footer="Egresos registrados en Tesorería"
          accent="blue"
        />
        <StatCard
          icon={Store}
          label="Sucursales"
          value={errorSucursales ? '—' : sucursales.length}
          footer="Sucursales activas del backend"
        />
      </div>

      {/* Segunda fila: inventario, alertas, empleados */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <InventoryBySucursal sucursales={sucursalesParaMostrar} />
        <StockAlerts alertasStock={stockAlerts.slice(0, 6)} />
        <EmployeeSummary />
      </div>

      {/* Tercera fila: gráfico y facturas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <IngresosEgresosChart ingresosEgresos={ventasUltimosSieteDias} />
        <RecentInvoices facturasRecientes={facturasRecientes} cargando={ventasCargando} error={errorVentas} />
      </div>
    </div>
  )
}
