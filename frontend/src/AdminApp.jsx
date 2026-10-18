// Este archivo es el antiguo App.jsx del panel admin, renombrado a AdminApp.jsx.
// Único cambio: recibe onLogout y se lo pasa al Header (botón "Cerrar sesión").
// El nuevo App.jsx decide si mostrar el Login, este panel o el de Bodega.
import { useCallback, useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ApiState from './components/ApiState'
import Inicio from './pages/Inicio'
import InventarioGlobal from './pages/InventarioGlobal'
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
import Empleados from './pages/Empleados'
import NuevoEmpleado from './pages/NuevoEmpleado'
import RolesPermisos from './pages/RolesPermisos'
import ControlAsistencia from './pages/ControlAsistencia'
import NominaSalarios from './pages/NominaSalarios'
import ConfiguracionEmpleados from './pages/ConfiguracionEmpleados'
import api from './api/client'
import { errorMessage } from './api/client'
import {
  facturasCompletas as facturasIniciales,
  egresosFinancieros as egresosIniciales,
} from './data/mockData'

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
// "page" usada en menuItems (src/data/mockData.js).
const paginas = {
  inicio: Inicio,
  'inventario-global': InventarioGlobal,
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

  const [facturasState, setFacturasState] = useState(facturasIniciales)
  const [egresosState, setEgresosState] = useState(egresosIniciales)

  async function agregarEmpleado(datos) {
    setErrorPersonal('')
    try {
      const { data } = await api.post('/api/usuarios', datos)
      setEmpleadosState((prev) => [normalizarEmpleado(data.usuario), ...prev])
    } catch (error) {
      setErrorPersonal(errorMessage(error, 'No se pudo registrar el empleado.'))
      throw error
    }
    setActivePage('empleados')
  }
  async function editarEmpleado(id, cambios) {
    setErrorPersonal('')
    const payload = { ...cambios }
    if ('estado' in payload) {
      payload.activo = payload.estado === 'Activo'
      delete payload.estado
    }
    if ('cedula' in payload) {
      payload.numeroDocumento = payload.cedula
      delete payload.cedula
    }
    if ('correo' in payload) {
      payload.correoElectronico = payload.correo
      delete payload.correo
    }
    delete payload.cargo
    if (payload.rolSistema) {
      const rol = catalogosPersonal.roles.find((item) => item.nombre === payload.rolSistema || ETIQUETAS_ROL[item.rol] === payload.rolSistema)
      if (rol) payload.idTipoUsuario = rol.idTipoUsuario
      delete payload.rolSistema
    }
    if (payload.sucursal) {
      const sucursal = catalogosPersonal.sucursales.find((item) => item.nombreSucursal === payload.sucursal)
      if (sucursal) payload.idSucursal = sucursal.idSucursal
      delete payload.sucursal
    }
    try {
      const { data } = await api.put(`/api/usuarios/${id}`, payload)
      const actualizado = normalizarEmpleado(data)
      setEmpleadosState((prev) => prev.map((empleado) => empleado.id === String(id) ? actualizado : empleado))
      return actualizado
    } catch (error) {
      setErrorPersonal(errorMessage(error, 'No se pudo actualizar el empleado.'))
      throw error
    }
  }
  async function eliminarEmpleado(id) {
    setErrorPersonal('')
    try {
      const { data } = await api.delete(`/api/usuarios/${id}`)
      setEmpleadosState((prev) => prev.map((empleado) =>
        empleado.id === String(id) ? normalizarEmpleado(data) : empleado
      ))
    } catch (error) {
      setErrorPersonal(errorMessage(error, 'No se pudo desactivar el empleado.'))
      throw error
    }
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

  const sucursalSeleccionada = activePage.startsWith('inventario-sucursal-')
    ? sucursales.find((sucursal) => `inventario-sucursal-${sucursal.idSucursal}` === activePage)
    : null
  const PaginaActiva = paginas[activePage] ?? Inicio

  return (
    <div className="min-h-screen flex bg-panel-bg text-gray-200">
      <Sidebar activePage={activePage} onNavigate={setActivePage} sucursales={sucursales} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onLogout={onLogout} />

        <main className="flex-1 p-6 overflow-y-auto">
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
            facturas={facturasState}
            onAnularFactura={anularFactura}
            onAgregarFactura={agregarFactura}
            egresos={egresosState}
            onEliminarEgreso={eliminarEgreso}
          />}
        </main>
      </div>
    </div>
  )
}