import { Home, Truck, Package, BarChart3, TriangleAlert, LogOut } from "lucide-react";
import logo from "../../assets/logo.png";

// Cada "page" es la clave que usa BodegaApp.jsx para elegir la página.
const grupos = [
  { titulo: "Inicio", icono: Home, page: "inicio" },
  { titulo: "Ingreso de mercancía", icono: Truck, hijos: [["Mercancía recibida", "recibida"]] },
  { titulo: "Productos", icono: Package, hijos: [["Registrar producto", "registrar-producto"], ["Consultar productos", "consultar-productos"]] },
  { titulo: "Inventario", icono: BarChart3, hijos: [["Existencias", "inventario"], ["Ajuste de inventario", "ajuste"]] },
  { titulo: "Mercancía dañada", icono: TriangleAlert, hijos: [["Registrar producto dañado", "registrar-danado"], ["Consultar mercancía dañada", "consultar-danados"]] },
];

const estilo = (activo) =>
  `block w-full rounded px-3 py-1.5 text-left text-sm ${activo ? "bg-[#F2B01E]/15 font-semibold text-[#F2B01E]" : "text-gray-300 hover:bg-white/5"}`;

export default function Layout({ activePage, onNavigate, onLogout, children }) {
  return (
    <div className="flex min-h-screen bg-[#141414] text-gray-200">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-[#2a2a2a] bg-[#1a1a1a] p-3">
        <img src={logo} alt="Ferretería Ferreteros S.A." className="mx-auto mb-2 h-24 w-24 rounded-full bg-white object-contain p-1" />
        <p className="px-3 pb-1 text-lg font-bold">Menú</p>
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {grupos.map((g) =>
            g.page ? (
              <button key={g.titulo} onClick={() => onNavigate(g.page)} className={estilo(activePage === g.page)}>
                <span className="flex items-center gap-2"><g.icono size={16} />{g.titulo}</span>
              </button>
            ) : (
              <div key={g.titulo}>
                <p className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-gray-200"><g.icono size={16} className="text-[#F2B01E]" />{g.titulo}</p>
                <div className="ml-4 border-l border-[#333] pl-2">
                  {g.hijos.map(([t, p]) => <button key={p} onClick={() => onNavigate(p)} className={estilo(activePage === p)}>{t}</button>)}
                </div>
              </div>
            )
          )}
        </nav>
        <button className="btn-ghost mt-2 flex items-center justify-center gap-2" onClick={onLogout}><LogOut size={16} />Cerrar sesión</button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-[#2a2a2a] bg-[#1a1a1a] px-6 py-3">
          <input className="input max-w-md" placeholder="Buscar productos, facturas, pedidos..." />
          <div className="ml-auto flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">Local:
              <select className="rounded border border-[#3a3a3a] bg-[#232323] px-2 py-1">
                <option>General</option><option>La chinita</option>
              </select>
            </label>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F2B01E] font-bold text-black">PB</span>
              <span className="leading-tight">Personal de<br />Bodega</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
