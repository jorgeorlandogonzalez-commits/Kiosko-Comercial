import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { Search, Plus, User, FileText, Phone, Mail, Edit2 } from 'lucide-react';
import { CustomerModal } from './CustomerModal';

export const Customers: React.FC<{
  customers: Customer[];
  onSaveCustomer: (c: Customer) => void;
}> = ({ customers, onSaveCustomer }) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.nit.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const handleEdit = (c: Customer) => {
    setEditingCustomer(c);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingCustomer(undefined);
    setShowModal(true);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-4 md:p-8">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black uppercase tracking-tighter flex items-center gap-3">
            <User className="text-brand-red" size={32} />
            Clientes
          </h2>
          <p className="text-gray-500 font-medium">Tu libreta digital con NIT listo para la DIAN</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-brand-red text-white px-6 py-4 rounded-2xl font-black uppercase text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-xl"
        >
          <Plus size={20} />
          Agregar Cliente
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por Nombre o NIT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-brand-red transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <User size={64} className="mb-4 opacity-20" />
              <p className="font-bold text-lg">No hay clientes registrados</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map(c => (
                <div 
                  key={c.nit} 
                  className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-brand-red/50 transition-all cursor-pointer group"
                  onClick={() => handleEdit(c)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-brand-black text-lg uppercase">{c.name}</h4>
                      {c.branch && <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-md font-bold uppercase">{c.branch}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-medium">
                      <span className="flex items-center gap-1"><FileText size={14}/> NIT: {c.nit}</span>
                      {c.phone && <span className="flex items-center gap-1"><Phone size={14}/> {c.phone}</span>}
                      {c.email && (
                        <span className="flex items-center gap-1" title={c.email}>
                          <Mail size={14}/> {c.email.length > 25 ? c.email.substring(0, 25) + '...' : c.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="bg-gray-100 text-gray-600 p-3 rounded-xl group-hover:bg-brand-red group-hover:text-white transition-all shrink-0">
                    <Edit2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CustomerModal
          customers={customers}
          initialCustomer={editingCustomer}
          onClose={() => setShowModal(false)}
          onSave={(c) => {
            onSaveCustomer(c);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};
