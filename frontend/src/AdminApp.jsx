// Este archivo es el antiguo App.jsx del panel admin, renombrado a AdminApp.jsx.
// Único cambio: recibe onLogout y se lo pasa al Header (botón "Cerrar sesión").
// El nuevo App.jsx decide si mostrar el Login, este panel o el de Bodega.
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Inicio from './pages/Inicio'
import InventarioGlobal from './pages/InventarioGlobal'
import InventarioLaChinita from './pages/InventarioLaChinita'
import InventarioBuenaVista from './pages/InventarioBuenaVista'
import AjustesInventarioLaChinita from './pages/AjustesInventarioLaChinita'
import AjustesInventarioBuenaVista from './pages/AjustesInventarioBuenaVista'
import AlertaStockLaChinita from './pages/AlertaStockLaChinita'
import AlertaStockBuenaVista from './pages/AlertaStockBuenaVista'
import Facturas from './pages/Facturas'
import TodasLasFacturas from './pages/TodasLasFacturas'
import FacturasLaChinita from './pages/FacturasLaChinita'
import FacturasBuenaVista from './pages/FacturasBuenaVista'
import Finanzas from './pages/Finanzas'
import Ingresos from './pages/Ingresos'
import Egresos from './pages/Egresos'
import ResumenFinanciero from './pages/ResumenFinanciero'
import Reportes from './pages/Reportes'
import ReporteVentas from './pages/ReporteVentas'
import ReporteInventario from './pages/ReporteInventario'
import ReporteFinanciero from './pages/ReporteFinanciero'
import ReporteSucursal from './pages/ReporteSucursal'
import ReporteEmpleados from './pages/ReporteEmpleados'
import ReporteConsolidado from './pages/ReporteConsolidado'
import Empleados from './pages/Empleados'
import NuevoEmpleado from './pages/NuevoEmpleado'
import RolesPermisos from './pages/RolesPermisos'
import ControlAsistencia from './pages/ControlAsistencia'
import NominaSalarios from './pages/NominaSalarios'
import ConfiguracionEmpleados from './pages/ConfiguracionEmpleados'
import {
  empleados as empleadosIniciales,
  roles as rolesIniciales,
  facturasCompletas as facturasIniciales,
  egresosFinancieros as egresosIniciales,
} from './data/mockData'

// Mapa de página -> componente. Para agregar una página nueva, solo hay que
// crear el componente en src/pages y agregarlo aquí con su misma clave de
// "page" usada en menuItems (src/data/mockData.js).
const paginas = {
  inicio: Inicio,
  'inventario-global': InventarioGlobal,
  'inventario-la-chinita': InventarioLaChinita,
  'inventario-buena-vista': InventarioBuenaVista,
  'ajustes-inventario-la-chinita': AjustesInventarioLaChinita,
  'ajustes-inventario-buena-vista': AjustesInventarioBuenaVista,
  'alerta-stock-la-chinita': AlertaStockLaChinita,
  'alerta-stock-buena-vista': AlertaStockBuenaVista,
  facturas: Facturas,
  'todas-las-facturas': TodasLasFacturas,
  'facturas-la-chinita': FacturasLaChinita,
  'facturas-buena-vista': FacturasBuenaVista,
  finanzas: Finanzas,
  ingresos: Ingresos,
  egresos: Egresos,
  'resumen-financiero': ResumenFinanciero,
  reportes: Reportes,
  'reporte-ventas': ReporteVentas,
  'reporte-inventario': ReporteInventario,
  'reporte-financiero': ReporteFinanciero,
  'reporte-sucursal': ReporteSucursal,
  'reporte-empleados': ReporteEmpleados,
  'reporte-consolidado': ReporteConsolidado,
  empleados: Empleados,
  'nuevo-empleado': NuevoEmpleado,
  'roles-permisos': RolesPermisos,
  'control-asistencia': ControlAsistencia,
  'nomina-salarios': NominaSalarios,
  'configuracion-empleados': ConfiguracionEmpleados,
}

export default function AdminApp({ onLogout }) {
  const [activePage, setActivePage] = useState('inicio')

  // La lista de empleados vive aquí (no dentro de Empleados.jsx) para que
  // "Nuevo empleado" pueda agregar uno y que se vea de una en la lista al
  // volver, sin necesidad de un backend todavía.
  const [empleadosState, setEmpleadosState] = useState(empleadosIniciales)
  // Roles, facturas y egresos también viven aquí por la misma razón: para
  // que "Nuevo rol", "Anular factura" o "Eliminar egreso" se reflejen de
  // una en las páginas de lista, sin backend todavía.
  const [rolesState, setRolesState] = useState(rolesIniciales)
  const [facturasState, setFacturasState] = useState(facturasIniciales)
  const [egresosState, setEgresosState] = useState(egresosIniciales)

  function agregarEmpleado(empleado) {
    setEmpleadosState((prev) => [...prev, empleado])
    setActivePage('empleados')
  }
  function editarEmpleado(id, cambios) {
    setEmpleadosState((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)))
  }
  function eliminarEmpleado(id) {
    setEmpleadosState((prev) => prev.filter((e) => e.id !== id))
  }

  function agregarRol(rol) {
    setRolesState((prev) => [...prev, rol])
  }
  function editarRol(nombreOriginal, cambios) {
    setRolesState((prev) => prev.map((r) => (r.rol === nombreOriginal ? { ...r, ...cambios } : r)))
  }

  // TEMPORAL-BACKEND: la factura nueva solo se agrega en memoria; el backend
  // debe generar el número, guardarla y descontar el stock.
  function agregarFactura(factura) {
    setFacturasState((prev) => [factura, ...prev])
  }

  function anularFactura(numero) {
    setFacturasState((prev) =>
      prev.map((f) => (f.numero === numero ? { ...f, estado: f.estado === 'Anulada' ? 'Pagada' : 'Anulada' } : f))
    )
  }

  function eliminarEgreso(fecha, descripcion) {
    setEgresosState((prev) => prev.filter((e) => !(e.fecha === fecha && e.descripcion === descripcion)))
  }

  const PaginaActiva = paginas[activePage] ?? Inicio

  return (
    <div className="min-h-screen flex bg-panel-bg text-gray-200">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onLogout={onLogout} />

        <main className="flex-1 p-6 overflow-y-auto">
          <PaginaActiva
            onNavigate={setActivePage}
            empleados={empleadosState}
            onAgregarEmpleado={agregarEmpleado}
            onEditarEmpleado={editarEmpleado}
            onEliminarEmpleado={eliminarEmpleado}
            roles={rolesState}
            onAgregarRol={agregarRol}
            onEditarRol={editarRol}
            facturas={facturasState}
            onAnularFactura={anularFactura}
            onAgregarFactura={agregarFactura}
            egresos={egresosState}
            onEliminarEgreso={eliminarEgreso}
          />
        </main>
      </div>
    </div>
  )
}