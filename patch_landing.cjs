const fs = require('fs');

let content = fs.readFileSync('components/LandingPage.tsx', 'utf8');

// C1: AUTORIZADO POR LA DIAN -> FACTURAS VÁLIDAS ANTE LA DIAN
content = content.replace(/Autorizado por la DIAN/gi, 'FACTURAS VÁLIDAS ANTE LA DIAN');

// Add SOPORTE_WHATSAPP
const importRegex = /import React.*?;/s;
content = content.replace(importRegex, `import React, { useState } from 'react';\nimport { PosPreview } from './PosPreview';`);
content = content.replace(/interface LandingPageProps/, `const SOPORTE_WHATSAPP = "573001234567";\n\ninterface LandingPageProps`);

// C6: Add WhatsApp button
const wsButton = `
      {/* WhatsApp Flotante */}
      <a 
        href={\`https://wa.me/\${SOPORTE_WHATSAPP}\`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Soporte por WhatsApp"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
      </a>
`;
content = content.replace(/(<\/div>\s*)$/, wsButton + '$1');

// C3: Replace image with PosPreview
const imageRegex = /<img[^>]*src="https:\/\/images\.unsplash\.com[^>]*>/s;
content = content.replace(imageRegex, `<PosPreview />`);

// C2: Trust Band (Banda Negra)
const trustBand = `
      {/* Franja de Confianza */}
      <div className="bg-brand-black text-white py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 font-bold text-sm md:text-base">
          <div className="flex items-center gap-2"><CheckCircle2 className="text-green-500" size={20}/> Facturas válidas ante la DIAN</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="text-green-500" size={20}/> Sigue vendiendo sin internet</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="text-green-500" size={20}/> Soporte humano por WhatsApp</div>
        </div>
      </div>
`;
content = content.replace(/\{\/\* Features Grid \*\/\}/, trustBand + '\n      {/* Features Grid */}');

// C4 & C5 & C7: Pricing Card
// Adding useState for isAnnual
content = content.replace(/const LandingPage.*\{/, `const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onTerminosClick, onHabilitadorClick }) => {\n  const [isAnnual, setIsAnnual] = useState(false);`);

const pricingCardOld = `          <div className="bg-[#FDFBF7] p-8 rounded-3xl border-2 border-gray-100 w-full md:w-auto text-center shadow-lg transform md:-rotate-2">
            <p className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase mb-2">Suscripción Mensual</p>
            <div className="flex items-start justify-center gap-1 mb-2">
              <span className="text-xl font-bold text-gray-400 mt-2">$</span>
              <span className="text-6xl font-black text-brand-black tracking-tighter">49.900</span>
            </div>
            <p className="text-sm font-bold text-gray-500 mb-8">Pesos Colombianos / mes</p>
            <button 
              onClick={onLoginClick}
              className="w-full bg-brand-red text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-brand-black transition-all"
            >
              Iniciar Prueba de 15 Días
            </button>
          </div>`;

const pricingCardNew = `          <div className="bg-[#FDFBF7] p-8 rounded-3xl border-2 border-gray-100 w-full md:w-96 text-center shadow-lg transform md:-rotate-2 flex flex-col items-center">
            <div className="flex items-center justify-center gap-2 mb-6 bg-gray-100 p-1 rounded-full">
              <button 
                onClick={() => setIsAnnual(false)} 
                className={\`px-4 py-2 rounded-full text-xs font-bold transition-all \${!isAnnual ? 'bg-white shadow-sm text-brand-black' : 'text-gray-500'}\`}
              >
                Mensual
              </button>
              <button 
                onClick={() => setIsAnnual(true)} 
                className={\`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 \${isAnnual ? 'bg-brand-red text-white shadow-sm' : 'text-gray-500'}\`}
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
          </div>`;
content = content.replace(pricingCardOld, pricingCardNew);

const ctaOld = `            <button 
              onClick={onLoginClick}
              className="bg-brand-red text-white px-8 py-4 rounded-xl font-black text-lg tracking-wide hover:bg-red-700 transition-all shadow-xl shadow-brand-red/20 flex items-center justify-center gap-2"
            >
              Comienza Tu Prueba Gratis
            </button>`;
const ctaNew = `            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button 
                onClick={onLoginClick}
                className="bg-brand-red text-white px-8 py-4 rounded-xl font-black text-lg tracking-wide hover:bg-red-700 transition-all shadow-xl shadow-brand-red/20 flex items-center justify-center gap-2"
              >
                Comienza Tu Prueba Gratis
              </button>
              <p className="text-xs font-bold text-gray-500 text-center sm:text-left">
                Sin tarjeta de crédito · Cancela cuando quieras
              </p>
            </div>`;
content = content.replace(ctaOld, ctaNew);

fs.writeFileSync('components/LandingPage.tsx', content);
