import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { UserPlus, X, Search, Hash, UserCheck, User, Phone, Mail, MapPin, Save } from 'lucide-react';

interface CustomerModalProps {
  onClose: () => void;
  onSave: (customer: Customer) => void;
  initialCustomer?: Partial<Customer>;
  customers: Customer[];
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ onClose, onSave, initialCustomer, customers }) => {
  const [customerNit, setCustomerNit] = useState(initialCustomer?.nit || '');
  const [customerName, setCustomerName] = useState(initialCustomer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(initialCustomer?.email || '');
  const [customerAddress, setCustomerAddress] = useState(initialCustomer?.address || '');
  const [customerBranch, setCustomerBranch] = useState(initialCustomer?.branch || '');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerFieldError, setCustomerFieldError] = useState<'nit' | 'name' | 'phone' | 'email' | null>(null);

  const handleCustomerNitChange = (val: string) => {
    const numbersOnly = val.replace(/[^0-9]/g, '');
    setCustomerNit(numbersOnly);
    setCustomerFieldError(null);
    const existing = customers.find(c => c.nit === numbersOnly);
    if (existing) {
      setCustomerName(existing.name);
      setCustomerPhone(existing.phone || '');
      setCustomerEmail(existing.email || '');
      setCustomerAddress(existing.address || '');
      setCustomerBranch(existing.branch || '');
    }
  };

  const saveCurrentCustomer = () => {
    if (!customerNit || customerNit.trim() === '') {
      setCustomerFieldError('nit');
      return;
    }
    if (!customerName || customerName.trim() === '') {
      setCustomerFieldError('name');
      return;
    }
    onSave({
      nit: customerNit,
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress,
      branch: customerBranch
    });
  };

  return (
    <div className="fixed inset-0 z-[600] bg-brand-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-brand-black uppercase tracking-tighter flex items-center gap-2">
              <UserPlus className="text-brand-red"/> Datos del Cliente
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Información de Contacto</p>
          </div>
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 p-2 rounded-full transition-all"><X size={20}/></button>
        </div>
        
        <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-1 mb-6 relative">
            <label className="text-[10px] font-black text-blue-500 uppercase ml-1">Buscar Cliente Existente</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18}/>
              <input 
                type="text" 
                value={customerSearchQuery}
                onChange={e => {
                  setCustomerSearchQuery(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                className="w-full pl-12 pr-4 py-4 bg-blue-50 text-blue-900 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-400 transition-all placeholder:text-blue-300"
                placeholder="Buscar por NIT o Nombre..."
              />
              {showCustomerDropdown && customerSearchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-50">
                  {customers.filter(c => c.nit.includes(customerSearchQuery) || c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).length > 0 ? (
                    customers.filter(c => c.nit.includes(customerSearchQuery) || c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).map(c => (
                      <div 
                        key={`${c.nit}-${c.branch || ''}`} 
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCustomerNit(c.nit);
                          setCustomerName(c.name);
                          setCustomerPhone(c.phone || '');
                          setCustomerEmail(c.email || '');
                          setCustomerAddress(c.address || '');
                          setCustomerBranch(c.branch || '');
                          setCustomerSearchQuery('');
                          setShowCustomerDropdown(false);
                        }}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                      >
                        <div className="font-bold text-sm text-gray-800">{c.name} {c.branch ? `(${c.branch})` : ''}</div>
                        <div className="text-xs text-gray-500">NIT: {c.nit}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500 font-bold">No se encontraron clientes</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">NIT o Cédula (Sin puntos)</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                value={customerNit}
                onChange={e => handleCustomerNitChange(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl outline-none font-mono font-bold text-lg focus:ring-2 transition-all placeholder:text-gray-300 ${customerFieldError === 'nit' ? 'ring-2 ring-brand-red' : 'focus:ring-brand-red'}`}
                placeholder="Ej: 1020304050"
                autoFocus
              />
              {customers.some(c => c.nit === customerNit) && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 flex items-center gap-1 text-[10px] font-black uppercase bg-green-100 px-2 py-1 rounded-lg">
                  <UserCheck size={14}/> Encontrado
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nombre Completo / Razón Social</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl outline-none font-bold uppercase text-sm focus:ring-2 transition-all placeholder:text-gray-300 ${customerFieldError === 'name' ? 'ring-2 ring-brand-red' : 'focus:ring-brand-red'}`}
                placeholder="NOMBRE DEL CLIENTE"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Celular / WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input 
                  type="text" 
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 transition-all placeholder:text-gray-300 ${customerFieldError === 'phone' ? 'ring-2 ring-brand-red' : 'focus:ring-brand-red'}`}
                  placeholder="300..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input 
                  type="email" 
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 transition-all placeholder:text-gray-300 ${customerFieldError === 'email' ? 'ring-2 ring-brand-red' : 'focus:ring-brand-red'}`}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Dirección Física</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl outline-none font-bold uppercase text-sm focus:ring-2 focus:ring-brand-red transition-all placeholder:text-gray-300"
                placeholder="DIRECCIÓN DE ENTREGA"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Sucursal / Info Extra (Opcional)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                value={customerBranch}
                onChange={e => setCustomerBranch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl outline-none font-bold uppercase text-sm focus:ring-2 focus:ring-brand-red transition-all placeholder:text-gray-300"
                placeholder="EJ: SUCURSAL NORTE, SEDE PRINCIPAL..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={saveCurrentCustomer}
            className="flex-1 py-4 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-brand-darkRed shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Save size={18}/> Guardar Datos
          </button>
        </div>
      </div>
    </div>
  );
};
