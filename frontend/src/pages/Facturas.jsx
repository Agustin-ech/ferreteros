import FacturasLista from '../components/FacturasLista'

export default function Facturas({ facturas, sucursales, ventasCargando, errorVentas }) {
  return (
    <FacturasLista
      facturas={facturas}
      sucursales={sucursales}
      cargando={ventasCargando}
      error={errorVentas}
      titulo="Facturas"
      subtitulo="Consulta las facturas emitidas por las ventas registradas."
      mostrarResumen
      mostrarCheckbox
      itemsPorPagina={5}
      botonAccion={null}
    />
  )
}