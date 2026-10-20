import { Home, Truck, Package, BarChart3, TriangleAlert, History } from "lucide-react";
import RoleLayout from "../../components/RoleLayout.jsx";
import { useBodega } from "../store.jsx";
import { crearVerificador, filtrarNavegacion, MODULOS } from "../../utils/permisos";

// Cada "page" es la clave que usa BodegaApp.jsx para elegir la página.
const navigation = [
  { label: "Inicio", icon: Home, page: "inicio" },
  { label: "Ingreso de mercancía", icon: Truck, children: [{ label: "Mercancía recibida", page: "recibida", modulo: MODULOS.productos }] },
  { label: "Productos", icon: Package, children: [
    { label: "Registrar producto", page: "registrar-producto", modulo: MODULOS.productos },
    { label: "Consultar productos", page: "consultar-productos", modulo: MODULOS.productos },
  ] },
  { label: "Inventario", icon: BarChart3, defaultOpen: true, children: [
    { label: "Existencias", page: "inventario" },
    { label: "Kardex de mercancía", page: "kardex", icon: History },
    { label: "Ajuste de inventario", page: "ajuste", modulo: MODULOS.ajustes },
  ] },
  { label: "Mercancía dañada", icon: TriangleAlert, children: [
    { label: "Registrar producto dañado", page: "registrar-danado", modulo: MODULOS.mermas },
    { label: "Consultar mercancía dañada", page: "consultar-danados", modulo: MODULOS.mermas },
  ] },
];
export { navigation };

export default function Layout({ activePage, onNavigate, onLogout, children }) {
  const { cargando, nombreSucursal, modulos } = useBodega();

  return (
    <RoleLayout
      roleName="Personal de Bodega"
      localName={cargando ? "Cargando..." : nombreSucursal || "Sin sucursal asignada"}
      navigation={cargando ? navigation : filtrarNavegacion(navigation, crearVerificador(modulos))}
      activePage={activePage}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      {children}
    </RoleLayout>
  );
}
