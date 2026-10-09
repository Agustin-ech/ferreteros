import { useMemo, useState } from 'react'
import { Users, Eye, Pencil, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import MenuAcciones from '../components/MenuAcciones'
import DetalleEmpleado from './DetalleEmpleado'

const estadoStyles = {
  Activo: 'bg-emerald-500/15 text-emerald-400',
  Inactivo: 'bg-red-500/15 text-red-400',
}

const ITEMS_POR_PAGINA = 7

// Lista de empleados. `empleados` y `onAgregarEmpleado` los pasa App.jsx
// (ver comentario ahí), así que un empleado nuevo aparece aquí sin recargar.
export default function Empleados({ empleados = [], onNavigate, onEditarEmpleado, onEliminarEmpleado }) {
  const [busqueda, setBusqueda] = useState('')
  const [sucursal, setSucursal] = useState('Todas')
  const [rol, setRol] = useState('Todos')
  const [estado, setEstado] = useState('Todos')
  const [pagina, setPagina] = useState(1)
  const [seleccionado, setSeleccionado] = useState(null)
  const [edicionInicial, setEdicionInicial] = useState(false)

  const roles = useMemo(() => ['Todos', ...new Set(empleados.map((e) => e.cargo))], [empleados])

  function cambiarFiltro(setter) {
    return (valor) => {
      setter(valor)
      setPagina(1)
    }
  }

  const filas = useMemo(() => {
    let filas = empleados
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      filas = filas.filter((e) => e.nombre.toLowerCase().includes(q) || e.id.includes(q))
    }
    if (sucursal !== 'Todas') filas = filas.filter((e) => e.sucursal === sucursal)
    if (rol !== 'Todos') filas = filas.filter((e) => e.cargo === rol)
    if (estado !== 'Todos') filas = filas.filter((e) => e.estado === estado)
    return filas
  }, [empleados, busqueda, sucursal, rol, estado])

  const totalPaginas = Math.max(1, Math.ceil(filas.length / ITEMS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
  const filasPagina = filas.slice(inicio, inicio + ITEMS_POR_PAGINA)

  if (seleccionado) {
    return (
      <DetalleEmpleado
        empleado={seleccionado}
        edicionInicial={edicionInicial}
        onVolver={() => setSeleccionado(null)}
        onGuardar={(datos) => {
          onEditarEmpleado?.(seleccionado.id, datos)
          setSeleccionado(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-brand-yellow/15 text-brand-yellow flex items-center justify-center shrink-0">
            <Users size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Empleados</h1>
            <p className="text-sm text-gray-500">Gestiona el personal de la ferretería y sus accesos al sistema.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('nuevo-empleado')}
          className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap"
        >
          <Plus size={16} /> Nuevo empleado
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => cambiarFiltro(setBusqueda)(e.target.value)}
          placeholder="Buscar empleado..."
          className="flex-1 min-w-[180px] bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
        <select value={sucursal} onChange={(e) => cambiarFiltro(setSucursal)(e.target.value)} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
          <option>Todas</option>
          <option>La Chinita</option>
          <option>Buenavista</option>
        </select>
        <select value={rol} onChange={(e) => cambiarFiltro(setRol)(e.target.value)} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={estado} onChange={(e) => cambiarFiltro(setEstado)(e.target.value)} className="bg-panel-card border border-panel-border rounded-lg px-3 py-2 text-sm text-gray-200 outline-none">
          <option>Todos</option>
          <option>Activo</option>
          <option>Inactivo</option>
        </select>
      </div>

      <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-panel-border">
              <th className="py-3 pl-4 pr-2 font-medium">ID</th>
              <th className="py-3 pr-2 font-medium">Nombre completo</th>
              <th className="py-3 pr-2 font-medium">Cargo</th>
              <th className="py-3 pr-2 font-medium">Sucursal</th>
              <th className="py-3 pr-2 font-medium">Teléfono</th>
              <th className="py-3 pr-2 font-medium">Estado</th>
              <th className="py-3 pr-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filasPagina.map((e) => (
              <tr key={e.id} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                <td className="py-3 pl-4 pr-2 text-gray-400">{e.id}</td>
                <td className="py-3 pr-2 text-gray-200 font-medium">{e.nombre}</td>
                <td className="py-3 pr-2 text-gray-300">{e.cargo}</td>
                <td className="py-3 pr-2 text-gray-400 whitespace-nowrap">{e.sucursal}</td>
                <td className="py-3 pr-2 text-gray-300 whitespace-nowrap">{e.telefono}</td>
                <td className="py-3 pr-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${estadoStyles[e.estado]}`}>{e.estado}</span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3 text-gray-400">
                    <button onClick={() => { setSeleccionado(e); setEdicionInicial(false) }} className="hover:text-white" title="Ver detalle"><Eye size={16} /></button>
                    <button onClick={() => { setSeleccionado(e); setEdicionInicial(true) }} className="hover:text-white" title="Editar"><Pencil size={15} /></button>
                    <MenuAcciones
                      acciones={[
                        {
                          label: e.estado === 'Activo' ? 'Desactivar' : 'Activar',
                          onClick: () => onEditarEmpleado?.(e.id, { estado: e.estado === 'Activo' ? 'Inactivo' : 'Activo' }),
                        },
                        {
                          label: 'Eliminar empleado',
                          destructivo: true,
                          onClick: () => onEliminarEmpleado?.(e.id),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filasPagina.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 text-sm">Ningún empleado coincide con esos filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
        <span>Mostrando {filas.length === 0 ? 0 : inicio + 1}-{Math.min(inicio + ITEMS_POR_PAGINA, filas.length)} de {filas.length} empleados</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1} className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5">
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPagina(n)}
              className={`h-8 w-8 flex items-center justify-center rounded-lg border text-xs font-semibold ${n === paginaActual ? 'bg-brand-yellow text-panel-sidebar border-brand-yellow' : 'border-panel-border text-gray-300 hover:bg-white/5'}`}
            >
              {n}
            </button>
          ))}
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="h-8 w-8 flex items-center justify-center rounded-lg border border-panel-border disabled:opacity-40 hover:bg-white/5">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}