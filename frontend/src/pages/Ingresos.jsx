import TesoreriaMovimientos from '../components/TesoreriaMovimientos'

export default function Ingresos({ sucursales = [] }) {
  return (
    <TesoreriaMovimientos
      tipo="ingreso"
      sucursales={sucursales}
      titulo="Ingresos"
      subtitulo="Ventas activas incorporadas automáticamente a Tesorería."
    />
  )
}
