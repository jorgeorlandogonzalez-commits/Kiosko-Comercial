import React from 'react';
import { ShoppingCart, Package, FileText, LayoutGrid, Settings, LogOut, Menu, X, UserCircle } from 'lucide-react';
import { Operator } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Operator | null;
  onLogoutClick: () => void;
  storeSettings?: any;
  isOpenMobile: boolean;
  setIsOpenMobile: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogoutClick, 
  storeSettings,
  isOpenMobile,
  setIsOpenMobile
}) => {
  const getGroup = (tab: string) => {
    if (['hub-ventas', 'pos', 'quotes', 'cxc', 'customers'].includes(tab)) return 'hub-ventas';
    if (['hub-inventario', 'inventory', 'orders'].includes(tab)) return 'hub-inventario';
    if (['hub-dian', 'invoices', 'habilitador'].includes(tab)) return 'hub-dian';
    if (['hub-numeros', 'dashboard', 'reports', 'expenses'].includes(tab)) return 'hub-numeros';
    if (['settings'].includes(tab)) return 'settings';
    return '';
  };

  const activeGroup = getGroup(activeTab);

  const navItems = [
    { id: 'hub-ventas', label: 'Ventas', icon: <ShoppingCart size={24} /> },
    { id: 'hub-inventario', label: 'Inventario', icon: <Package size={24} /> },
    { id: 'hub-dian', label: 'DIAN', icon: <FileText size={24} /> },
    { id: 'hub-numeros', label: 'Números', icon: <LayoutGrid size={24} /> },
    { id: 'settings', label: 'Ajustes', icon: <Settings size={24} /> },
  ];

  const handleNav = (id: string) => {
    setActiveTab(id);
    setIsOpenMobile(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-brand-black text-white w-64 border-r-4 border-brand-red flex-shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-white/10 shrink-0">
        {storeSettings?.logoUrl ? (
           <img src={storeSettings.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl bg-white p-1" referrerPolicy="no-referrer" />
        ) : (
           <div className="w-12 h-12 bg-brand-red rounded-xl flex items-center justify-center font-black text-2xl shadow-lg">K</div>
        )}
        <div className="flex flex-col leading-none overflow-hidden">
          <span className="font-black text-xl text-white truncate">
            {storeSettings?.name ? storeSettings.name.split(' ')[0] : 'Kiosko'}
          </span>
          <span className="text-xs font-black text-brand-red bg-white px-1.5 py-0.5 rounded-sm uppercase inline-block w-max mt-1">
            {storeSettings?.name && storeSettings.name.split(' ')[1] ? storeSettings.name.split(' ').slice(1).join(' ') : 'COMERCIAL'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        {navItems.map(item => {
          const isActive = activeGroup === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all ${
                isActive 
                  ? 'bg-brand-red text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {currentUser && (
        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center text-white shrink-0">
              <UserCircle size={24} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-black text-white truncate">{currentUser.name}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">{currentUser.role}</span>
            </div>
          </div>
          <button 
            onClick={onLogoutClick}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-brand-red text-white rounded-xl font-black uppercase text-xs transition-all"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block h-full">
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-[900] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpenMobile(false)} />
          <div className="absolute inset-y-0 left-0 w-64 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
          <button 
            onClick={() => setIsOpenMobile(false)}
            className="absolute top-4 left-[270px] bg-white text-black p-2 rounded-full shadow-lg"
          >
            <X size={24} />
          </button>
        </div>
      )}
    </>
  );
};
