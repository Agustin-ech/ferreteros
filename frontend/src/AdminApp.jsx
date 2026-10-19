// Este archivo es el antiguo App.jsx del panel admin, renombrado a AdminApp.jsx.
// Único cambio: recibe onLogout y se lo pasa al Header (botón "Cerrar sesión").
// El nuevo App.jsx decide si mostrar el Login, este panel o el de Bodega.
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ApiState from './components/ApiState'
import api from './api/client'
import { errorMessage } from './api/client'
import { listarVentas, normalizarVenta } from './api/ventas'

// Las páginas se descargan al abrirlas por primera vez.
const Inicio = lazy(() => import('./pages/Inicio'))
const InventarioGlobal = lazy(() => import('./pages/InventarioGlobal'))
const Kardex = lazy(() => import('./pages/Kardex'))
const InventarioSucursal = lazy(() => import('./pages/InventarioSucursal'))
const Facturas = lazy(() => import('./pages/Facturas'))
const TodasLasFacturas = lazy(() => import('./pages/TodasLasFacturas'))
const FacturasSucursal = lazy(() => import('./pages/FacturasSucursal'))
const Finanzas = lazy(() => import('./pages/Finanzas'))
const Ingresos = lazy(() => import('./pages/Ingresos'))
const Egresos = lazy(() => import('./pages/Egresos'))
const ResumenFinanciero = lazy(() => import('./pages/ResumenFinanciero'))
const Reportes = lazy(() => import('./pages/Reportes'))
const ReporteVentas = lazy(() => import('./pages/ReporteVentas'))
const ReporteInventario = lazy(() => import('./pages/ReporteInventario'))
const ReporteFinanciero = lazy(() => import('./pages/ReporteFinanciero'))
const ReporteSucursal = lazy(() => import('./pages/ReporteSucursal'))
const ReporteConsolidado = lazy(() => import('./pages/ReporteConsolidado'))
const ReporteFacturas = lazy(() => import('./pages/ReporteFacturas'))
const ReporteDevoluciones = lazy(() => import('./pages/ReporteDevoluciones'))
const ReporteProductos = lazy(() => import('./pages/ReporteProductos'))
const ReporteMercanciaDanada = lazy(() => import('./pages/ReporteMercanciaDanada'))
const Empleados = lazy(() => import('./pages/Empleados'))
const NuevoEmpleado = lazy(() => import('./pages/NuevoEmpleado'))
const RolesPermisos = lazy(() => import('./pages/RolesPermisos'))
const PedidosProveedor = lazy(() => import('./pages/PedidosProveedor'))
const ReporteCompras = lazy(() => import('./pages/ReporteCompras'))

const ETIQUETAS_ROL = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodeguero' }

function normalizarEmpleado(usuario) {
  const etiquetaRol = ETIQUETAS_ROL[usuario.rol] || usuario.rol || ''
  return {
    ...usuario,
    id: String(usuario.idUsuario),
    nombre: usuario.nombre,
    cedula: usuario.numeroDocumento,
    correo: usuario.correoElectronico || '',
    sucursal: usuario.sucursal || '',
    rolSistema: etiquetaRol,
    cargo: etiquetaRol,
    estado: usuario.activo ? 'Activo' : 'Inactivo',
  }
}

function normalizarRol(rol) {
  return {
    ...rol,
    rol: ETIQUETAS_ROL[rol.rol] || rol.nombre,
  }
}

// Mapa de página -> componente. Para agregar una página nueva, solo hay que
// crear el componente en src/pages y agregarlo aquí con su misma clave de
// "page" usada en menuItems (src/data/menu.js). Las páginas por sucursal
// (inventario-sucursal-<id>, facturas-sucursal-<id>) se generan con las
// sucursales que devuelve el backend.
const paginas = {
  inicio: Inicio,
  'inventario-global': InventarioGlobal,
  kardex: Kardex,
  facturas: Facturas,
  'todas-las-facturas': TodasLasFacturas,
  finanzas: Finanzas,
  ingresos: Ingresos,
  egresos: Egresos,
  'resumen-financiero': ResumenFinanciero,
  reportes: Reportes,
  'reporte-ventas': ReporteVentas,
  'reporte-inventario': ReporteInventario,
  'reporte-financiero': ReporteFinanciero,
  'reporte-sucursal': ReporteSucursal,
  'reporte-consolidado': ReporteConsolidado,
  'reporte-facturas': ReporteFacturas,
  'reporte-devoluciones': ReporteDevoluciones,
  'reporte-productos': ReporteProductos,
  'reporte-compras': ReporteCompras,
  'reporte-mercancia-danada': ReporteMercanciaDanada,
  empleados: Empleados,
  'nuevo-empleado': NuevoEmpleado,
  'roles-permisos': RolesPermisos,
  'pedidos-proveedor': PedidosProveedor,
}

export default function AdminApp({ onLogout }) {
  const [activePage, setActivePage] = useState('inicio')
  const [sucursales, setSucursales] = useState([])
  const [cargandoSucursales, setCargandoSucursales] = useState(true)
  const [errorSucursales, setErrorSucursales] = useState('')
  const [empleadosState, setEmpleadosState] = useState([])
  const [rolesState, setRolesState] = useState([])
  const [funcionesState, setFuncionesState] = useState([])
  const [catalogosPersonal, setCatalogosPersonal] = useState({
    tiposDocumento: [],
    roles: [],
    sucursales: [],
  })
  const [cargandoPersonal, setCargandoPersonal] = useState(true)
  const [errorPersonal, setErrorPersonal] = useState('')

  const cargarSucursales = useCallback(async () => {
    setCargandoSucursales(true)
    setErrorSucursales('')
    try {
      const response = await api.get('/api/sucursales', { params: { solo_activas: true } })
      setSucursales((response.data || []).filter((sucursal) => sucursal.activa !== false))
    } catch (error) {
      setErrorSucursales(errorMessage(error, 'No se pudieron cargar las sucursales.'))
      setSucursales([])
    } finally {
      setCargandoSucursales(false)
    }
  }, [])

  useEffect(() => { cargarSucursales() }, [cargarSucursales])

  const cargarPersonal = useCallback(async () => {
    setCargandoPersonal(true)
    setErrorPersonal('')
    try {
      const [usuarios, catalogos, roles, funciones] = await Promise.all([
        api.get('/api/usuarios'),
        api.get('/api/usuarios/catalogos'),
        api.get('/api/roles'),
        api.get('/api/funciones'),
      ])
      setEmpleadosState((usuarios.data || []).map(normalizarEmpleado))
      setCatalogosPersonal(catalogos.data)
      setRolesState((roles.data || []).map(normalizarRol))
      setFuncionesState(funciones.data || [])
    } catch (error) {
      setErrorPersonal(errorMessage(error, 'No se pudo cargar el personal y sus permisos.'))
    } finally {
      setCargandoPersonal(false)
    }
  }, [])

  useEffect(() => { cargarPersonal() }, [cargarPersonal])

  const [ventas, setVentas] = useState([])
  const [ventasCargando, setVentasCargando] = useState(true)
  const [errorVentas, setErrorVentas] = useState('')
  const [productoParaBusqueda, setProductoParaBusqueda] = useState(null)

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

  const facturasState = useMemo(
    () => ventas
      .filter((venta) => venta.factura && venta.factura.activo !== false)
      .map((venta) => normalizarVenta(venta, sucursales)),
    [ventas, sucursales]
  )

  // Las tres funciones de empleados lanzan el error para que cada pantalla
  // lo muestre junto al formulario o la tabla que lo originó.
  function reemplazarEmpleado(usuario) {
    const actualizado = normalizarEmpleado(usuario)
    setEmpleadosState((prev) => prev.map((empleado) => empleado.id === actualizado.id ? actualizado : empleado))
    return actualizado
  }
  async function agregarEmpleado(datos) {
    const { data } = await api.post('/api/usuarios', datos)
    const empleado = normalizarEmpleado(data.usuario)
    setEmpleadosState((prev) => [empleado, ...prev])
    setActivePage('empleados')
    return empleado
  }
  // `payload` ya viene con los campos que acepta PUT /api/usuarios/<id>.
  async function editarEmpleado(id, payload) {
    const { data } = await api.put(`/api/usuarios/${id}`, payload)
    return reemplazarEmpleado(data)
  }
  async function eliminarEmpleado(id) {
    const { data } = await api.delete(`/api/usuarios/${id}`)
    return reemplazarEmpleado(data)
  }

  async function agregarRol(rol) {
    setErrorPersonal('')
    try {
      const { data } = await api.post('/api/roles', {
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        idFunciones: rol.idFunciones,
      })
      const nuevoRol = normalizarRol(data)
      setRolesState((prev) => [...prev, nuevoRol])
      setCatalogosPersonal((prev) => ({
        ...prev,
        roles: [...prev.roles, {
          idTipoUsuario: data.idTipoUsuario,
          nombre: data.nombre,
          rol: data.rol,
        }],
        rolesDisponibles: prev.rolesDisponibles.filter((item) => item.rol !== data.rol),
      }))
    } catch (error) {
      setErrorPersonal(errorMessage(error, 'No se pudo crear el rol.'))
      throw error
    }
  }
  async function editarRol(idTipoUsuario, cambios) {
    setErrorPersonal('')
    try {
      const { data } = await api.put(`/api/roles/${idTipoUsuario}`, {
        descripcion: cambios.descripcion,
        idFunciones: cambios.idFunciones,
      })
      setRolesState((prev) => prev.map((rol) =>
        rol.idTipoUsuario === idTipoUsuario ? normalizarRol(data) : rol
      ))
    } catch (error) {
      setErrorPersonal(errorMessage(error, 'No se pudieron actualizar los permisos del rol.'))
      throw error
    }
  }

  function abrirProductoDesdeBusqueda(producto) {
    setProductoParaBusqueda(producto.idProducto)
    setActivePage('inventario-global')
  }

  const sucursalSeleccionada = activePage.startsWith('inventario-sucursal-')
    ? sucursales.find((sucursal) => `inventario-sucursal-${sucursal.idSucursal}` === activePage)
    : null
  const sucursalFacturas = activePage.startsWith('facturas-sucursal-')
    ? sucursales.find((sucursal) => `facturas-sucursal-${sucursal.idSucursal}` === activePage)
    : null
  const PaginaActiva = paginas[activePage] ?? Inicio
  const errorDatos = errorVentas || errorSucursales
  const usarFacturasBackend = [
    'facturas',
    'todas-las-facturas',
    ...(sucursalFacturas ? [activePage] : []),
    'ingresos',
  ].includes(activePage)

  return (
    <div className="min-h-screen flex bg-panel-bg text-gray-200">
      <Sidebar activePage={activePage} onNavigate={setActivePage} sucursales={sucursales} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onLogout={onLogout} onSelectProduct={abrirProductoDesdeBusqueda} />

        <main className="flex-1 p-6 overflow-y-auto">
          <Suspense fallback={<p role="status" className="text-sm text-gray-400">Cargando...</p>}>
          {['empleados', 'nuevo-empleado', 'roles-permisos'].includes(activePage) && (
            <div className="mb-4">
              <ApiState
                loading={cargandoPersonal}
                error={errorPersonal}
                onRetry={cargarPersonal}
                loadingMessage="Cargando personal y permisos..."
              />
            </div>
          )}
          {(cargandoSucursales || errorSucursales || sucursales.length === 0) && (
            <div className="mb-4">
              <ApiState
                loading={cargandoSucursales}
                error={errorSucursales}
                empty={!cargandoSucursales && !errorSucursales && sucursales.length === 0}
                onRetry={cargarSucursales}
                loadingMessage="Cargando sucursales..."
                emptyMessage="No hay sucursales activas disponibles para consultar su inventario."
              />
            </div>
          )}
          {sucursalSeleccionada ? (
            <InventarioSucursal
              key={sucursalSeleccionada.idSucursal}
              idSucursal={sucursalSeleccionada.idSucursal}
              nombreSucursal={sucursalSeleccionada.nombreSucursal}
            />
          ) : sucursalFacturas ? (
            <FacturasSucursal
              key={sucursalFacturas.idSucursal}
              nombreSucursal={sucursalFacturas.nombreSucursal}
              facturas={facturasState}
              sucursales={sucursales}
              ventasCargando={ventasCargando}
              errorVentas={errorDatos}
            />
          ) : <PaginaActiva
            onNavigate={setActivePage}
            empleados={empleadosState}
            onAgregarEmpleado={agregarEmpleado}
            onEditarEmpleado={editarEmpleado}
            onEliminarEmpleado={eliminarEmpleado}
            catalogosPersonal={catalogosPersonal}
            cargandoPersonal={cargandoPersonal}
            rolesDisponibles={catalogosPersonal.rolesDisponibles || []}
            funciones={funcionesState}
            roles={rolesState}
            onAgregarRol={agregarRol}
            onEditarRol={editarRol}
            facturas={usarFacturasBackend ? facturasState : undefined}
            ventas={ventas}
            ventasCargando={ventasCargando}
            errorVentas={errorDatos}
            errorSucursales={errorSucursales}
            sucursales={sucursales}
            productoParaBusqueda={activePage === 'inventario-global' ? productoParaBusqueda : null}
            onProductoAbierto={() => setProductoParaBusqueda(null)}
          />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}