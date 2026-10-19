import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Campo, Badge, useAviso } from "../components/ui.jsx";
import errorMessage from "../../api/errorMessage";
import { Truck } from "lucide-react";

export default function MercanciaRecibida() {
  const { catalogoProductos: productos, recibidos, recibidosCargando, recibidosError, cargarRecibidos, agregarRecibido, hoy } = useBodega();
  const vacio = { fecha: hoy(), factura: "", codigo: "", cantidad: "", proveedor: "" };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, Aviso] = useAviso();

  const guardar = async (e) => {
    e.preventDefault();
    const p = productos.find((x) => x.codigo === f.codigo && x.activo);
    if (!p || !f.factura.trim() || !f.proveedor.trim() || !f.fecha || !Number.isFinite(Number(f.cantidad)) || Number(f.cantidad) <= 0)
      return setError("Completa producto, fecha, factura, proveedor y una cantidad mayor a 0.");
    setGuardando(true);
    setError("");
    try {
      await agregarRecibido({
        fecha: f.fecha,
        factura: f.factura.trim(),
        codigo: p.codigo,
        cantidad: Number(f.cantidad),
        proveedor: f.proveedor.trim(),
      });
      setF(vacio); setError(""); aviso("Mercancía recibida registrada");
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar el ingreso de inventario."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Titulo icono={Truck}>Mercancía recibida</Titulo>
      <form onSubmit={guardar} className="card">
        <div className="grid gap-4 md:grid-cols-5">
          <Campo label="Fecha" requerido><input type="date" className="input" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
          <Campo label="N.º de factura" requerido><input className="input" maxLength="60" placeholder="Ej: FAC-0892" value={f.factura} onChange={(e) => setF({ ...f, factura: e.target.value })} /></Campo>
          <Campo label="Proveedor" requerido><input className="input" maxLength="100" placeholder="Nombre del proveedor" value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} /></Campo>
          <Campo label="Producto" requerido>
            <select className="input" value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })}>
              <option value="">Seleccionar</option>{productos.filter((p) => p.activo).map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Cantidad" requerido><input type="number" min="1" className="input" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} /></Campo>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end"><button className="btn-primary" type="submit" disabled={guardando}>{guardando ? "Guardando..." : "+ Registrar ingreso"}</button></div>
      </form>
      <div className="card overflow-x-auto">
        {recibidosError && <div role="alert" className="mb-3 flex items-center justify-between gap-3 text-sm text-red-400"><span>{recibidosError}</span><button type="button" className="underline" onClick={cargarRecibidos}>Reintentar</button></div>}
        <table className="w-full">
          <thead><tr>{["Fecha", "Factura", "Producto", "Cantidad", "Proveedor", "Estado"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{recibidosCargando && recibidos.length === 0
            ? <tr><td className="td text-center text-gray-400" colSpan="6">Cargando ingresos...</td></tr>
            : recibidos.length === 0
              ? <tr><td className="td text-center text-gray-400" colSpan="6">No hay mercancía recibida registrada.</td></tr>
              : recibidos.map((r) => (
            <tr key={r.id}><td className="td">{r.fecha}</td><td className="td">{r.factura}</td><td className="td">{r.producto}</td><td className="td">{r.cantidad}</td>
              <td className="td">{r.proveedor}</td><td className="td"><Badge texto={r.estado} /></td></tr>
          ))}</tbody>
        </table>
      </div>
      <Aviso />
    </div>
  );
}
