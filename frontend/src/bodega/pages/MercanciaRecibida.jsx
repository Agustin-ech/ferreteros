import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Campo, Badge, useAviso } from "../components/ui.jsx";
import { Truck } from "lucide-react";

export default function MercanciaRecibida() {
  const { productos, recibidos, agregarRecibido, hoy } = useBodega();
  const vacio = { fecha: hoy(), factura: "", codigo: "", cantidad: "" };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [aviso, Aviso] = useAviso();

  const guardar = (e) => {
    e.preventDefault();
    const p = productos.find((x) => x.codigo === f.codigo);
    if (!p || !f.factura.trim() || Number(f.cantidad) < 1) return setError("Selecciona un producto, escribe la factura y una cantidad mayor a 0.");
    agregarRecibido({ fecha: f.fecha, factura: f.factura.trim(), codigo: p.codigo, producto: p.nombre, cantidad: Number(f.cantidad), proveedor: p.proveedor || "—" });
    setF(vacio); setError(""); aviso("Mercancía recibida registrada");
  };

  return (
    <div className="space-y-4">
      <Titulo icono={Truck}>Mercancía recibida</Titulo>
      <form onSubmit={guardar} className="card">
        <div className="grid gap-4 md:grid-cols-4">
          <Campo label="Fecha" requerido><input type="date" className="input" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
          <Campo label="N.º de factura" requerido><input className="input" placeholder="Ej: FAC-0892" value={f.factura} onChange={(e) => setF({ ...f, factura: e.target.value })} /></Campo>
          <Campo label="Producto" requerido>
            <select className="input" value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })}>
              <option value="">Seleccionar</option>{productos.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Cantidad" requerido><input type="number" min="1" className="input" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} /></Campo>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end"><button className="btn-primary" type="submit">+ Registrar ingreso</button></div>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>{["Fecha", "Factura", "Producto", "Cantidad", "Proveedor", "Estado"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{recibidos.map((r) => (
            <tr key={r.id}><td className="td">{r.fecha}</td><td className="td">{r.factura}</td><td className="td">{r.producto}</td><td className="td">{r.cantidad}</td>
              <td className="td">{r.proveedor}</td><td className="td"><Badge texto={r.estado} /></td></tr>
          ))}</tbody>
        </table>
      </div>
      <Aviso />
    </div>
  );
}
