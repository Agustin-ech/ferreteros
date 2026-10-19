import Finanzas from './Finanzas'

export default function ReporteFinanciero({ sucursales = [] }) {
  return (
    <Finanzas
      sucursales={sucursales}
      resumen
      titulo="Reporte financiero"
      modoReporte
    />
  )
}
