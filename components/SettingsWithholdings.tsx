import React, { useState, useEffect } from 'react';
import { Percent, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { Withholding } from '../types';
import { getWithholdings, saveWithholdings } from '../services/storageService';

export const SettingsWithholdings: React.FC = () => {
  const [withholdings, setWithholdings] = useState<Withholding[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Withholding>>({});

  useEffect(() => {
    setWithholdings(getWithholdings());
  }, []);

  const handleSave = () => {
    if (!formData.name || !formData.percentage || !formData.type) return;
    
    let updated: Withholding[];
    if (isEditing) {
      updated = withholdings.map(w => w.id === isEditing ? { ...w, ...formData } as Withholding : w);
    } else {
      updated = [...withholdings, {
        id: Date.now().toString(),
        name: formData.name,
        type: formData.type as any,
        percentage: Number(formData.percentage),
        pucSales: formData.pucSales || '',
        pucPurchases: formData.pucPurchases || '',
        isActive: true
      }];
    }
    
    setWithholdings(updated);
    saveWithholdings(updated);
    setIsEditing(null);
    setFormData({});
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta retención?')) {
      const updated = withholdings.filter(w => w.id !== id);
      setWithholdings(updated);
      saveWithholdings(updated);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
      <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Percent className="text-gray-500" size={20} />
          <h2 className="font-bold text-gray-800 uppercase tracking-widest text-sm">Configuración de Retenciones</h2>
        </div>
      </div>
      
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-6">Configura las retenciones (Retefuente, ReteICA, ReteIVA) que tus clientes te aplican. Podrás seleccionarlas al momento de cobrar en la caja.</p>
        
        {/* Formulario */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
            <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Retefuente Compras" className="w-full border-b-2 border-gray-300 bg-transparent py-2 px-1 focus:border-brand-black outline-none font-bold text-gray-800" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
            <select value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full border-b-2 border-gray-300 bg-transparent py-2 px-1 focus:border-brand-black outline-none font-bold text-gray-800">
              <option value="">Seleccionar...</option>
              <option value="ReteFuente">ReteFuente</option>
              <option value="ReteICA">ReteICA</option>
              <option value="ReteIVA">ReteIVA</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Porcentaje (%)</label>
            <input type="number" step="0.001" value={formData.percentage || ''} onChange={e => setFormData({...formData, percentage: Number(e.target.value)})} placeholder="Ej. 2.5" className="w-full border-b-2 border-gray-300 bg-transparent py-2 px-1 focus:border-brand-black outline-none font-bold text-gray-800" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Cuenta PUC</label>
            <input type="text" value={formData.pucSales || ''} onChange={e => setFormData({...formData, pucSales: e.target.value})} placeholder="Ej. 135515" className="w-full border-b-2 border-gray-300 bg-transparent py-2 px-1 focus:border-brand-black outline-none font-bold text-gray-800" />
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={handleSave} className="bg-brand-black text-white px-4 py-2 rounded-lg font-bold text-sm w-full flex items-center justify-center gap-2 hover:bg-gray-800">
              <CheckCircle2 size={16} /> {isEditing ? 'Guardar' : 'Agregar'}
            </button>
            {isEditing && (
              <button onClick={() => { setIsEditing(null); setFormData({}); }} className="text-gray-500 text-xs font-bold underline text-center">Cancelar</button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre</th>
                <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">% Valor</th>
                <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Cuenta PUC</th>
                <th className="py-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {withholdings.map(w => (
                <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-bold text-gray-700">{w.name}</td>
                  <td className="py-3 px-2 text-gray-600">{w.type}</td>
                  <td className="py-3 px-2 font-bold text-brand-black">{w.percentage}%</td>
                  <td className="py-3 px-2 text-gray-500">{w.pucSales || '-'}</td>
                  <td className="py-3 px-2 flex justify-end gap-2">
                    <button onClick={() => { setIsEditing(w.id); setFormData(w); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(w.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {withholdings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">No hay retenciones configuradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
