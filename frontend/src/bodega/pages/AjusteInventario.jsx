import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Campo, useAviso } from "../components/ui.jsx";
import errorMessage from "../../api/errorMessage";
import { Wrench } from "lucide-react";

export default function AjusteInventario() {
  const { productos, fijarStock } = useBodega();
  const [codigo, setCodigo] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, Aviso] = useAviso();
  const p = productos.find((x) => x.codigo === codigo);

  const guardar = async (e) => {
    e.preventDefault();
    if (!p || nuevo === "" || motivo.trim().length < 3) {
      setError("Selecciona un producto, indica el nuevo stock y escribe un motivo de al menos 3 caracteres.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const resultado = await fijarStock(p.codigo, Math.max(0, Number(nuevo)), motivo);
      if (!resultado) {
        setError("El nuevo stock coincide con la existencia actual; no se generó ningún ajuste.");
        return;
      }
      setCodigo(""); setNuevo(""); setMotivo(""); aviso("Inventario ajustado");
    } catch (err) {
      setError(errorMessage(err, "No se pudo ajustar el inventario."));
    } finally {
      setGuardando(false);
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
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end"><button className="btn-primary" type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Guardar ajuste"}</button></div>
      </div>
      <Aviso />
    </form>
  );
}
