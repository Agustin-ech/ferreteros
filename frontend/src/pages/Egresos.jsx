import TesoreriaMovimientos from '../components/TesoreriaMovimientos'

export default function Egresos({ sucursales = [] }) {
  return (
    <TesoreriaMovimientos
      tipo="egreso"
      sucursales={sucursales}
      titulo="Egresos"
      subtitulo="Egresos registrados manualmente en Tesorería."
    />
  )
}
