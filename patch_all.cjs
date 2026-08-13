const fs = require('fs');
let content = fs.readFileSync('components/LandingPage.tsx', 'utf8');

// Imports
content = content.replace(
  /import \{ Store, [^\}]+ \} from 'lucide-react';/,
  "import { Store, WifiOff, FileText, CheckCircle2, ChevronRight, Calculator, Smartphone, ShieldCheck, MessageCircle, X, ShoppingCart, Coffee, Hammer, User2 } from 'lucide-react';"
);

// Constants
content = content.replace(
  /const SOPORTE_WHATSAPP = "[^"]+";/,
  'const SOPORTE_WHATSAPP = "573247804513";\nconst SOPORTE_HUMANO = { nombre: "Jorge González", rol: "Fundador — Soporte directo", iniciales: "JG" };'
);

// Routing & state
const statesRegex = /const \[isAnnual, setIsAnnual\] = useState\(false\);/;
const statesReplacement = `const [isAnnual, setIsAnnual] = useState(false);
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
  }, [documentTitle]);`;

if (content.includes("const path = window.location.pathname;")) {
  console.log("States already patched.");
} else {
  content = content.replace(statesRegex, statesReplacement);
}

// Hero Headline
const originalHeroHeadlineStr = `<h1 className="text-5xl md:text-6xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
            Facturación Electrónica <span className="text-brand-red">Para Tu Negocio.</span> Sin Complicaciones.
          </h1>`;
if (content.includes(originalHeroHeadlineStr)) {
  content = content.replace(originalHeroHeadlineStr, `{heroHeadline}`);
}

// Hero Bullets
const originalHeroBulletsStr = `<div className="mt-8 flex items-center gap-4 text-sm font-bold text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500"/> Sin contratos</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500"/> Soporte WhatsApp</span>
          </div>`;
const newHeroBulletsStr = `<div className="mt-8 flex flex-col gap-3 text-sm font-bold text-gray-600">
            {heroBullets.map((bullet, idx) => (
              <span key={idx} className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                <span className="leading-tight">{bullet}</span>
              </span>
            ))}
          </div>`;
if (content.includes(originalHeroBulletsStr)) {
  content = content.replace(originalHeroBulletsStr, newHeroBulletsStr);
}

// Verticales Section
const featuresGridStr = `{/* Features Grid */}`;
const verticalesSectionStr = `
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

      {/* Features Grid */}`;
if (content.includes(featuresGridStr) && !content.includes("Hecho para su tipo de negocio")) {
  content = content.replace(featuresGridStr, verticalesSectionStr);
}

// Pricing Bullets
const oldPricingList = `<ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Facturación DIAN Ilimitada
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Modo Offline Garantizado
              </li>
              <li className="flex items-center gap-3 font-bold text-gray-700">
                <div className="bg-green-100 text-green-600 p-1 rounded-full"><CheckCircle2 size={18} /></div> Soporte Técnico WhatsApp
              </li>
            </ul>`;

const newPricingList = `<ul className="space-y-4 mb-8">
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
            </ul>`;
if (content.includes(oldPricingList)) {
  content = content.replace(oldPricingList, newPricingList);
} else {
  console.log("Could not find old pricing list.");
}

// Soporte Humano & Volver al inicio & Widget
const footerStr = `{/* Footer */}`;
const supportSection = `
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
                href={\`https://wa.me/\${SOPORTE_WHATSAPP}\`}
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
      <div className="fixed bottom-6 right-6 z-50">
        {showWidget ? (
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 w-72 mb-4 relative animate-in slide-in-from-bottom-4">
            <button 
              onClick={() => setShowWidget(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h4 className="font-black text-brand-black text-lg mb-2 pr-6">¿Tienes dudas? Te ayudamos con amor</h4>
            <p className="text-gray-500 text-sm font-medium mb-6">Horario de soporte:<br/>Lunes a Sábado, 8:00 AM - 6:00 PM (COL)</p>
            <a 
              href={\`https://wa.me/\${SOPORTE_WHATSAPP}\`}
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

      {/* Footer */}`;
if (content.includes(footerStr) && !content.includes("Atendido por personas, no por máquinas")) {
  content = content.replace(footerStr, supportSection);
}

fs.writeFileSync('components/LandingPage.tsx', content);

// Update T&C
let terms = fs.readFileSync('TERMINOS_Y_CONDICIONES.md', 'utf8');
terms = terms.replace(/\+57 300 123 4567/g, "+57 3247804513");
fs.writeFileSync('TERMINOS_Y_CONDICIONES.md', terms);

console.log("Patch applied successfully!");
