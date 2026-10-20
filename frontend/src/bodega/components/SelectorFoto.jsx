import { useEffect, useRef, useState } from "react";
import { Camera, Package, Trash2 } from "lucide-react";

// Selector de foto con vista previa.
// - archivo: File elegido (aún sin subir) o null
// - urlActual: foto ya guardada en el servidor (opcional)
// - onChange(archivo): nuevo File elegido
// - onQuitar(): el usuario pidió quitar la foto (la guardada o la recién elegida)
export default function SelectorFoto({ archivo, urlActual = null, onChange, onQuitar, deshabilitado = false }) {
  const inputRef = useRef(null);
  const [previa, setPrevia] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!archivo) { setPrevia(null); return undefined; }
    const url = URL.createObjectURL(archivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const elegir = (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Selecciona un archivo de imagen (JPG, PNG o WEBP)."); return; }
    setError("");
    onChange(f);
  };

  const mostrada = previa || urlActual;

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#141414]">
          {mostrada
            ? <img src={mostrada} alt="Foto del producto" className="h-full w-full object-cover" />
            : <Package size={30} className="text-gray-500" />}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={elegir} disabled={deshabilitado} />
          <button type="button" className="btn-ghost inline-flex items-center gap-2" disabled={deshabilitado} onClick={() => inputRef.current?.click()}>
            <Camera size={16} /> {mostrada ? "Cambiar foto" : "Subir foto"}
          </button>
          {mostrada && onQuitar && (
            <button type="button" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400" disabled={deshabilitado} onClick={onQuitar}>
              <Trash2 size={14} /> Quitar foto
            </button>
          )}
          <p className="text-xs text-gray-500">JPG, PNG o WEBP. Se reduce automáticamente.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
