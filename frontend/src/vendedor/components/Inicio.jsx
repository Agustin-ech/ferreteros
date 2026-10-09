import React from 'react';
import { FiShoppingCart, FiFileText, FiDollarSign, FiRefreshCw, FiArrowRight } from 'react-icons/fi';

export default function Inicio({ cambiarVista }) {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-1">¡Bienvenido, Vendedor!</h2>
                <p className="text-gray-400 text-sm">Selecciona un acceso directo para empezar la jornada</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                {/* Tarjeta 1: Nueva venta */}
                <div 
                    onClick={() => cambiarVista('nueva-venta')}
                    className="bg-[#2a2a2a] border border-[#333]/50 rounded-2xl p-6 flex flex-col justify-between hover:bg-[#F2B01E] hover:border-[#F2B01E] transition-all duration-300 group cursor-pointer"
                >
                    <div>
                        <div className="text-[#F2B01E] mb-4 bg-[#1f1f1f] w-fit p-3 rounded-xl group-hover:bg-[#D99A10] group-hover:text-white transition-colors">
                            <FiShoppingCart size={24} />
                        </div>
                        <p className="text-gray-200 text-sm mb-6">Registra ventas presenciales o telefónicas.</p>
                    </div>
                    <div className="bg-[#1f1f1f] border border-[#333]/50 rounded-xl p-4 flex items-center justify-between group-hover:bg-[#D99A10] group-hover:border-[#D99A10] transition-colors">
                        <span className="font-semibold text-sm text-white">Nueva venta</span>
                        <FiArrowRight className="text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </div>

                {/* Tarjeta 2: Ver factura/pedido */}
                <div 
                    onClick={() => cambiarVista('facturas-emitidas')}
                    className="bg-[#2a2a2a] border border-[#333]/50 rounded-2xl p-6 flex flex-col justify-between hover:bg-[#F2B01E] hover:border-[#F2B01E] transition-all duration-300 group cursor-pointer"
                >
                    <div>
                        <div className="text-[#F2B01E] mb-4 bg-[#1f1f1f] w-fit p-3 rounded-xl group-hover:bg-[#D99A10] group-hover:text-white transition-colors">
                            <FiFileText size={24} />
                        </div>
                        <p className="text-gray-200 text-sm mb-6">Consulta la factura emitida o el pedido realizado</p>
                    </div>
                    <div className="bg-[#1f1f1f] border border-[#333]/50 rounded-xl p-4 flex items-center justify-between group-hover:bg-[#D99A10] group-hover:border-[#D99A10] transition-colors">
                        <span className="font-semibold text-sm text-white">Ver factura/pedido</span>
                        <FiArrowRight className="text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </div>

                {/* Tarjeta 3: Consultar pagos */}
                <div 
                    onClick={() => cambiarVista('historial-pago')}
                    className="bg-[#2a2a2a] border border-[#333]/50 rounded-2xl p-6 flex flex-col justify-between hover:bg-[#F2B01E] hover:border-[#F2B01E] transition-all duration-300 group cursor-pointer"
                >
                    <div>
                        <div className="text-[#F2B01E] mb-4 bg-[#1f1f1f] w-fit p-3 rounded-xl group-hover:bg-[#D99A10] group-hover:text-white transition-colors">
                            <FiDollarSign size={24} />
                        </div>
                        <p className="text-gray-200 text-sm mb-6">Consulta todos los pagos y totalidad</p>
                    </div>
                    <div className="bg-[#1f1f1f] border border-[#333]/50 rounded-xl p-4 flex items-center justify-between group-hover:bg-[#D99A10] group-hover:border-[#D99A10] transition-colors">
                        <span className="font-semibold text-sm text-white">Consultar pagos</span>
                        <FiArrowRight className="text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </div>

                {/* Tarjeta 4: Consultar devolución */}
                <div 
                    onClick={() => cambiarVista('consultar-devolucion')}
                    className="bg-[#2a2a2a] border border-[#333]/50 rounded-2xl p-6 flex flex-col justify-between hover:bg-[#F2B01E] hover:border-[#F2B01E] transition-all duration-300 group cursor-pointer"
                >
                    <div>
                        <div className="text-[#F2B01E] mb-4 bg-[#1f1f1f] w-fit p-3 rounded-xl group-hover:bg-[#D99A10] group-hover:text-white transition-colors">
                            <FiRefreshCw size={24} />
                        </div>
                        <p className="text-gray-200 text-sm mb-6">Consulta y registra todos los tramites de devolucion</p>
                    </div>
                    <div className="bg-[#1f1f1f] border border-[#333]/50 rounded-xl p-4 flex items-center justify-between group-hover:bg-[#D99A10] group-hover:border-[#D99A10] transition-colors">
                        <span className="font-semibold text-sm text-white">Consultar devolucion</span>
                        <FiArrowRight className="text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </div>
        </div> 
    );
}