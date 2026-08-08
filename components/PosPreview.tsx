import React from 'react';
import { Store, CheckCircle2 } from 'lucide-react';

export const PosPreview: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col h-[500px] w-full transform md:rotate-2">
      {/* Header */}
      <div className="bg-[#FDFBF7] p-4 flex items-center justify-between border-b border-gray-100 relative">
        <div className="flex items-center gap-2">
          <div className="bg-brand-red text-white p-1.5 rounded-lg">
            <Store size={18} />
          </div>
          <span className="font-black text-sm tracking-tighter uppercase text-brand-black">Kiosko Comercial</span>
        </div>
        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm absolute -top-3 -right-3 md:top-4 md:right-4 border border-green-200">
          <CheckCircle2 size={12} />
          APROBADA · DIAN <span className="text-green-600/70 ml-1">CUFE: 8F3A…C21D</span>
        </div>
      </div>
      
      {/* Body */}
      <div className="flex-1 p-6 flex flex-col justify-between bg-gray-50/50">
        <div className="grid grid-cols-2 gap-4">
          {[{ name: "Pan", price: "$1.500" }, { name: "Leche", price: "$4.000" }, { name: "Café", price: "$3.000" }, { name: "Gaseosa", price: "$2.500" }].map((item, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center items-center gap-2 hover:border-brand-red transition-colors cursor-pointer">
              <span className="font-bold text-gray-700">{item.name}</span>
              <span className="text-brand-red font-black text-sm">{item.price}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-4 flex justify-between items-center shadow-sm">
            <span className="font-bold text-gray-500 uppercase tracking-widest text-xs">Total:</span>
            <span className="font-black text-2xl text-brand-black">$11.000</span>
          </div>
          <button className="w-full bg-brand-red text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20">
            Cobrar
          </button>
        </div>
      </div>
    </div>
  );
};
