import ReporteDatos from '../components/ReporteDatos'

export default function ReporteVentas() {
  return (
    <ReporteDatos
      codigo="ventas"
      titulo="Reporte de ventas"
      descripcion="Ventas por periodo y sucursal, con sus totales y detalles."
    />
  )
}
