import FacturasLista from '../components/FacturasLista'

export default function FacturasBuenaVista({ facturas, onAnularFactura }) {
  return (
    <FacturasLista
      facturas={facturas}
      onAnularFactura={onAnularFactura}
      sucursalFija="Buenavista"
      titulo="Facturas · Buenavista"
      subtitulo="Listado de facturas de la sucursal Buenavista."
      itemsPorPagina={10}
      botonAccion="exportar"
    />
  )
}