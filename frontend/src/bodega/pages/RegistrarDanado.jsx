import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Campo, useAviso } from "../components/ui.jsx";
import errorMessage from "../../api/errorMessage";
import { TriangleAlert } from "lucide-react";

export default function RegistrarDanado() {
  const { productos, tiposDanio, tiposDanioError, cargarTiposDanio, agregarDanado, hoy } = useBodega();
  const vacio = { codigo: "", cantidad: "", fecha: hoy(), idTipoDanio: "", descripcion: "" };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, Aviso] = useAviso();
  const p = productos.find((x) => x.codigo === f.codigo.trim().toUpperCase());

  const guardar = async (e) => {
    e.preventDefault();
    if (!p) return setError("El código no coincide con ningún producto registrado.");
    if (!f.cantidad || Number(f.cantidad) < 1 || !f.idTipoDanio || !f.fecha || !f.descripcion.trim()) return setError("Completa todos los campos obligatorios (*).");
    if (Number(f.cantidad) > p.stock) return setError(`Solo hay ${p.stock} en stock de ${p.nombre}.`);
    setGuardando(true);
    setError("");
    try {
      await agregarDanado({
        fecha: f.fecha,
        codigo: p.codigo,
        cantidad: Number(f.cantidad),
        idTipoDanio: f.idTipoDanio,
        descripcion: f.descripcion,
      });
      setF(vacio); setError(""); aviso("Producto dañado guardado");
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar la salida de inventario."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar}>
      <Titulo icono={TriangleAlert}>Registrar producto dañado</Titulo>
      <div className="card">
        <h2 className="mb-3 font-semibold">Información del producto</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Código del producto" requerido><input className="input" placeholder="Ej: PRT-001" value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} /></Campo>
          <Campo label="Nombre del producto"><input className="input opacity-70" readOnly placeholder="Se completa con el código" value={p?.nombre || ""} /></Campo>
          <Campo label="Cantidad dañada" requerido><input type="number" min="1" className="input" placeholder="Ej: 5" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} /></Campo>
          <Campo label="Fecha de daño" requerido><input type="date" className="input" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
        </div>
        <fieldset className="mt-4">
          <legend className="mb-1 text-sm">¿Por qué está dañado?<span className="text-red-500"> *</span></legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {tiposDanio.map((tipo) => (
              <label key={tipo.idTipoDanio} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="motivo"
                  checked={Number(f.idTipoDanio) === tipo.idTipoDanio}
                  onChange={() => setF({ ...f, idTipoDanio: String(tipo.idTipoDanio) })}
                />
                {tipo.nombre}
              </label>
            ))}
          </div>
          {tiposDanioError && (
            <div role="alert" className="mt-2 flex items-center gap-3 text-sm text-red-400">
              <span>{tiposDanioError}</span>
              <button type="button" className="underline" onClick={cargarTiposDanio}>Reintentar</button>
            </div>
          )}
          {!tiposDanioError && tiposDanio.length === 0 && <p className="mt-2 text-sm text-gray-400">No hay tipos de daño disponibles.</p>}
        </fieldset>
        <div className="mt-4"><Campo label="Descripción del daño" requerido>
          <textarea className="input h-24" placeholder="Escribe una breve descripción..." value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        </Campo></div>
        {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" disabled={guardando} onClick={() => { setF(vacio); setError(""); }}>Limpiar</button>
          <button type="submit" className="btn-primary" disabled={guardando || tiposDanio.length === 0}>{guardando ? "Guardando..." : "Guardar"}</button>
        </div>
      </div>
      <Aviso />
    </form>
  );
}
