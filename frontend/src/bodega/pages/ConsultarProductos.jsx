import { useState } from "react";
import { useBodega, dinero } from "../store.jsx";
import { Titulo, Badge, Modal, Paginacion, useAviso, useConfirmacion } from "../components/ui.jsx";
import errorMessage from "../../api/errorMessage";
import { Search, Eye, Pencil, Trash2 } from "lucide-react";

const POR_PAGINA = 8;

export default function ConsultarProductos() {
  const { productos, actualizarProducto, eliminarProducto } = useBodega();
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [sel, setSel] = useState(null);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState({});
  const [error, setError] = useState("");
  const [aviso, Aviso] = useAviso();
  const [pedirConfirmacion, Confirmacion] = useConfirmacion();

  const t = busca.toLowerCase();
  const filtrados = productos.filter((p) => [p.codigo, p.nombre, p.categoria, p.marca].some((v) => String(v).toLowerCase().includes(t)));
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const buscar = () => { setBusca(q); setPagina(1); };

const abrir = (p, edit) => {
    setSel(p);
    setEditando(edit);
    setError("");
    setBorrador({ 
      stock: p.stock, 
      venta: p.venta, 
      compra: p.compra, 
      estado: p.estado, 
      motivo: "" 
    });
  };

  const guardar = async () => {
    setError("");

    // Validaciones de precios
    if (Number(borrador.venta) < 0.01 || Number(borrador.compra) < 0.01) {
      setError("Los precios de compra y venta deben ser mayores que cero.");
      return;
    }

    // Validación de motivo si el stock cambió
    if (Number(borrador.stock) !== sel.stock && !borrador.motivo.trim()) {
      setError("Indica el motivo requerido para ajustar el stock.");
      return;
    }

    try {
      await actualizarProducto(sel.codigo, {
        stock: Number(borrador.stock),
        venta: Number(borrador.venta),
        compra: Number(borrador.compra),
        estado: borrador.estado,
        motivo: borrador.motivo,
      });
      setSel(null);
      aviso("Producto actualizado");
    } catch (err) {
      setError(errorMessage(err, "No se pudo actualizar el producto."));
    }
  };

  const borrar = (p) =>
    pedirConfirmacion(
      { titulo: "Desactivar producto", mensaje: `¿Seguro que quieres desactivar "${p.nombre}" (${p.codigo})? El producto dejará de estar disponible, pero se conservará su inventario e historial.` },
      async () => {
        setError("");
        try {
          await eliminarProducto(p.codigo);
          aviso("Producto desactivado");
        } catch (err) {
          setError(errorMessage(err, "No se pudo desactivar el producto."));
        }
      }
    );

  return (
    <div>
      <Titulo icono={Search}>Consultar productos</Titulo>
      <div className="mb-4 flex gap-2">
        <input className="input" placeholder="Buscar por nombre o código..." value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
        <button className="btn-primary" onClick={buscar}>Buscar</button>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr>{["Código", "Producto", "Tipo", "Unidad", "Stock", "Precio venta", "Estado", "Acciones"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.codigo}>
                <td className="td">{p.codigo}</td><td className="td">{p.nombre}</td><td className="td">{p.tipo}</td>
                <td className="td">{p.unidad}</td><td className="td">{p.stock}</td><td className="td">{dinero(p.venta)}</td>
                <td className="td"><Badge texto={p.estado} /></td>
                <td className="td whitespace-nowrap">
                  <button title="Ver" className="mr-3 text-gray-300 hover:text-[#F2B01E]" onClick={() => abrir(p, false)}><Eye size={16} /></button>
                  <button title="Editar" className="mr-3 text-gray-300 hover:text-[#F2B01E]" onClick={() => abrir(p, true)}><Pencil size={16} /></button>
                  {p.estado === "Activo" && <button title="Desactivar" className="text-gray-300 hover:text-red-400" onClick={() => borrar(p)}><Trash2 size={16} /></button>}
                </td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={8} className="td text-center text-gray-400">No se encontraron productos. Prueba con otro nombre o código.</td></tr>}
          </tbody>
        </table>
        <Paginacion pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} onChange={setPagina} />
      </div>

      {sel && (
        <Modal titulo={`${sel.codigo} · ${sel.nombre}`} onClose={() => setSel(null)}>
          {editando ? (
            <div className="space-y-3 text-sm">

{/* Campos numéricos: Stock, Precio de venta, Precio de compra */}
              {[["Stock", "stock"], ["Precio de venta", "venta"], ["Precio de compra", "compra"]].map(([l, k]) => (
                <label key={k} className="block">
                  {l}
                  <input 
                    type="number" 
                    min={k === "stock" ? "0" : "0.01"} 
                    step="0.01" 
                    className="input mt-1" 
                    value={borrador[k]} 
                    onChange={(e) => setBorrador({ ...borrador, [k]: e.target.value })} 
                  />
                </label>
              ))}

              {/* Selector de Estado */}
              <label className="block">
                Estado
                <select 
                  className="input mt-1" 
                  value={borrador.estado} 
                  onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}
                >
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
              </label>

              {/* Motivo condicional (solo si cambia el stock) */}
              {Number(borrador.stock) !== sel.stock && (
                <label className="block">
                  Motivo del ajuste de stock
                  <textarea 
                    className="input mt-1" 
                    value={borrador.motivo} 
                    onChange={(e) => setBorrador({ ...borrador, motivo: e.target.value })} 
                  />
                </label>
              )}

              {/* Mensaje de error accesible */}
              {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
              <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setSel(null)}>Cancelar</button><button className="btn-primary" onClick={guardar}>Guardar cambios</button></div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {[["Tipo", sel.tipo], ["Unidad", sel.unidad], ["Stock", sel.stock], ["Stock mínimo", sel.stockMinimo],
                ["Precio de compra", dinero(sel.compra)], ["Precio de venta", dinero(sel.venta)], ["Estado", sel.estado]].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-gray-400">{k}</dt><dd>{v}</dd></div>
              ))}
              {sel.descripcion && <div className="col-span-2"><dt className="text-xs text-gray-400">Descripción</dt><dd>{sel.descripcion}</dd></div>}
            </dl>
          )}
        </Modal>
      )}
      <Confirmacion />
      <Aviso />
    </div>
  );
}
