// =====================================================================
// TEMPORAL-BACKEND: ARCHIVO TEMPORAL (sin backend todavía)
// Todos los datos de Bodega (productos, mercancía dañada, mercancía
// recibida) viven aquí: datos de prueba + estado de React + localStorage.
// Cuando el backend esté listo hay que:
//  - Borrar productosIniciales / danadosIniciales / recibidosIniciales.
//  - Reemplazar cada función de `api` (agregarProducto, agregarDanado,
//    ajustar stock, etc.) por una llamada al backend (src/api/client.js)
//    y volver a cargar la lista desde el servidor.
//  - Quitar useGuardado (localStorage) y reiniciarDatos.
//  - Que el backend descuente/sume el stock (hoy lo hace ajustarStock aquí).
// Buscar "TEMPORAL-BACKEND" en el proyecto para ver todo lo pendiente.
// =====================================================================
import { createContext, useContext, useEffect, useState } from "react";

const hoy = () => new Date().toISOString().slice(0, 10);

const productosIniciales = [
  { codigo: "PRT-001", nombre: "Tornillo 5mm", tipo: "Ferretería", categoria: "Tornillos", marca: "Fixer", unidad: "Unidad", stock: 120, compra: 900, venta: 1500, proveedor: "Ferretería La 15", estado: "Activo", descripcion: "" },
  { codigo: "PRT-002", nombre: "Cemento gris", tipo: "Construcción", categoria: "Cemento", marca: "Argos", unidad: "Saco", stock: 25, compra: 18000, venta: 22000, proveedor: "Ferretería La 15", estado: "Activo", descripcion: "" },
  { codigo: "PRT-003", nombre: "Pintura blanca", tipo: "Pinturas", categoria: "Pinturas", marca: "Pintuco", unidad: "Galón", stock: 45, compra: 36000, venta: 45000, proveedor: "Pintuco SA", estado: "Activo", descripcion: "" },
  { codigo: "PRT-004", nombre: "Cable eléctrico", tipo: "Electricidad", categoria: "Cables", marca: "Centelsa", unidad: "Metro", stock: 80, compra: 2500, venta: 3500, proveedor: "Electrocables", estado: "Activo", descripcion: "" },
  { codigo: "PRT-005", nombre: "Martillo 16oz", tipo: "Herramientas", categoria: "Herramientas", marca: "Tramontina", unidad: "Unidad", stock: 12, compra: 20000, venta: 28000, proveedor: "Ferretería La 15", estado: "Activo", descripcion: "" },
  { codigo: "PRT-006", nombre: "Taladro 1/2\"", tipo: "Herramientas", categoria: "Herramientas", marca: "Bosch", unidad: "Unidad", stock: 8, compra: 140000, venta: 180000, proveedor: "Ferretería La 15", estado: "Activo", descripcion: "" },
  { codigo: "PRT-007", nombre: "Disco de corte", tipo: "Herramientas", categoria: "Herramientas", marca: "Norton", unidad: "Unidad", stock: 30, compra: 9000, venta: 12000, proveedor: "Ferretería La 15", estado: "Activo", descripcion: "" },
  { codigo: "PRT-008", nombre: "Pintura negra", tipo: "Pinturas", categoria: "Pinturas", marca: "Pintuco", unidad: "Galón", stock: 18, compra: 33000, venta: 42000, proveedor: "Pintuco SA", estado: "Activo", descripcion: "" },
  { codigo: "PRT-009", nombre: "Tubo PVC 1/2\"", tipo: "Plomería", categoria: "Plomería", marca: "Pavco", unidad: "Unidad", stock: 60, compra: 6000, venta: 8500, proveedor: "Pavco", estado: "Activo", descripcion: "" },
  { codigo: "PRT-010", nombre: "Llave de paso", tipo: "Plomería", categoria: "Plomería", marca: "Grival", unidad: "Unidad", stock: 6, compra: 12000, venta: 17000, proveedor: "Pavco", estado: "Activo", descripcion: "" },
];

const danadosIniciales = [
  { id: 1, fecha: "2026-09-10", codigo: "PRT-005", producto: "Martillo 16oz", cantidad: 2, motivo: "Producto roto", descripcion: "Cabeza dañada", estado: "Pendiente" },
  { id: 2, fecha: "2026-09-09", codigo: "PRT-003", producto: "Pintura blanca", cantidad: 3, motivo: "Caja dañada", descripcion: "Caja rota", estado: "Pendiente" },
  { id: 3, fecha: "2026-09-08", codigo: "PRT-001", producto: "Tornillo 5mm", cantidad: 10, motivo: "Faltantes", descripcion: "No vino la cantidad completa", estado: "Revisado" },
];

const recibidosIniciales = [
  { id: 1, fecha: "2026-09-10", factura: "FAC-0891", codigo: "PRT-001", producto: "Tornillo 5mm", cantidad: 100, proveedor: "Ferretería La 15", estado: "Recibido" },
  { id: 2, fecha: "2026-09-09", factura: "FAC-0887", codigo: "PRT-002", producto: "Cemento gris", cantidad: 40, proveedor: "Ferretería La 15", estado: "Recibido" },
  { id: 3, fecha: "2026-09-08", factura: "FAC-0880", codigo: "PRT-003", producto: "Pintura blanca", cantidad: 20, proveedor: "Pintuco SA", estado: "Recibido" },
];

const Ctx = createContext(null);
export const useBodega = () => useContext(Ctx);

// Guarda en localStorage para que los datos sobrevivan al recargar (sustituto temporal del backend)
function useGuardado(clave, inicial) {
  const [valor, setValor] = useState(() => {
    try { return JSON.parse(localStorage.getItem(clave)) ?? inicial; } catch { return inicial; }
  });
  useEffect(() => { localStorage.setItem(clave, JSON.stringify(valor)); }, [clave, valor]);
  return [valor, setValor];
}

export function BodegaProvider({ children }) {
  const [productos, setProductos] = useGuardado("bodega_productos", productosIniciales);
  const [danados, setDanados] = useGuardado("bodega_danados", danadosIniciales);
  const [recibidos, setRecibidos] = useGuardado("bodega_recibidos", recibidosIniciales);

  const ajustarStock = (codigo, delta) =>
    setProductos((ps) => ps.map((p) => (p.codigo === codigo ? { ...p, stock: Math.max(0, p.stock + delta) } : p)));

  const api = {
    productos, danados, recibidos, hoy,
    agregarProducto: (p) => setProductos((ps) => [p, ...ps]),
    actualizarProducto: (codigo, cambios) => setProductos((ps) => ps.map((p) => (p.codigo === codigo ? { ...p, ...cambios } : p))),
    eliminarProducto: (codigo) => setProductos((ps) => ps.filter((p) => p.codigo !== codigo)),
    fijarStock: (codigo, stock) => setProductos((ps) => ps.map((p) => (p.codigo === codigo ? { ...p, stock } : p))),
    agregarDanado: (d) => {
      setDanados((ds) => [{ ...d, id: Date.now(), estado: "Pendiente" }, ...ds]);
      ajustarStock(d.codigo, -d.cantidad);
    },
    alternarEstadoDanado: (id) =>
      setDanados((ds) => ds.map((d) => (d.id === id ? { ...d, estado: d.estado === "Pendiente" ? "Revisado" : "Pendiente" } : d))),
    eliminarDanado: (id) => setDanados((ds) => ds.filter((d) => d.id !== id)),
    agregarRecibido: (r) => {
      setRecibidos((rs) => [{ ...r, id: Date.now(), estado: "Recibido" }, ...rs]);
      ajustarStock(r.codigo, r.cantidad);
    },
    reiniciarDatos: () => { setProductos(productosIniciales); setDanados(danadosIniciales); setRecibidos(recibidosIniciales); },
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const dinero = (n) => "$" + Number(n || 0).toLocaleString("es-CO");
