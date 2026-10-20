import { useEffect, useState } from 'react'
import { DollarSign, FileText, Home, RefreshCw, ShoppingCart } from 'lucide-react'
import RoleLayout from '../components/RoleLayout'
import { crearVerificador, filtrarNavegacion, moduloDePagina, MODULOS } from '../utils/permisos'
import api from '../api/client'
import usePaginaHistorial from '../hooks/usePaginaHistorial'
import Inicio from './components/Inicio'
import ConsultarDevolucion from './components/ConsultarDevolucionIntegrada'
import HistorialVentasIntegrado from './components/HistorialVentasIntegrado'
import RegistrarDevolucion from './components/RegistrarDevolucionIntegrada'
import VentasDelDia from './components/VentasDelDiaIntegradas'
import NuevaVenta from './components/NuevaVentaIntegrada'

const navigation = [
  { label: 'Inicio', icon: Home, page: 'inicio' },
  { label: 'Ventas', icon: ShoppingCart, children: [
    { label: 'Nueva venta', page: 'nueva-venta', modulo: MODULOS.ventas },
    { label: 'Ventas del día', page: 'ventas-del-dia', modulo: MODULOS.ventas },
    { label: 'Filtro de ventas', page: 'filtro-ventas', modulo: MODULOS.ventas },
  ] },
  { label: 'Facturas y pedidos', icon: FileText, children: [
    { label: 'Facturas emitidas', page: 'facturas-emitidas', modulo: MODULOS.ventas },
  ] },
  { label: 'Pagos', icon: DollarSign, children: [
    { label: 'Historial de pago', page: 'historial-pago', modulo: MODULOS.ventas },
  ] },
  { label: 'Devoluciones', icon: RefreshCw, children: [
    { label: 'Registrar devolución', page: 'registrar-devolucion', modulo: MODULOS.devoluciones },
    { label: 'Consultar devolución', page: 'consultar-devolucion', modulo: MODULOS.devoluciones },
  ] },
]
const moduloPorPagina = moduloDePagina(navigation)

export default function VendedorApp({ usuario, onLogout }) {
  const puede = crearVerificador(usuario?.modulos)
  const [visitaActual, setVisitaActual] = usePaginaHistorial('inicio')
  const [nombreSucursal, setNombreSucursal] = useState('')

  useEffect(() => {
    const idSucursal = usuario?.idSucursal
    if (!idSucursal) {
      setNombreSucursal('')
      return undefined
    }

    let vigente = true
    api.get('/api/sucursales')
      .then(({ data }) => {
        if (!vigente) return
        const sucursal = data.find((item) => Number(item.idSucursal) === Number(idSucursal))
        setNombreSucursal(sucursal?.nombreSucursal || 'Nombre no disponible')
      })
      .catch(() => {
        if (vigente) setNombreSucursal('Nombre no disponible')
      })

    return () => { vigente = false }
  }, [usuario?.idSucursal])

  const renderizarVisita = () => {
    if (!puede(moduloPorPagina[visitaActual])) return <div role="alert" className="rounded-xl border border-panel-border bg-panel-card p-6 text-sm text-gray-300">Tu rol no tiene permiso para esta sección. Pide al administrador que lo active en Roles y permisos.</div>
    switch (visitaActual) {
      case 'inicio': return <Inicio cambiarVista={setVisitaActual} />
      case 'nueva-venta': return <NuevaVenta idSucursal={usuario?.idSucursal} idUsuario={usuario?.idUsuario} puedeDomicilio={puede(MODULOS.domicilios)} />
      case 'ventas-del-dia': return <VentasDelDia idSucursal={usuario?.idSucursal} />
      case 'filtro-ventas': return <HistorialVentasIntegrado titulo="Filtro de ventas" idSucursal={usuario?.idSucursal} />
      case 'facturas-emitidas': return <HistorialVentasIntegrado titulo="Facturas emitidas" modo="facturas" idSucursal={usuario?.idSucursal} />
      case 'historial-pago': return <HistorialVentasIntegrado titulo="Historial de pago" modo="pagos" idSucursal={usuario?.idSucursal} />
      case 'registrar-devolucion': return <RegistrarDevolucion />
      case 'consultar-devolucion': return <ConsultarDevolucion />
      default: return <Inicio cambiarVista={setVisitaActual} />
    }
  }

  return (
    <RoleLayout
      roleName="Vendedor"
      localName={!usuario?.idSucursal ? 'Sucursal sin asignar' : nombreSucursal || 'Cargando sucursal...'}
      navigation={filtrarNavegacion(navigation, puede)}
      activePage={visitaActual}
      onNavigate={setVisitaActual}
      onLogout={onLogout}
    >
      {renderizarVisita()}
    </RoleLayout>
  )
}
