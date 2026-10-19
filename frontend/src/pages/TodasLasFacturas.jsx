import FacturasLista from '../components/FacturasLista'

export default function TodasLasFacturas({ facturas, sucursales, ventasCargando, errorVentas }) {
  return (
    <FacturasLista
      facturas={facturas}
      sucursales={sucursales}
      cargando={ventasCargando}
      error={errorVentas}
      mostrarResumen
      titulo="Todas las facturas"
      subtitulo="Listado completo de todas las facturas del sistema."
      itemsPorPagina={10}
      botonAccion="exportar"
    />
  )
}