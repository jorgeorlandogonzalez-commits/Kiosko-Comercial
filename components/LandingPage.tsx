import React, { useState } from 'react';
import { PosPreview } from './PosPreview';
import { Store, WifiOff, FileText, CheckCircle2, ChevronRight, Calculator, Smartphone, ShieldCheck, MessageCircle, X, ShoppingCart, Coffee, Hammer, User2 } from 'lucide-react';

const SOPORTE_WHATSAPP = "573247804513";
const SOPORTE_HUMANO = { nombre: "Jorge González", rol: "Fundador — Soporte directo", iniciales: "JG" };

interface LandingPageProps {
  onLoginClick: () => void;
  onTerminosClick: () => void;
  onHabilitadorClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onTerminosClick, onHabilitadorClick }) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [showWidget, setShowWidget] = useState(false);

  const path = window.location.pathname;
  const isTiendas = path === '/para/tiendas';
  const isPanaderias = path === '/para/panaderias';
  const isFerreterias = path === '/para/ferreterias';
  const isVertical = isTiendas || isPanaderias || isFerreterias;

  let documentTitle = "Kiosko Comercial";
  let heroHeadline = (
    <h1 className="text-5xl md:text-6xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
      Facturación Electrónica <span className="text-brand-red">Para Tu Negocio.</span> Sin Complicaciones.
    </h1>
  );
  let heroBullets = [
    "Facturas válidas ante la DIAN",
    "Sigue vendiendo sin internet",
    "Soporte humano por WhatsApp"
  ];

  if (isTiendas) {
    documentTitle = "Software para Tiendas de Barrio | Kiosko Comercial";
    heroHeadline = (
      <h1 className="text-4xl md:text-5xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
        Para su tienda de barrio: facture sin enredos y siga vendiendo <span className="text-brand-red">aunque se vaya el internet.</span>
      </h1>
    );
    heroBullets = [
      "Venda desde el celular o la tablet del mostrador.",
      "Fiados al día: lleve la cuenta de lo que debe cada cliente sin libreta.",
      "Inventario de su surtido: sepa qué se está acabando antes de que falte."
    ];
  } else if (isPanaderias) {
    documentTitle = "Software para Panaderías | Kiosko Comercial";
    heroHeadline = (
      <h1 className="text-4xl md:text-5xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
        Para su panadería: cuadre la vitrina al amanecer y <span className="text-brand-red">la caja al cierre</span>, sin cuadernos.
      </h1>
    );
    heroBullets = [
      "Venda el pan del día con código de barras o al tacto.",
      "Aparte el IVA del 5% y del 19% sin sacar cuentas.",
      "Sepa cuánta harina y azúcar le queda en bodega."
    ];
  } else if (isFerreterias) {
    documentTitle = "Software para Ferreterías | Kiosko Comercial";
    heroHeadline = (
      <h1 className="text-4xl md:text-5xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
        Para su ferretería: miles de referencias <span className="text-brand-red">sin perder una sola venta.</span>
      </h1>
    );
    heroBullets = [
      "Busque por nombre o código en segundos.",
      "Fiados con control: el cliente paga cuando pueda y usted siempre sabe cuánto le deben.",
      "Inventario de tornillería y repuestos sin volverse loco."
    ];
  }

  React.useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);
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
            FACTURAS VÁLIDAS ANTE LA DIAN
          </div>
          {heroHeadline}
          <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed font-medium">
            El sistema POS más fácil de usar en Colombia. Diseñado para comerciantes reales. Sigue vendiendo incluso sin internet. Desde $49.900 al mes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button 
                onClick={onLoginClick}
                className="bg-brand-red text-white px-8 py-4 rounded-xl font-black text-lg tracking-wide hover:bg-red-700 transition-all shadow-xl shadow-brand-red/20 flex items-center justify-center gap-2"
              >
                Comienza Tu Prueba Gratis
              </button>
              <p className="text-xs font-bold text-gray-500 text-center sm:text-left">
                Sin tarjeta de crédito · Cancela cuando quieras
              </p>
            </div>
            <a href="#caracteristicas" className="px-8 py-4 rounded-xl font-bold text-gray-600 border-2 border-gray-200 hover:border-gray-300 hover:text-gray-900 transition-all flex items-center justify-center">
              Ver Características
            </a>
          </div>
          <div className="mt-8 flex flex-col gap-3 text-sm font-bold text-gray-600">
            {heroBullets.map((bullet, idx) => (
              <span key={idx} className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                <span className="leading-tight">{bullet}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-red/20 to-transparent rounded-3xl transform rotate-3 scale-105 -z-10"></div>
          <PosPreview />
        </div>
      </section>

      
      {/* Franja de Confianza */}
      <div className="bg-brand-black text-white py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 font-bold text-sm md:text-base">
          <div className="flex items-center gap-2"><CheckCircle2 className="text-green-500" size={20}/> Facturas válidas ante la DIAN</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="text-green-500" size={20}/> Sigue vendiendo sin internet</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="text-green-500" size={20}/> Soporte humano por WhatsApp</div>
        </div>
      </div>

      
      {!isVertical && (
        <section className="py-24 bg-gray-50 px-6 border-y border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4 text-brand-black">Hecho para su tipo de negocio</h2>
              <p className="text-gray-500 max-w-xl mx-auto font-medium">Soluciones diseñadas a la medida de los comercios colombianos más comunes.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <a href="/para/tiendas" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-red/30 transition-all group flex flex-col items-center text-center">
                <div className="bg-orange-100 text-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShoppingCart size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-brand-black group-hover:text-brand-red transition-colors">Tiendas de Barrio</h3>
                <p className="text-gray-500 text-sm">Venda rápido y fíe con confianza.</p>
              </a>
              <a href="/para/panaderias" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-red/30 transition-all group flex flex-col items-center text-center">
                <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Coffee size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-brand-black group-hover:text-brand-red transition-colors">Panaderías</h3>
                <p className="text-gray-500 text-sm">Cuadre la vitrina y la caja sin cuadernos.</p>
              </a>
              <a href="/para/ferreterias" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-red/30 transition-all group flex flex-col items-center text-center">
                <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Hammer size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-brand-black group-hover:text-brand-red transition-colors">Ferreterías</h3>
                <p className="text-gray-500 text-sm">Control de miles de referencias en segundos.</p>
              </a>
            </div>
          </div>
        </section>
      )}

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
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Facturación DIAN ilimitada
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Inventario y POS incluidos, sin costo extra
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Modo Offline Garantizado
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Don J, su asistente inteligente incluido
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Soporte Técnico por WhatsApp
              </li>
            </ul>
          </div>
          <div className="bg-[#FDFBF7] p-8 rounded-3xl border-2 border-gray-100 w-full md:w-96 text-center shadow-lg transform md:-rotate-2 flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 mb-6 bg-gray-100 p-1 rounded-full">
              <button 
                onClick={() => setIsAnnual(false)} 
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${!isAnnual ? 'bg-white shadow-sm text-brand-black' : 'text-gray-500'}`}
              >
                Mensual
              </button>
              <button 
                onClick={() => setIsAnnual(true)} 
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${isAnnual ? 'bg-brand-red text-white shadow-sm' : 'text-gray-500'}`}
              >
                Anual <span className="text-[9px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full whitespace-nowrap">2 MESES GRATIS</span>
              </button>
            </div>
            
            <p className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase mb-2">
              {isAnnual ? 'Suscripción Anual' : 'Suscripción Mensual'}
            </p>
            <div className="flex items-start justify-center gap-1 mb-2">
              <span className="text-xl font-bold text-gray-400 mt-2">$</span>
              <span className="text-5xl sm:text-6xl font-black text-brand-black tracking-tighter">
                {isAnnual ? '499.000' : '49.900'}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-500 mb-6">
              Pesos Colombianos / {isAnnual ? 'año' : 'mes'}
            </p>
            <button 
              onClick={onLoginClick}
              className="w-full bg-brand-red text-white px-4 py-4 rounded-xl font-black uppercase tracking-wider sm:tracking-widest text-xs sm:text-sm hover:bg-brand-black transition-all whitespace-normal sm:whitespace-nowrap flex items-center justify-center text-center"
              style={{ minHeight: '56px' }}
            >
              Iniciar Prueba de 15 Días
            </button>
          </div>
        </div>
      </section>

      
      {isVertical && (
        <div className="py-12 bg-[#FDFBF7] flex justify-center">
          <a href="/" className="text-brand-red font-bold hover:underline flex items-center gap-2">
            ← Volver al inicio
          </a>
        </div>
      )}

      {/* Soporte Humano */}
      <section className="py-24 bg-brand-black text-white px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-12">Atendido por personas, no por máquinas.</h2>
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-center gap-8 max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-brand-red rounded-full flex items-center justify-center text-3xl font-black text-white shrink-0">
              {SOPORTE_HUMANO.iniciales}
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-1">{SOPORTE_HUMANO.nombre}</h3>
              <p className="text-gray-400 font-medium mb-6">{SOPORTE_HUMANO.rol}</p>
              <a 
                href={`https://wa.me/${SOPORTE_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 transition-colors inline-flex"
              >
                <MessageCircle size={20} />
                Escríbame al WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Widget WhatsApp */}
      <div className="fixed bottom-6 left-6 z-50">
        {showWidget ? (
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 w-72 mb-4 relative animate-in slide-in-from-bottom-4">
            <button 
              onClick={() => setShowWidget(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h4 className="font-black text-brand-black text-lg mb-2 pr-6">¿Tienes dudas? Te ayudamos con amor</h4>
            <p className="text-gray-500 text-sm font-medium mb-6">Horario de soporte:<br/>Lunes a Viernes 8:00 AM - 5:00 PM · Sábados 8:00 AM - 12:00 M · Domingos y festivos no laboramos</p>
            <a 
              href={`https://wa.me/${SOPORTE_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              ¡Escribir ahora!
            </a>
          </div>
        ) : (
          <button 
            onClick={() => setShowWidget(true)}
            className="bg-brand-black text-white px-5 py-4 rounded-full font-bold flex items-center gap-3 shadow-2xl hover:bg-brand-red transition-all hover:scale-105"
          >
            <MessageCircle size={24} className="text-green-400" />
            ¿Dudas? ¡Hablemos!
          </button>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 pt-12 pb-24 md:pb-28 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Store size={20} className="text-gray-400" />
            <span className="font-black text-gray-400 tracking-widest uppercase text-xs">Kiosko Comercial © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-bold text-gray-500">
            <button onClick={onTerminosClick} className="hover:text-brand-red transition-colors cursor-pointer outline-none">Términos y Condiciones</button>
            <button onClick={onHabilitadorClick} className="hover:text-brand-red transition-colors cursor-pointer outline-none">Software Habilitador DIAN</button>
            <a href="https://wa.me/573247804513" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">Soporte WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
