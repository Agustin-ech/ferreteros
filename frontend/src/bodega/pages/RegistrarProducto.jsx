import { useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Campo, useAviso } from "../components/ui.jsx";
import { Package } from "lucide-react";

const vacio = { codigo: "", nombre: "", tipo: "", categoria: "", marca: "", unidad: "", compra: "", venta: "", stock: "", proveedor: "", estado: "Activo", descripcion: "" };
const tipos = ["Ferretería", "Construcción", "Pinturas", "Electricidad", "Herramientas", "Plomería", "Otros"];
const unidades = ["Unidad", "Saco", "Galón", "Metro", "Caja", "Kilo"];
const proveedores = ["Ferretería La 15", "Pintuco SA", "Electrocables", "Pavco"];

export default function RegistrarProducto() {
  const { productos, agregarProducto } = useBodega();
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [aviso, Aviso] = useAviso();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const guardar = (e) => {
    e.preventDefault();
    const codigo = f.codigo.trim().toUpperCase();
    if (!codigo || !f.nombre || !f.tipo || !f.categoria || !f.unidad || f.venta === "" || f.stock === "")
      return setError("Completa todos los campos obligatorios (*).");
    if (productos.some((p) => p.codigo === codigo)) return setError(`Ya existe un producto con el código ${codigo}.`);
    agregarProducto({ ...f, codigo, stock: Number(f.stock), compra: Number(f.compra || 0), venta: Number(f.venta) });
    setF(vacio); setError(""); aviso("Producto agregado");
  };

  const Sel = ({ k, opciones, ph }) => (
    <select className="input" value={f[k]} onChange={set(k)}>
      <option value="">{ph}</option>{opciones.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <form onSubmit={guardar}>
      <Titulo icono={Package}>Registrar producto</Titulo>
      <div className="card">
        <h2 className="mb-3 font-semibold">Información del producto</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Código del producto" requerido><input className="input" placeholder="Ej: PRT-001" value={f.codigo} onChange={set("codigo")} /></Campo>
          <Campo label="Nombre del producto" requerido><input className="input" placeholder="Ej: Tornillo 5mm" value={f.nombre} onChange={set("nombre")} /></Campo>
          <Campo label="Tipo de producto" requerido><Sel k="tipo" opciones={tipos} ph="Seleccionar tipo" /></Campo>
          <Campo label="Categoría" requerido><input className="input" placeholder="Ej: Tornillos" value={f.categoria} onChange={set("categoria")} /></Campo>
          <Campo label="Marca"><input className="input" placeholder="Ej: Tramontina" value={f.marca} onChange={set("marca")} /></Campo>
          <Campo label="Unidad de medida" requerido><Sel k="unidad" opciones={unidades} ph="Seleccionar unidad" /></Campo>
          <Campo label="Cantidad en inventario" requerido><input type="number" min="0" className="input" placeholder="Ej: 100" value={f.stock} onChange={set("stock")} /></Campo>
          <Campo label="Precio de venta" requerido><input type="number" min="0" className="input" placeholder="Ej: 15000" value={f.venta} onChange={set("venta")} /></Campo>
          <Campo label="Precio de compra"><input type="number" min="0" className="input" placeholder="Ej: 10000" value={f.compra} onChange={set("compra")} /></Campo>
          <Campo label="Proveedor"><Sel k="proveedor" opciones={proveedores} ph="Seleccionar proveedor" /></Campo>
          <Campo label="Descripción"><textarea className="input h-20" placeholder="Escribe una breve descripción del producto..." value={f.descripcion} onChange={set("descripcion")} /></Campo>
          <Campo label="Estado"><Sel k="estado" opciones={["Activo", "Inactivo"]} ph="Estado" /></Campo>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => { setF(vacio); setError(""); }}>Limpiar</button>
          <button type="submit" className="btn-primary">+ Agregar producto</button>
        </div>
      </div>
      <Aviso />
    </form>
  );
}
