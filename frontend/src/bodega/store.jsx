import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../api/client";
import { errorMessage } from "../api/client";

// Fecha local (no UTC): con toISOString() después de las 7 p. m. en
// Colombia ya saldría el día siguiente.
const hoy = () => {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const inicioConsultaDanados = () => {
  const fecha = new Date();
  fecha.setUTCFullYear(fecha.getUTCFullYear() - 5);
  return fecha.toISOString().slice(0, 10);
};

const Ctx = createContext(null);
export const useBodega = () => useContext(Ctx);

const numero = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
};

const mensajeError = errorMessage;

const normalizarDanado = (registro) => ({
  ...registro,
  id: registro.idMercanciaDanada,
  fecha: registro.fecha?.slice(0, 10) || "",
  codigo: registro.codigo || "",
  producto: registro.producto || "",
  motivo: registro.tipoDanio || "",
});

const normalizarRecibido = (registro) => ({
  ...registro,
  id: registro.idMercanciaRecibida,
  fecha: registro.fecha?.slice(0, 10) || "",
  cantidad: numero(registro.cantidad, 0),
});

const normalizarProducto = (producto, stockDisponible = 0, tipos = [], unidades = []) => {
  const codigo = producto.codigoSKU || producto.codigo || "";
  const nombre = producto.nombre || "";
  const tipo = producto.tipo || tipos.find((item) => item.idTipoProducto === producto.idTipoProducto)?.nombre || "";
  const unidad = producto.unidad || unidades.find((item) => item.idUnidadMedida === producto.idUnidadMedida)?.nombre || "";

  return {
    idProducto: producto.idProducto ?? null,
    codigo,
    nombre,
    tipo,
    categoria: tipo,
    marca: "",
    unidad,
    stock: numero(stockDisponible, producto.stock ?? 0),
    compra: numero(producto.costoUnitario ?? producto.compra ?? 0),
    venta: numero(producto.precio ?? producto.venta ?? 0),
    proveedor: "",
    estado: producto.activo === false ? "Inactivo" : "Activo",
    descripcion: producto.descripcion || "",
    idTipoProducto: producto.idTipoProducto,
    idUnidadMedida: producto.idUnidadMedida,
    stockMinimo: producto.stockMinimo ?? 5,
    codigoSKU: codigo,
    activo: producto.activo !== false,
  };
};

export function BodegaProvider({ children }) {
  // productos: solo los que tienen inventario en la sucursal de bodega.
  // catalogoProductos: todo el catálogo, para validar códigos y para recibir
  // mercancía de un producto que la sucursal aún no maneja.
  const [productos, setProductos] = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [tiposProducto, setTiposProducto] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [idSucursal, setIdSucursal] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [nombreSucursal, setNombreSucursal] = useState("");
  const [danados, setDanados] = useState([]);
  const [danadosTotal, setDanadosTotal] = useState(0);
  const [danadosCargando, setDanadosCargando] = useState(false);
  const [danadosError, setDanadosError] = useState("");
  const [tiposDanio, setTiposDanio] = useState([]);
  const [tiposDanioError, setTiposDanioError] = useState("");
  const [recibidos, setRecibidos] = useState([]);
  const [recibidosCargando, setRecibidosCargando] = useState(false);
  const [recibidosError, setRecibidosError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDanados = useCallback(async (pagina = 1, buscar = "", sucursal = idSucursal) => {
    setDanadosCargando(true);
    setDanadosError("");
    try {
      const params = {
        pagina,
        por_pagina: 5,
        desde: inicioConsultaDanados(),
        hasta: hoy(),
        buscar: buscar.trim() || undefined,
      };
      if (sucursal) params.sucursal_id = sucursal;
      const { data } = await api.get("/api/v1/mercancia-danada", { params });
      setDanados((data.datos || []).map(normalizarDanado));
      setDanadosTotal(data.paginacion?.total || 0);
    } catch (err) {
      setDanadosError(mensajeError(err, "No se pudo cargar la mercancía dañada."));
    } finally {
      setDanadosCargando(false);
    }
  }, [idSucursal]);

  const cargarTiposDanio = useCallback(async () => {
    setTiposDanioError("");
    try {
      const { data } = await api.get("/api/v1/mercancia-danada/tipos-danio");
      setTiposDanio(data || []);
    } catch (err) {
      setTiposDanioError(mensajeError(err, "No se pudieron cargar los tipos de daño."));
    }
  }, []);

  const cargarRecibidos = useCallback(async () => {
    setRecibidosCargando(true);
    setRecibidosError("");
    try {
      const { data } = await api.get("/api/v1/mercancia-recibida");
      setRecibidos((data || []).map(normalizarRecibido));
    } catch (err) {
      setRecibidosError(mensajeError(err, "No se pudieron cargar los ingresos de mercancía."));
    } finally {
      setRecibidosCargando(false);
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");
    setNombreSucursal("");
    try {
      const { data: perfil } = await api.get("/api/auth/me");
      const usuario = perfil?.usuario || {};
      const sucursalUsuario = Number(usuario.idSucursal);
      const sucursal = Number.isInteger(sucursalUsuario) && sucursalUsuario > 0
        ? sucursalUsuario
        : null;
      setIdSucursal(sucursal);
      const modulosUsuario = usuario.modulos || [];
      setModulos(modulosUsuario);

      const [productosRes, inventarioRes, catalogosRes, sucursalRes] = await Promise.all([
        api.get("/api/productos", { params: { incluirInactivos: true } }),
        sucursal
          ? api.get("/api/inventario", { params: { sucursal } })
          : api.get("/api/inventario"),
        api.get("/api/productos/catalogos"),
        sucursal ? api.get(`/api/sucursales/${sucursal}`) : Promise.resolve(null),
      ]);
      const tipos = catalogosRes.data?.tipos || [];
      const unidades = catalogosRes.data?.unidades || [];
      const inventarioPorProducto = {};
      for (const item of (inventarioRes.data || []).filter((item) => item.activo !== false)) {
        inventarioPorProducto[item.idProducto] =
          (inventarioPorProducto[item.idProducto] || 0) + numero(item.cantidadDisponible, 0);
      }

      setTiposProducto(tipos);
      setUnidadesMedida(unidades);
      setNombreSucursal(sucursalRes?.data?.nombreSucursal || "");
      const catalogo = (productosRes.data || []).map((producto) =>
        normalizarProducto(producto, inventarioPorProducto[producto.idProducto] ?? 0, tipos, unidades)
      );
      setCatalogoProductos(catalogo);
      setProductos(catalogo.filter((producto) => producto.idProducto in inventarioPorProducto));
      // Sin el permiso, el backend responde 403: no se piden para no romper la carga.
      if (modulosUsuario.includes("MERMAS")) {
        await cargarDanados(1, "", sucursal);
        await cargarTiposDanio();
      }
      if (modulosUsuario.includes("PRODUCTOS")) await cargarRecibidos();
    } catch (err) {
      setError(mensajeError(err, "No se pudieron cargar los productos e inventario del backend."));
    } finally {
      setCargando(false);
    }
  }, [cargarDanados, cargarTiposDanio, cargarRecibidos]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const actualizarStock = async (codigo, delta, motivo, productoOverride = null) => {
    const producto = productoOverride || productos.find((p) => p.codigo === codigo);
    if (!producto) throw new Error("No se encontró el producto seleccionado.");
    if (!idSucursal) throw new Error("No hay una sucursal asignada para registrar el ajuste.");
    if (!motivo?.trim()) throw new Error("Escribe el motivo del ajuste.");

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
    catalogoProductos,
    tiposProducto,
    unidadesMedida,
    idSucursal,
    modulos,
    nombreSucursal,
    danados,
    danadosTotal,
    danadosCargando,
    danadosError,
    cargarDanados,
    tiposDanio,
    tiposDanioError,
    cargarTiposDanio,
    recibidos,
    recibidosCargando,
    recibidosError,
    cargarRecibidos,
    hoy,
    cargando,
    error,
    recargar: cargarDatos,
    agregarProducto: async (p) => {
      const idTipoProducto = Number(p.idTipoProducto);
      const idUnidadMedida = Number(p.idUnidadMedida);
      if (!tiposProducto.some((tipo) => tipo.idTipoProducto === idTipoProducto)) {
        throw new Error("Selecciona un tipo de producto vigente.");
      }
      if (!unidadesMedida.some((unidad) => unidad.idUnidadMedida === idUnidadMedida)) {
        throw new Error("Selecciona una unidad de medida vigente.");
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
        activo: p.estado !== "Inactivo",
      };

      const { data } = await api.post("/api/productos", payload);
      const productoNormalizado = normalizarProducto(data, 0, tiposProducto, unidadesMedida);
      setProductos((ps) => [productoNormalizado, ...ps]);
      setCatalogoProductos((ps) => [productoNormalizado, ...ps]);
      const stockInicial = numero(p.stock, 0);
      if (stockInicial > 0) {
        try {
          await actualizarStock(
            productoNormalizado.codigo,
            stockInicial,
            "Stock inicial al registrar producto",
            productoNormalizado
          );
        } catch (err) {
          const detalle = err?.response?.data?.mensaje || err?.response?.data?.error || err.message;
          throw new Error(`El producto se creó, pero no se pudo registrar su stock inicial: ${detalle}`);
        }
      }
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
        activo: cambios.estado ? cambios.estado !== "Inactivo" : producto.activo,
      };

      const { data } = await api.put(`/api/productos/${producto.idProducto}`, payload);
      const actualizado = normalizarProducto(data, producto.stock, tiposProducto, unidadesMedida);
      setProductos((ps) => ps.map((p) => (p.idProducto === producto.idProducto ? actualizado : p)));
      const stockNuevo = cambios.stock === undefined ? producto.stock : Number(cambios.stock);
      if (!Number.isFinite(stockNuevo) || stockNuevo < 0) {
        throw new Error("El stock debe ser un número válido mayor o igual a cero.");
      }
      if (stockNuevo !== producto.stock) {
        const respuesta = await actualizarStock(codigo, stockNuevo - producto.stock, cambios.motivo, actualizado);
        return { ...actualizado, stock: Number(respuesta.inventario_actualizado.cantidadDisponible) };
      }
      return actualizado;
    },
    eliminarProducto: async (codigo) => {
      const producto = productos.find((p) => p.codigo === codigo);
      if (!producto) throw new Error("No se encontró el producto seleccionado.");
      const { data } = await api.delete(`/api/productos/${producto.idProducto}`);
      const actualizado = normalizarProducto(data, producto.stock, tiposProducto, unidadesMedida);
      setProductos((ps) => ps.map((p) => (p.idProducto === producto.idProducto ? actualizado : p)));
      return actualizado;
    },
    fijarStock: async (codigo, stock, motivo) => {
      const producto = productos.find((p) => p.codigo === codigo);
      if (!producto) throw new Error("No se encontró el producto para ajustar su inventario.");
      const actual = numero(producto.stock, 0);
      const nuevo = Math.max(0, numero(stock, 0));
      if (nuevo === actual) return null;
      const delta = nuevo - actual;
      return actualizarStock(codigo, delta, motivo);
    },
    agregarDanado: async (d) => {
      const producto = productos.find((p) => p.codigo === d.codigo);
      if (!producto) throw new Error("No se encontró el producto seleccionado.");
      if (!idSucursal) throw new Error("No hay una sucursal asignada para registrar la salida.");
      const { data } = await api.post("/api/v1/mercancia-danada", {
        idProducto: producto.idProducto,
        idSucursal,
        idTipoDanio: Number(d.idTipoDanio),
        cantidad: numero(d.cantidad, 0),
        fecha: `${d.fecha}T12:00:00`,
        descripcion: d.descripcion.trim(),
      });

      setDanados((ds) => [normalizarDanado(data), ...ds].slice(0, 5));
      setDanadosTotal((total) => total + 1);
      const stockActual = numero(data.existenciasRestantes, Math.max(0, producto.stock - numero(d.cantidad, 0)));
      setProductos((ps) =>
        ps.map((p) => (p.idProducto === producto.idProducto ? { ...p, stock: stockActual } : p))
      );
      return data;
    },
    cambiarEstadoDanado: async (id, estado) => {
      const { data } = await api.patch(`/api/v1/mercancia-danada/${id}/estado`, { estado });
      setDanados((ds) => ds.map((d) => (d.id === id ? normalizarDanado(data) : d)));
      if (data.existenciasActuales !== undefined) {
        const registro = danados.find((d) => d.id === id);
        setProductos((ps) => ps.map((p) =>
          p.idProducto === registro?.idProducto
            ? { ...p, stock: numero(data.existenciasActuales, p.stock) }
            : p
        ));
      }
      return data;
    },
    eliminarDanado: async (id) => {
      const { data } = await api.delete(`/api/v1/mercancia-danada/${id}`);
      const registro = danados.find((d) => d.id === id);
      setDanados((ds) => ds.filter((d) => d.id !== id));
      setDanadosTotal((total) => Math.max(0, total - 1));
      setProductos((ps) => ps.map((p) =>
        p.idProducto === registro?.idProducto
          ? { ...p, stock: numero(data.existenciasActuales, p.stock) }
          : p
      ));
      return data;
    },
    agregarRecibido: async (r) => {
      const producto = catalogoProductos.find((p) => p.codigo === r.codigo);
      if (!producto) throw new Error("No se encontró el producto seleccionado.");
      if (!idSucursal) throw new Error("No hay una sucursal asignada para registrar el ingreso.");
      const { data } = await api.post("/api/v1/mercancia-recibida", {
        idProducto: producto.idProducto,
        idSucursal,
        cantidad: numero(r.cantidad, 0),
        fecha: r.fecha,
        factura: r.factura,
        proveedor: r.proveedor,
      });

      setRecibidos((rs) => [normalizarRecibido(data), ...rs]);
      setRecibidosError("");
      const actual = productos.find((p) => p.idProducto === producto.idProducto);
      const stockActual = numero(data?.existenciasRestantes, (actual?.stock ?? 0) + numero(r.cantidad, 0));
      // Si la sucursal no manejaba el producto, a partir de este ingreso queda asociado.
      setProductos((ps) => (actual
        ? ps.map((p) => (p.idProducto === producto.idProducto ? { ...p, stock: stockActual } : p))
        : [{ ...producto, stock: stockActual }, ...ps]));
      return data;
    },
    reiniciarDatos: () => {
      setProductos([]);
      setCatalogoProductos([]);
      setDanados([]);
      setDanadosTotal(0);
      setRecibidos([]);
    },
  };

  return <Ctx.Provider value={apiBodega}>{children}</Ctx.Provider>;
}

export const dinero = (n) => "$" + Number(n || 0).toLocaleString("es-CO");
