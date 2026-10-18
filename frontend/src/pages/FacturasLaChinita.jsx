import FacturasLista from '../components/FacturasLista'

export default function FacturasLaChinita({ facturas, sucursales, ventasCargando, errorVentas }) {
  return (
    <FacturasLista
      facturas={facturas}
      sucursales={sucursales}
      cargando={ventasCargando}
      error={errorVentas}
      sucursalFija="La Chinita"
      mostrarResumen
      titulo="Facturas · La Chinita"
      subtitulo="Listado de facturas de la sucursal La Chinita."
      itemsPorPagina={10}
      botonAccion="exportar"
    />
  )
}