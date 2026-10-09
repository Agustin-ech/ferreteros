import React, { useState } from 'react';
import { FiFilter, FiSearch, FiRotateCcw, FiEye } from 'react-icons/fi';

export default function FiltroVentas() {
    const [fechaInicial, setFechaInicial] = useState('');
    const [fechaFinal, setFechaFinal] = useState('');
    const [metodoPago, setMetodoPago] = useState('Todos');
    const [codigoFactura, setCodigoFactura] = useState('');
    const [cliente, setCliente] = useState('');
    

    //Datos de simulacion
    const ventasFiltradas = [
        { factura: 'FFF0000001', cliente: 'Andrés López', fecha: '13/09/2026', metodo: 'Efectivo', total: '$71.000' },
        { factura: 'FFF0000002', cliente: 'Carlos Pérez', fecha: '12/09/2026', metodo: 'Transferencia', total: '$125.000' },
        { factura: 'FFF0000003', cliente: 'Laura Martínez', fecha: '12/09/2026', metodo: 'Tarjeta', total: '$98.500' },
        { factura: 'FFF0000004', cliente: 'Jorge Ramírez', fecha: '11/09/2026', metodo: 'Efectivo', total: '$54.000' },
        { factura: 'FFF0000005', cliente: 'Valentina Torres', fecha: '10/09/2026', metodo: 'Transferencia', total: '$210.000' },
    ];

    const handleLimpiar = () => {
        setFechaInicial('');
        setFechaFinal('');
        setMetodoPago('Todos');
        setCodigoFactura('');
        setCliente('');
    };

    const handleFechaChange = (e, setter) => {
        const valor = e.target.value.replace(/\D/g, ''); // Solo números
        let fechaFormateada = '';

        if (valor.length > 0) {
            fechaFormateada = valor.substring(0, 2); // Días
        }
        if (valor.length > 2) {
            fechaFormateada += '/' + valor.substring(2, 4); // Meses
        }
        if (valor.length > 4) {
            fechaFormateada += '/' + valor.substring(4, 8); // Años (máximo 4 dígitos)
        }
        setter(fechaFormateada);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                <FiFilter className="text-[#F2B01E]" /> Filtro de ventas
                </h2>
                <p className="text-gray-400 text-sm">Consulta aquí por fecha las ventas</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-6">
                <h3 className="font-semibold text-gray-200 text-sm flex items-center gap-2">
                <FiFilter className="text-[#F2B01E]" /> Filtros de búsqueda
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* Fecha inicial */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Fecha inicial</label>
                        <input 
                        type="text" 
                        value={fechaInicial} 
                        onChange={(e) => handleFechaChange(e, setFechaInicial)}
                        maxLength={10}
                        placeholder="DD/MM/AAAA" 
                        className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" 
                        />
                    </div>

                    {/* Fecha final */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Fecha final</label>
                        <input 
                        type="text" 
                        value={fechaFinal} 
                        onChange={(e) => handleFechaChange(e, setFechaFinal)}
                        maxLength={10}
                        placeholder="DD/MM/AAAA" 
                        className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" 
                        />
                    </div>

                    {/* Método de pago */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Método de pago</label>
                        <select 
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]"
                        >
                        <option>Todos</option>
                        <option>Efectivo</option>
                        <option>Transferencia</option>
                        <option>Contraentrega</option>
                        </select>
                    </div>

                    {/* Código de factura */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Código de factura</label>
                        <input 
                        type="text" 
                        value={codigoFactura}
                        onChange={(e) => setCodigoFactura(e.target.value)}
                        placeholder="FFF0000000" 
                        className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" 
                        />
                    </div>

                    {/* Cliente */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Cliente</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={cliente}
                                onChange={(e) => setCliente(e.target.value)}
                                placeholder="Buscar cliente..." 
                                className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E] pr-10" 
                            />
                            <FiSearch className="absolute right-3 top-2.5 text-gray-400 text-base" />
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3">
                        <button className="flex-1 bg-[#F2B01E] hover:bg-[#D99A10] text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer">
                        <FiFilter /> Filtrar
                        </button>
                        <button 
                        onClick={handleLimpiar}
                        className="bg-[#1f1f1f] hover:bg-gray-700 border border-[#333] text-gray-300 font-medium px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                        <FiRotateCcw /> Limpiar
                        </button>
                    </div>
                </div>
            </div>

            {/* Resultados Encontrados */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-200 text-sm">Resultados encontrados: 18 ventas</h3>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-[#2a2a2a] text-gray-400 text-xs">
                                <th className="py-3 px-4">Factura</th>
                                <th className="py-3 px-4">Cliente</th>
                                <th className="py-3 px-4">Fecha</th>
                                <th className="py-3 px-4">Método de pago</th>
                                <th className="py-3 px-4">Total</th>
                                <th className="py-3 px-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-gray-300">
                            {ventasFiltradas.map((item, idx) => (
                                <tr key={idx} className="hover:bg-[#1f1f1f]/40 transition-colors">
                                    <td className="py-3.5 px-4 font-medium text-white">{item.factura}</td>
                                    <td className="py-3.5 px-4">{item.cliente}</td>
                                    <td className="py-3.5 px-4">{item.fecha}</td>
                                    <td className="py-3.5 px-4">{item.metodo}</td>
                                    <td className="py-3.5 px-4 text-white font-semibold">{item.total}</td>
                                    <td className="py-3.5 px-4 text-center">
                                        <button className="text-gray-400 hover:text-[#F2B01E] transition-colors cursor-pointer p-1">
                                        <FiEye className="text-base" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Paginación y Total general */}
                <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-[#2a2a2a] gap-4">
                    {/* Paginador */}
                    <div className="flex gap-1.5">
                        <button className="w-8 h-8 rounded-lg bg-[#F2B01E] text-white font-bold text-xs flex items-center justify-center cursor-pointer">1</button>
                        <button className="w-8 h-8 rounded-lg bg-[#1f1f1f] hover:bg-gray-700 text-gray-300 text-xs flex items-center justify-center border border-[#333] cursor-pointer">2</button>
                        <button className="w-8 h-8 rounded-lg bg-[#1f1f1f] hover:bg-gray-700 text-gray-300 text-xs flex items-center justify-center border border-[#333] cursor-pointer">3</button>
                        <button className="w-8 h-8 rounded-lg bg-[#1f1f1f] hover:bg-gray-700 text-gray-300 text-xs flex items-center justify-center border border-[#333] cursor-pointer">&gt;</button>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-base font-bold text-white">Total:</span>
                        <div className="bg-[#F2B01E] text-white font-bold px-6 py-2 rounded-xl text-base shadow-md">
                            $558.500
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}