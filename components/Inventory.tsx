import React, { useState, useMemo, useRef } from 'react';
import { Product, KardexEntry } from '../types';
import { 
  Package, Search, Plus, Trash2, Edit3, X, Minus, 
  AlertTriangle, Star, TrendingUp, List, LayoutGrid, 
  History, ClipboardCheck, ScanBarcode, ArrowDown, ArrowUp, 
  Info, Filter, Save, Tag, Calculator, Percent, FileSearch, Banknote, DollarSign, Clock, Trash, Boxes, Upload, Image as ImageIcon
} from 'lucide-react';

interface InventoryProps {
  products: Product[];
  kardexEntries: KardexEntry[];
  categories: string[];
  onAddCategory: (category: string) => void;
  onAddProduct: (product: Product) => void;
  onUpdateProducts: (updatedProducts: Product[]) => void;
  onDeleteProduct: (id: string) => void;
  onPhysicalCount: (productId: string, newStock: number) => void;
}

type InvView = 'table' | 'catalog' | 'kardex' | 'conteo';

export const Inventory: React.FC<InventoryProps> = ({ 
  products, 
  kardexEntries,
  categories,
  onAddCategory,
  onAddProduct, 
  onUpdateProducts, 
  onDeleteProduct,
  onPhysicalCount
}) => {
  const [activeView, setActiveView] = useState<InvView>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState<string | null>(null);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [productForHistory, setProductForHistory] = useState<Product | null>(null);
  
  // Ref para el input de archivo oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  // formSalePrice representa el precio Base + IVA
  const [formSalePrice, setFormSalePrice] = useState<number>(0);
  const [formProduct, setFormProduct] = useState<Partial<Product>>({
      name: '', cost: 0, price: 0, taxRate: 19, consumptionTax: 0, category: 'General', stock: 0, icon: '📦', ean: '', isQuickAccess: false
  });

  // Estados locales para el modo Conteo
  const [conteoValues, setConteoValues] = useState<Record<string, number>>({});

  const filteredProducts = products.filter((p: Product) => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.ean && p.ean.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const inventoryStats = useMemo(() => {
      const totalCost = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
      const totalRetail = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
      const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
      return { totalCost, totalRetail, totalItems };
  }, [products]);

  const handleStockAdjust = (product: Product, delta: number) => {
      const newStock = Math.max(0, product.stock + delta);
      onPhysicalCount(product.id, newStock);
  };

  const toggleQuickAccess = (p: Product) => {
      const updated = products.map(item => 
          item.id === p.id ? { ...item, isQuickAccess: !item.isQuickAccess } : item
      );
      onUpdateProducts(updated);
  };

  // CÁLCULO DE PRECIO FINAL Y MARGEN (IC como valor fijo)
  const finalCalculations = useMemo(() => {
    const salePriceInput = Number(formSalePrice) || 0;
    const ivaRate = Number(formProduct.taxRate) || 0;
    const icValue = Number(formProduct.consumptionTax) || 0;
    const cost = Number(formProduct.cost) || 0;

    const finalPrice = salePriceInput + icValue;
    const basePrice = salePriceInput / (1 + ivaRate / 100);
    const profit = basePrice - cost;
    const margin = basePrice > 0 ? (profit / basePrice) * 100 : 0;

    return {
      finalPrice,
      margin,
      profitPerUnit: Math.round(profit)
    };
  }, [formSalePrice, formProduct.taxRate, formProduct.consumptionTax, formProduct.cost]);

  const marginColorClass = useMemo(() => {
      if (finalCalculations.margin <= 10) return 'text-red-500';
      if (finalCalculations.margin <= 20) return 'text-orange-400';
      return 'text-green-400';
  }, [finalCalculations.margin]);

  const handleEdit = (p: Product) => {
      setEditingProduct(p);
      setFormProduct({ ...p });
      const icValue = p.consumptionTax || 0;
      setFormSalePrice(Math.round(p.price - icValue));
      setShowModal(true);
  };

  const handleViewHistory = (p: Product) => {
    setProductForHistory(p);
    setShowHistoryModal(true);
  };

  const productSpecificKardex = useMemo(() => {
    if (!productForHistory) return [];
    return kardexEntries.filter(entry => entry.productId === productForHistory.id);
  }, [productForHistory, kardexEntries]);

  const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const productData: Product = {
          id: editingProduct ? editingProduct.id : `PRD-${Date.now()}`,
          name: formProduct.name!,
          cost: Number(formProduct.cost),
          price: Math.round(finalCalculations.finalPrice),
          taxRate: Number(formProduct.taxRate),
          consumptionTax: Number(formProduct.consumptionTax || 0),
          category: formProduct.category || 'General',
          stock: Number(formProduct.stock),
          icon: formProduct.icon || '📦',
          ean: formProduct.ean || '',
          isQuickAccess: !!formProduct.isQuickAccess
      };

      if (editingProduct) {
          // Si el stock cambió en el modal, registramos movimiento en el Kardex vía MainApp
          if (editingProduct.stock !== productData.stock) {
              onPhysicalCount(editingProduct.id, productData.stock);
          }
          onUpdateProducts(products.map((p: Product) => p.id === editingProduct.id ? productData : p));
      } else {
          onAddProduct(productData);
      }
      setShowModal(false);
      setEditingProduct(null);
  };

  // Manejo de carga de imagen
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Validación básica de tamaño (ej: máx 1MB para localStorage)
        if (file.size > 1000000) {
            alert("La imagen es muy pesada. Por favor use una imagen de menos de 1MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormProduct({ ...formProduct, icon: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

  const confirmDelete = () => {
    if (productIdToDelete) {
      onDeleteProduct(productIdToDelete);
      setProductIdToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleConteoChange = (id: string, val: string) => {
    setConteoValues(prev => ({ ...prev, [id]: parseFloat(val) || 0 }));
  };

  const handleSaveConteo = (p: Product) => {
    const newVal = conteoValues[p.id];
    if (newVal !== undefined && newVal !== p.stock) {
        onPhysicalCount(p.id, newVal);
        alert(`Stock de ${p.name} actualizado a ${newVal}`);
    }
  };

  // Helper para renderizar icono o imagen
  const renderProductIcon = (iconStr: string | undefined, sizeClass: string = "text-2xl") => {
      const icon = iconStr || '📦';
      const isImage = icon.startsWith('http') || icon.startsWith('data:image');
      
      if (isImage) {
          return <img src={icon} alt="Producto" className={`object-cover rounded-lg aspect-square ${sizeClass === "text-5xl" ? "w-24 h-24" : "w-10 h-10"}`} />;
      }
      return <span className={sizeClass}>{icon}</span>;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-3">
             <Package size={32} className="text-brand-red" /> Inventarios
          </h2>
          <p className="text-gray-500 font-medium">Gestión de stock con segregación de impuestos fiscales.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveView('table')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeView === 'table' ? 'bg-brand-black text-white' : 'text-gray-400'}`}><List size={14}/> Tabla</button>
            <button onClick={() => setActiveView('catalog')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeView === 'catalog' ? 'bg-brand-black text-white' : 'text-gray-400'}`}><LayoutGrid size={14}/> Catálogo</button>
            <button onClick={() => setActiveView('kardex')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeView === 'kardex' ? 'bg-brand-black text-white' : 'text-gray-400'}`}><History size={14}/> Kardex</button>
            <button onClick={() => setActiveView('conteo')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeView === 'conteo' ? 'bg-brand-black text-white' : 'text-gray-400'}`}><ClipboardCheck size={14}/> Conteo</button>
        </div>
      </div>

      {/* PANEL DE SINCRONIZACIÓN FINANCIERA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo Total Inventario</p>
                  <p className="text-2xl font-black text-blue-600 tracking-tighter">${Math.round(inventoryStats.totalCost).toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><DollarSign size={20}/></div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Venta Total Proyectada</p>
                  <p className="text-2xl font-black text-green-600 tracking-tighter">${Math.round(inventoryStats.totalRetail).toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl text-green-600"><TrendingUp size={20}/></div>
          </div>
          <div className="bg-brand-black text-white p-5 rounded-[2rem] shadow-lg flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Unidades</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{inventoryStats.totalItems.toLocaleString()}</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl text-brand-red"><Boxes size={20}/></div>
          </div>
      </div>

      <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
              <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-red" size={20} />
              <input 
                type="text" 
                placeholder="Busca por EAN o descripción..." 
                className="w-full pl-12 pr-6 py-4 rounded-[2rem] border-2 border-gray-100 focus:border-brand-red outline-none text-sm font-black shadow-inner transition-all" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
          </div>
          <button onClick={() => { 
            setEditingProduct(null); 
            setFormSalePrice(0);
            setFormProduct({ name: '', cost: 0, price: 0, taxRate: 19, consumptionTax: 0, category: 'General', stock: 0, icon: '📦', ean: '', isQuickAccess: false }); 
            setShowModal(true); 
          }} className="bg-brand-red text-white px-8 rounded-[2rem] shadow-xl hover:bg-brand-darkRed transition-all flex items-center gap-2 font-black uppercase text-xs tracking-widest"><Plus size={20} /> Crear Item</button>
      </div>

      {activeView === 'table' && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-brand-black text-white text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-5">FAV</th>
                  <th className="px-6 py-5">CÓDIGO EAN</th>
                  <th className="px-6 py-5">DESCRIPCIÓN</th>
                  <th className="px-6 py-5">COSTO</th>
                  <th className="px-6 py-5">P. FINAL (CON IC)</th>
                  <th className="px-6 py-5">IVA</th>
                  <th className="px-6 py-5">IMP. CONS. ($)</th>
                  <th className="px-6 py-5">MÁRGEN</th>
                  <th className="px-6 py-5">STOCK</th>
                  <th className="px-6 py-5 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((p) => {
                  const icValue = p.consumptionTax || 0;
                  const salePriceWithoutIC = p.price - icValue;
                  const netRevenue = salePriceWithoutIC / (1 + (p.taxRate / 100));
                  const margin = netRevenue > 0 ? ((netRevenue - p.cost) / netRevenue) * 100 : 0;
                  
                  return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                        <button 
                            onClick={() => toggleQuickAccess(p)} 
                            className={`p-2 rounded-lg transition-all ${p.isQuickAccess ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-yellow-400'}`}
                            title="Acceso Rápido / Favorito"
                        >
                            <Star size={18} fill={p.isQuickAccess ? "currentColor" : "none"} />
                        </button>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-400 text-xs tracking-tighter">{p.ean || '---'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {renderProductIcon(p.icon, "text-2xl")}
                        <p className="font-black text-brand-black uppercase text-xs leading-tight">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-400 text-sm">$ {Math.round(p.cost).toLocaleString()}</td>
                    <td className="px-6 py-4 font-black text-brand-black text-sm">$ {Math.round(p.price).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-400 text-xs">{p.taxRate}%</td>
                    <td className="px-6 py-4"><span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg font-black text-[10px] border border-orange-100">$ {icValue.toLocaleString()}</span></td>
                    <td className="px-6 py-4"><div className={`font-black text-xs ${margin > 20 ? 'text-green-600' : 'text-orange-500'}`}>{margin.toFixed(1)}%</div></td>
                    <td className="px-6 py-4"><span className={`font-black text-sm ${p.stock <= 5 ? 'text-red-600 animate-pulse' : 'text-brand-black'}`}>{p.stock}</span></td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleViewHistory(p)} 
                          className="p-3 bg-gray-50 text-gray-600 hover:bg-brand-black hover:text-white rounded-xl transition-all shadow-sm"
                          title="Kardex / Historial"
                        >
                          <History size={18}/>
                        </button>
                        <button 
                          onClick={() => handleEdit(p)} 
                          className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Editar Artículo y Cantidades"
                        >
                          <Edit3 size={18}/>
                        </button>
                        <button 
                          onClick={() => { setProductIdToDelete(p.id); setShowDeleteConfirm(true); }} 
                          className="p-3 bg-red-50 text-red-300 hover:text-red-600 rounded-xl transition-all"
                          title="Eliminar Artículo"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'catalog' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredProducts.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2rem] shadow-md border border-gray-100 flex flex-col items-center text-center group hover:border-brand-red transition-all">
                    <div className="mb-4 group-hover:scale-110 transition-transform">
                        {renderProductIcon(p.icon, "text-5xl")}
                    </div>
                    <h3 className="font-black text-xs text-brand-black uppercase line-clamp-2 h-8">{p.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest">{p.category}</p>
                    <div className="mt-4 flex flex-col items-center">
                        <p className="text-brand-red font-black text-lg leading-none">${Math.round(p.price).toLocaleString()}</p>
                        <span className={`text-[10px] font-black mt-2 px-3 py-1 rounded-full uppercase ${p.stock > 5 ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-600'}`}>{p.stock} Disponibles</span>
                    </div>
                    <button onClick={() => handleEdit(p)} className="mt-6 w-full py-2 bg-gray-50 hover:bg-brand-black hover:text-white text-gray-400 rounded-xl text-[9px] font-black uppercase transition-all">Ver Ficha</button>
                </div>
            ))}
        </div>
      )}

      {activeView === 'kardex' && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-black text-brand-black uppercase tracking-widest text-xs">Registro Global de Movimientos</h3>
                <span className="bg-brand-black text-white px-3 py-1 rounded-full text-[9px] font-black">{kardexEntries.length} Eventos</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto no-scrollbar">
                {kardexEntries.length === 0 ? (
                    <div className="p-20 text-center text-gray-300 flex flex-col items-center gap-4">
                        <Boxes size={48} className="opacity-20" />
                        <p className="font-black uppercase text-sm tracking-widest">Sin registros históricos</p>
                    </div>
                ) : (
                    kardexEntries.map(entry => (
                        <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.type === 'ENTRADA_COMPRA' ? 'bg-green-100 text-green-600' : entry.type === 'SALIDA_VENTA' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {entry.quantity > 0 ? <ArrowDown size={18}/> : <ArrowUp size={18}/>}
                                </div>
                                <div>
                                    <p className="text-brand-black font-black text-xs uppercase leading-none">{entry.productName}</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1">{new Date(entry.date).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`font-black text-sm block ${entry.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                                </span>
                                <span className="text-[9px] text-gray-400 font-black uppercase">{entry.note || entry.type.replace('_', ' ')}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}

      {activeView === 'conteo' && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 bg-orange-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ClipboardCheck className="text-orange-600" />
                    <div>
                        <h3 className="font-black text-orange-900 uppercase text-sm">Modo Conteo Rápido</h3>
                        <p className="text-[10px] text-orange-700 font-medium">Actualice stock físico sin entrar a cada producto.</p>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-brand-black text-white text-[10px] font-black uppercase">
                        <tr>
                            <th className="px-6 py-4">DESCRIPCIÓN</th>
                            <th className="px-6 py-4 text-center">STOCK ACTUAL</th>
                            <th className="px-6 py-4 text-center">NUEVO CONTEO</th>
                            <th className="px-6 py-4 text-center">ACCIÓN</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {renderProductIcon(p.icon, "text-lg")}
                                        <span className="font-black text-brand-black text-xs uppercase">{p.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="font-bold text-gray-400">{p.stock}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input 
                                        type="number" 
                                        step="any"
                                        className="w-24 p-2 bg-gray-100 border border-gray-200 rounded-lg font-black text-center outline-none focus:border-brand-red"
                                        placeholder={p.stock.toString()}
                                        value={conteoValues[p.id] !== undefined ? conteoValues[p.id] : ''}
                                        onChange={e => handleConteoChange(p.id, e.target.value)}
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleSaveConteo(p)}
                                        disabled={conteoValues[p.id] === undefined || conteoValues[p.id] === p.stock}
                                        className="p-2 bg-brand-red text-white rounded-lg disabled:opacity-30 hover:bg-brand-darkRed transition-all"
                                    >
                                        <Save size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* MODAL HISTORIAL (KARDEX INDIVIDUAL) */}
      {showHistoryModal && productForHistory && (
          <div className="fixed inset-0 z-[300] bg-brand-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 h-[80vh] flex flex-col">
                  <div className="p-8 border-b flex justify-between items-center bg-gray-50 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-brand-black text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                              {renderProductIcon(productForHistory.icon, "text-2xl")}
                          </div>
                          <div>
                              <h3 className="font-black text-xl text-brand-black uppercase tracking-tighter leading-none">{productForHistory.name}</h3>
                              <p className="text-xs text-gray-400 font-bold uppercase mt-1">Movimientos de Inventario (Kardex)</p>
                          </div>
                      </div>
                      <button onClick={() => setShowHistoryModal(false)} className="hover:bg-gray-200 p-2 rounded-full transition-colors"><X /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                      {productSpecificKardex.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-300">
                              <History size={64} className="mb-4 opacity-20" />
                              <p className="font-black uppercase text-sm tracking-widest">Sin movimientos registrados</p>
                          </div>
                      ) : (
                          productSpecificKardex.map(entry => (
                              <div key={entry.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.type === 'ENTRADA_COMPRA' ? 'bg-green-100 text-green-600' : entry.type === 'SALIDA_VENTA' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                          {entry.quantity > 0 ? <ArrowDown size={18}/> : <ArrowUp size={18}/>}
                                      </div>
                                      <div>
                                          <p className="font-black text-[10px] text-gray-400 uppercase tracking-widest">{new Date(entry.date).toLocaleString()}</p>
                                          <p className="font-black text-sm text-brand-black uppercase leading-none mt-1">{entry.note || entry.type.replace('_', ' ')}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className={`font-black text-lg ${entry.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                                      </p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase">Saldo: {entry.balance}</p>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL ELIMINAR */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[400] bg-brand-black/95 backdrop-blur-lg flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in-95 border-t-[12px] border-brand-red">
            <div className="w-24 h-24 bg-red-50 text-brand-red rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Trash size={48} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-brand-black uppercase tracking-tighter mb-3">¿Eliminar Artículo?</h3>
            <p className="text-gray-500 font-bold mb-10 leading-snug px-4 uppercase text-xs">Esta acción no se puede deshacer y el producto desaparecerá de la base de datos.</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-5 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest shadow-xl hover:bg-brand-darkRed active:scale-95 transition-all text-xs">Sí, Eliminar Ahora</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-5 bg-gray-100 text-gray-500 font-black rounded-2xl uppercase tracking-widest hover:bg-gray-200 transition-all text-xs">No, Mantener</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR/EDITAR ARTÍCULO (CON CAMPO DE STOCK) */}
      {showModal && (
          <div className="fixed inset-0 z-[200] bg-brand-black/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden border-t-[12px] border-brand-red shadow-2xl animate-in zoom-in-95 my-auto">
                  <div className="p-8 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-black text-2xl text-brand-black uppercase tracking-tighter">{editingProduct ? 'Editar Artículo' : 'Nuevo Producto'}</h3>
                      <button onClick={() => setShowModal(false)} className="hover:bg-gray-200 p-2 rounded-full transition-colors"><X /></button>
                  </div>
                  <form onSubmit={handleFormSubmit} className="p-8 space-y-5">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Cód. Barras (EAN)</label>
                            <input type="text" className="w-full p-4 bg-gray-900 text-white rounded-2xl font-mono text-base outline-none border-2 border-transparent focus:border-brand-red transition-all" value={formProduct.ean} onChange={e => setFormProduct({...formProduct, ean: e.target.value})} placeholder="770..." />
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Foto / Icono</label>
                            <div className="flex gap-2 h-full">
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        className="w-full h-full p-4 bg-gray-100 rounded-2xl text-center text-sm outline-none border-2 border-transparent focus:border-brand-red truncate" 
                                        value={formProduct.icon} 
                                        onChange={e => setFormProduct({...formProduct, icon: e.target.value})} 
                                        placeholder="URL o Emoji" 
                                    />
                                    {/* Preview pequeña si es imagen */}
                                    {(formProduct.icon?.startsWith('http') || formProduct.icon?.startsWith('data:')) && (
                                        <div className="absolute right-1 top-1 bottom-1 w-10">
                                            <img src={formProduct.icon} alt="Preview" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    className="hidden" 
                                    accept="image/*"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-4 bg-gray-200 hover:bg-gray-300 rounded-2xl transition-all"
                                    title="Subir foto real"
                                >
                                    <Upload size={18} className="text-gray-600" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormProduct({...formProduct, isQuickAccess: !formProduct.isQuickAccess})}
                                    className={`p-4 rounded-2xl border-2 transition-all ${formProduct.isQuickAccess ? 'bg-yellow-50 border-yellow-400 text-yellow-500' : 'bg-gray-50 border-gray-200 text-gray-300'}`}
                                    title="Marcar como Favorito"
                                >
                                    <Star fill={formProduct.isQuickAccess ? "currentColor" : "none"} size={18} />
                                </button>
                            </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Descripción del Producto *</label>
                        <input type="text" className="w-full p-5 bg-gray-100 rounded-2xl font-black text-brand-black outline-none border-2 border-transparent focus:border-brand-red transition-all" value={formProduct.name} onChange={e => setFormProduct({...formProduct, name: e.target.value})} placeholder="Ej: Arroz Diana 1kg" required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Stock / Cantidad Actual</label>
                            <div className="relative group">
                                <Boxes className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-red" size={20}/>
                                <input 
                                    type="number" 
                                    step="any"
                                    className="w-full pl-10 p-4 bg-gray-900 text-white rounded-2xl font-black outline-none border-2 border-transparent focus:border-brand-red transition-all" 
                                    value={formProduct.stock} 
                                    onChange={e => setFormProduct({...formProduct, stock: parseFloat(e.target.value) || 0})} 
                                    disabled={!!editingProduct}
                                    title={editingProduct ? "Para ajustar stock, use el modo Conteo o Compras" : ""}
                                />
                            </div>
                            {editingProduct && <p className="text-[8px] text-gray-400 uppercase font-black px-1 italic leading-tight">Use "Conteo" para ajustar stock existente.</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Categoría</label>
                            <select 
                                className="w-full p-4 bg-gray-100 border border-gray-200 rounded-2xl font-black outline-none text-xs" 
                                value={formProduct.category} 
                                onChange={e => {
                                    if (e.target.value === 'NEW') {
                                        const name = prompt("Escriba el nombre de la nueva categoría, socio:");
                                        if (name) {
                                            onAddCategory(name);
                                            setFormProduct({...formProduct, category: name});
                                        }
                                    } else {
                                        setFormProduct({...formProduct, category: e.target.value})
                                    }
                                }}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                                <option value="NEW" className="font-black text-brand-red text-center">+ Crear Nueva...</option>
                            </select>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Costo Unitario (Neto)</label>
                            <input type="number" className="w-full p-4 bg-gray-100 rounded-2xl font-bold outline-none" value={formProduct.cost} onChange={e => setFormProduct({...formProduct, cost: Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Precio Venta (Base + IVA) *</label>
                            <input type="number" className="w-full p-4 bg-brand-black text-white rounded-2xl font-black outline-none border-2 border-transparent focus:border-brand-red" value={formSalePrice || ''} onChange={e => setFormSalePrice(Number(e.target.value))} required />
                          </div>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-dashed border-orange-200 space-y-4">
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest text-center border-b border-orange-100 pb-2 mb-2 flex items-center justify-center gap-2"><Banknote size={14}/> Cajón de Impuestos DIAN</p>
                          <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1"><Percent size={12} className="text-brand-red"/> Tarifa IVA %</label>
                                <select className="w-full p-4 bg-white border border-gray-200 rounded-2xl font-black outline-none text-xs" value={formProduct.taxRate} onChange={e => setFormProduct({...formProduct, taxRate: Number(e.target.value)})}>
                                    <option value="19">19% (Gravado)</option>
                                    <option value="5">5% (Canasta)</option>
                                    <option value="0">0% (Exento)</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-orange-500 uppercase ml-1 flex items-center gap-1"><DollarSign size={12}/> Imp. Consumo (Valor)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-4 bg-white border border-orange-300 text-orange-600 rounded-2xl font-black outline-none text-sm placeholder:text-orange-200 focus:ring-2 focus:ring-orange-500" 
                                    value={formProduct.consumptionTax || ''} 
                                    onChange={e => setFormProduct({...formProduct, consumptionTax: Number(e.target.value)})} 
                                    placeholder="Ej: 100" 
                                />
                                <p className="text-[8px] text-orange-400 uppercase font-black italic">Se suma al precio de venta</p>
                              </div>
                          </div>
                          <div className="pt-2 flex justify-between items-center bg-orange-100/50 p-3 rounded-xl">
                             <span className="text-[10px] font-black text-orange-800 uppercase">Precio Final al Público:</span>
                             <span className="text-lg font-black text-orange-900">${Math.round(finalCalculations.finalPrice).toLocaleString()}</span>
                          </div>
                      </div>

                      <div className="bg-brand-black p-5 rounded-[2rem] border-4 border-white/5 flex items-center justify-between shadow-lg">
                          <div>
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Márgen de Utilidad (Neto)</p>
                              <p className={`text-4xl font-black tracking-tighter ${marginColorClass}`}>
                                  {finalCalculations.margin.toFixed(1)}%
                              </p>
                          </div>
                          <div className="text-right">
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Utilidad / Und</p>
                              <p className="text-2xl font-black text-white tracking-tighter">${finalCalculations.profitPerUnit.toLocaleString()}</p>
                          </div>
                      </div>

                      <button type="submit" className="w-full py-5 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest shadow-2xl hover:bg-brand-darkRed transition-all flex items-center justify-center gap-3">
                        <Save size={20}/> {editingProduct ? 'Sincronizar Cambios' : 'Registrar Producto'}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};