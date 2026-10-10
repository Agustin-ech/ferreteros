import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const hoy = () => new Date().toISOString().slice(0, 10);

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

const numero = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
};

const normalizarProducto = (producto, stockDisponible = 0) => {
  const codigo = producto.codigoSKU || producto.codigo || "";
  const nombre = producto.nombre || "";
  const tipo = producto.tipo || producto.tipo_producto?.nombre || `Tipo ${producto.idTipoProducto || 1}`;
  const categoria = producto.categoria || producto.tipo_producto?.nombre || tipo;
  const unidad = producto.unidad || producto.unidadMedida?.nombre || `Unidad ${producto.idUnidadMedida || 1}`;

  return {
    idProducto: producto.idProducto ?? null,
    codigo,
    nombre,
    tipo,
    categoria,
    marca: producto.marca || "",
    unidad,
    stock: numero(stockDisponible, producto.stock ?? 0),
    compra: numero(producto.costoUnitario ?? producto.compra ?? 0),
    venta: numero(producto.precio ?? producto.venta ?? 0),
    proveedor: producto.proveedor || "",
    estado: producto.activo === false ? "Inactivo" : "Activo",
    descripcion: producto.descripcion || "",
    idTipoProducto: producto.idTipoProducto ?? 1,
    idUnidadMedida: producto.idUnidadMedida ?? 1,
    stockMinimo: producto.stockMinimo ?? 5,
    codigoSKU: codigo,
  };
};

async function obtenerSucursalActual() {
  try {
    const { data } = await api.get("/api/auth/me");
    return Number(data?.usuario?.idSucursal ?? 1);
  } catch {
    return 1;
  }
}

export function BodegaProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [danados, setDanados] = useState(danadosIniciales);
  const [recibidos, setRecibidos] = useState(recibidosIniciales);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    const cargarDatos = async () => {
      setCargando(true);
      setError("");
      try {
        const { data: perfil } = await api.get("/api/auth/me");
        const usuario = perfil?.usuario || {};
        const rol = String(usuario.rol || "").toLowerCase();
        const sucursal = rol === "admin" ? null : Number(usuario.idSucursal || 1);

        const [productosRes, inventarioRes] = await Promise.all([
          api.get("/api/productos"),
          sucursal ? api.get("/api/inventario", { params: { sucursal } }) : api.get("/api/inventario"),
        ]);

        const inventarioPorProducto = {};
        for (const item of inventarioRes.data || []) {
          inventarioPorProducto[item.idProducto] = numero(item.cantidadDisponible, 0);
        }

        const lista = (productosRes.data || []).map((producto) =>
          normalizarProducto(producto, inventarioPorProducto[producto.idProducto] ?? 0)
        );

        if (!cancelado) setProductos(lista);
      } catch (err) {
        if (!cancelado) {
          setProductos([]);
          setError(
            err?.response?.data?.mensaje ||
            err?.response?.data?.error ||
            "No se pudieron cargar los productos e inventario del backend."
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarDatos();
    return () => {
      cancelado = true;
    };
  }, []);

  const actualizarStock = async (codigo, delta) => {
    const producto = productos.find((p) => p.codigo === codigo);
    if (!producto) return null;

    const idSucursal = await obtenerSucursalActual();
    const cantidad = Math.abs(delta);
    const operacion = delta >= 0 ? "suma" : "resta";

    const { data } = await api.post("/api/inventario/ajustar", {
      idProducto: producto.idProducto,
      idSucursal,
      cantidad,
      operacion,
    });

    const stockActual = numero(data?.inventario_actualizado?.cantidadDisponible, producto.stock + delta);
    setProductos((ps) =>
      ps.map((p) => (p.idProducto === producto.idProducto ? { ...p, stock: stockActual } : p))
    );

    return data;
  };

  const apiBodega = {
    productos,
    danados,
    recibidos,
    hoy,
    cargando,
    error,
    agregarProducto: async (p) => {
      const payload = {
        idTipoProducto: Number(p.idTipoProducto ?? 1),
        idUnidadMedida: Number(p.idUnidadMedida ?? 1),
        codigoSKU: String(p.codigo || p.codigoSKU || "").trim(),
        nombre: String(p.nombre || "").trim(),
        descripcion: p.descripcion || null,
        precio: numero(p.venta ?? p.precio, 0),
        costoUnitario: numero(p.compra ?? p.costoUnitario, 0),
        stockMinimo: Number(p.stockMinimo || 5),
      };

      const { data } = await api.post("/api/productos", payload);
      const productoNormalizado = normalizarProducto(data, 0);
      setProductos((ps) => [productoNormalizado, ...ps]);
      return productoNormalizado;
    },
    actualizarProducto: async (codigo, cambios) => {
      const producto = productos.find((p) => p.codigo === codigo);
      if (!producto) return null;

      const payload = {
        idTipoProducto: producto.idTipoProducto,
        idUnidadMedida: producto.idUnidadMedida,
        codigoSKU: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: numero(cambios.venta ?? cambios.precio ?? producto.venta, 0),
        costoUnitario: numero(cambios.compra ?? cambios.costoUnitario ?? producto.compra, 0),
      };

      const { data } = await api.put(`/api/productos/${producto.idProducto}`, payload);
      const actualizado = normalizarProducto(data, producto.stock);
      setProductos((ps) => ps.map((p) => (p.idProducto === producto.idProducto ? actualizado : p)));
      return actualizado;
    },
    eliminarProducto: (codigo) => {
      setProductos((ps) => ps.filter((p) => p.codigo !== codigo));
    },
    fijarStock: async (codigo, stock) => {
      const producto = productos.find((p) => p.codigo === codigo);
      if (!producto) return null;
      const actual = numero(producto.stock, 0);
      const nuevo = Math.max(0, numero(stock, 0));
      if (nuevo === actual) return null;
      const delta = nuevo - actual;
      return actualizarStock(codigo, delta);
    },
    agregarDanado: async (d) => {
      const producto = productos.find((p) => p.codigo === d.codigo);
      if (!producto) return null;
      const { data } = await api.post("/api/inventario/ajustar", {
        idProducto: producto.idProducto,
        idSucursal: await obtenerSucursalActual(),
        cantidad: numero(d.cantidad, 0),
        operacion: "resta",
      });

      setDanados((ds) => [{ ...d, id: Date.now(), estado: "Pendiente" }, ...ds]);
      const stockActual = numero(data?.inventario_actualizado?.cantidadDisponible, Math.max(0, producto.stock - numero(d.cantidad, 0)));
      setProductos((ps) =>
        ps.map((p) => (p.idProducto === producto.idProducto ? { ...p, stock: stockActual } : p))
      );
      return data;
    },
    alternarEstadoDanado: (id) =>
      setDanados((ds) => ds.map((d) => (d.id === id ? { ...d, estado: d.estado === "Pendiente" ? "Revisado" : "Pendiente" } : d))),
    eliminarDanado: (id) => setDanados((ds) => ds.filter((d) => d.id !== id)),
    agregarRecibido: async (r) => {
      const producto = productos.find((p) => p.codigo === r.codigo);
      if (!producto) return null;
      const { data } = await api.post("/api/inventario/ajustar", {
        idProducto: producto.idProducto,
        idSucursal: await obtenerSucursalActual(),
        cantidad: numero(r.cantidad, 0),
        operacion: "suma",
      });

      setRecibidos((rs) => [{ ...r, id: Date.now(), estado: "Recibido" }, ...rs]);
      const stockActual = numero(data?.inventario_actualizado?.cantidadDisponible, producto.stock + numero(r.cantidad, 0));
      setProductos((ps) =>
        ps.map((p) => (p.idProducto === producto.idProducto ? { ...p, stock: stockActual } : p))
      );
      return data;
    },
    reiniciarDatos: () => {
      setProductos([]);
      setDanados(danadosIniciales);
      setRecibidos(recibidosIniciales);
    },
  };

  return <Ctx.Provider value={apiBodega}>{children}</Ctx.Provider>;
}

export const dinero = (n) => "$" + Number(n || 0).toLocaleString("es-CO");
