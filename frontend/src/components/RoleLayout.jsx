import { useEffect, useState } from 'react'
import {
  Bell, ChevronDown, ChevronRight, LogOut, MapPin, Menu, Search, User, X,
} from 'lucide-react'
import logo from '../assets/logo.png'

function NavigationItem({ item, activePage, onNavigate, onSelect }) {
  const [isOpen, setIsOpen] = useState(Boolean(
    item.defaultOpen || item.children?.some((child) => child.page === activePage)
  ))
  const Icon = item.icon
  const isActive = item.page === activePage
  const hasActiveChild = item.children?.some((child) => child.page === activePage)

  useEffect(() => {
    if (hasActiveChild) setIsOpen(true)
  }, [hasActiveChild])

  if (item.page && !item.children) {
    return (
      <button
        type="button"
        onClick={() => { onNavigate(item.page); onSelect() }}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
          isActive ? 'bg-brand-yellow/10 text-brand-yellow' : 'text-gray-300 hover:bg-white/5'
        }`}
      >
        {Icon && <Icon size={17} />}
        {item.label}
      </button>
    )
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          if (item.page) onNavigate(item.page)
          setIsOpen((open) => !open)
        }}
        className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
          isActive || hasActiveChild ? 'bg-brand-yellow/10 text-brand-yellow' : 'text-gray-300 hover:bg-white/5'
        }`}
      >
        <span className="flex items-center gap-3">
          {Icon && <Icon size={17} />}
          {item.label}
        </span>
        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>

      {isOpen && item.children && (
        <div className="mt-1 ml-8 flex flex-col gap-0.5 border-l border-panel-border pl-3">
          {item.children.map((child) => (
            <button
              key={child.page}
              type="button"
              onClick={() => { onNavigate(child.page); onSelect() }}
              className={`w-full py-1.5 text-left text-[13px] transition-colors ${
                activePage === child.page
                  ? 'font-semibold text-brand-yellow'
                  : 'text-gray-400 hover:text-brand-yellow'
              }`}
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RoleLayout({
  roleName,
  localName = 'General',
  navigation,
  activePage,
  onNavigate,
  onLogout,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="role-panel flex min-h-screen bg-panel-bg text-gray-200">
      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMenu}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-panel-border bg-panel-sidebar transition-transform lg:static lg:translate-x-0 ${
        menuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between gap-3 border-b border-panel-border px-5 py-5">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Ferretería Ferreteros S.A." className="h-10 w-10 rounded-full bg-white object-contain" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">Ferretería</p>
              <p className="text-sm font-bold text-brand-yellow -mt-0.5">Ferreteros S.A.</p>
            </div>
          </div>
          <button type="button" aria-label="Cerrar menú" onClick={closeMenu} className="text-gray-400 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        </div>

        <p className="px-5 pb-2 pt-4 text-[11px] tracking-wide text-gray-500">Menú</p>
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {navigation.map((item) => (
            <NavigationItem
              key={item.label}
              item={item}
              activePage={activePage}
              onNavigate={onNavigate}
              onSelect={closeMenu}
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[73px] items-center justify-between gap-3 border-b border-panel-border bg-panel-bg px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMenuOpen((open) => !open)}
              className="shrink-0 rounded-lg border border-panel-border p-2 text-gray-300 hover:text-brand-yellow lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-panel-border bg-panel-card px-3 py-2">
              <Search size={16} className="shrink-0 text-gray-500" />
              <input
                type="text"
                aria-label="Buscar"
                placeholder="Buscar productos, facturas, pedidos..."
                className="w-full min-w-0 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-500"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-5">
            <div className="hidden items-center gap-1.5 text-sm text-gray-400 md:flex">
              <MapPin size={15} />
              Local: <span className="font-medium text-gray-200">{localName}</span>
            </div>
            <Bell size={18} className="hidden text-gray-400 sm:block" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-yellow">
                <User size={16} />
              </div>
              <span className="hidden text-sm font-medium text-gray-200 sm:block">{roleName}</span>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Cerrar sesión"
                className="flex items-center gap-1.5 rounded-lg border border-panel-border px-2.5 py-1.5 text-sm text-gray-300 transition-colors hover:border-brand-yellow hover:text-brand-yellow sm:px-3"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            )}
          </div>
        </header>
        <main className="role-content min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
