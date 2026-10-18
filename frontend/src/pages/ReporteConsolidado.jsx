import ReporteDatos from '../components/ReporteDatos'

export default function ReporteConsolidado() {
  return (
    <ReporteDatos
      codigo="consolidado-sucursales"
      titulo="Reporte consolidado"
      descripcion="Resumen real de ventas, devoluciones y facturación de todas las sucursales autorizadas."
      mostrarSucursal={false}
    />
  )
}
