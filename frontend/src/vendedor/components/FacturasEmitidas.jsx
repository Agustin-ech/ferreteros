import React, { useState } from 'react';
import { FiFilter, FiRotateCcw, FiEye, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function FacturasEmitidas() {
    const [fechaInicial, setFechaInicial] = useState('');
    const [fechaFinal, setFechaFinal] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);

    // Datos de simuacion 
    const facturas = [
        { id: 1, factura: 'FFF0000001', fecha: '13/09/2026', total: '$71.000' },
        { id: 2, factura: 'FFF0000002', fecha: '12/09/2026', total: '$125.000' },
        { id: 3, factura: 'FFF0000003', fecha: '12/09/2026', total: '$98.500' },
        { id: 4, factura: 'FFF0000004', fecha: '11/09/2026', total: '$54.000' },
        { id: 5, factura: 'FFF0000005', fecha: '10/09/2026', total: '$210.000' },
    ];

    const handleLimpiar = () => {
        setFechaInicial('');
        setFechaFinal('');
    };

    const handleFechaChange = (e, setter) => {
        const valor = e.target.value.replace(/\D/g, ''); // Solo números
        let fechaFormateada = '';

        if (valor.length > 0) {
            fechaFormateada = valor.substring(0, 2); // Día
        }
        if (valor.length > 2) {
            fechaFormateada += '/' + valor.substring(2, 4); // Mese
        }
        if (valor.length > 4) {
            fechaFormateada += '/' + valor.substring(4, 8); // Año
        }
        setter(fechaFormateada);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <FiFilter className="text-[#F2B01E]" /> Facturas emitidas
                </h2>
                <p className="text-gray-400 text-sm mt-1">Consulta aquí el historial de las facturas emitidas mediante filtrado</p>
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-6 shadow-xl">
                <h3 className="font-semibold text-gray-200 text-sm flex items-center gap-2">
                    <FiFilter className="text-[#F2B01E]" /> Filtros de búsqueda
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Fecha inicial</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={fechaInicial} 
                                onChange={(e) => handleFechaChange(e, setFechaInicial)}
                                maxLength={10}
                                placeholder="DD/MM/AAAA" 
                                className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Fecha final</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={fechaFinal} 
                                onChange={(e) => handleFechaChange(e, setFechaFinal)}
                                maxLength={10}
                                placeholder="DD/MM/AAAA" 
                                className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" 
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="flex-1 bg-[#F2B01E] hover:bg-[#D99A10] text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md">
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

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#2a2a2a] bg-[#141414] text-gray-400 text-xs uppercase tracking-wider">
                                <th className="py-4 px-6 font-semibold">Codigo Factura</th>
                                <th className="py-4 px-6 font-semibold">Fecha</th>
                                <th className="py-4 px-6 font-semibold">Total</th>
                                <th className="py-4 px-6 font-semibold text-center">Ver Factura</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60 text-sm text-gray-300">
                            {facturas.map((item) => (
                                <tr key={item.id} className="hover:bg-[#1f1f1f]/50 transition-colors">
                                    <td className="py-4 px-6 font-medium text-white">{item.factura}</td>
                                    <td className="py-4 px-6 text-gray-400">{item.fecha}</td>
                                    <td className="py-4 px-6 font-semibold text-white">{item.total}</td>
                                    <td className="py-4 px-6 text-center">
                                        <button 
                                            title="Ver detalle"
                                            className="p-2 bg-[#1f1f1f] hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors inline-flex items-center justify-center border border-[#333]/50 cursor-pointer"
                                        >
                                            <FiEye className="text-base" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-start p-4 border-t border-[#2a2a2a] bg-[#141414]">
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                            className="w-8 h-8 bg-[#1f1f1f] border border-[#333] rounded text-gray-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                        >
                            &lt;
                        </button>
                        {[1, 2, 3].map((num) => (
                            <button
                                key={num}
                                onClick={() => setPaginaActual(num)}
                                className={`w-8 h-8 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                    paginaActual === num 
                                        ? 'bg-[#F2B01E] text-black shadow-md' 
                                        : 'bg-[#1f1f1f] border border-[#333] text-gray-300 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                        <button 
                            onClick={() => setPaginaActual(prev => Math.min(prev + 1, 3))}
                            className="w-8 h-8 bg-[#1f1f1f] border border-[#333] rounded text-gray-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                        >
                            &gt;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}