import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Campo, useAviso } from "../components/ui.jsx";
import errorMessage from "../../api/errorMessage";
import { Package } from "lucide-react";

const vacio = { codigo: "", nombre: "", tipo: "", unidad: "", compra: "", venta: "", stock: "", stockMinimo: "5", estado: "Activo", descripcion: "" };

export default function RegistrarProducto() {
  const { catalogoProductos: productos, tiposProducto, unidadesMedida, agregarProducto, cargando } = useBodega();
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, Aviso] = useAviso();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const sinCatalogos = !cargando && (!tiposProducto.length || !unidadesMedida.length);

  const guardar = async (e) => {
    e.preventDefault();
    const codigo = f.codigo.trim().toUpperCase();
    if (!codigo || !f.nombre.trim() || !f.tipo || !f.unidad || f.venta === "" || f.compra === "" || f.stock === "")
      return setError("Completa todos los campos obligatorios (*).");
    if (productos.some((p) => p.codigo === codigo)) return setError(`Ya existe un producto con el código ${codigo}.`);
    if (Number(f.venta) < 0.01 || Number(f.compra) < 0.01) {
      return setError("Los precios de compra y venta deben ser mayores que cero.");
    }
    setGuardando(true);
    setError("");
    try {
      await agregarProducto({
        ...f,
        codigo,
        idTipoProducto: Number(f.tipo),
        idUnidadMedida: Number(f.unidad),
        stock: Number(f.stock),
        stockMinimo: Number(f.stockMinimo),
        compra: Number(f.compra || 0),
        venta: Number(f.venta),
      });
      setF(vacio);
      aviso("Producto agregado");
    } catch (err) {
      if (err.message?.startsWith("El producto se creó,")) setF(vacio);
      setError(errorMessage(err, "No se pudo guardar el producto."));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar}>
      <Titulo icono={Package}>Registrar producto</Titulo>
      <div className="card">
        <h2 className="mb-3 font-semibold">Información del producto</h2>
        {sinCatalogos && <p className="mb-4 text-sm text-red-400">No se pudieron cargar los tipos de producto o las unidades de medida activas. No es posible registrar el producto.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Código del producto" requerido><input className="input" placeholder="Ej: PRT-001" value={f.codigo} onChange={set("codigo")} /></Campo>
          <Campo label="Nombre del producto" requerido><input className="input" placeholder="Ej: Tornillo 5mm" value={f.nombre} onChange={set("nombre")} /></Campo>
          <Campo label="Tipo de producto" requerido>
            <select className="input" value={f.tipo} onChange={set("tipo")}>
              <option value="">Seleccionar tipo</option>
              {tiposProducto.map((tipo) => <option key={tipo.idTipoProducto} value={tipo.idTipoProducto}>{tipo.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Unidad de medida" requerido>
            <select className="input" value={f.unidad} onChange={set("unidad")}>
              <option value="">Seleccionar unidad</option>
              {unidadesMedida.map((unidad) => <option key={unidad.idUnidadMedida} value={unidad.idUnidadMedida}>{unidad.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Cantidad en inventario" requerido><input type="number" min="0" className="input" placeholder="Ej: 100" value={f.stock} onChange={set("stock")} /></Campo>
          <Campo label="Stock mínimo"><input type="number" min="0" className="input" value={f.stockMinimo} onChange={set("stockMinimo")} /></Campo>
          <Campo label="Precio de venta" requerido><input type="number" min="0.01" step="0.01" className="input" placeholder="Ej: 15000" value={f.venta} onChange={set("venta")} /></Campo>
          <Campo label="Precio de compra" requerido><input type="number" min="0.01" step="0.01" className="input" placeholder="Ej: 10000" value={f.compra} onChange={set("compra")} /></Campo>
          <Campo label="Descripción"><textarea className="input h-20" placeholder="Escribe una breve descripción del producto..." value={f.descripcion} onChange={set("descripcion")} /></Campo>
          <Campo label="Estado">
            <select className="input" value={f.estado} onChange={set("estado")}><option>Activo</option><option>Inactivo</option></select>
          </Campo>
        </div>
        {(!tiposProducto.length || !unidadesMedida.length) && <p className="mt-3 text-sm text-amber-400">No hay tipos o unidades activos disponibles en los catálogos del servidor.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => { setF(vacio); setError(""); }}>Limpiar</button>
          <button type="submit" className="btn-primary" disabled={guardando || !tiposProducto.length || !unidadesMedida.length}>
            {guardando ? "Guardando..." : "+ Agregar producto"}
          </button>
        </div>
      </div>
      <Aviso />
    </form>
  );
}
