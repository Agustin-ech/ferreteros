import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Campo, useAviso } from "../components/ui.jsx";
import { TriangleAlert } from "lucide-react";

const motivos = ["Producto roto", "Caja dañada", "Faltantes", "Vencido", "Otro"];

export default function RegistrarDanado() {
  const { productos, agregarDanado, hoy } = useBodega();
  const vacio = { codigo: "", cantidad: "", fecha: hoy(), motivo: "", descripcion: "" };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [aviso, Aviso] = useAviso();
  const p = productos.find((x) => x.codigo === f.codigo.trim().toUpperCase());

  const guardar = (e) => {
    e.preventDefault();
    if (!p) return setError("El código no coincide con ningún producto registrado.");
    if (!f.cantidad || Number(f.cantidad) < 1 || !f.motivo || !f.descripcion.trim()) return setError("Completa todos los campos obligatorios (*).");
    if (Number(f.cantidad) > p.stock) return setError(`Solo hay ${p.stock} en stock de ${p.nombre}.`);
    agregarDanado({ fecha: f.fecha, codigo: p.codigo, producto: p.nombre, cantidad: Number(f.cantidad), motivo: f.motivo, descripcion: f.descripcion });
    setF(vacio); setError(""); aviso("Producto dañado guardado");
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
            {motivos.map((m) => (
              <label key={m} className="flex items-center gap-1.5"><input type="radio" name="motivo" checked={f.motivo === m} onChange={() => setF({ ...f, motivo: m })} />{m}</label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4"><Campo label="Descripción del daño" requerido>
          <textarea className="input h-24" placeholder="Escribe una breve descripción..." value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        </Campo></div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => { setF(vacio); setError(""); }}>Limpiar</button>
          <button type="submit" className="btn-primary">Guardar</button>
        </div>
      </div>
      <Aviso />
    </form>
  );
}
