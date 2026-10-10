import { useState } from "react";
import { X } from "lucide-react";

export const Titulo = ({ icono: Icono, children }) => (
  <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold"><Icono size={26} className="text-[#F2B01E]" />{children}</h1>
);

export const Stat = ({ icono: Icono, titulo, valor, nota, rojo }) => (
  <div className="card flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-400">{titulo}</p>
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${rojo ? "bg-red-500/15 text-red-400" : "bg-brand-yellow/15 text-brand-yellow"}`}>
        <Icono size={16} />
      </span>
    </div>
    <p className={`text-2xl font-bold ${rojo ? "text-red-400" : "text-white"}`}>{valor}</p>
    {nota && <p className="text-xs text-gray-500">{nota}</p>}
  </div>
);

const colores = {
  Activo: "bg-emerald-500/15 text-emerald-400",
  Inactivo: "bg-gray-500/15 text-gray-400",
  Pendiente: "bg-red-500/15 text-red-400",
  Revisado: "bg-emerald-500/15 text-emerald-400",
  Recibido: "bg-emerald-500/15 text-emerald-400",
};
export const Badge = ({ texto }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colores[texto] || "bg-gray-500/15 text-gray-400"}`}>{texto}</span>
);

export const Campo = ({ label, requerido, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block">{label}{requerido && <span className="text-red-500"> *</span>}</span>
    {children}
  </label>
);

export function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function useAviso() {
  const [msg, setMsg] = useState("");
  const mostrar = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };
  const Aviso = () => msg ? <div className="fixed bottom-6 right-6 z-50 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">{msg}</div> : null;
  return [mostrar, Aviso];
}

export function Paginacion({ pagina, total, porPagina, onChange }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total ? (pagina - 1) * porPagina + 1 : 0;
  const hasta = Math.min(total, pagina * porPagina);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
      <div className="flex gap-1">
        {Array.from({ length: paginas }, (_, i) => (
          <button key={i} onClick={() => onChange(i + 1)}
            className={`h-8 w-8 rounded-lg border text-xs transition-colors ${pagina === i + 1 ? "border-brand-yellow bg-brand-yellow font-bold text-black" : "border-panel-border bg-panel-card text-gray-300 hover:border-brand-yellow"}`}>{i + 1}</button>
        ))}
      </div>
      <span>Mostrando {desde} - {hasta} de {total} registros</span>
    </div>
  );
}

// Reemplaza al confirm() feo del navegador. Uso:
//   const [pedirConfirmacion, Confirmacion] = useConfirmacion();
//   pedirConfirmacion({ titulo, mensaje, textoBoton }, () => haceralgo());
//   ... y en el JSX: <Confirmacion />
export function useConfirmacion() {
  const [estado, setEstado] = useState(null);
  const pedir = (opciones, alConfirmar) => setEstado({ ...opciones, alConfirmar });
  const cerrar = () => setEstado(null);
  const Confirmacion = () =>
    estado ? (
      <Modal titulo={estado.titulo || "Confirmar"} onClose={cerrar}>
        <p className="text-sm text-gray-300">{estado.mensaje}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={cerrar}>Cancelar</button>
          <button
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
            onClick={() => { estado.alConfirmar(); cerrar(); }}
          >
            {estado.textoBoton || "Eliminar"}
          </button>
        </div>
      </Modal>
    ) : null;
  return [pedir, Confirmacion];
}
