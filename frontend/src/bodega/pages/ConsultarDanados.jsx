import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Badge, Paginacion, useConfirmacion } from "../components/ui.jsx";
import { TriangleAlert, CheckCircle2, Trash2 } from "lucide-react";

const POR_PAGINA = 5;

export default function ConsultarDanados() {
  const { danados, alternarEstadoDanado, eliminarDanado } = useBodega();
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [pedirConfirmacion, Confirmacion] = useConfirmacion();
  const t = busca.toLowerCase();
  const filtrados = danados.filter((d) => [d.producto, d.codigo, d.motivo].some((v) => v.toLowerCase().includes(t)));
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const buscar = () => { setBusca(q); setPagina(1); };

  return (
    <div>
      <Titulo icono={TriangleAlert}>Consultar mercancía dañada</Titulo>
      <div className="mb-4 flex gap-2">
        <input className="input" placeholder="Buscar por producto, código o motivo..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
        <button className="btn-primary" onClick={buscar}>Buscar</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>{["Fecha", "Producto", "Cantidad", "Motivo", "Descripción", "Estado", "Acciones"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {visibles.map((d) => (
              <tr key={d.id}>
                <td className="td">{d.fecha}</td><td className="td">{d.producto}</td><td className="td">{d.cantidad}</td><td className="td">{d.motivo}</td>
                <td className="td">{d.descripcion}</td><td className="td"><Badge texto={d.estado} /></td>
                <td className="td whitespace-nowrap">
                  <button title="Cambiar estado (Pendiente / Revisado)" className="mr-3 text-gray-300 hover:text-green-400" onClick={() => alternarEstadoDanado(d.id)}><CheckCircle2 size={16} /></button>
                  <button title="Eliminar" className="text-gray-300 hover:text-red-400" onClick={() => pedirConfirmacion({ titulo: "Eliminar registro", mensaje: `¿Seguro que quieres eliminar el registro de "${d.producto}" (${d.cantidad} unidades)?` }, () => eliminarDanado(d.id))}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={7} className="td text-center text-gray-400">No hay registros de mercancía dañada con ese criterio.</td></tr>}
          </tbody>
        </table>
        <Paginacion pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} onChange={setPagina} />
      </div>
      <Confirmacion />
    </div>
  );
}
