import { useEffect, useState } from "react";
import { useBodega } from "../store.jsx";
import { Titulo, Campo, useAviso } from "../components/ui.jsx";
import { Package } from "lucide-react";

const vacio = { codigo: "", nombre: "", idTipoProducto: "", idUnidadMedida: "", idSucursal: "", compra: "", venta: "", stock: "", descripcion: "" };

export default function RegistrarProducto() {
  const {
    productos, agregarProducto, tiposProducto, unidadesMedida, sucursales,
    idSucursalActual, cargando,
  } = useBodega();
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, Aviso] = useAviso();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (f.idSucursal) return;
    const sucursalInicial = idSucursalActual || sucursales[0]?.idSucursal;
    if (sucursalInicial) setF((actual) => ({ ...actual, idSucursal: String(sucursalInicial) }));
  }, [f.idSucursal, idSucursalActual, sucursales]);

  const guardar = async (e) => {
    e.preventDefault();
    const codigo = f.codigo.trim().toUpperCase();
    if (!codigo || !f.nombre.trim() || !f.idTipoProducto || !f.idUnidadMedida || !f.idSucursal
      || f.venta === "" || f.compra === "" || f.stock === "")
      return setError("Completa todos los campos obligatorios (*).");
    if (productos.some((p) => p.codigo === codigo)) return setError(`Ya existe un producto con el código ${codigo}.`);
    if (Number(f.venta) < 0.01 || Number(f.compra) < 0.01) {
      return setError("Los precios de compra y venta deben ser mayores que cero.");
    }
    if (!Number.isFinite(Number(f.stock)) || Number(f.stock) <= 0) {
      return setError("El stock inicial debe ser mayor que cero para asignar el producto a la sucursal.");
    }

    setGuardando(true);
    setError("");
    try {
      await agregarProducto({
        ...f,
        idTipoProducto: Number(f.idTipoProducto),
        idUnidadMedida: Number(f.idUnidadMedida),
        idSucursal: Number(f.idSucursal),
        codigo,
        stock: Number(f.stock),
        compra: Number(f.compra),
        venta: Number(f.venta),
      });
      setF({ ...vacio, idSucursal: f.idSucursal });
      aviso("Producto agregado");
    } catch (err) {
      setError(err?.response?.data?.mensaje || err?.response?.data?.error || err.message || "No se pudo guardar el producto.");
    } finally {
      setGuardando(false);
    }
  };

  const sinCatalogos = !cargando && (!tiposProducto.length || !unidadesMedida.length || !sucursales.length);

  return (
    <form onSubmit={guardar}>
      <Titulo icono={Package}>Registrar producto</Titulo>
      <div className="card">
        <h2 className="mb-3 font-semibold">Información del producto</h2>
        {sinCatalogos && <p className="mb-4 text-sm text-red-400">No se pudieron cargar tipos, unidades o sucursales activas. No es posible registrar el producto.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Código del producto" requerido><input className="input" placeholder="Ej: PRT-001" value={f.codigo} onChange={set("codigo")} /></Campo>
          <Campo label="Nombre del producto" requerido><input className="input" placeholder="Ej: Tornillo 5mm" value={f.nombre} onChange={set("nombre")} /></Campo>
          <Campo label="Tipo de producto" requerido>
            <select className="input" value={f.idTipoProducto} onChange={set("idTipoProducto")}>
              <option value="">Seleccionar tipo</option>{tiposProducto.map((tipo) => <option key={tipo.idTipoProducto} value={tipo.idTipoProducto}>{tipo.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Unidad de medida" requerido>
            <select className="input" value={f.idUnidadMedida} onChange={set("idUnidadMedida")}>
              <option value="">Seleccionar unidad</option>{unidadesMedida.map((unidad) => <option key={unidad.idUnidadMedida} value={unidad.idUnidadMedida}>{unidad.nombre}</option>)}
            </select>
          </Campo>
          {sucursales.length > 1 && (
            <Campo label="Sucursal del inventario inicial" requerido>
              <select className="input" value={f.idSucursal} onChange={set("idSucursal")}>
                <option value="">Seleccionar sucursal</option>{sucursales.map((sucursal) => <option key={sucursal.idSucursal} value={sucursal.idSucursal}>{sucursal.nombreSucursal}</option>)}
              </select>
            </Campo>
          )}
          <Campo label="Cantidad en inventario" requerido><input type="number" min="0.01" step="0.01" className="input" placeholder="Ej: 100" value={f.stock} onChange={set("stock")} /></Campo>
          <Campo label="Precio de venta" requerido><input type="number" min="0.01" step="0.01" className="input" placeholder="Ej: 15000" value={f.venta} onChange={set("venta")} /></Campo>
          <Campo label="Precio de compra" requerido><input type="number" min="0.01" step="0.01" className="input" placeholder="Ej: 10000" value={f.compra} onChange={set("compra")} /></Campo>
          <Campo label="Descripción"><textarea className="input h-20" placeholder="Escribe una breve descripción del producto..." value={f.descripcion} onChange={set("descripcion")} /></Campo>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => { setF({ ...vacio, idSucursal: f.idSucursal }); setError(""); }}>Limpiar</button>
          <button type="submit" className="btn-primary" disabled={cargando || guardando || sinCatalogos}>{guardando ? "Guardando..." : "+ Agregar producto"}</button>
        </div>
      </div>
      <Aviso />
    </form>
  );
}
