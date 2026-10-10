import { useState } from 'react'
import {
  Home, Package, FileText, DollarSign, BarChart2, Users, ChevronDown,
} from 'lucide-react'
import { menuItems } from '../data/mockData'
import logo from '../assets/logo.png'

const iconMap = { Home, Package, FileText, DollarSign, BarChart2, Users }

// Un ítem de submenú puede ser:
// - un texto simple (hoja sin página propia todavía)
// - { label, page } -> hoja que navega a una página
// - { label, children } -> submenú que se puede expandir
// El componente se llama a sí mismo para soportar cualquier nivel de anidación.
function SubmenuNode({ item, activePage, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false)

  if (typeof item === 'string') {
    return (
      <button className="text-left text-[13px] text-gray-400 hover:text-brand-yellow py-1.5 transition-colors w-full">
        {item}
      </button>
    )
  }

  // Hoja simple sin submenú propio (comportamiento previo, intacto).
  if (item.page && !item.children) {
    const isActive = activePage === item.page
    return (
      <button
        onClick={() => onNavigate(item.page)}
        className={`text-left text-[13px] py-1.5 transition-colors w-full ${
          isActive ? 'text-brand-yellow font-semibold' : 'text-gray-400 hover:text-brand-yellow'
        }`}
      >
        {item.label}
      </button>
    )
  }

  // Ítem que a la vez navega a su propia página Y se puede desplegar para
  // mostrar sub-opciones (ej: "La Chinita" -> vista general, con "Ajustes
  // de inventario" y "Alerta de Stock" como hijos).
  const isActive = item.page && activePage === item.page

  return (
    <div>
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => (item.page ? onNavigate(item.page) : setIsOpen((v) => !v))}
          className={`flex-1 text-left text-[13px] py-1.5 transition-colors ${
            isActive ? 'text-brand-yellow font-semibold' : 'text-gray-300 hover:text-brand-yellow'
          }`}
        >
          {item.label}
        </button>
        {item.children && (
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="p-1 text-gray-500 hover:text-brand-yellow"
          >
            <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {item.children && isOpen && (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-panel-border pl-3">
          {item.children.map((child) => (
            <SubmenuNode
              key={typeof child === 'string' ? child : child.label}
              item={child}
              activePage={activePage}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ activePage, onNavigate, sucursales = [] }) {
  const [openMenu, setOpenMenu] = useState('Inventario')
  const items = menuItems.map((item) => item.label !== 'Inventario' ? item : ({
    ...item,
    children: [
      { label: 'Inventario global', page: 'inventario-global' },
      ...sucursales.map((sucursal) => ({
        label: sucursal.nombreSucursal,
        page: `inventario-sucursal-${sucursal.idSucursal}`,
      })),
    ],
  }))

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-panel-sidebar border-r border-panel-border">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-panel-border">
        <img src={logo} alt="Ferretería Ferreteros S.A." className="h-10 w-10 rounded-full object-contain bg-white" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Ferretería</p>
          <p className="text-sm font-bold text-brand-yellow -mt-0.5">Ferreteros S.A.</p>
        </div>
      </div>

      <p className="px-5 pt-4 pb-2 text-[11px] tracking-wide text-gray-500">Menu</p>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {items.map((item) => {
          const Icon = iconMap[item.icon]
          const isSubmenuOpen = openMenu === item.label
          const isActiveTop = item.page && activePage === item.page

          function handleClick() {
            if (item.children) setOpenMenu(isSubmenuOpen ? null : item.label)
            if (item.page) onNavigate(item.page)
          }

          return (
            <div key={item.label} className="mb-1">
              <button
                onClick={handleClick}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActiveTop ? 'bg-brand-yellow/10 text-brand-yellow' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={17} />
                  {item.label}
                </span>
                {item.children && (
                  <ChevronDown
                    size={15}
                    className={`transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>

              {item.children && isSubmenuOpen && (
                <div className="mt-1 ml-8 flex flex-col gap-0.5 border-l border-panel-border pl-3">
                  {item.children.map((child) => (
                    <SubmenuNode
                      key={typeof child === 'string' ? child : child.label}
                      item={child}
                      activePage={activePage}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}