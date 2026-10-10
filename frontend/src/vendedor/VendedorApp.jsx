import { useState } from 'react'
import { DollarSign, FileText, Home, RefreshCw, ShoppingCart } from 'lucide-react'
import RoleLayout from '../components/RoleLayout'
import Inicio from './components/Inicio'
import ConsultarDevolucion from './components/ConsultarDevolucion'
import FiltroVentas from './components/FiltroVentas'
import HistorialPago from './components/HistorialPago'
import FacturasEmitidas from './components/FacturasEmitidas'
import RegistrarDevolucion from './components/RegistrarDevolucion'
import VentasDelDia from './components/VentasDelDia'
import NuevaVenta from './components/NuevaVenta'

const navigation = [
  { label: 'Inicio', icon: Home, page: 'inicio' },
  { label: 'Ventas', icon: ShoppingCart, children: [
    { label: 'Nueva venta', page: 'nueva-venta' },
    { label: 'Ventas del día', page: 'ventas-del-dia' },
    { label: 'Filtro de ventas', page: 'filtro-ventas' },
  ] },
  { label: 'Facturas y pedidos', icon: FileText, children: [
    { label: 'Facturas emitidas', page: 'facturas-emitidas' },
  ] },
  { label: 'Pagos', icon: DollarSign, children: [
    { label: 'Historial de pago', page: 'historial-pago' },
  ] },
  { label: 'Devoluciones', icon: RefreshCw, children: [
    { label: 'Registrar devolución', page: 'registrar-devolucion' },
    { label: 'Consultar devolución', page: 'consultar-devolucion' },
  ] },
]

export default function VendedorApp({ onLogout }) {
  const [visitaActual, setVisitaActual] = useState('inicio')

  const renderizarVisita = () => {
    switch (visitaActual) {
      case 'inicio': return <Inicio cambiarVista={setVisitaActual} />
      case 'nueva-venta': return <NuevaVenta />
      case 'ventas-del-dia': return <VentasDelDia />
      case 'filtro-ventas': return <FiltroVentas />
      case 'facturas-emitidas': return <FacturasEmitidas />
      case 'historial-pago': return <HistorialPago />
      case 'registrar-devolucion': return <RegistrarDevolucion />
      case 'consultar-devolucion': return <ConsultarDevolucion />
      default: return <Inicio cambiarVista={setVisitaActual} />
    }
  }

  return (
    <RoleLayout
      roleName="Vendedor"
      localName="La Chinita"
      navigation={navigation}
      activePage={visitaActual}
      onNavigate={setVisitaActual}
      onLogout={onLogout}
    >
      {renderizarVisita()}
    </RoleLayout>
  )
}
