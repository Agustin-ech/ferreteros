import React, { useState } from 'react';
import { FiRotateCcw, FiCheck, FiSearch } from 'react-icons/fi';
import { BiPackage } from 'react-icons/bi';

export default function RegistrarDevolucion() {
    const [fechaDevolucion, setFechaDevolucion] = useState('');
    const [facturaPedido, setFacturaPedido] = useState('');
    const [producto, setProducto] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [motivo, setMotivo] = useState('');
    const [observaciones, setObservaciones] = useState('');

    const handleLimpiar = () => {
        setFechaDevolucion('');
        setFacturaPedido('');
        setProducto('');
        setCantidad('');
        setMotivo('');
        setObservaciones('');
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
                    <BiPackage className="text-[#F2B01E]" /> Registrar devolución
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                    Ingrese aquí los requisitos y motivos de la devolución
                </p>
            </div>

            {/* Tarjeta del Formulario */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-6 shadow-xl">
                <h3 className="font-semibold text-gray-200 text-sm flex items-center gap-2 border-b border-[#2a2a2a] pb-4">
                    <BiPackage className="text-[#F2B01E]" /> Información de la devolución
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                    {/* Factura / Pedido */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Factura / Pedido</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={facturaPedido} 
                                onChange={(e) => setFacturaPedido(e.target.value)}
                                placeholder="Ej: FFF000001" 
                                className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E] pr-10" 
                            />
                            <FiSearch className="absolute right-3 top-2.5 text-gray-400 text-base" />
                        </div>
                    </div>

                    {/* Producto */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Producto</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={producto} 
                                onChange={(e) => setProducto(e.target.value)}
                                placeholder="Buscar producto..." 
                                className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E] pr-10" 
                            />
                            <FiSearch className="absolute right-3 top-2.5 text-gray-400 text-base" />
                        </div>
                    </div>

                    {/* Cantidad */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                        <input 
                            type="number" 
                            min="0"
                            value={cantidad} 
                            onChange={(e) => {
                                if (e.target.value >= 0) setCantidad(e.target.value);
                            }}
                            placeholder="Ej: 1" 
                            className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" 
                        />
                    </div>

                    {/* Motivo de devolución */}
                    <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Motivo de devolución</label>
                        <input 
                            type="text" 
                            value={motivo} 
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Ej: Caducidad" 
                            className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" 
                        />
                    </div>
                </div>

                {/* Observaciones */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Observaciones</label>
                    <textarea 
                        rows="3"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Ej: Producto en mal estado, cambio de talla, etc..."
                        className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#F2B01E] resize-none"
                    ></textarea>
                </div>

                {/* Botones de acción al fondo */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
                    <button 
                        onClick={handleLimpiar}
                        className="bg-[#1f1f1f] hover:bg-gray-700 border border-[#333] text-gray-300 font-medium px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer"
                    >
                        <FiRotateCcw /> Limpiar
                    </button>
                    <button className="bg-[#F2B01E] hover:bg-[#D99A10] text-white font-semibold px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-md">
                        <FiCheck className="text-base" /> Registrar devolución
                    </button>
                </div>
            </div>
        </div>
    );
}