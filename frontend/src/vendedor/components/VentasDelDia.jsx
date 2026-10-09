import React from 'react';
import { FiDollarSign } from 'react-icons/fi';

export default function VentasDelDia() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                <FiDollarSign className="text-[#F2B01E]" /> Ventas del día
                </h2>
                <p className="text-gray-400 text-sm">Consulta aquí el totalidad de las ventas del día</p>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-6">
                
                {/* Tabla de ventas */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-[#2a2a2a] text-gray-400 text-xs text-center">
                                <th className="py-3 px-3">Código</th>
                                <th className="py-3 px-3">Nombre cliente</th>
                                <th className="py-3 px-3">Apellido cliente</th>
                                <th className="py-3 px-3">Cantidad productos</th>
                                <th className="py-3 px-3">Codigo de productos</th>
                                <th className="py-3 px-3">Total</th>
                                <th className="py-3 px-3">Método de pago</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-gray-300 text-center">
                            <tr>
                                <td className="py-4 px-3 font-medium text-white">FFF00000001</td>
                                <td className="py-4 px-3">Andres sebastian</td>
                                <td className="py-4 px-3">lopez caica</td>
                                <td className="py-4 px-3">2</td>
                                <td className="py-4 px-3 text-xs leading-relaxed">
                                FER-0012<br />
                                FER-0489
                                </td>
                                <td className="py-4 px-3 text-white font-semibold">$71.000</td>
                                <td className="py-4 px-3">Transferencia</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end items-center pt-4 border-t border-[#2a2a2a] gap-4">
                    <span className="text-base font-bold text-white">
                        Total del día:
                    </span>
                    <div className="bg-[#F2B01E] text-white font-bold px-6 py-2 rounded-xl text-base shadow-md">
                        $71.000
                    </div>
                </div>
            </div>
        </div>
    );
}