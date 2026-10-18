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

const normalizarProducto = (producto, stockDisponible = 0, tipos = [], unidades = []) => {
  const codigo = producto.codigoSKU || producto.codigo || "";
  const nombre = producto.nombre || "";
  const tipo = producto.tipo || producto.tipo_producto?.nombre
    || tipos.find((item) => item.idTipoProducto === producto.idTipoProducto)?.nombre || "";
  const categoria = producto.categoria || producto.tipo_producto?.nombre || tipo;
  const unidad = producto.unidad || producto.unidad_medida?.nombre
    || unidades.find((item) => item.idUnidadMedida === producto.idUnidadMedida)?.nombre || "";

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
    idTipoProducto: producto.idTipoProducto ?? null,
    idUnidadMedida: producto.idUnidadMedida ?? null,
    stockMinimo: producto.stockMinimo ?? 5,
    codigoSKU: codigo,
  };
};

export function BodegaProvider({ children }) {
  const [productos, setProductos] = useState([]);
  const [tiposProducto, setTiposProducto] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [idSucursalActual, setIdSucursalActual] = useState(null);
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

        const [productosRes, inventarioRes, catalogosRes, sucursalesRes] = await Promise.all([
          api.get("/api/productos"),
          usuario.idSucursal
            ? api.get("/api/inventario", { params: { sucursal: usuario.idSucursal } })
            : api.get("/api/inventario"),
          api.get("/api/productos/catalogos"),
          api.get("/api/sucursales", { params: { solo_activas: true } }),
        ]);

        const tipos = catalogosRes.data?.tiposProducto || [];
        const unidades = catalogosRes.data?.unidadesMedida || [];
        const sucursalesActivas = (sucursalesRes.data || []).filter((sucursal) => sucursal.activa !== false);
        const inventarioPorProducto = {};
        const productosEnSucursal = new Set();
        for (const item of inventarioRes.data || []) {
          inventarioPorProducto[item.idProducto] = numero(item.cantidadDisponible, 0);
          productosEnSucursal.add(item.idProducto);
        }

        const lista = (productosRes.data || [])
          .filter((producto) => productosEnSucursal.has(producto.idProducto))
          .map((producto) =>
            normalizarProducto(producto, inventarioPorProducto[producto.idProducto], tipos, unidades)
          );

        if (!cancelado) {
          setProductos(lista);
          setTiposProducto(tipos);
          setUnidadesMedida(unidades);
          setSucursales(sucursalesActivas);
          setIdSucursalActual(usuario.idSucursal ? Number(usuario.idSucursal) : null);
        }
      } catch (err) {
        if (!cancelado) {
          setProductos([]);
          setTiposProducto([]);
          setUnidadesMedida([]);
          setSucursales([]);
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

  const actualizarStock = async (codigo, delta, idSucursal, motivo) => {
    const producto = productos.find((p) => p.codigo === codigo);
    if (!producto) throw new Error("No se encontró el producto para ajustar su inventario.");
    if (!idSucursal) throw new Error("Selecciona una sucursal válida para ajustar el inventario.");
    if (!motivo?.trim()) throw new Error("El motivo del ajuste es obligatorio.");

    const cantidad = Math.abs(delta);
    const operacion = delta >= 0 ? "suma" : "resta";

    const { data } = await api.post("/api/inventario/ajustar", {
      idProducto: producto.idProducto,
      idSucursal,
      cantidad,
      operacion,
      motivo: motivo.trim(),
    });

    const stockActual = Number(data.inventario_actualizado?.cantidadDisponible);
    if (!Number.isFinite(stockActual)) {
      throw new Error("El backend no devolvió la cantidad de inventario actualizada.");
    }
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
    tiposProducto,
    unidadesMedida,
    sucursales,
    idSucursalActual,
    agregarProducto: async (p) => {
      const idTipoProducto = Number(p.idTipoProducto);
      const idUnidadMedida = Number(p.idUnidadMedida);
      const idSucursal = Number(p.idSucursal);
      const stock = numero(p.stock, -1);
      if (!tiposProducto.some((tipo) => tipo.idTipoProducto === idTipoProducto)) {
        throw new Error("Selecciona un tipo de producto vigente.");
      }
      if (!unidadesMedida.some((unidad) => unidad.idUnidadMedida === idUnidadMedida)) {
        throw new Error("Selecciona una unidad de medida vigente.");
      }
      if (!sucursales.some((sucursal) => sucursal.idSucursal === idSucursal)) {
        throw new Error("Selecciona una sucursal vigente para el inventario inicial.");
      }
      if (!Number.isFinite(stock) || stock <= 0) {
        throw new Error("La cantidad inicial debe ser mayor que cero para asignar el producto a la sucursal.");
      }

      const payload = {
        idTipoProducto,
        idUnidadMedida,
        codigoSKU: String(p.codigo || p.codigoSKU || "").trim(),
        nombre: String(p.nombre || "").trim(),
        descripcion: p.descripcion || null,
        precio: numero(p.venta ?? p.precio, 0),
        costoUnitario: numero(p.compra ?? p.costoUnitario, 0),
        stockMinimo: Number(p.stockMinimo || 5),
      };

      const { data } = await api.post("/api/productos", payload);
      const productoNormalizado = normalizarProducto(data, 0, tiposProducto, unidadesMedida);
      try {
        const { data: inventarioData } = await api.post("/api/inventario/ajustar", {
          idProducto: data.idProducto,
          idSucursal,
          cantidad: stock,
          operacion: "suma",
          motivo: "Inventario inicial al registrar producto",
        });
        const cantidadDisponible = Number(inventarioData.inventario_actualizado?.cantidadDisponible);
        if (!Number.isFinite(cantidadDisponible)) {
          throw new Error("El backend no devolvió la cantidad de inventario actualizada.");
        }
        const productoConStock = { ...productoNormalizado, stock: cantidadDisponible };
        setProductos((ps) => [productoConStock, ...ps]);
        return productoConStock;
      } catch (error) {
        const mensaje = error?.response?.data?.mensaje || error?.response?.data?.error || error.message;
        throw new Error(`El producto se creó, pero no se pudo registrar el stock inicial: ${mensaje}`);
      }
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
      const actualizado = normalizarProducto(data, producto.stock, tiposProducto, unidadesMedida);
      setProductos((ps) => ps.map((p) => (p.idProducto === producto.idProducto ? actualizado : p)));
      const stockNuevo = cambios.stock === undefined ? producto.stock : Number(cambios.stock);
      if (!Number.isFinite(stockNuevo) || stockNuevo < 0) {
        throw new Error("El stock debe ser un número válido mayor o igual a cero.");
      }
      if (stockNuevo !== producto.stock) {
        const respuesta = await actualizarStock(codigo, stockNuevo - producto.stock, idSucursalActual, cambios.motivo);
        return { ...actualizado, stock: Number(respuesta.inventario_actualizado.cantidadDisponible) };
      }
      return actualizado;
    },
    eliminarProducto: (codigo) => {
      setProductos((ps) => ps.filter((p) => p.codigo !== codigo));
    },
    fijarStock: async (codigo, stock, motivo) => {
      const producto = productos.find((p) => p.codigo === codigo);
      if (!producto) throw new Error("No se encontró el producto para ajustar su inventario.");
      const actual = numero(producto.stock, 0);
      const nuevo = Math.max(0, numero(stock, 0));
      if (nuevo === actual) return null;
      const delta = nuevo - actual;
      return actualizarStock(codigo, delta, idSucursalActual, motivo);
    },
    agregarDanado: async (d) => {
      const producto = productos.find((p) => p.codigo === d.codigo);
      if (!producto) return null;
      const { data } = await api.post("/api/inventario/ajustar", {
        idProducto: producto.idProducto,
        idSucursal: idSucursalActual,
        cantidad: numero(d.cantidad, 0),
        operacion: "resta",
        motivo: d.motivo || "Registro de mercancía dañada",
      });

      setDanados((ds) => [{ ...d, id: Date.now(), estado: "Pendiente" }, ...ds]);
      const stockActual = Number(data.inventario_actualizado?.cantidadDisponible);
      if (!Number.isFinite(stockActual)) {
        throw new Error("El backend no devolvió la cantidad de inventario actualizada.");
      }
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
        idSucursal: idSucursalActual,
        cantidad: numero(r.cantidad, 0),
        operacion: "suma",
        motivo: r.factura ? `Mercancía recibida, factura ${r.factura}` : "Mercancía recibida",
      });

      setRecibidos((rs) => [{ ...r, id: Date.now(), estado: "Recibido" }, ...rs]);
      const stockActual = Number(data.inventario_actualizado?.cantidadDisponible);
      if (!Number.isFinite(stockActual)) {
        throw new Error("El backend no devolvió la cantidad de inventario actualizada.");
      }
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
