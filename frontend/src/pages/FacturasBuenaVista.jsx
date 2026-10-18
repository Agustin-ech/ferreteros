import FacturasLista from '../components/FacturasLista'

export default function FacturasBuenaVista({ facturas, sucursales, ventasCargando, errorVentas }) {
  return (
    <FacturasLista
      facturas={facturas}
      sucursales={sucursales}
      cargando={ventasCargando}
      error={errorVentas}
      sucursalFija="Buenavista"
      mostrarResumen
      titulo="Facturas · Buenavista"
      subtitulo="Listado de facturas de la sucursal Buenavista."
      itemsPorPagina={10}
      botonAccion="exportar"
    />
  )
}