import FacturasLista from '../components/FacturasLista'

export default function TodasLasFacturas({ facturas, onAnularFactura }) {
  return (
    <FacturasLista
      facturas={facturas}
      onAnularFactura={onAnularFactura}
      titulo="Todas las facturas"
      subtitulo="Listado completo de todas las facturas del sistema."
      itemsPorPagina={10}
      botonAccion="exportar"
    />
  )
}