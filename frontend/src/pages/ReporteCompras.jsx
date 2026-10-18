import ReporteDatos from '../components/ReporteDatos'

export default function ReporteCompras() {
  return (
    <ReporteDatos
      codigo="compras"
      titulo="Reporte de compras a proveedores"
      descripcion="Órdenes de compra, productos solicitados y estados por período."
      mostrarProveedor
    />
  )
}
