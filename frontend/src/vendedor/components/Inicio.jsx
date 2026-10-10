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
                    className="bg-panel-card border border-panel-border rounded-xl p-5 flex flex-col justify-between hover:border-brand-yellow transition-colors group cursor-pointer"
                >
                    <div>
                        <div className="text-brand-yellow mb-4 bg-panel-bg w-fit p-3 rounded-lg">
                            <FiShoppingCart size={24} />
                        </div>
                        <p className="text-gray-200 text-sm mb-6">Registra ventas presenciales o telefónicas.</p>
                    </div>
                    <div className="bg-panel-bg border border-panel-border rounded-lg p-3 flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">Nueva venta</span>
                        <FiArrowRight className="text-gray-400 transition-transform group-hover:translate-x-1" />
                    </div>
                </div>

                {/* Tarjeta 2: Ver factura/pedido */}
                <div 
                    onClick={() => cambiarVista('facturas-emitidas')}
                    className="bg-panel-card border border-panel-border rounded-xl p-5 flex flex-col justify-between hover:border-brand-yellow transition-colors group cursor-pointer"
                >
                    <div>
                        <div className="text-brand-yellow mb-4 bg-panel-bg w-fit p-3 rounded-lg">
                            <FiFileText size={24} />
                        </div>
                        <p className="text-gray-200 text-sm mb-6">Consulta la factura emitida o el pedido realizado</p>
                    </div>
                    <div className="bg-panel-bg border border-panel-border rounded-lg p-3 flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">Ver factura/pedido</span>
                        <FiArrowRight className="text-gray-400 transition-transform group-hover:translate-x-1" />
                    </div>
                </div>

                {/* Tarjeta 3: Consultar pagos */}
                <div 
                    onClick={() => cambiarVista('historial-pago')}
                    className="bg-panel-card border border-panel-border rounded-xl p-5 flex flex-col justify-between hover:border-brand-yellow transition-colors group cursor-pointer"
                >
                    <div>
                        <div className="text-brand-yellow mb-4 bg-panel-bg w-fit p-3 rounded-lg">
                            <FiDollarSign size={24} />
                        </div>
                        <p className="text-gray-200 text-sm mb-6">Consulta todos los pagos y totalidad</p>
                    </div>
                    <div className="bg-panel-bg border border-panel-border rounded-lg p-3 flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">Consultar pagos</span>
                        <FiArrowRight className="text-gray-400 transition-transform group-hover:translate-x-1" />
                    </div>
                </div>

                {/* Tarjeta 4: Consultar devolución */}
                <div 
                    onClick={() => cambiarVista('consultar-devolucion')}
                    className="bg-panel-card border border-panel-border rounded-xl p-5 flex flex-col justify-between hover:border-brand-yellow transition-colors group cursor-pointer"
                >
                    <div>
                        <div className="text-brand-yellow mb-4 bg-panel-bg w-fit p-3 rounded-lg">
                            <FiRefreshCw size={24} />
                        </div>
                        <p className="text-gray-200 text-sm mb-6">Consulta y registra todos los tramites de devolucion</p>
                    </div>
                    <div className="bg-panel-bg border border-panel-border rounded-lg p-3 flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">Consultar devolucion</span>
                        <FiArrowRight className="text-gray-400 transition-transform group-hover:translate-x-1" />
                    </div>
                </div>
            </div>
        </div> 
    );
}