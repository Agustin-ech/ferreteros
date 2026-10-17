import HistorialVentasIntegrado from './HistorialVentasIntegrado'

export default function VentasDelDiaIntegradas({ idSucursal }) {
  return <HistorialVentasIntegrado titulo="Ventas del día" soloHoy modo="ventas" idSucursal={idSucursal} />
}