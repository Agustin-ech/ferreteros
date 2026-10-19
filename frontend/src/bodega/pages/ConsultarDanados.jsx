import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Badge, Paginacion, useConfirmacion } from "../components/ui.jsx";
import errorMessage from "../../api/errorMessage";
import { TriangleAlert, CheckCircle2, Trash2 } from "lucide-react";

const POR_PAGINA = 5;

export default function ConsultarDanados() {
  const {
    danados,
    danadosTotal,
    danadosCargando,
    danadosError,
    cargarDanados,
    cambiarEstadoDanado,
    eliminarDanado,
  } = useBodega();
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [pedirConfirmacion, Confirmacion] = useConfirmacion();
  const buscar = async () => {
    setBusca(q);
    setPagina(1);
    setError("");
    await cargarDanados(1, q);
  };
  const confirmarBaja = async (id) => {
    setProcesando(true);
    setError("");
    try {
      await cambiarEstadoDanado(id, "Dada de baja");
    } catch (err) {
      setError(errorMessage(err, "No se pudo confirmar el daño."));
    } finally {
      setProcesando(false);
    }
  };
  const confirmarAnulacion = (registro) => pedirConfirmacion(
    {
      titulo: "Anular registro",
      mensaje: `¿Anular el registro de "${registro.producto}" (${registro.cantidad} unidades)? Las unidades volverán al inventario.`,
      textoBoton: "Anular y devolver",
    },
    async () => {
      setProcesando(true);
      setError("");
      try {
        await eliminarDanado(registro.id);
        if (danados.length === 1 && pagina > 1) {
          const nuevaPagina = pagina - 1;
          setPagina(nuevaPagina);
          await cargarDanados(nuevaPagina, busca);
        }
      } catch (err) {
        setError(errorMessage(err, "No se pudo anular el registro."));
      } finally {
        setProcesando(false);
      }
    },
  );

  return (
    <div>
      <Titulo icono={TriangleAlert}>Consultar mercancía dañada</Titulo>
      <div className="mb-4 flex gap-2">
        <input className="input" placeholder="Buscar por producto, código o motivo..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
        <button className="btn-primary" disabled={danadosCargando} onClick={buscar}>Buscar</button>
      </div>
      {(error || danadosError) && (
        <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 text-sm text-red-400">
          <span>{error || danadosError}</span>
          {!error && <button type="button" className="underline" onClick={() => cargarDanados(pagina, busca)}>Reintentar carga</button>}
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>{["Fecha", "Producto", "Cantidad", "Motivo", "Descripción", "Estado", "Acciones"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {danados.map((d) => (
              <tr key={d.id}>
                <td className="td">{d.fecha}</td><td className="td">{d.producto}</td><td className="td">{d.cantidad}</td><td className="td">{d.motivo}</td>
                <td className="td">{d.descripcion}</td><td className="td"><Badge texto={d.estado} /></td>
                <td className="td whitespace-nowrap">
                  {["Registrada", "Reclamada"].includes(d.estado) && <>
                    <button title="Confirmar pérdida (dar de baja)" disabled={procesando} className="mr-3 text-gray-300 hover:text-green-400 disabled:opacity-50" onClick={() => confirmarBaja(d.id)}><CheckCircle2 size={16} /></button>
                    <button title="Anular registro y devolver al inventario" disabled={procesando} className="text-gray-300 hover:text-red-400 disabled:opacity-50" onClick={() => confirmarAnulacion(d)}><Trash2 size={16} /></button>
                  </>}
                </td>
              </tr>
            ))}
            {!danadosCargando && danados.length === 0 && <tr><td colSpan={7} className="td text-center text-gray-400">No hay registros de mercancía dañada con ese criterio.</td></tr>}
            {danadosCargando && <tr><td colSpan={7} className="td text-center text-gray-400">Cargando registros...</td></tr>}
          </tbody>
        </table>
        <Paginacion
          pagina={pagina}
          total={danadosTotal}
          porPagina={POR_PAGINA}
          onChange={(nuevaPagina) => {
            setPagina(nuevaPagina);
            cargarDanados(nuevaPagina, busca);
          }}
        />
      </div>
      <Confirmacion />
    </div>
  );
}
