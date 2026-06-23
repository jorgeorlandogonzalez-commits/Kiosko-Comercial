import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Settings, Users, UserCircle, 
  LogOut, Package, MoveLeft, MoveRight, Edit2, Check, LayoutGrid, ClipboardList, FileSpreadsheet, FilePieChart, FileText, 
  Maximize2, Minimize2, Wallet
} from 'lucide-react';
import { Operator } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Operator | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  storeSettings?: any;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const INITIAL_NAV_ITEMS: NavItem[] = [
  { id: 'pos', label: 'Caja', icon: <ShoppingCart size={20} /> },
  { id: 'inventory', label: 'Inventarios', icon: <Package size={20} /> },
  { id: 'cxc', label: 'Fiados', icon: <Users size={20} /> },
  { id: 'orders', label: 'Compras', icon: <ClipboardList size={20} /> },
  { id: 'quotes', label: 'Cotizar', icon: <FileSpreadsheet size={20} /> },
  { id: 'expenses', label: 'Gastos', icon: <Wallet size={20} /> },
  { id: 'invoices', label: 'Facturas', icon: <FileText size={20} /> },
  { id: 'dashboard', label: 'Estadísticos', icon: <LayoutGrid size={20} /> },
  { id: 'reports', label: 'Reportes', icon: <FilePieChart size={20} /> },
  { id: 'settings', label: 'Ajustes', icon: <Settings size={20} /> },
];

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogoutClick,
  storeSettings
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [systemTime, setSystemTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reloj del Sistema
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listener para cambio de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Formato Hora Colombia 24H
  const timeString = systemTime.toLocaleTimeString('es-CO', { 
    timeZone: 'America/Bogota', 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Cargar orden personalizado desde localStorage
  useEffect(() => {
    const key = currentUser?.id ? `kiosko_${currentUser.id}_nav_order` : 'kiosko_nav_order';
    const savedOrder = localStorage.getItem(key);
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const reordered = orderIds
          .map(id => INITIAL_NAV_ITEMS.find(item => item.id === id))
          .filter((item): item is NavItem => item !== undefined);
        
        const missing = INITIAL_NAV_ITEMS.filter(item => !orderIds.includes(item.id));
        setNavItems([...reordered, ...missing]);
      } catch (e) {
        setNavItems(INITIAL_NAV_ITEMS);
      }
    } else {
      setNavItems(INITIAL_NAV_ITEMS);
    }
  }, [currentUser?.id]);

  // Filtrado de pestañas por Rol
  const filteredNavItems = navItems.filter(item => {
    if (currentUser?.role === 'ADMIN') return true;
    // Pestañas restringidas para CAJERO
    const restrictedTabs = ['settings', 'reports', 'expenses'];
    return !restrictedTabs.includes(item.id);
  });

  const saveOrder = (items: NavItem[]) => {
    const key = currentUser?.id ? `kiosko_${currentUser.id}_nav_order` : 'kiosko_nav_order';
    localStorage.setItem(key, JSON.stringify(items.map(i => i.id)));
  };

  const moveItem = (index: number, direction: 'left' | 'right') => {
    const newItems = [...navItems];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      const temp = newItems[index];
      newItems[index] = newItems[targetIndex];
      newItems[targetIndex] = temp;
      setNavItems(newItems);
      saveOrder(newItems);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <nav className="bg-brand-black text-white h-16 md:h-20 flex-shrink-0 z-50 shadow-xl border-b-4 border-brand-red flex items-center justify-between px-4">
      <div className="flex items-center gap-2 shrink-0">
        {storeSettings?.logoUrl ? (
           <img src={storeSettings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white p-0.5" referrerPolicy="no-referrer" />
        ) : (
           <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center font-black text-xl shadow-lg">K</div>
        )}
        <div className="hidden sm:flex flex-col leading-none">
          <span className="font-black text-lg text-white">
            {storeSettings?.name ? storeSettings.name.split(' ')[0] : 'Kiosko'}
          </span>
          <span className="text-[10px] font-black text-brand-red bg-white px-1 rounded-sm uppercase">
            {storeSettings?.name && storeSettings.name.split(' ')[1] ? storeSettings.name.split(' ').slice(1).join(' ') : 'COMERCIAL'}
          </span>
        </div>
      </div>

      {/* Menú Scrollable - Alineado a la izquierda (justify-start) para evitar recorte */}
      <div className="flex-1 flex justify-start px-4 overflow-x-auto no-scrollbar mask-gradient-x">
        <div className={`flex items-center p-1.5 rounded-2xl transition-all ${isEditMode ? 'bg-white/5 border-2 border-dashed border-white/20' : ''}`}>
          {filteredNavItems.map((item, index) => (
            <div key={item.id} className="relative group flex items-center">
              {isEditMode && index > 0 && (
                <button 
                  onClick={() => moveItem(index, 'left')}
                  className="absolute -left-2 z-10 bg-brand-red text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                  <MoveLeft size={12} />
                </button>
              )}

              <button
                onClick={() => !isEditMode && setActiveTab(item.id)}
                className={`flex items-center px-4 py-2 rounded-xl text-xs font-black transition-all gap-2 shrink-0 mx-1
                  ${activeTab === item.id ? 'bg-brand-red text-white shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}
                  ${isEditMode ? 'cursor-default opacity-80 border border-white/10 scale-95' : 'cursor-pointer'}`}
              >
                {item.icon}
                <span className="uppercase tracking-wider hidden md:inline">{item.label}</span>
              </button>

              {isEditMode && index < filteredNavItems.length - 1 && (
                <button 
                  onClick={() => moveItem(index, 'right')}
                  className="absolute -right-2 z-10 bg-brand-red text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                  <MoveRight size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button 
            onClick={toggleFullscreen}
            className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title={isFullscreen ? "Salir Pantalla Completa" : "Pantalla Completa"}
        >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className={`p-2.5 rounded-xl transition-all border-2 flex items-center gap-2
            ${isEditMode ? 'bg-green-600 border-green-400 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
          title={isEditMode ? "Finalizar Edición" : "Organizar Menú"}
        >
          {isEditMode ? <Check size={18} /> : <Edit2 size={18} />}
        </button>

        {currentUser && (
          <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 bg-white/10 p-1 pr-3 rounded-full border border-white/20 hover:bg-white/20 transition-all ml-2">
            <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center text-white">
              <UserCircle size={20} />
            </div>
            <span className="hidden sm:block text-xs font-black truncate max-w-[80px]">{currentUser.name.split(' ')[0]}</span>
          </button>
        )}
      </div>

      {showLogoutConfirm && (
          <div className="fixed inset-0 z-[300] bg-brand-black/90 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center border-t-8 border-brand-red shadow-2xl">
                  <div className="w-16 h-16 bg-red-50 text-brand-red rounded-full flex items-center justify-center mx-auto mb-4">
                      <LogOut size={32} />
                  </div>
                  <h3 className="text-xl font-black text-brand-black mb-2 uppercase">Cerrar Sesión</h3>
                  <p className="text-gray-500 text-sm mb-6">¿Deseas salir del terminal?</p>
                  <div className="flex flex-col gap-3">
                      <button onClick={() => { onLogoutClick(); setShowLogoutConfirm(false); }} className="w-full py-3 bg-brand-red text-white font-black rounded-xl uppercase hover:bg-brand-darkRed transition-all">Sí, Salir</button>
                      <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-3 bg-gray-100 text-gray-600 font-black rounded-xl uppercase hover:bg-gray-200 transition-all">Cancelar</button>
                  </div>
              </div>
          </div>
      )}
    </nav>
  );
};