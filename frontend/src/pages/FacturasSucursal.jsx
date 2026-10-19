import FacturasLista from '../components/FacturasLista'

// Facturas de una sucursal. La página se genera para cada sucursal activa
// que devuelve el backend (ver AdminApp y Sidebar).
export default function FacturasSucursal({ nombreSucursal, facturas, sucursales, ventasCargando, errorVentas }) {
  return (
    <FacturasLista
      facturas={facturas}
      sucursales={sucursales}
      cargando={ventasCargando}
      error={errorVentas}
      sucursalFija={nombreSucursal}
      mostrarResumen
      titulo={`Facturas · ${nombreSucursal}`}
      subtitulo={`Listado de facturas de la sucursal ${nombreSucursal}.`}
      itemsPorPagina={10}
      botonAccion="exportar"
    />
  )
}
