import { useState } from "react";
import { BodegaProvider, useBodega } from "./store.jsx";
import Layout from "./components/Layout.jsx";
import Inicio from "./pages/Inicio.jsx";
import RegistrarProducto from "./pages/RegistrarProducto.jsx";
import ConsultarProductos from "./pages/ConsultarProductos.jsx";
import Inventario from "./pages/Inventario.jsx";
import AjusteInventario from "./pages/AjusteInventario.jsx";
import RegistrarDanado from "./pages/RegistrarDanado.jsx";
import ConsultarDanados from "./pages/ConsultarDanados.jsx";
import MercanciaRecibida from "./pages/MercanciaRecibida.jsx";

const paginas = {
  inicio: Inicio,
  recibida: MercanciaRecibida,
  "registrar-producto": RegistrarProducto,
  "consultar-productos": ConsultarProductos,
  inventario: Inventario,
  ajuste: AjusteInventario,
  "registrar-danado": RegistrarDanado,
  "consultar-danados": ConsultarDanados,
};

function PaginaBodega({ Pagina, onNavigate }) {
  const { cargando, error, recargar } = useBodega();
  if (cargando) return <p role="status" className="text-sm text-gray-300">Cargando productos e inventario...</p>;
  if (error) {
    return (
      <div role="alert" className="card">
        <p className="text-sm text-red-400">{error}</p>
        <button className="btn-primary mt-3" onClick={recargar}>Reintentar</button>
      </div>
    );
  }
  return <Pagina onNavigate={onNavigate} />;
}

export default function BodegaApp({ onLogout }) {
  const [activePage, setActivePage] = useState("inicio");
  const Pagina = paginas[activePage] ?? Inicio;

  return (
    <BodegaProvider>
      <Layout activePage={activePage} onNavigate={setActivePage} onLogout={onLogout}>
        <PaginaBodega Pagina={Pagina} onNavigate={setActivePage} />
      </Layout>
    </BodegaProvider>
  );
}
