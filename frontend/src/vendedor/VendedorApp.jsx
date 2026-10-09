// Panel del Vendedor (proyecto "Proyectoff" integrado). Navega por estado.
// TEMPORAL-BACKEND: el panel usa datos de ejemplo dentro de cada componente
// (src/vendedor/components/*). Cuando el backend esté listo, reemplazarlos por
// llamadas a la API (ventas, facturas, pagos y devoluciones).
// Nota: este panel usaba react-icons (se agregó al package.json del proyecto unido).
import React, { useState } from 'react';
import { 
  FiHome, FiShoppingCart, FiFileText, FiDollarSign, 
  FiRefreshCw, FiSearch, FiBell, FiChevronDown, FiChevronRight, FiLogOut, FiUser
} from 'react-icons/fi';

import logo from '../assets/logo.png';
import Inicio from './components/Inicio';
import ConsultarDevolucion from './components/ConsultarDevolucion';
import FiltroVentas from './components/FiltroVentas';
import HistorialPago from './components/HistorialPago';
import FacturasEmitidas from './components/FacturasEmitidas';
import RegistrarDevolucion from './components/RegistrarDevolucion';
import VentasDelDia from './components/VentasDelDia';
import NuevaVenta from './components/NuevaVenta';

export default function VendedorApp({ onLogout }) {
  const [visitaActual, setVisitaActual] = useState('inicio');

  const [openVentas, setOpenVentas] = useState(false);
  const [openFacturas, setOpenFacturas] = useState(false);
  const [openPagos, setOpenPagos] = useState(false);
  const [openDevoluciones, setOpenDevoluciones] = useState(false);

  const renderizarVisita = () => {
    switch (visitaActual) {
      case 'inicio': return <Inicio cambiarVista={setVisitaActual} />;
      case 'nueva-venta': return <NuevaVenta />;
      case 'ventas-del-dia': return <VentasDelDia />;
      case 'filtro-ventas': return <FiltroVentas />;
      case 'facturas-emitidas': return <FacturasEmitidas />;
      case 'historial-pago': return <HistorialPago />;
      case 'registrar-devolucion': return <RegistrarDevolucion />;
      case 'consultar-devolucion': return <ConsultarDevolucion />;
      default: return <Inicio cambiarVista={setVisitaActual} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#141414] text-white overflow-hidden">
      
      {/* 1. BARRA LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col justify-between p-4 overflow-y-auto">
        <div>
          <div className="flex flex-col items-center text-center mb-6 pt-4">
            <img src={logo} alt="Logo Ferretería" className="w-16 h-16 rounded-full object-cover mb-3 bg-gray-700" /> 
            <h1 className="font-bold text-base tracking-wider text-white">Ferretería</h1>
            <h1 className="font-bold text-base tracking-wider text-white">Ferreteros S.A.</h1>
          </div>
          <hr className="border-[#F2B01E] mb-6 mx-2" />

          {/* Menú de Navegación */}
          <div className="text-xs text-gray-400 font-semibold mb-3 px-2 uppercase tracking-wider">Menu</div>
          <nav className="space-y-1">
            <div onClick={() => setVisitaActual('inicio')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#2a2a2a] text-white font-medium text-sm cursor-pointer">
              <FiHome /> Inicio
            </div>
            
            {/* Ventas (Desplegable) */}
            <div className="pt-1">
              <div 
                onClick={() => setOpenVentas(!openVentas)}
                className="flex items-center justify-between px-3 py-2 text-gray-300 hover:bg-[#1a1a1a] rounded-lg cursor-pointer text-sm select-none"
              >
                <span className="flex items-center gap-3">
                  <FiShoppingCart className={openVentas ? "text-white" : "text-[#F2B01E]"}/> Ventas</span>
                {openVentas ? <FiChevronDown className="text-xs text-gray-400" /> : <FiChevronRight className="text-xs text-gray-400" />}
              </div>

              {openVentas && (
                <div className="pl-9 space-y-1 mt-1 text-xs text-gray-400">
                  <div onClick={() => setVisitaActual('nueva-venta')} className="cursor-pointer block py-1.5 hover:text-white transition-colors">Nueva venta</div>
                  <div onClick={() => setVisitaActual('ventas-del-dia')} className="cursor-pointer block py-1.5 hover:text-white transition-colors">Ventas del día</div>
                  <div onClick={() => setVisitaActual('filtro-ventas')} className="cursor-pointer block py-1.5 hover:text-white transition-colors">Filtro de ventas</div>
                </div>
              )}
            </div>

            {/* Facturas y pedidos (Desplegable) */}
            <div className="pt-1">
              <div 
                onClick={() => setOpenFacturas(!openFacturas)}
                className="flex items-center justify-between px-3 py-2 text-gray-300 hover:bg-[#1a1a1a] rounded-lg cursor-pointer text-sm select-none"
              >
                <span className="flex items-center gap-3">
                  <FiFileText className={openFacturas ? "text-white" : "text-[#F2B01E]"} /> Facturas y pedidos
                </span>
                {openFacturas ? <FiChevronDown className="text-xs text-gray-400" /> : <FiChevronRight className="text-xs text-gray-400" />}
              </div>

              {openFacturas && (
                <div className="pl-9 space-y-1 mt-1 text-xs text-gray-400">
                  <div onClick={() => setVisitaActual('facturas-emitidas')} className="cursor-pointer block py-1.5 hover:text-white transition-colors">Facturas emitidas</div>
                </div>
              )}
            </div>

            {/* Pagos (Desplegable) */}
            <div className="pt-1">
              <div 
                onClick={() => setOpenPagos(!openPagos)}
                className="flex items-center justify-between px-3 py-2 text-gray-300 hover:bg-[#1a1a1a] rounded-lg cursor-pointer text-sm select-none"
              >
                <span className="flex items-center gap-3">
                  <FiDollarSign className={openPagos ? "text-white" : "text-[#F2B01E]"} /> Pagos
                </span>
                {openPagos ? <FiChevronDown className="text-xs text-gray-400" /> : <FiChevronRight className="text-xs text-gray-400" />}
              </div>

              {openPagos && (
                <div className="pl-9 space-y-1 mt-1 text-xs text-gray-400">
                  <div onClick={() => setVisitaActual('historial-pago')} className="cursor-pointer block py-1.5 hover:text-white transition-colors">Historial de pago</div>
                </div>
              )}
            </div>

            {/* Devoluciones (Desplegable) */}
            <div className="pt-1">
              <div 
                onClick={() => setOpenDevoluciones(!openDevoluciones)}
                className="flex items-center justify-between px-3 py-2 text-gray-300 hover:bg-[#1a1a1a] rounded-lg cursor-pointer text-sm select-none"
              >
                <span className="flex items-center gap-3">
                  <FiRefreshCw className={openDevoluciones ? "text-white" : "text-[#F2B01E]"} /> Devoluciones
                </span>
                {openDevoluciones ? <FiChevronDown className="text-xs text-gray-400" /> : <FiChevronRight className="text-xs text-gray-400" />}
              </div>

              {openDevoluciones && (
                <div className="pl-9 space-y-1 mt-1 text-xs text-gray-400">
                  <div onClick={() => setVisitaActual('registrar-devolucion')} className="cursor-pointer block py-1.5 hover:text-white transition-colors">Registrar devolución</div>
                  <div onClick={() => setVisitaActual('consultar-devolucion')} className="cursor-pointer block py-1.5 hover:text-white transition-colors">Consultar devolución</div>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="border-[#F2B01E] pt-4">
          <hr className="border-[#F2B01E] mb-6 mx-2" />
          <div onClick={onLogout} className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-red-400 transition-colors cursor-pointer">
            <FiLogOut /> Cerrar sesión
          </div>
        </div>
      </aside>

      {/* HEADER Y TARJETAS */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        
        {/* Barra superior */}
        <header className="h-16 border-b border-[#2a2a2a] flex items-center justify-between px-8 bg-[#1a1a1a]">
          <div className="relative w-96">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar productos, facturas, pedidos..." 
              className="w-full bg-[#ffffff] border border-[#333] rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-gray-500 text-black placeholder-gray-500"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-300 bg-[#232323] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
              <span className="text-xs text-gray-500">Local:</span>
              <span className="font-semibold text-gray-200">La chinita</span>
            </div>
            <div className="relative cursor-pointer text-gray-300 hover:text-white">
              <FiBell size={20} />
              <span className="absolute -top-1 -right-1 bg-[#F2B01E] text-white text-[5px] w-2 h-2 rounded-full flex items-center justify-center font-bold"></span>
            </div>
            <div className="flex items-center gap-3 cursor-pointer text-gray-300 hover:text-white">
              <FiUser size={20} />
              <span className="text-sm font-medium">Vendedor</span>
              <FiChevronDown className="text-xs text-gray-400" />
            </div>
          </div>
        </header>

        {/* Contenedor dinámico */}
        <main className="flex-1 p-6 bg-[#141414] overflow-y-auto">
          {renderizarVisita()}
        </main>
      </div>
    </div>
  );
}