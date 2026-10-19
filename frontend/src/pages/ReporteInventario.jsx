import ReporteDatos from '../components/ReporteDatos'

export default function ReporteInventario({ onNavigate }) {
  return (
    <div className="space-y-4">
      <ReporteDatos
        codigo="inventario-existencias"
        titulo="Reporte de existencias"
        descripcion="Existencias actuales de productos por sucursal. Consulta el detalle de entradas y salidas en el Kardex."
      />
      <button type="button" className="btn-primary" onClick={() => onNavigate?.('kardex')}>
        Consultar kardex de mercancía
      </button>
    </div>
  )
}
