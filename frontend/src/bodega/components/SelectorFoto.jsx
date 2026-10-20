import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Package, Trash2, X } from "lucide-react";

// En celular y tablet se usa la cámara nativa del sistema (input con
// capture): es la mejor experiencia y funciona aunque la app no esté en HTTPS.
const esTactil = () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
// La cámara web en el navegador (getUserMedia) solo existe en HTTPS o localhost.
const hayCamaraWeb = () => Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);

function mensajeCamara(err) {
  if (err?.name === "NotAllowedError") return "No se dio permiso para usar la cámara. Actívalo en el navegador o elige un archivo.";
  if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") return "No se encontró una cámara en este dispositivo.";
  if (err?.name === "NotReadableError") return "La cámara está siendo usada por otra aplicación.";
  return "No se pudo abrir la cámara. Puedes elegir un archivo en su lugar.";
}

// Ventana con la vista previa de la cámara web (computadores).
function CamaraWeb({ onCapturar, onCerrar }) {
  const videoRef = useRef(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let flujo = null;
    let cancelado = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
        flujo = stream;
        videoRef.current.srcObject = stream;
      })
      .catch((err) => { if (!cancelado) setError(mensajeCamara(err)); });
    // Apagar la cámara al cerrar la ventana.
    return () => { cancelado = true; flujo?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    const alPresionar = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  const capturar = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const lienzo = document.createElement("canvas");
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    lienzo.getContext("2d").drawImage(video, 0, 0);
    lienzo.toBlob((blob) => {
      if (blob) onCapturar(new File([blob], "foto-producto.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Tomar foto">
      <div className="w-full max-w-lg rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold text-white"><Camera size={16} className="text-[#F2B01E]" /> Tomar foto</p>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        {error ? (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} autoPlay playsInline muted onLoadedData={() => setListo(true)} className="aspect-[4/3] w-full object-cover" />
            {!listo && <p className="absolute inset-0 grid place-items-center text-sm text-gray-400">Abriendo cámara...</p>}
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCerrar}>Cancelar</button>
          {!error && (
            <button type="button" className="btn-primary inline-flex items-center gap-2" disabled={!listo} onClick={capturar}>
              <Camera size={16} /> Capturar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Selector de foto con vista previa. La foto es opcional.
// - archivo: File elegido (aún sin subir) o null
// - urlActual: foto ya guardada en el servidor (opcional)
// - onChange(archivo): nuevo File elegido
// - onQuitar(): el usuario pidió quitar la foto (la guardada o la recién elegida)
export default function SelectorFoto({ archivo, urlActual = null, onChange, onQuitar, deshabilitado = false }) {
  const archivoRef = useRef(null);
  const camaraRef = useRef(null);
  const [previa, setPrevia] = useState(null);
  const [error, setError] = useState("");
  const [camaraWebAbierta, setCamaraWebAbierta] = useState(false);

  useEffect(() => {
    if (!archivo) { setPrevia(null); return undefined; }
    const url = URL.createObjectURL(archivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const recibir = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Selecciona un archivo de imagen (JPG, PNG o WEBP)."); return; }
    setError("");
    onChange(f);
  };

  const elegir = (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    recibir(f);
  };

  const tomarFoto = () => {
    setError("");
    if (!esTactil() && hayCamaraWeb()) setCamaraWebAbierta(true);
    else camaraRef.current?.click();
  };

  const mostrada = previa || urlActual;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#141414]">
          {mostrada
            ? <img src={mostrada} alt="Foto del producto" className="h-full w-full object-cover" />
            : <Package size={30} className="text-gray-500" />}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input ref={archivoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={elegir} disabled={deshabilitado} />
          {/* capture abre directamente la cámara trasera en celulares */}
          <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={elegir} disabled={deshabilitado} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost inline-flex items-center gap-2" disabled={deshabilitado} onClick={tomarFoto}>
              <Camera size={16} /> {mostrada ? "Tomar otra" : "Tomar foto"}
            </button>
            <button type="button" className="btn-ghost inline-flex items-center gap-2" disabled={deshabilitado} onClick={() => archivoRef.current?.click()}>
              <ImagePlus size={16} /> Elegir archivo
            </button>
          </div>
          {mostrada && onQuitar && (
            <button type="button" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400" disabled={deshabilitado} onClick={onQuitar}>
              <Trash2 size={14} /> Quitar foto
            </button>
          )}
          <p className="text-xs text-gray-500">Opcional. JPG, PNG o WEBP; se reduce automáticamente.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
      {camaraWebAbierta && (
        <CamaraWeb
          onCerrar={() => setCamaraWebAbierta(false)}
          onCapturar={(f) => { setCamaraWebAbierta(false); recibir(f); }}
        />
      )}
    </div>
  );
}
