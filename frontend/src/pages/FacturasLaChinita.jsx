import FacturasLista from '../components/FacturasLista'

export default function FacturasLaChinita({ facturas, onAnularFactura }) {
  return (
    <FacturasLista
      facturas={facturas}
      onAnularFactura={onAnularFactura}
      sucursalFija="La Chinita"
      titulo="Facturas · La Chinita"
      subtitulo="Listado de facturas de la sucursal La Chinita."
      itemsPorPagina={10}
      botonAccion="exportar"
    />
  )
}