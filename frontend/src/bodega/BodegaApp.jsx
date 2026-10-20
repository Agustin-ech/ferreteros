import { useState } from "react";
import { BodegaProvider, useBodega } from "./store.jsx";
import Layout, { navigation } from "./components/Layout.jsx";
import { crearVerificador, moduloDePagina } from "../utils/permisos";
import Inicio from "./pages/Inicio.jsx";
import RegistrarProducto from "./pages/RegistrarProducto.jsx";
import ConsultarProductos from "./pages/ConsultarProductos.jsx";
import Inventario from "./pages/Inventario.jsx";
import AjusteInventario from "./pages/AjusteInventario.jsx";
import RegistrarDanado from "./pages/RegistrarDanado.jsx";
import ConsultarDanados from "./pages/ConsultarDanados.jsx";
import MercanciaRecibida from "./pages/MercanciaRecibida.jsx";
import Kardex from "./pages/Kardex.jsx";

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

const moduloPorPagina = moduloDePagina(navigation);

function PaginaBodega({ Pagina, pagina, onNavigate }) {
  const { cargando, error, recargar, modulos } = useBodega();
  if (cargando) return <p role="status" className="text-sm text-gray-300">Cargando productos e inventario...</p>;
  if (error) {
    return (
      <div role="alert" className="card">
        <p className="text-sm text-red-400">{error}</p>
        <button className="btn-primary mt-3" onClick={recargar}>Reintentar</button>
      </div>
    );
  }
  if (!crearVerificador(modulos)(moduloPorPagina[pagina])) return <div role="alert" className="card p-6 text-sm text-gray-300">Tu rol no tiene permiso para esta sección. Pide al administrador que lo active en Roles y permisos.</div>;
  return <Pagina onNavigate={onNavigate} />;
}

export default function BodegaApp({ onLogout }) {
  const [activePage, setActivePage] = useState("inicio");
  const Pagina = paginas[activePage] ?? Inicio;

  return (
    <BodegaProvider>
      <Layout activePage={activePage} onNavigate={setActivePage} onLogout={onLogout}>
        <PaginaBodega Pagina={Pagina} pagina={activePage} onNavigate={setActivePage} />
      </Layout>
    </BodegaProvider>
  );
}
