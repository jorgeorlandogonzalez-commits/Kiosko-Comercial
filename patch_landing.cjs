const fs = require('fs');

let content = fs.readFileSync('components/LandingPage.tsx', 'utf8');

// 1. Change Imports
content = content.replace(
  "import { Store, WifiOff, FileText, CheckCircle2, ChevronRight, Calculator, Smartphone, ShieldCheck } from 'lucide-react';",
  "import { Store, WifiOff, FileText, CheckCircle2, ChevronRight, Calculator, Smartphone, ShieldCheck, MessageCircle, X, ShoppingCart, Coffee, Hammer, User2 } from 'lucide-react';"
);

// 2. Constants
content = content.replace(
  'const SOPORTE_WHATSAPP = "573001234567";',
  'const SOPORTE_WHATSAPP = "573247804513";\nconst SOPORTE_HUMANO = { nombre: "Jorge González", rol: "Fundador — Soporte directo", iniciales: "JG" };'
);

// 3. States & Routing
const newStates = `
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
      <h1 className="text-5xl md:text-6xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
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
      <h1 className="text-5xl md:text-6xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
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
      <h1 className="text-5xl md:text-6xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
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
`;

content = content.replace(
  'const [isAnnual, setIsAnnual] = useState(false);',
  newStates
);

// 4. Hero section replacement (Headline & Bullets)
const originalHeadlineBlock = `          <h1 className="text-5xl md:text-6xl font-black text-brand-black leading-[1.1] tracking-tighter mb-6">
            Facturación Electrónica <span className="text-brand-red">Para Tu Negocio.</span> Sin Complicaciones.
          </h1>`;
content = content.replace(originalHeadlineBlock, `          {heroHeadline}`);

const originalBulletsBlock = `          <div className="mt-8 flex items-center gap-4 text-sm font-bold text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500"/> Sin contratos</span>
            <span className="flex items-center gap-1"><CheckCircle2 size={16} className="text-green-500"/> Soporte WhatsApp</span>
          </div>`;

const newBulletsBlock = `          <div className="mt-8 flex flex-col gap-3 text-sm font-bold text-gray-600">
            {heroBullets.map((bullet, idx) => (
              <span key={idx} className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                <span className="leading-tight">{bullet}</span>
              </span>
            ))}
          </div>`;
// Wait, the original bullets block might not be exactly that.
