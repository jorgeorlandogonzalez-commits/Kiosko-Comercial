import React, { useEffect, useState } from 'react';
import { MessageCircle, ArrowRight, ChevronLeft } from 'lucide-react';

export const TestimoniosPage: React.FC = () => {
  const [facturas, setFacturas] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Comercios que ya facturan | Kiosko Comercial";
    fetch('/api/stats/public')
      .then(res => res.json())
      .then(data => {
        setFacturas(data.facturasEmitidas || 0);
      })
      .catch(() => {
        setFacturas(0);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="p-6 max-w-4xl mx-auto w-full pt-12">
        <a href="/" className="inline-flex items-center gap-2 text-brand-red font-bold hover:underline mb-8">
          <ChevronLeft size={16} /> Volver al inicio
        </a>
        <h1 className="text-4xl md:text-5xl font-black text-brand-black mb-12 tracking-tighter">
          Comercios que ya facturan con Kiosko
        </h1>

        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 text-center mb-12">
          {facturas === null ? (
            <div className="text-gray-400 font-bold animate-pulse">Cargando datos reales...</div>
          ) : facturas === 0 ? (
            <div>
              <div className="text-6xl md:text-8xl font-black text-brand-black mb-6">0</div>
              <p className="text-xl text-gray-500 font-medium max-w-xl mx-auto">
                El contador arranca hoy. Sé de los primeros.
              </p>
            </div>
          ) : (
            <div>
              <div className="text-6xl md:text-8xl font-black text-brand-black mb-6">
                {facturas.toLocaleString()}
              </div>
              <p className="text-xl text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
                facturas electrónicas aprobadas ante la DIAN con Kiosko Comercial desde agosto de 2026
              </p>
            </div>
          )}
        </div>

        <div className="bg-brand-black text-white p-8 md:p-12 rounded-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-black mb-4">Estamos creciendo con comercios reales.</h2>
          <p className="text-gray-400 font-medium mb-8 max-w-2xl mx-auto text-lg">
            ¿Ya usas Kiosko? Cuéntanos tu experiencia y aparece aquí.
          </p>
          <a 
            href="https://wa.me/573247804513?text=Hola,%20quiero%20dejar%20mi%20testimonio%20sobre%20Kiosko"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold transition-colors text-lg mb-6"
          >
            <MessageCircle size={24} /> Enviar mi testimonio
          </a>
        </div>
      </div>
    </div>
  );
};
