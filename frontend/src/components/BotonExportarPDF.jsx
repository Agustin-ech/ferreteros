import { Download } from 'lucide-react'

// Botón "Exportar PDF" de las páginas de Reportes. Usa el diálogo de
// impresión del navegador (que permite "Guardar como PDF"), sobre el
// contenido marcado con la clase .print-area de cada página. No aparece
// él mismo en la hoja impresa.
export default function BotonExportarPDF({ className = '' }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`print:hidden flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap ${className}`}
    >
      <Download size={16} /> Exportar PDF
    </button>
  )
}