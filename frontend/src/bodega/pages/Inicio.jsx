import { useBodega } from "../store.jsx";
import { Stat, Badge } from "../components/ui.jsx";
import { Package, Truck, TriangleAlert, Warehouse } from "lucide-react";

export default function Inicio({ onNavigate }) {
  const { productos, danados, recibidos } = useBodega();
  const existencias = productos.reduce((s, p) => s + p.stock, 0);
  const recibidas = recibidos.reduce((s, r) => s + r.cantidad, 0);
  const bajos = [...productos].filter((p) => p.stock <= 15).sort((a, b) => a.stock - b.stock).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-r from-[#1f1f1f] to-[#3a2c08]">
        <h1 className="text-2xl font-bold">¡Bienvenido, <span className="text-[#F2B01E]">Personal de Bodega!</span></h1>
        <p className="text-sm text-gray-300">Aquí un resumen general del inventario y las mercancías de la ferretería.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icono={Package} titulo="Productos en inventario" valor={productos.length} />
        <Stat icono={Truck} titulo="Mercancía recibida" valor={recibidas} />
        <Stat icono={TriangleAlert} titulo="Productos dañados" valor={danados.length} />
        <Stat icono={Warehouse} titulo="Existencias totales" valor={existencias.toLocaleString("es-CO")} nota="Total en bodega" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="mb-2 flex justify-between"><h2 className="font-semibold">Últimos ingresos de mercancía</h2>
            <button onClick={() => onNavigate("recibida")} className="text-xs text-[#F2B01E]">Ver todo</button></div>
          <table className="w-full">
            <thead><tr>{["Fecha", "Factura", "Cantidad", "Proveedor", "Estado"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{recibidos.slice(0, 5).map((r) => (
              <tr key={r.id}><td className="td">{r.fecha}</td><td className="td">{r.factura}</td><td className="td">{r.cantidad}</td>
                <td className="td">{r.proveedor}</td><td className="td"><Badge texto={r.estado} /></td></tr>
            ))}</tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Productos con menor existencia</h2>
          {bajos.length === 0 && <p className="text-sm text-gray-400">No hay productos con stock bajo.</p>}
          {bajos.map((p) => (
            <div key={p.codigo} className="mb-2">
              <div className="flex justify-between text-sm"><span>{p.nombre}</span><b>{p.stock}</b></div>
              <div className="h-1.5 rounded bg-[#333]"><div className="h-1.5 rounded bg-[#F2B01E]" style={{ width: `${Math.min(100, p.stock * 6)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
