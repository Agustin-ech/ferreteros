import React, {useState}from 'react';
import { FiShoppingCart, FiPlus } from 'react-icons/fi';

export default function NuevaVenta() {
    const [ccNit, setCcNit] = useState('');
    const [telefono, setTelefono] = useState('');
    const [tipoPago, setTipoPago] = useState('Efectivo'); // Seleccionado por defecto
    const [fecha, setFecha] = useState('');

    const handleSoloNumeros = (e, setter) => {
        const valor = e.target.value;
        const soloNumeros = valor.replace(/\D/g, ''); // \D elimina todo lo que no sea dígito
        setter(soloNumeros);
    };

    //formatear la fecha automáticamente como DD/MM/AAAA
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
        fechaFormateada += '/' + valor.substring(4, 8); // Años (máximo 4 dígitos)
        }
        setFecha(fechaFormateada);
    };
    
    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                <FiShoppingCart className="text-[#F2B01E]" /> Nueva venta
                </h2>
                <p className="text-gray-400 text-sm">Registra las ventas presenciales o telefónicas en el sistema</p>
            </div>

            {/*Información del cliente */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-200 text-sm">Informacion del cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombres:</label>
                    <input 
                    type="text" 
                    placeholder="Ej. Andres sebastian" 
                    className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Apellidos:</label>
                    <input 
                    type="text" 
                    placeholder="Ej. lopez caica" 
                    className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">CC/NIT:</label>
                    <input 
                    type="text" 
                    value={ccNit}
                    onChange={(e) => handleSoloNumeros(e, setCcNit)}
                    placeholder="0.000.000.00" 
                    className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Gmail:</label>
                    <input 
                    type="text" 
                    placeholder="Ej. tu_correo@correo.com" 
                    className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Dirección:</label>
                    <input 
                    type="text" 
                    placeholder="Ej. Calle 00 # 0-00" 
                    className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Telefono:</label>
                    <input 
                    type="text" 
                    value={telefono}
                    onChange={(e) => handleSoloNumeros(e, setTelefono)}
                    placeholder="Ej. 000000000" 
                    className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" />
                </div>
                </div>
            </div>

            {/*Información del Pedido */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-200 text-sm">Informacion del Pedido</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Entrega:</label>
                    <select className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]">
                    <option>Domicilio</option>
                    <option>Tienda</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Tpo de pago:</label>
                    <div className="flex gap-2">
                        {['Efectivo', 'Transferencias', 'Contraentrega'].map((metodo) => (
                            <span 
                            key={metodo}
                            onClick={() => setTipoPago(metodo)}
                            className={`border px-3 py-1.5 rounded-lg text-xs cursor-pointer text-center flex-1 transition-colors ${
                                tipoPago === metodo 
                                ? 'bg-[#F2B01E] text-white border-[#F2B01E] font-medium' 
                                : 'bg-[#1f1f1f] border-[#333] text-gray-300 hover:border-[#F2B01E]'
                            }`}
                            >
                            {metodo}
                            </span>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Fecha:</label>
                    <input 
                    type="text" 
                    value={fecha}
                    onChange={handleFechaChange}
                    maxLength={10}
                    placeholder="00/00/0000" 
                    className="w-full bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" />
                </div>
                </div>
            </div>

            {/*Buscar Producto y Tabla */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-200 text-sm">Buscar Producto (Codigo o Nombre):</h3>
                <div className="flex gap-4">
                <input type="text" placeholder="Ej. Cemento, Tornillo 1/2, Broca..." className="flex-1 bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" />
                <button className="bg-[#F2B01E] hover:bg-[#D99A10] text-white font-semibold px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors cursor-pointer">
                    <FiPlus /> Agregar
                </button>
                </div>

                {/* Tabla de Productos */}
                <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                        <tr className="border-b border-[#2a2a2a] text-gray-400 text-xs">
                            <th className="py-2 px-3">Código</th>
                            <th className="py-2 px-3">Descripción del producto</th>
                            <th className="py-2 px-3">Cantidad</th>
                            <th className="py-2 px-3">Precio Unit</th>
                            <th className="py-2 px-3">Subtotal</th>
                        </tr>
                        </thead>
                        {/*estos son productos de ejemplo*/}
                        <tbody className="divide-y divide-gray-800 text-gray-300">
                        <tr>
                            <td className="py-3 px-3">FER-0012</td>
                            <td className="py-3 px-3">Cemento Gris Argos 50kg</td>
                            <td className="py-3 px-3">
                                <input 
                                type="number" 
                                min="0"
                                defaultValue={2} 
                                className="w-16 bg-[#1f1f1f] border border-[#333] rounded px-2 py-1 text-white text-center" />
                            </td> {/*estos son los incrementadores*/}
                            <td className="py-3 px-3">$28.000</td>
                            <td className="py-3 px-3">$56.000</td>
                        </tr>
                        <tr>
                            <td className="py-3 px-3">FER-0489</td>
                            <td className="py-3 px-3">Tornill Goloso 2 pulg (Caja x100)</td>
                            <td className="py-3 px-3">
                                <input 
                                type="number" 
                                min="0"
                                defaultValue={1} 
                                className="w-16 bg-[#1f1f1f] border border-[#333] rounded px-2 py-1 text-white text-center" />
                            </td> {/*estos son los incrementadores*/}
                            <td className="py-3 px-3">$15.000</td>
                            <td className="py-3 px-3">$15.000</td>
                        </tr>
                        </tbody>
                    </table>
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-3">
                        <h3 className="font-semibold text-gray-200 text-sm">Eliminar producto de la orden</h3>
                        <p className="text-xs text-gray-400">Ingrese el codigo del producto que eliminara de la orden</p>
                        <div className="flex gap-4 max-w-md">
                            <input 
                            type="text" 
                            placeholder="Ej. FER-0000" 
                            className="flex-1 bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F2B01E]" />
                            <button className="bg-[#F2B01E] hover:bg-[#D99A10] text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors cursor-pointer">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/*Totalidad */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-200 text-sm">Totalidad</h3>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                    <label className="block text-xs text-gray-400 mb-1">Codigo de factura</label>
                    <input type="text" disabled defaultValue="FFF00000001" className="bg-[#1f1f1f] border border-[#333]/50 rounded-lg px-3 py-2 text-sm text-gray-400 w-48" />
                    </div>
                    
                    <div className="w-full md:w-72 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                        <span>Método de pago:</span>
                        <span className="text-[#F2B01E] font-medium">{tipoPago}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                        <span>Subtotal:</span>
                        <span className="text-white font-medium">$71.000</span>
                    </div>
                    <div className="flex justify-between text-gray-400 border-b border-[#2a2a2a] pb-2">
                        <span>Domicilio:</span>
                        <span className="text-white font-medium">$0</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-white pt-1">
                        <span>Total a pagar:</span>
                        <span className="text-[#F2B01E]">$71.000</span>
                    </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-4 pt-4 border-t border-[#2a2a2a]">
                    <button className="bg-[#2a2a2a] hover:bg-gray-700 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors cursor-pointer">
                    Cancelar Venta
                    </button>
                    <button className="bg-[#F2B01E] hover:bg-[#D99A10] text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors cursor-pointer">
                    Procesar Venta
                    </button>
                </div>
            </div>  
        </div>
    );
}