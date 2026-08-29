import React from 'react';
import { ShoppingCart, FileSpreadsheet, Users, UserPlus, Package, ClipboardList, FileText, BadgeCheck, LayoutGrid, FilePieChart, Wallet, ChevronRight } from 'lucide-react';

const HubButton: React.FC<{ icon: React.ReactNode, title: string, subtitle: string, onClick: () => void }> = ({ icon, title, subtitle, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white border-2 border-gray-100 hover:border-brand-red hover:shadow-xl rounded-[2rem] p-6 sm:p-8 flex items-center gap-4 sm:gap-6 text-left transition-all group min-h-[100px]"
  >
    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <h3 className="text-xl sm:text-2xl font-black text-brand-black uppercase">{title}</h3>
      <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">{subtitle}</p>
    </div>
    <ChevronRight className="text-gray-300 group-hover:text-brand-red transition-colors shrink-0" size={32} />
  </button>
);

const HubLayout: React.FC<{ title: string, subtitle: string, children: React.ReactNode, icon: React.ReactNode }> = ({ title, subtitle, children, icon }) => (
  <div className="h-full flex flex-col bg-gray-50 p-4 md:p-8 overflow-y-auto">
    <div className="mb-8">
      <h2 className="text-3xl md:text-4xl font-black text-brand-black uppercase tracking-tighter flex items-center gap-3">
        <span className="text-brand-red">{icon}</span>
        {title}
      </h2>
      <p className="text-gray-500 font-medium mt-2 text-lg">{subtitle}</p>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-5xl">
      {children}
    </div>
  </div>
);

export const HubVentas: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => (
  <HubLayout title="Ventas" subtitle="Factura, cotiza y maneja a tus clientes" icon={<ShoppingCart size={40} />}>
    <HubButton icon={<ShoppingCart size={32} />} title="Punto de Venta" subtitle="Vende y factura en segundos" onClick={() => onNavigate('pos')} />
    <HubButton icon={<FileSpreadsheet size={32} />} title="Cotizaciones" subtitle="Arma la cotización y vuélvela venta con un clic" onClick={() => onNavigate('quotes')} />
    <HubButton icon={<Users size={32} />} title="Fiados (CxC)" subtitle="Quién te debe y cuánto, sin libreta" onClick={() => onNavigate('cxc')} />
    <HubButton icon={<UserPlus size={32} />} title="Clientes" subtitle="Tu libreta digital con NIT listo para la DIAN" onClick={() => onNavigate('customers')} />
  </HubLayout>
);

export const HubInventario: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => (
  <HubLayout title="Inventario" subtitle="Controla tu surtido y tus compras" icon={<Package size={40} />}>
    <HubButton icon={<Package size={32} />} title="Productos" subtitle="Tu surtido con stock y precios al día" onClick={() => onNavigate('inventory')} />
    <HubButton icon={<ClipboardList size={32} />} title="Compras" subtitle="Legaliza el surtido y maneja proveedores" onClick={() => onNavigate('orders')} />
  </HubLayout>
);

export const HubDian: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => (
  <HubLayout title="DIAN" subtitle="Historial y configuración de facturación electrónica" icon={<FileText size={40} />}>
    <HubButton icon={<FileText size={32} />} title="Historial de Facturas" subtitle="Tus envíos a la DIAN con reenvío en un clic" onClick={() => onNavigate('invoices')} />
    <HubButton icon={<BadgeCheck size={32} />} title="Software Habilitador" subtitle="Certificado y resolución de tu negocio" onClick={() => onNavigate('habilitador')} />
  </HubLayout>
);

export const HubNumeros: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => (
  <HubLayout title="Números" subtitle="Conoce la salud financiera de tu negocio" icon={<LayoutGrid size={40} />}>
    <HubButton icon={<LayoutGrid size={32} />} title="Dashboard de Hoy" subtitle="La foto del día en un vistazo" onClick={() => onNavigate('dashboard')} />
    <HubButton icon={<FilePieChart size={32} />} title="Reportes" subtitle="Ventas, compras y ganancias en un solo lugar" onClick={() => onNavigate('reports')} />
    <HubButton icon={<Wallet size={32} />} title="Gastos" subtitle="La plata que sale del local" onClick={() => onNavigate('expenses')} />
  </HubLayout>
);
