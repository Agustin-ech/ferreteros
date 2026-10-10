import { Search, Bell, MapPin, User, LogOut } from 'lucide-react'

// Cambio: recibe onLogout para poder cerrar sesión (botón a la derecha).
// TEMPORAL-BACKEND: cuando exista el login real, onLogout debe invalidar el
// token/sesión en el backend además de limpiar el estado local.
export default function Header({ onLogout }) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-panel-border bg-panel-bg">
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 bg-panel-card border border-panel-border rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            placeholder="Buscar productos, facturas, pedidos..."
            className="bg-transparent outline-none text-sm text-gray-200 placeholder-gray-500 w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-400">
          <MapPin size={15} />
          Local: <span className="text-gray-200 font-medium">General</span>
        </div>

        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-brand-yellow" />
        </button>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-brand-yellow/20 flex items-center justify-center text-brand-yellow">
            <User size={16} />
          </div>
          <span className="hidden sm:block text-sm text-gray-200 font-medium">Administrador</span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 rounded-lg border border-panel-border px-3 py-1.5 text-sm text-gray-300 hover:text-brand-yellow hover:border-brand-yellow transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        )}
      </div>
    </header>
  )
}
