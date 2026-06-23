import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, PaymentMethod, StoreSettings } from '../types';
import { Plus, Trash, Search, DollarSign, Calendar, Tag, FileText, AlertTriangle, X, Printer, Edit2 } from 'lucide-react';
import { getColombiaISO } from '../services/dianService';

interface ExpensesProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onEditExpense: (expense: Expense) => void;
  storeSettings: StoreSettings;
}

const getColombiaDateString = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

export const Expenses: React.FC<ExpensesProps> = ({ expenses, onAddExpense, onDeleteExpense, onEditExpense, storeSettings }) => {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Servicios');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [reference, setReference] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'ALL'>('ALL');
  
  const allCategories = useMemo(() => {
    const defaultCategories = ['Servicios', 'Nómina', 'Arriendo', 'Insumos', 'Mantenimiento', 'Impuestos', 'Otros'];
    const usedCategories = expenses.map(e => e.category);
    return Array.from(new Set([...defaultCategories, ...usedCategories]));
  }, [expenses]);

  const todayStr = getColombiaDateString(new Date().toISOString());
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const finalCategory = isNewCategory ? newCategoryName.trim() : category;
    if (!finalCategory) {
      alert("Por favor ingrese el nombre de la nueva categoría.");
      return;
    }

    const now = new Date();
    const [year, month, day] = expenseDate.split('-');
    const expenseDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();

    if (editingExpenseId) {
      const updatedExpense: Expense = {
        id: editingExpenseId,
        date: expenseDateTime,
        description,
        amount: parseFloat(amount),
        category: finalCategory,
        paymentMethod,
        reference
      };
      onEditExpense(updatedExpense);
    } else {
      const newExpense: Expense = {
        id: `EXP-${Date.now()}`,
        date: expenseDateTime,
        description,
        amount: parseFloat(amount),
        category: finalCategory,
        paymentMethod,
        reference
      };
      onAddExpense(newExpense);
    }
    
    // Reset form
    setDescription('');
    setAmount('');
    setReference('');
    setNewCategoryName('');
    setIsNewCategory(false);
    setCategory(finalCategory);
    setExpenseDate(todayStr);
    setEditingExpenseId(null);
    setShowForm(false);
  };

  const handleEditClick = (expense: Expense) => {
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setPaymentMethod(expense.paymentMethod);
    setReference(expense.reference || '');
    setExpenseDate(getColombiaDateString(expense.date));
    setIsNewCategory(false);
    setEditingExpenseId(expense.id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setDescription('');
    setAmount('');
    setReference('');
    setNewCategoryName('');
    setIsNewCategory(false);
    setCategory('Servicios');
    setExpenseDate(todayStr);
    setEditingExpenseId(null);
    setShowForm(false);
  };

  const handlePrintExpense = (expense: Expense) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Egreso</title>
        <style>
          body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .title { font-weight: bold; font-size: 1.2em; margin-bottom: 5px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { font-weight: bold; font-size: 1.2em; margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          .footer { text-align: center; margin-top: 30px; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${storeSettings.name}</div>
          <div>NIT: ${storeSettings.nit}</div>
          <div>COMPROBANTE DE EGRESO</div>
          <div>Nº ${expense.id.replace('EXP-', '')}</div>
        </div>
        
        <div class="row">
          <span>Fecha:</span>
          <span>${new Date(expense.date).toLocaleDateString('es-CO')}</span>
        </div>
        <div class="row">
          <span>Hora:</span>
          <span>${new Date(expense.date).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div class="row">
          <span>Categoría:</span>
          <span>${expense.category}</span>
        </div>
        <div class="row">
          <span>Método:</span>
          <span>${expense.paymentMethod}</span>
        </div>
        ${expense.reference ? `<div class="row"><span>Ref:</span><span>${expense.reference}</span></div>` : ''}
        
        <div style="margin-top: 15px; margin-bottom: 5px; font-weight: bold;">Concepto:</div>
        <div style="margin-bottom: 15px;">${expense.description}</div>
        
        <div class="row total">
          <span>TOTAL:</span>
          <span>$${expense.amount.toLocaleString()}</span>
        </div>
        
        <div class="footer">
          <div>_______________________</div>
          <div>Firma / Recibí Conforme</div>
        </div>
        <script>
          window.onload = () => { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = getColombiaDateString(exp.date);
      const matchesDate = expDate >= startDate && expDate <= endDate;
      const matchesCategory = filterCategory === 'ALL' || exp.category === filterCategory;
      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (exp.reference && exp.reference.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesDate && matchesCategory && matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, startDate, endDate, filterCategory, searchTerm]);

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const confirmDeleteExpense = () => {
      if (expenseToDelete) {
          onDeleteExpense(expenseToDelete);
          setExpenseToDelete(null);
      }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      {/* MODAL ELIMINAR GASTO */}
      {expenseToDelete && (
          <div className="fixed inset-0 z-[600] bg-brand-black/95 flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden border-t-[12px] border-brand-red shadow-2xl animate-in zoom-in-95 flex flex-col">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2"><AlertTriangle className="text-brand-red" /> Eliminar Gasto</h3>
                      </div>
                      <button onClick={() => setExpenseToDelete(null)} className="p-2 hover:bg-gray-200 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  <div className="p-8">
                      <p className="text-gray-600 mb-6 text-center">¿Estás seguro de eliminar este gasto?</p>
                      <div className="flex gap-4">
                          <button onClick={() => setExpenseToDelete(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all">Cancelar</button>
                          <button onClick={confirmDeleteExpense} className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/30">Eliminar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-brand-black tracking-tight">Control de Gastos</h1>
          <p className="text-gray-500">Registra y analiza los egresos del negocio</p>
        </div>
        <button 
          onClick={() => {
            if (showForm) {
              handleCancelEdit();
            } else {
              setShowForm(true);
            }
          }}
          className="bg-brand-black text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-red transition-all flex items-center gap-2 shadow-lg"
        >
          {showForm ? 'Cancelar' : <><Plus size={20} /> Nuevo Gasto</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><DollarSign className="text-brand-red"/> {editingExpenseId ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Fecha *</label>
              <input 
                type="date" 
                required
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Descripción *</label>
              <input 
                type="text" 
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none"
                placeholder="Ej. Pago de luz, Compra de bolsas..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor ($) *</label>
              <input 
                type="number" 
                required
                min="0"
                step="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none font-mono text-lg"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Categoría</label>
              <select 
                value={isNewCategory ? 'NEW' : category}
                onChange={e => {
                  if (e.target.value === 'NEW') {
                    setIsNewCategory(true);
                  } else {
                    setIsNewCategory(false);
                    setCategory(e.target.value);
                  }
                }}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none"
              >
                {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                <option value="NEW" className="font-bold text-brand-red">+ Nueva Categoría...</option>
              </select>
              {isNewCategory && (
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Nombre de la nueva categoría"
                  className="w-full mt-2 p-3 bg-white border border-brand-red rounded-xl focus:ring-2 focus:ring-brand-red outline-none"
                  autoFocus
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Método de Pago</label>
              <select 
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none"
              >
                <option value={PaymentMethod.CASH}>Efectivo (Caja)</option>
                <option value={PaymentMethod.TRANSFER}>Transferencia / Nequi</option>
                <option value={PaymentMethod.CARD}>Tarjeta</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Referencia / Factura (Opcional)</label>
              <input 
                type="text" 
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none"
                placeholder="Nº de factura, recibo, etc."
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
              <button type="submit" className="bg-brand-red text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-md">
                {editingExpenseId ? 'Actualizar Gasto' : 'Guardar Gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        {/* Filtros */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar gasto..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3">
            <Calendar size={18} className="text-gray-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full py-2.5 bg-transparent outline-none text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3">
            <Calendar size={18} className="text-gray-400" />
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full py-2.5 bg-transparent outline-none text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3">
            <Tag size={18} className="text-gray-400" />
            <select 
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as any)}
              className="w-full py-2.5 bg-transparent outline-none text-sm font-medium"
            >
              <option value="ALL">Todas las Categorías</option>
              {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        {/* Resumen */}
        <div className="p-4 bg-brand-black text-white flex justify-between items-center">
          <span className="font-bold uppercase tracking-wider text-sm text-gray-300">Total Gastos (Periodo)</span>
          <span className="text-2xl font-black">${totalExpenses.toLocaleString()}</span>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 shadow-sm z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Fecha</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Descripción</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Categoría</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Pago</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Valor</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium text-gray-500">No hay gastos registrados en este periodo</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600">
                      <div className="font-medium">{new Date(exp.date).toLocaleDateString('es-CO')}</div>
                      <div className="text-xs text-gray-400">{new Date(exp.date).toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{exp.description}</div>
                      {exp.reference && <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><FileText size={12}/> Ref: {exp.reference}</div>}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold border border-gray-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-medium">{exp.paymentMethod}</td>
                    <td className="p-4 text-right font-mono font-bold text-brand-red">
                      ${exp.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handlePrintExpense(exp)}
                          className="p-2 text-gray-400 hover:text-brand-black hover:bg-gray-100 rounded-lg transition-colors"
                          title="Imprimir Gasto"
                        >
                          <Printer size={18} />
                        </button>
                        <button 
                          onClick={() => handleEditClick(exp)}
                          className="p-2 text-gray-400 hover:text-brand-black hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar Gasto"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setExpenseToDelete(exp.id)}
                          className="p-2 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar Gasto"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
