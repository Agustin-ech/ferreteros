import { useBodega, dinero } from "../store.jsx";
import { Titulo, Stat } from "../components/ui.jsx";
import { BarChart3, Package, Layers, TrendingDown, Wallet } from "lucide-react";

export default function Inventario({ onNavigate }) {
  const { productos } = useBodega();
  const total = productos.reduce((s, p) => s + p.stock, 0);
  const valor = productos.reduce((s, p) => s + p.stock * (p.compra || 0), 0);
  const porCategoria = Object.entries(productos.reduce((a, p) => ({ ...a, [p.categoria]: (a[p.categoria] || 0) + p.stock }), {})).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...porCategoria.map(([, v]) => v));
  const bajos = productos.filter((p) => p.stock <= 15).sort((a, b) => a.stock - b.stock);

  return (
    <div className="space-y-4">
      <Titulo icono={BarChart3}>Existencias en inventario</Titulo>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icono={Package} titulo="Total de productos" valor={total.toLocaleString("es-CO")} />
        <Stat icono={Layers} titulo="Categorías" valor={porCategoria.length} />
        <Stat icono={TrendingDown} titulo="Stock bajo" valor={bajos.length} rojo />
        <Stat icono={Wallet} titulo="Valor total de inventario" valor={dinero(valor)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Existencias por categoría</h2>
          {porCategoria.map(([c, v]) => (
            <div key={c} className="mb-2 flex items-center gap-2 text-sm">
              <span className="w-28 shrink-0 truncate text-right text-gray-300">{c}</span>
              <div className="h-5 flex-1 rounded bg-[#2a2a2a]"><div className="h-5 rounded bg-[#C98A12]" style={{ width: `${(v / max) * 100}%` }} /></div>
              <span className="w-10 text-xs">{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="mb-2 flex justify-between"><h2 className="font-semibold">Productos con stock bajo</h2><button onClick={() => onNavigate("ajuste")} className="text-xs text-[#F2B01E]">Ajustar inventario</button></div>
          <table className="w-full">
            <thead><tr>{["Producto", "Categoría", "Cantidad"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{bajos.map((p) => <tr key={p.codigo}><td className="td">{p.nombre}</td><td className="td">{p.categoria}</td><td className="td font-bold text-red-400">{p.stock}</td></tr>)}</tbody>
          </table>
          {bajos.length === 0 && <p className="pt-2 text-sm text-gray-400">Todo el inventario está por encima del mínimo (15).</p>}
        </div>
      </div>
    </div>
  );
}
