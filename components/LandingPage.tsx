import React from 'react';
import { Store, WifiOff, FileText, CheckCircle2, ChevronRight, Calculator, Smartphone, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onTerminosClick: () => void;
  onHabilitadorClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onTerminosClick, onHabilitadorClick }) => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-900 font-sans selection:bg-brand-red selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-red text-white p-2 rounded-lg">
              <Store size={24} />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase text-brand-black">Kiosko Comercial</span>
          </div>
          <button 
            onClick={onLoginClick}
            className="bg-brand-black text-white px-6 py-2.5 rounded-full font-bold text-sm tracking-wide hover:bg-brand-red transition-all shadow-md flex items-center gap-2"
          >
            Iniciar Sesión <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-block bg-brand-red/10 text-brand-red font-bold px-3 py-1 rounded-full text-xs tracking-widest uppercase mb-6 border border-brand-red/20">
            Autorizado por la DIAN
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
            Facturación Electrónica <span className="text-brand-red">Para Tu Negocio.</span> Sin Complicaciones.
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed font-medium">
            El sistema POS más fácil de usar en Colombia. Diseñado para comerciantes reales. Sigue vendiendo incluso sin internet. Desde $39.900 al mes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={onLoginClick}
              className="bg-brand-red text-white px-8 py-4 rounded-xl font-black text-lg tracking-wide hover:bg-red-700 transition-all shadow-xl shadow-brand-red/20 flex items-center justify-center gap-2"
            >
              Comienza Tu Prueba Gratis
            </button>
            <a href="#caracteristicas" className="px-8 py-4 rounded-xl font-bold text-gray-600 border-2 border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-all flex items-center justify-center">
              Ver Características
            </a>
          </div>
          <div className="mt-8 flex items-center gap-4 text-sm font-bold text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500"/> Sin contratos</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500"/> Soporte WhatsApp</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-red/20 to-transparent rounded-3xl transform rotate-3 scale-105 -z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1000" 
            alt="Comerciante usando sistema POS" 
            className="rounded-3xl shadow-2xl object-cover h-[500px] w-full border-4 border-white"
          />
        </div>
      </section>

      {/* Features Grid */}
      <section id="caracteristicas" className="py-24 bg-brand-black text-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">Todo lo que su negocio necesita, <span className="text-brand-red">sin enredos ni complicaciones.</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto font-medium">Los sistemas tradicionales son difíciles de usar. Kiosko Comercial está diseñado pensando en usted: botones grandes, letras claras y procesos sencillos.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="bg-brand-red w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <WifiOff size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Vende sin Internet</h3>
              <p className="text-gray-400 leading-relaxed text-sm">¿Se cayó el internet? No hay problema. Sigue facturando y el sistema enviará todo a la DIAN automáticamente cuando vuelva la conexión.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="bg-white text-brand-black w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <FileText size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Facturación DIAN</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Cumple con todas las normas vigentes. Generación instantánea de facturas electrónicas (.XML y PDF) con tu propio certificado digital.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
              <div className="bg-blue-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Calculator size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Control de Caja y Fiados</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Olvídate de las libretas. Gestiona tus cuentas por cobrar, inventario y cuadre de caja diario con un par de clics.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors md:col-start-2">
              <div className="bg-green-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Tu Asistente "Don J"</h3>
              <p className="text-gray-400 leading-relaxed text-sm">¿Dudas con el sistema o la DIAN? "Don J" es tu asistente impulsado por Inteligencia Artificial, experto en explicar temas de contabilidad, impuestos y el uso del POS con palabras sencillas y cotidianas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Simple */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl border border-gray-100 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-4xl font-black tracking-tighter text-brand-black mb-4">Un solo plan. <br/>Todas las funciones.</h2>
            <p className="text-gray-600 mb-6 font-medium text-lg text-balance">
              No te cobramos por módulos extra. Con nuestra tarifa única tienes acceso a facturación ilimitada, soporte directo e inventario.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Facturación DIAN Ilimitada
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Modo Offline Garantizado
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Soporte Técnico WhatsApp
              </li>
            </ul>
          </div>
          <div className="bg-[#FDFBF7] p-8 rounded-3xl border-2 border-gray-100 w-full md:w-auto text-center shadow-lg transform md:-rotate-2">
            <p className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase mb-2">Suscripción Mensual</p>
            <div className="flex items-start justify-center gap-1 mb-2">
              <span className="text-xl font-bold text-gray-400 mt-2">$</span>
              <span className="text-6xl font-black text-brand-black tracking-tighter">39.900</span>
            </div>
            <p className="text-sm font-bold text-gray-500 mb-8">Pesos Colombianos / mes</p>
            <button 
              onClick={onLoginClick}
              className="w-full bg-brand-red text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-brand-black transition-all"
            >
              Iniciar Prueba de 15 Días
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 py-12 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Store size={20} className="text-gray-400" />
            <span className="font-black text-gray-400 tracking-widest uppercase text-xs">Kiosko Comercial © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-bold text-gray-500">
            <button onClick={onTerminosClick} className="hover:text-brand-red transition-colors cursor-pointer outline-none">Términos y Condiciones</button>
            <button onClick={onHabilitadorClick} className="hover:text-brand-red transition-colors cursor-pointer outline-none">Software Habilitador DIAN</button>
            <a href="https://wa.me/573001234567" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Soporte WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
