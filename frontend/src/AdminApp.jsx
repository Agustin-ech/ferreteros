// Este archivo es el antiguo App.jsx del panel admin, renombrado a AdminApp.jsx.
// Único cambio: recibe onLogout y se lo pasa al Header (botón "Cerrar sesión").
// El nuevo App.jsx decide si mostrar el Login, este panel o el de Bodega.
import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Inicio from './pages/Inicio'
import InventarioGlobal from './pages/InventarioGlobal'
import Kardex from './pages/Kardex'
import InventarioSucursal from './pages/InventarioSucursal'
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
import ReporteFacturas from './pages/ReporteFacturas'
import ReporteDevoluciones from './pages/ReporteDevoluciones'
import ReporteProductos from './pages/ReporteProductos'
import Empleados from './pages/Empleados'
import NuevoEmpleado from './pages/NuevoEmpleado'
import RolesPermisos from './pages/RolesPermisos'
import ControlAsistencia from './pages/ControlAsistencia'
import NominaSalarios from './pages/NominaSalarios'
import ConfiguracionEmpleados from './pages/ConfiguracionEmpleados'
import PedidosProveedor from './pages/PedidosProveedor'
import ReporteCompras from './pages/ReporteCompras'
import api from './api/client'
import {
  actualizarEmpleado,
  crearEmpleado,
  listarEmpleados,
  obtenerCatalogosEmpleados,
} from './api/empleados'
import { listarVentas, normalizarVenta } from './api/ventas'
import {
  roles as rolesIniciales,
} from './data/mockData'

// Mapa de página -> componente. Para agregar una página nueva, solo hay que
// crear el componente en src/pages y agregarlo aquí con su misma clave de
// "page" usada en menuItems (src/data/mockData.js).
const paginas = {
  inicio: Inicio,
  'inventario-global': InventarioGlobal,
  kardex: Kardex,
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
  'reporte-facturas': ReporteFacturas,
  'reporte-devoluciones': ReporteDevoluciones,
  'reporte-productos': ReporteProductos,
  'reporte-compras': ReporteCompras,
  empleados: Empleados,
  'nuevo-empleado': NuevoEmpleado,
  'roles-permisos': RolesPermisos,
  'control-asistencia': ControlAsistencia,
  'nomina-salarios': NominaSalarios,
  'configuracion-empleados': ConfiguracionEmpleados,
  'pedidos-proveedor': PedidosProveedor,
}

export default function AdminApp({ onLogout }) {
  const [activePage, setActivePage] = useState('inicio')
  const [sucursales, setSucursales] = useState([])
  const [errorSucursales, setErrorSucursales] = useState('')
  const [ventas, setVentas] = useState([])
  const [ventasCargando, setVentasCargando] = useState(true)
  const [errorVentas, setErrorVentas] = useState('')
  const [productoParaBusqueda, setProductoParaBusqueda] = useState(null)
  const [empleadosState, setEmpleadosState] = useState([])
  const [catalogosEmpleados, setCatalogosEmpleados] = useState({
    roles: [],
    tiposDocumento: [],
    sucursales: [],
  })
  const [empleadosCargando, setEmpleadosCargando] = useState(false)
  const [errorEmpleados, setErrorEmpleados] = useState('')

  useEffect(() => {
    let cancelado = false
    api.get('/api/sucursales', { params: { solo_activas: true } })
      .then((response) => {
        if (!cancelado) {
          setSucursales((response.data || []).filter((sucursal) => sucursal.activa !== false))
          setErrorSucursales('')
        }
      })
      .catch(() => {
        if (!cancelado) setErrorSucursales('No se pudieron cargar las sucursales desde el servidor.')
      })

    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    let cancelado = false
    listarVentas()
      .then(({ ventas: resultados, errorNombres }) => {
        if (!cancelado) {
          setVentas(resultados)
          setErrorVentas(errorNombres)
        }
      })
      .catch((error) => {
        if (!cancelado) {
          setErrorVentas(error.message || 'No se pudieron cargar las ventas desde el servidor.')
        }
      })
      .finally(() => {
        if (!cancelado) setVentasCargando(false)
      })

    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    if (!['empleados', 'nuevo-empleado'].includes(activePage)) return undefined
    let cancelado = false
    setEmpleadosCargando(true)
    setErrorEmpleados('')
    Promise.all([listarEmpleados(), obtenerCatalogosEmpleados()])
      .then(([empleados, catalogos]) => {
        if (cancelado) return
        setEmpleadosState(empleados)
        setCatalogosEmpleados(catalogos)
      })
      .catch((error) => {
        if (!cancelado) {
          setErrorEmpleados(
            error?.response?.data?.mensaje
            || error?.response?.data?.error
            || error.message
            || 'No se pudieron cargar los empleados y sus catálogos.'
          )
        }
      })
      .finally(() => {
        if (!cancelado) setEmpleadosCargando(false)
      })
    return () => { cancelado = true }
  }, [activePage])

  // Los roles siguen siendo locales mientras no exista su API de administración.
  const [rolesState, setRolesState] = useState(rolesIniciales)
  const facturasState = useMemo(
    () => ventas
      .filter((venta) => venta.factura && venta.factura.activo !== false)
      .map((venta) => normalizarVenta(venta, sucursales)),
    [ventas, sucursales]
  )

  async function agregarEmpleado(datos) {
    const empleado = await crearEmpleado(datos)
    setEmpleadosState((prev) => [empleado, ...prev])
    setActivePage('empleados')
    return empleado
  }
  async function editarEmpleado(id, cambios) {
    const empleado = await actualizarEmpleado(id, cambios)
    setEmpleadosState((prev) => prev.map((e) => (e.idUsuario === empleado.idUsuario ? empleado : e)))
    return empleado
  }

  function agregarRol(rol) {
    setRolesState((prev) => [...prev, rol])
  }
  function editarRol(nombreOriginal, cambios) {
    setRolesState((prev) => prev.map((r) => (r.rol === nombreOriginal ? { ...r, ...cambios } : r)))
  }

  function abrirProductoDesdeBusqueda(producto) {
    setProductoParaBusqueda(producto.idProducto)
    setActivePage('inventario-global')
  }

  const sucursalSeleccionada = activePage.startsWith('inventario-sucursal-')
    ? sucursales.find((sucursal) => `inventario-sucursal-${sucursal.idSucursal}` === activePage)
    : null
  const PaginaActiva = paginas[activePage] ?? Inicio
  const paginaEmpleados = ['empleados', 'nuevo-empleado'].includes(activePage)
  const errorDatos = errorVentas || errorSucursales
  const usarFacturasBackend = [
    'facturas',
    'todas-las-facturas',
    'facturas-la-chinita',
    'facturas-buena-vista',
    'ingresos',
  ].includes(activePage)

  return (
    <div className="min-h-screen flex bg-panel-bg text-gray-200">
      <Sidebar activePage={activePage} onNavigate={setActivePage} sucursales={sucursales} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onLogout={onLogout} onSelectProduct={abrirProductoDesdeBusqueda} />

        <main className="flex-1 p-6 overflow-y-auto">
          {sucursalSeleccionada ? (
            <InventarioSucursal
              key={sucursalSeleccionada.idSucursal}
              idSucursal={sucursalSeleccionada.idSucursal}
              nombreSucursal={sucursalSeleccionada.nombreSucursal}
            />
          ) : <PaginaActiva
            onNavigate={setActivePage}
            empleados={empleadosState}
            onAgregarEmpleado={agregarEmpleado}
            onEditarEmpleado={editarEmpleado}
            empleadosCargando={empleadosCargando}
            errorEmpleados={errorEmpleados}
            roles={paginaEmpleados ? catalogosEmpleados.roles : rolesState}
            onAgregarRol={agregarRol}
            onEditarRol={editarRol}
            facturas={usarFacturasBackend ? facturasState : undefined}
            ventas={ventas}
            ventasCargando={ventasCargando}
            errorVentas={errorDatos}
            errorSucursales={errorSucursales}
            sucursales={paginaEmpleados ? catalogosEmpleados.sucursales : sucursales}
            tiposDocumento={catalogosEmpleados.tiposDocumento}
            cargando={paginaEmpleados && empleadosCargando}
            errorCarga={paginaEmpleados ? errorEmpleados : ''}
            productoParaBusqueda={activePage === 'inventario-global' ? productoParaBusqueda : null}
            onProductoAbierto={() => setProductoParaBusqueda(null)}
          />}
        </main>
      </div>
    </div>
  )
}