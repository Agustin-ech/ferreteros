import React, { useState } from 'react';
import { FiClock, FiFilter, FiRotateCcw } from 'react-icons/fi';

export default function ConsultarDevolucion() {
    const [fechaDevolucion, setFechaDevolucion] = useState('');
    const [metodoPago, setMetodoPago] = useState('Todos');

    // Datos simulados 
    const devoluciones = [
        {
            id: 1,
            codigo: 'FFF0000001',
            fecha: '00/00/0000',
            metodo: 'efectivo',
            producto: 'tornillo',
            cantidad: 'xx',
            motivo: 'caduci',
            estado: 'solucionado'
        }
    ];

    const handleLimpiar = () => {
        setFechaDevolucion('');
        setMetodoPago('Todos');
    };

    const handleFechaChange = (e) => {
        const valor = e.target.value.replace(/\D/g, ''); // Solo números
        let fechaFormateada = '';

        if (valor.length > 0) {
            fechaFormateada = valor.substring(0, 2); // Días
        }
        if (valor.length > 2) {
            fechaFormateada += '/' + valor.substring(2, 4); // Meses
        }
        if (valor.length > 4) {
            fechaFormateada += '/' + valor.substring(4, 8); // Años
        }
        setFechaDevolucion(fechaFormateada);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Cabecera de la sección */}
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <FiClock className="text-[#F2B01E]" /> Consultar devolución
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                    Consulta aquí el historial de todas las devoluciones
                </p>
            </div>

            {/* Tarjeta de Filtros de Búsqueda */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-6 shadow-xl">
                <h3 className="font-semibold text-gray-200 text-sm flex items-center gap-2">
                    <FiFilter className="text-[#F2B01E]" /> Historial de devoluciones
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    {/* Fecha de devolución */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Fecha de devolución</label>
                        <input 
                            type="text" 
                            value={fechaDevolucion} 
                            onChange={handleFechaChange}
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
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 pt-2">
                    <button className="bg-[#F2B01E] hover:bg-[#D99A10] text-white font-semibold px-6 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md">
                        <FiFilter /> Filtrar
                    </button>
                    <button 
                        onClick={handleLimpiar}
                        className="bg-[#1f1f1f] hover:bg-gray-700 border border-[#333] text-gray-300 font-medium px-6 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                        <FiRotateCcw /> Limpiar
                    </button>
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#2a2a2a] bg-[#141414] text-gray-400 text-xs uppercase tracking-wider">
                                <th className="py-4 px-6 font-semibold">Códigode factura</th>
                                <th className="py-4 px-6 font-semibold">Fecha de devolución</th>
                                <th className="py-4 px-6 font-semibold">Metodo de pago</th>
                                <th className="py-4 px-6 font-semibold">Productos</th>
                                <th className="py-4 px-6 font-semibold">Cantidad</th>
                                <th className="py-4 px-6 font-semibold">Motivo</th>
                                <th className="py-4 px-6 font-semibold">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60 text-sm text-gray-300">
                            {devoluciones.map((item) => (
                                <tr key={item.id} className="hover:bg-[#1f1f1f]/50 transition-colors">
                                    <td className="py-4 px-6 font-medium text-white">{item.codigo}</td>
                                    <td className="py-4 px-6 text-gray-400">{item.fecha}</td>
                                    <td className="py-4 px-6 text-gray-300">{item.metodo}</td>
                                    <td className="py-4 px-6 text-gray-300">{item.producto}</td>
                                    <td className="py-4 px-6 text-gray-300">{item.cantidad}</td>
                                    <td className="py-4 px-6 text-gray-300">{item.motivo}</td>
                                    <td className="py-4 px-6">
                                        <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">
                                            {item.estado}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}