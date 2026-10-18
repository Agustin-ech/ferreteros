import { useState } from "react";
import { BodegaProvider } from "./store.jsx";
import Layout from "./components/Layout.jsx";
import Inicio from "./pages/Inicio.jsx";
import RegistrarProducto from "./pages/RegistrarProducto.jsx";
import ConsultarProductos from "./pages/ConsultarProductos.jsx";
import Inventario from "./pages/Inventario.jsx";
import AjusteInventario from "./pages/AjusteInventario.jsx";
import RegistrarDanado from "./pages/RegistrarDanado.jsx";
import ConsultarDanados from "./pages/ConsultarDanados.jsx";
import MercanciaRecibida from "./pages/MercanciaRecibida.jsx";
import Kardex from "./pages/Kardex.jsx";

// Panel de Bodega. Navega por estado (igual que el panel admin), sin
// react-router, así no hay que instalar nada nuevo.
// Los productos y el inventario se consultan en el backend; los registros de
// mercancía dañada y recibida siguen siendo datos locales de la maqueta.
const paginas = {
  inicio: Inicio,
  recibida: MercanciaRecibida,
  "registrar-producto": RegistrarProducto,
  "consultar-productos": ConsultarProductos,
  inventario: Inventario,
  kardex: Kardex,
  ajuste: AjusteInventario,
  "registrar-danado": RegistrarDanado,
  "consultar-danados": ConsultarDanados,
};

export default function BodegaApp({ onLogout }) {
  const [activePage, setActivePage] = useState("inicio");
  const Pagina = paginas[activePage] ?? Inicio;

  return (
    <BodegaProvider>
      <Layout activePage={activePage} onNavigate={setActivePage} onLogout={onLogout}>
        <Pagina onNavigate={setActivePage} />
      </Layout>
    </BodegaProvider>
  );
}
