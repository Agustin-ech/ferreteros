import ReporteDatos from '../components/ReporteDatos'

export default function ReporteSucursal() {
  return (
    <ReporteDatos
      codigo="consolidado-sucursales"
      titulo="Reporte por sucursal"
      descripcion="Comparativo de ventas, devoluciones y cobertura de facturación entre sucursales."
      mostrarSucursal={false}
    />
  )
}
