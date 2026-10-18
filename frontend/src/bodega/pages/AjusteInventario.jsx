import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Campo, useAviso } from "../components/ui.jsx";
import { Wrench } from "lucide-react";

export default function AjusteInventario() {
  const { productos, fijarStock } = useBodega();
  const [codigo, setCodigo] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [aviso, Aviso] = useAviso();
  const p = productos.find((x) => x.codigo === codigo);

  const guardar = async (e) => {
    e.preventDefault();
    if (!p || nuevo === "" || !motivo.trim()) return;
    try {
      await fijarStock(p.codigo, Math.max(0, Number(nuevo)), motivo.trim());
      setCodigo(""); setNuevo(""); setMotivo(""); aviso("Inventario ajustado");
    } catch (err) {
      setError(err?.response?.data?.mensaje || err?.response?.data?.error || err.message || "No se pudo ajustar el inventario.");
    }
  };

  return (
    <form onSubmit={guardar}>
      <Titulo icono={Wrench}>Ajuste de inventario</Titulo>
      <div className="card grid max-w-2xl gap-4">
        <Campo label="Producto" requerido>
          <select className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)}>
            <option value="">Seleccionar producto</option>
            {productos.map((x) => <option key={x.codigo} value={x.codigo}>{x.codigo} · {x.nombre}</option>)}
          </select>
        </Campo>
        {p && <p className="text-sm text-gray-300">Stock actual: <b>{p.stock}</b> {p.unidad.toLowerCase()}(s)</p>}
        <Campo label="Nuevo stock" requerido><input type="number" min="0" className="input" value={nuevo} onChange={(e) => setNuevo(e.target.value)} /></Campo>
        <Campo label="Motivo del ajuste" requerido><textarea className="input h-20" placeholder="Ej: Conteo físico del 28 de septiembre" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end"><button className="btn-primary" type="submit">Guardar ajuste</button></div>
      </div>
      <Aviso />
    </form>
  );
}
