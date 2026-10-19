import KardexInventario from '../components/KardexInventario'

export default function Kardex({ sucursales = [] }) {
  return <KardexInventario sucursales={sucursales} />
}
