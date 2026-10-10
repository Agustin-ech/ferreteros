import FacturasLista from '../components/FacturasLista'

export default function Facturas({ facturas, onAnularFactura, onAgregarFactura }) {
  return (
    <FacturasLista
      facturas={facturas}
      onAnularFactura={onAnularFactura}
      onAgregarFactura={onAgregarFactura}
      titulo="Facturas"
      subtitulo="Consulta y gestiona todas las facturas del sistema."
      mostrarResumen
      mostrarCheckbox
      itemsPorPagina={5}
      botonAccion="nueva"
    />
  )
}