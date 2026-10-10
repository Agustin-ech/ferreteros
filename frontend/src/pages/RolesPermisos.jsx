import { useState } from 'react'
import { ShieldCheck, Eye, Pencil, Plus } from 'lucide-react'
import DetalleRol from './DetalleRol'

const ROL_VACIO = { rol: '', descripcion: '', permisos: [], usuarios: 0 }

export default function RolesPermisos({ roles = [], onAgregarRol, onEditarRol }) {
  const [seleccionado, setSeleccionado] = useState(null)
  const [edicionInicial, setEdicionInicial] = useState(false)
  const [creando, setCreando] = useState(false)

  if (creando) {
    return (
      <DetalleRol
        rol={ROL_VACIO}
        esCreacion
        onVolver={() => setCreando(false)}
        onGuardar={(rol) => {
          onAgregarRol?.(rol)
          setCreando(false)
        }}
      />
    )
  }

  if (seleccionado) {
    return (
      <DetalleRol
        rol={seleccionado}
        edicionInicial={edicionInicial}
        onVolver={() => setSeleccionado(null)}
        onGuardar={(rol) => {
          onEditarRol?.(seleccionado.rol, rol)
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
            <ShieldCheck size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Roles y permisos</h1>
            <p className="text-sm text-gray-500">Define los roles de los usuarios y los permisos de acceso a cada módulo.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="flex items-center gap-2 bg-brand-yellow text-panel-sidebar font-semibold text-sm rounded-lg px-4 py-2 hover:brightness-95 transition whitespace-nowrap"
        >
          <Plus size={16} /> Nuevo rol
        </button>
      </div>

      <div className="bg-panel-card border border-panel-border rounded-xl overflow-x-auto scroll-thin">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-panel-border">
              <th className="py-3 pl-4 pr-2 font-medium">Rol</th>
              <th className="py-3 pr-2 font-medium">Descripción</th>
              <th className="py-3 pr-2 font-medium">Permisos</th>
              <th className="py-3 pr-2 font-medium text-right">Usuarios</th>
              <th className="py-3 pr-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.rol} className="border-b border-panel-border/60 last:border-0 hover:bg-white/5">
                <td className="py-3 pl-4 pr-2 text-gray-200 font-medium whitespace-nowrap">{r.rol}</td>
                <td className="py-3 pr-2 text-gray-400">{r.descripcion}</td>
                <td className="py-3 pr-2">
                  <div className="flex flex-wrap gap-1.5">
                    {r.permisos.map((p) => (
                      <span key={p} className="text-[11px] font-semibold px-2 py-1 rounded-full bg-brand-yellow/15 text-brand-yellow whitespace-nowrap">
                        {p}
                      </span>
                    ))}
                    {r.permisos.length === 0 && <span className="text-xs text-gray-600">Sin permisos</span>}
                  </div>
                </td>
                <td className="py-3 pr-2 text-right text-gray-300">{r.usuarios}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3 text-gray-400">
                    <button onClick={() => { setSeleccionado(r); setEdicionInicial(false) }} className="hover:text-white" title="Ver rol"><Eye size={16} /></button>
                    <button onClick={() => { setSeleccionado(r); setEdicionInicial(true) }} className="hover:text-white" title="Editar rol"><Pencil size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">Mostrando 1 - {roles.length} de {roles.length} roles</p>
    </div>
  )
}