import { Home, Truck, Package, BarChart3, TriangleAlert } from "lucide-react";
import RoleLayout from "../../components/RoleLayout.jsx";

// Cada "page" es la clave que usa BodegaApp.jsx para elegir la página.
const navigation = [
  { label: "Inicio", icon: Home, page: "inicio" },
  { label: "Ingreso de mercancía", icon: Truck, children: [{ label: "Mercancía recibida", page: "recibida" }] },
  { label: "Productos", icon: Package, children: [
    { label: "Registrar producto", page: "registrar-producto" },
    { label: "Consultar productos", page: "consultar-productos" },
  ] },
  { label: "Inventario", icon: BarChart3, defaultOpen: true, children: [
    { label: "Existencias", page: "inventario" },
    { label: "Ajuste de inventario", page: "ajuste" },
  ] },
  { label: "Mercancía dañada", icon: TriangleAlert, children: [
    { label: "Registrar producto dañado", page: "registrar-danado" },
    { label: "Consultar mercancía dañada", page: "consultar-danados" },
  ] },
];

export default function Layout({ activePage, onNavigate, onLogout, children }) {
  return (
    <RoleLayout
      roleName="Personal de Bodega"
      navigation={navigation}
      activePage={activePage}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      {children}
    </RoleLayout>
  );
}
