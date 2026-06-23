
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Order, Supplier, Product, PaymentMethod, SupplierAccount, CreditTransaction, StoreSettings } from '../types';
import { 
  ClipboardList, Plus, Check, Trash2, Truck, Phone, Package, 
  ShoppingBag, ScanBarcode, DollarSign, Calculator, Search, 
  Banknote, Mail, Boxes, Percent, Save, Tag, X, ReceiptText, 
  ArrowRight, CornerDownRight, AlertCircle, Link, QrCode, Smartphone, Wallet, CheckCircle2, ArrowLeft, History, Calendar, Printer, Edit, Trash, ChevronDown, ChevronUp, FileDown, FileText, FileType, Edit2
} from 'lucide-react';
import { dbService } from '../services/storageService';
import { getColombiaDate } from '../services/dianService';

interface OrdersProps {
  products: Product[]; 
  orders: Order[];
  onProcessBatchPurchase: (supplierData: any, items: StagedItem[], method: PaymentMethod, customDate?: string, invoiceRef?: string) => void;
  supplierAccounts: SupplierAccount[];
  onAddSupplierPayment: (supplierId: string, amount: number, paymentDate?: string, description?: string) => void;
  onDeleteSupplierPayment?: (supplierId: string, transactionId: string) => void;
  onEditSupplierPayment?: (supplierId: string, transactionId: string, newAmount: number, newDate: string, newDescription: string) => void;
  onDeletePurchaseDocument: (batchId: string) => void;
  onEditPurchaseDocument: (batchId: string, name: string, nit: string, items: StagedItem[], method: PaymentMethod, newDate?: string, invoiceRef?: string) => void;
  storeSettings: StoreSettings;
  suppliers: Supplier[];
  onSaveSupplier: (supplier: Supplier) => void;
  pendingEditBatchId?: string | null;
  onEditLoaded?: () => void;
}

interface StagedItem {
    product: Product;
    quantity: number;
    cost: number;
    discountPerc: number;
}

// Estilos centralizados para el indicador del calendario (Selector de Fecha)
const pickerStyles = 
  "[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer " +
  "[&::-webkit-calendar-picker-indicator]:p-1.5 " + // Espacio interno para el icono
  "[&::-webkit-calendar-picker-indicator]:bg-gray-200 " + // Fondo gris claro
  "[&::-webkit-calendar-picker-indicator]:rounded-full " + // Circulo perfecto
  "[&::-webkit-calendar-picker-indicator]:border-2 [&::-webkit-calendar-picker-indicator]:border-brand-black " + // Borde negro
  "hover:[&::-webkit-calendar-picker-indicator]:bg-gray-300 hover:[&::-webkit-calendar-picker-indicator]:border-brand-red transition-all";

// Clase principal para inputs de fecha grandes (Registro, Historial y Edición)
const dateInputClass = `w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none text-xs font-bold shadow-sm cursor-pointer text-gray-900 ${pickerStyles}`;

export const Orders: React.FC<OrdersProps> = ({ 
  products, 
  orders, 
  onProcessBatchPurchase,
  supplierAccounts,
  onAddSupplierPayment,
  onDeleteSupplierPayment,
  onEditSupplierPayment,
  onDeletePurchaseDocument,
  onEditPurchaseDocument,
  storeSettings,
  suppliers,
  onSaveSupplier,
  pendingEditBatchId,
  onEditLoaded
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'REGISTRO' | 'CXP' | 'HISTORIAL'>('REGISTRO');
  
  // Estado Proveedor
  const [supplierName, setSupplierName] = useState('');
  const [supplierNit, setSupplierNit] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  // Fix: Use getColombiaDate to ensure correct day even after 7PM local time (UTC-5)
  const [purchaseDate, setPurchaseDate] = useState(getColombiaDate());
  const [invoiceRef, setInvoiceRef] = useState('');

  // Estado Carrito de Compra (Staging)
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // Modal de Pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Estado CXP
  const [selectedSupplierAcc, setSelectedSupplierAcc] = useState<SupplierAccount | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [payDescription, setPayDescription] = useState('');
  const [showCxpPrintOptions, setShowCxpPrintOptions] = useState(false);
  const [cxpSearch, setCxpSearch] = useState('');

  useEffect(() => {
    if (selectedSupplierAcc) {
      const updated = supplierAccounts.find(a => a.id === selectedSupplierAcc.id);
      if (updated) {
        setSelectedSupplierAcc(updated);
      } else {
        setSelectedSupplierAcc(null);
      }
    }
  }, [supplierAccounts]);

  // Estado Historial & Edición (Memoria base 365 días por defecto)
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    // Fix: Use correct timezone formatting
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  });
  // Fix: Use getColombiaDate for end date
  const [historyEndDate, setHistoryEndDate] = useState(getColombiaDate());
  const [historySearch, setHistorySearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [editingBatch, setEditingBatch] = useState<{id: string, name: string, nit: string, items: StagedItem[], paymentMethod: PaymentMethod, date: string, reference?: string } | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [editSearchTerm, setEditSearchTerm] = useState('');
  const [showEditSearchDropdown, setShowEditSearchDropdown] = useState(false);

  const [editingSupplierPayment, setEditingSupplierPayment] = useState<CreditTransaction | null>(null);
  const [editSupplierPaymentAmount, setEditSupplierPaymentAmount] = useState('');
  const [editSupplierPaymentDate, setEditSupplierPaymentDate] = useState('');
  const [editSupplierPaymentDescription, setEditSupplierPaymentDescription] = useState('');
  
  const [supplierPaymentToDelete, setSupplierPaymentToDelete] = useState<CreditTransaction | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingEditBatchId) {
        setActiveSubTab('HISTORIAL');
        const batchOrders = orders.filter(o => {
            const oBatchId = o.batchId || `legacy-${o.id}`;
            return oBatchId === pendingEditBatchId;
        });
        if (batchOrders.length > 0) {
            const first = batchOrders[0];
            const staged: StagedItem[] = batchOrders.map(o => {
                const prod = products.find(p => p.id === o.productId);
                return {
                    product: prod || { id: o.productId, name: o.productName, cost: o.cost, price: 0, stock: 0, category: '', ean: o.ean, taxRate: o.taxRate, consumptionTax: o.consumptionTax },
                    quantity: o.quantity,
                    cost: o.cost,
                    discountPerc: o.discount ? (o.discount / (o.cost * o.quantity)) * 100 : 0
                };
            });
            setEditingBatch({
                id: first.batchId,
                name: first.supplier,
                nit: first.supplierNit || '',
                items: staged,
                paymentMethod: first.paymentMethod || PaymentMethod.CASH,
                date: first.date.split('T')[0],
                reference: first.reference || ''
            });
        }
        if (onEditLoaded) onEditLoaded();
    }
  }, [pendingEditBatchId, orders, products, onEditLoaded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
            setShowSearchDropdown(false);
        }
        if (editSearchRef.current && !editSearchRef.current.contains(e.target as Node)) {
            setShowEditSearchDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSupplierChange = (val: string) => {
      setSupplierName(val);
      const found = suppliers.find(s => s.name.toLowerCase() === val.toLowerCase());
      if (found) {
          setSupplierNit(found.nit);
          setSupplierPhone(found.phone || '');
          setSupplierEmail(found.email || '');
      }
  };

  const handleSupplierNitChange = (val: string) => {
      setSupplierNit(val);
      const found = suppliers.find(s => s.nit === val);
      if (found) {
          setSupplierName(found.name);
          setSupplierPhone(found.phone || '');
          setSupplierEmail(found.email || '');
      }
  };

  const addItemToStage = (p: Product) => {
      const existing = stagedItems.find(item => item.product.id === p.id);
      if (existing) {
          setStagedItems(prev => prev.map(item => 
            item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item
          ));
      } else {
          setStagedItems(prev => [...prev, { 
            product: p, 
            quantity: 1, 
            cost: p.cost, 
            discountPerc: 0 
          }]);
      }
      setSearchTerm('');
      setShowSearchDropdown(false);
  };

  const removeItemFromStage = (index: number) => {
    setStagedItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItemToEditBatch = (p: Product) => {
    if (!editingBatch) return;
    const existing = editingBatch.items.find(item => item.product.id === p.id);
    let newItems;
    if (existing) {
        newItems = editingBatch.items.map(item => 
          item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item
        );
    } else {
        newItems = [...editingBatch.items, { 
          product: p, 
          quantity: 1, 
          cost: p.cost, 
          discountPerc: 0 
        }];
    }
    setEditingBatch({ ...editingBatch, items: newItems });
    setEditSearchTerm('');
    setShowEditSearchDropdown(false);
  };

  const updateStagedItem = (index: number, field: keyof StagedItem, value: number) => {
      setStagedItems(prev => {
          const newItems = [...prev];
          (newItems[index] as any)[field] = value;
          return newItems;
      });
  };

  const updateEditingItem = (index: number, field: keyof StagedItem, value: number) => {
      if (!editingBatch) return;
      const newItems = [...editingBatch.items];
      (newItems[index] as any)[field] = value;
      setEditingBatch({ ...editingBatch, items: newItems });
  };

  const stagedTotals = useMemo(() => {
      return stagedItems.reduce((acc, item) => {
          const subtotalGross = item.cost * item.quantity;
          const discountVal = subtotalGross * (item.discountPerc / 100);
          const ivaVal = subtotalGross * (item.product.taxRate / 100); 
          const icVal = (item.product.consumptionTax || 0) * item.quantity;
          
          return {
              base: acc.base + subtotalGross,
              discount: acc.discount + discountVal,
              tax: acc.tax + ivaVal,
              ic: acc.ic + icVal,
              total: acc.total + (subtotalGross - discountVal + ivaVal + icVal)
          };
      }, { base: 0, discount: 0, tax: 0, ic: 0, total: 0 });
  }, [stagedItems]);

  const handleConfirmPurchase = (method: PaymentMethod) => {
      if (pendingEditBatchId) {
          onEditPurchaseDocument(
              pendingEditBatchId,
              supplierName,
              supplierNit,
              stagedItems,
              method,
              purchaseDate,
              invoiceRef
          );
          if (onEditLoaded) onEditLoaded();
      } else {
          onProcessBatchPurchase(
              { name: supplierName, nit: supplierNit, phone: supplierPhone, email: supplierEmail },
              stagedItems,
              method,
              purchaseDate,
              invoiceRef
          );
      }
      
      setStagedItems([]);
      setSupplierName('');
      setSupplierNit('');
      setSupplierPhone('');
      setSupplierEmail('');
      setInvoiceRef('');
      setPurchaseDate(getColombiaDate());
      setShowPaymentModal(false);
      setActiveSubTab('HISTORIAL');
      setEditingBatch(null);
  };

  const handleSupplierPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedSupplierAcc || !payAmount || !payDate) return;
      
      const now = new Date();
      const [year, month, day] = payDate.split('-');
      const paymentDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
      
      onAddSupplierPayment(selectedSupplierAcc.id, Number(payAmount), paymentDateTime, payDescription);
      setPayAmount('');
      setPayDate(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
      setPayDescription('');
      alert("Abono a proveedor registrado correctamente.");
  };

  const handleEditSupplierPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierAcc || !editingSupplierPayment || !onEditSupplierPayment || !editSupplierPaymentAmount || !editSupplierPaymentDate || !editSupplierPaymentDescription) return;

    const now = new Date();
    const [year, month, day] = editSupplierPaymentDate.split('-');
    const paymentDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
    
    onEditSupplierPayment(selectedSupplierAcc.id, editingSupplierPayment.id, Math.round(Number(editSupplierPaymentAmount)), paymentDateTime, editSupplierPaymentDescription);
    setEditingSupplierPayment(null);
  };

  const handleDeleteSupplierPaymentClick = (tx: CreditTransaction) => {
    if (!selectedSupplierAcc || !onDeleteSupplierPayment) return;
    setSupplierPaymentToDelete(tx);
  };

  const confirmDeleteSupplierPayment = () => {
    if (!selectedSupplierAcc || !onDeleteSupplierPayment || !supplierPaymentToDelete) return;
    onDeleteSupplierPayment(selectedSupplierAcc.id, supplierPaymentToDelete.id);
    setSupplierPaymentToDelete(null);
  };

  const formatMoney = (v: number) => Math.round(v).toLocaleString('es-CO');
  
  const formatDecimal = (v: number) => v.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const filteredSearch = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.ean && p.ean.includes(searchTerm))
  ).slice(0, 5);

  const filteredEditSearch = products.filter(p => 
    p.name.toLowerCase().includes(editSearchTerm.toLowerCase()) || 
    (p.ean && p.ean.includes(editSearchTerm))
  ).slice(0, 5);

  const purchaseHistory = useMemo(() => {
      const start = historyStartDate;
      const end = historyEndDate;

      const grouped: Record<string, { 
          batchId: string, 
          date: string, 
          supplier: string, 
          supplierNit: string, 
          items: Order[], 
          total: number, 
          totalDiscount: number,
          paymentMethod?: PaymentMethod,
          supplierPhone?: string,
          supplierEmail?: string,
          status?: string,
          isPaid?: boolean,
          paidAmount?: number,
          reference?: string
      }> = {};
      
      orders.forEach(o => {
          const oDateStr = o.date.split('T')[0];
          const batchId = o.batchId || `legacy-${o.id}`;
          
          if (oDateStr >= start && oDateStr <= end) {
              const matchesSearch = o.supplier.toLowerCase().includes(historySearch.toLowerCase()) || 
                                    o.supplierNit.toLowerCase().includes(historySearch.toLowerCase()) ||
                                    batchId.toLowerCase().includes(historySearch.toLowerCase());
              
              if (matchesSearch) {
                  if (!grouped[batchId]) {
                      grouped[batchId] = { 
                        batchId: batchId, 
                        date: o.date, 
                        supplier: o.supplier, 
                        supplierNit: o.supplierNit, 
                        items: [], 
                        total: 0,
                        totalDiscount: 0,
                        paymentMethod: o.paymentMethod,
                        supplierPhone: o.supplierPhone,
                        supplierEmail: o.supplierEmail,
                        status: o.status,
                        reference: o.reference
                      };
                  }
                  grouped[batchId].items.push(o);
                  
                  const gross = o.cost * o.quantity;
                  const discount = o.discount || 0;
                  const iva = gross * (o.taxRate/100);
                  const ic = (o.consumptionTax || 0) * o.quantity;
                  
                  grouped[batchId].total += (gross + iva + ic - discount);
                  grouped[batchId].totalDiscount += discount;
              }
          }
      });

      const sortedBatches = Object.values(grouped).sort((a,b) => b.date.localeCompare(a.date));

      // Calculate paid status for CXP batches based on supplier balances
      const supplierBalances: Record<string, number> = {};
      supplierAccounts.forEach(acc => {
          supplierBalances[acc.id] = acc.currentBalance;
      });

      sortedBatches.forEach(batch => {
          if (batch.paymentMethod === PaymentMethod.CXP) {
              const balance = supplierBalances[batch.supplierNit] || 0;
              // We are iterating from newest to oldest.
              // The current balance is applied to the newest batches first (they remain unpaid).
              if (balance >= batch.total) {
                  batch.isPaid = false;
                  batch.paidAmount = 0;
                  supplierBalances[batch.supplierNit] = balance - batch.total;
              } else if (balance > 0) {
                  batch.isPaid = false;
                  batch.paidAmount = batch.total - balance;
                  supplierBalances[batch.supplierNit] = 0;
              } else {
                  batch.isPaid = true;
                  batch.paidAmount = batch.total;
              }
          } else {
              batch.isPaid = true;
              batch.paidAmount = batch.total;
          }
      });

      return sortedBatches;
  }, [orders, historyStartDate, historyEndDate, historySearch, supplierAccounts]);

  const handlePrintDocument = (batch: any) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const totalIVA = batch.items.reduce((acc: number, i: Order) => acc + (i.cost * i.quantity * (i.taxRate/100)), 0);
      const totalIC = batch.items.reduce((acc: number, i: Order) => acc + ((i.consumptionTax || 0) * i.quantity), 0);
      const subtotal = batch.items.reduce((acc: number, i: Order) => acc + (i.cost * i.quantity), 0);
      const discountTotal = batch.items.reduce((acc: number, i: Order) => acc + (i.discount || 0), 0);
      const customFooter = storeSettings.customFooter ? storeSettings.customFooter.replace(/\n/g, '<br>') : '';

      const html = `
        <!DOCTYPE html><html><head><title>Compra ${batch.batchId}</title>
        <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; border-bottom: 4px solid #D62828; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background: #111; color: #fff; padding: 12px; text-align: left; text-transform: uppercase; font-size: 9px; letter-spacing: 1px; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 11px; }
            .totals-grid { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .total-box { background: #f9f9f9; padding: 20px; border-radius: 15px; }
            .flex-between { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            .bold { font-weight: 800; }
            .brand-red { color: #D62828; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .custom-footer { margin-top: 20px; font-size: 10px; font-weight: bold; text-align: center; border: 1px dashed #ddd; padding: 10px; background: #fdfdfd; }
        </style></head><body>
            <div class="header">
                <div>
                    <h1 style="margin:0">${storeSettings.name.toUpperCase()}</h1>
                    <p style="margin:5px 0">${storeSettings.address}<br>NIT: ${storeSettings.nit}<br>TEL: ${storeSettings.phone}</p>
                </div>
                <div style="text-align:right">
                    <h2 style="margin:0">REGISTRO DE COMPRA</h2>
                    <p style="margin:5px 0"><span class="bold">LOTE ID:</span> ${batch.batchId}<br>${batch.reference ? `<span class="bold">FACTURA/REF:</span> ${batch.reference}<br>` : ''}<span class="bold">FECHA:</span> ${new Date(batch.date).toLocaleString('es-CO')}</p>
                </div>
            </div>
            <div style="margin-top:20px; background:#f4f4f4; padding:15px; border-radius:10px;">
                <p style="margin:0"><span class="bold">PROVEEDOR:</span> ${batch.supplier.toUpperCase()}</p>
                <p style="margin:5px 0 0 0"><span class="bold">NIT/CC:</span> ${batch.supplierNit}</p>
                <p style="margin:5px 0 0 0"><span class="bold">ESTADO PAGO:</span> ${batch.paymentMethod?.toUpperCase() || 'PAGADO'}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:13%">EAN</th>
                        <th style="width:27%">DESCRIPCIÓN</th>
                        <th style="width:5%" class="text-center">CANT</th>
                        <th style="width:13%" class="text-right">COSTO UN.</th>
                        <th style="width:8%" class="text-center">IVA (%)</th>
                        <th style="width:9%" class="text-center">IC ($)</th>
                        <th style="width:10%" class="text-center">DESC %</th>
                        <th style="width:15%" class="text-right">TOTAL ITEM</th>
                    </tr>
                </thead>
                <tbody>
                    ${batch.items.map((i: Order) => {
                        const rowGross = i.cost * i.quantity;
                        const rowDiscount = i.discount || 0;
                        const rowIVA = rowGross * (i.taxRate/100);
                        const rowIC = (i.consumptionTax || 0) * i.quantity;
                        const rowTotal = rowGross - rowDiscount + rowIVA + rowIC;
                        
                        const discountPerc = rowGross > 0 ? (rowDiscount / rowGross) * 100 : 0;

                        return `
                        <tr>
                            <td>${i.ean || '---'}</td>
                            <td>${i.productName.toUpperCase()}</td>
                            <td class="bold text-center">${i.quantity}</td>
                            <td class="text-right">$${Math.round(i.cost).toLocaleString()}</td>
                            <td class="text-center">${i.taxRate}%</td>
                            <td class="text-center">$${Math.round(i.consumptionTax || 0).toLocaleString()}</td>
                            <td class="text-center">${discountPerc.toFixed(1)}%</td>
                            <td class="bold text-right">$${Math.round(rowTotal).toLocaleString()}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            <div class="totals-grid">
                <div>
                    <p style="font-size:10px; color:#666; text-transform:uppercase; font-weight:bold;">Resumen Impositivo</p>
                    <div class="flex-between"><span>Subtotal Base:</span><span>$${subtotal.toFixed(1)}</span></div>
                    <div class="flex-between"><span>Impuesto IVA:</span><span>$${totalIVA.toFixed(1)}</span></div>
                    <div class="flex-between"><span>Imp. Consumo:</span><span>$${totalIC.toFixed(1)}</span></div>
                    <div class="flex-between"><span>Descuento:</span><span>-$${discountTotal.toFixed(1)}</span></div>
                </div>
                <div class="total-box">
                    <div class="flex-between" style="font-size:18px;">
                        <span class="bold uppercase">Total Legalizado:</span>
                        <span class="bold brand-red">$${batch.total.toFixed(1)}</span>
                    </div>
                    <p style="margin:10px 0 0 0; font-size:9px; color:#888;">Este documento acredita el ingreso de mercancía al sistema POS para control de inventarios y costos.</p>
                </div>
            </div>
            
            ${customFooter ? `<div class="custom-footer">${customFooter}</div>` : ''}

            <div class="footer">
                <p>Software: ${storeSettings.softwareName || 'KIOSKO COMERCIAL POS'} | Fabricante: ${storeSettings.softwareManufacturer || 'KIOSKO DEV STUDIO S.A.S.'}</p>
            </div>
            <script>window.onload = function() { window.print(); window.close(); }</script>
        </body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
  };

  const handlePrintCxpHistory = (format: 'THERMAL' | 'LETTER' | 'HALF_LETTER') => {
      if (!selectedSupplierAcc) return;
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const acc = selectedSupplierAcc;
      const settings = storeSettings;
      const customFooter = storeSettings.customFooter ? storeSettings.customFooter.replace(/\n/g, '<br>') : '';
      
      let cssStyles = '';
      if (format === 'THERMAL') {
          cssStyles = `
            @page { margin: 0; size: 80mm auto; }
            body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 10px 0; font-size: 11px; color: #000; line-height: 1.1; }
            .center { text-align: center; } .bold { font-weight: bold; } .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .custom-footer { margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; font-weight: bold; text-align: center; font-size: 9px; }
          `;
      } else {
          // Carta y Media Carta
          const pageSize = format === 'LETTER' ? 'Letter' : '140mm 216mm';
          cssStyles = `
            @page { size: ${pageSize}; margin: 15mm; }
            body { font-family: sans-serif; padding: 0; color: #111; font-size: 12px; }
            .header { display: flex; justify-content: space-between; border-bottom: 4px solid #D62828; padding-bottom: 20px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #111; color: #fff; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            .custom-footer { margin-top: 20px; padding: 10px; border: 1px dashed #ccc; background: #fffbe6; font-size: 10px; text-align: center; border-radius: 5px; }
          `;
      }

      let contentHtml = '';
      if (format === 'THERMAL') {
          contentHtml = `
                <div class="center">
                    <div class="bold" style="font-size: 14px;">${settings.name.toUpperCase()}</div>
                    <div class="bold">NIT: ${settings.nit}</div><div class="line"></div>
                    <div class="bold">ESTADO DE CUENTA PROVEEDOR</div>
                    <div>Fecha: ${new Date().toLocaleDateString()}</div><div class="line"></div>
                </div>
                <div><b>PROVEEDOR:</b> ${acc.supplierName.toUpperCase()}</div>
                <div><b>NIT/CC:</b> ${acc.id}</div><div class="line"></div>
                ${acc.history.slice(0, 30).map(tx => `
                    <div class="flex"><span>${new Date(tx.date).toLocaleDateString()} ${tx.type === 'CHARGE' ? 'CARGO' : 'ABONO'}</span><span>$${Math.round(tx.amount).toLocaleString()}</span></div>
                `).join('')}
                <div class="line"></div>
                <div class="flex bold" style="font-size: 13px;"><span>SALDO ACTUAL:</span> <span>$${Math.round(acc.currentBalance).toLocaleString()}</span></div>
                ${customFooter ? `<div class="custom-footer">${customFooter}</div>` : ''}
                <div class="center" style="margin-top: 15px; font-size: 8px;">Software: Kiosko Comercial</div>
          `;
      } else {
          contentHtml = `
                <div class="header">
                    <div><h1 style="margin:0">${settings.name.toUpperCase()}</h1><p style="margin:5px 0">NIT: ${settings.nit}</p></div>
                    <div style="text-align:right"><h2 style="margin:0">HISTORIAL CXP</h2><p style="margin:0">Fecha Reporte: ${new Date().toLocaleDateString()}</p></div>
                </div>
                <div>
                    <p><b>Proveedor:</b> ${acc.supplierName}</p>
                    <p><b>NIT/Cédula:</b> ${acc.id}</p>
                </div>
                <table>
                    <thead><tr><th>Fecha</th><th>Descripción / Concepto</th><th>Tipo</th><th style="text-align:right">Monto</th></tr></thead>
                    <tbody>
                        ${acc.history.map(tx => `
                            <tr>
                                <td>${new Date(tx.date).toLocaleDateString()}</td>
                                <td>${tx.description || 'N/A'}</td>
                                <td>${tx.type === 'CHARGE' ? 'CARGO' : 'ABONO'}</td>
                                <td style="text-align:right">$${Math.round(tx.amount).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="text-align:right; margin-top:30px;">
                    <h2 style="color:#D62828">SALDO PENDIENTE: $${Math.round(acc.currentBalance).toLocaleString()}</h2>
                </div>
                ${customFooter ? `<div class="custom-footer">${customFooter}</div>` : ''}
                <div class="footer">Software: Kiosko Comercial POS</div>
          `;
      }

      printWindow.document.write(`<!DOCTYPE html><html><head><style>${cssStyles}</style></head><body>${contentHtml}<script>window.onload = function() { window.print(); window.close(); }</script></body></html>`);
      printWindow.document.close();
      setShowCxpPrintOptions(false);
  };

  const handleEditClick = (batch: any) => {
      const mappedItems: StagedItem[] = batch.items.map((i: Order) => ({
          product: products.find(p => p.id === i.productId) || { 
              id: i.productId || '', 
              name: i.productName, 
              cost: i.cost, 
              price: 0, 
              taxRate: i.taxRate, 
              consumptionTax: i.consumptionTax, 
              category: 'General', 
              stock: 0, 
              ean: i.ean 
          },
          quantity: i.quantity,
          cost: i.cost,
          discountPerc: i.discount ? (i.discount / (i.cost * i.quantity) * 100) : 0 
      }));

      setEditingBatch({
          id: batch.batchId,
          name: batch.supplier,
          nit: batch.supplierNit,
          items: mappedItems,
          paymentMethod: batch.paymentMethod || PaymentMethod.CASH,
          date: batch.date.split('T')[0]
      });
  };

  const handleSaveEditBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBatch) {
        onEditPurchaseDocument(
            editingBatch.id, 
            editingBatch.name, 
            editingBatch.nit, 
            editingBatch.items, 
            editingBatch.paymentMethod, 
            editingBatch.date, 
            editingBatch.reference
        );
        setEditingBatch(null);
        if (onEditLoaded) onEditLoaded();
    }
  };

  const confirmDeleteBatch = () => {
    if (batchToDelete) {
      onDeletePurchaseDocument(batchToDelete);
      setBatchToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const renderProductIcon = (iconStr: string | undefined) => {
      const icon = iconStr || '📦';
      const isImage = icon.startsWith('http') || icon.startsWith('data:image');
      
      if (isImage) {
          return <img src={icon} alt="Producto" className="w-10 h-10 object-cover rounded-lg shadow-sm" />;
      }
      return <span className="text-2xl">{icon}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-3"><ClipboardList className="text-brand-red" size={32} /> Abastecimiento & CXP</h2>
          <p className="text-gray-500 font-medium">Gestión integral de compras y deudas con proveedores.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveSubTab('REGISTRO')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeSubTab === 'REGISTRO' ? 'bg-brand-black text-white' : 'text-gray-400 hover:text-brand-black'}`}>Registro Compra</button>
            <button onClick={() => setActiveSubTab('HISTORIAL')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeSubTab === 'HISTORIAL' ? 'bg-brand-black text-white' : 'text-gray-400 hover:text-brand-black'}`}>Historial</button>
            <button onClick={() => setActiveSubTab('CXP')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeSubTab === 'CXP' ? 'bg-brand-black text-white' : 'text-gray-400 hover:text-brand-black'}`}>Cuentas por Pagar</button>
        </div>
      </div>

      {activeSubTab === 'REGISTRO' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in slide-in-from-top-2">
            <div className="xl:col-span-12 space-y-6">
                <div className="bg-white rounded-[3rem] shadow-xl border-t-[12px] border-brand-red overflow-hidden">
                    <div className="p-8 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Truck size={14}/> Datos del Proveedor</p>
                            <datalist id="suppliers-list">
                                {suppliers.map(s => <option key={s.nit} value={s.name}>{s.nit} - {s.name}</option>)}
                            </datalist>
                            <datalist id="suppliers-nit-list">
                                {suppliers.map(s => <option key={s.nit} value={s.nit}>{s.name} - {s.nit}</option>)}
                            </datalist>
                            <div className="grid grid-cols-2 gap-3">
                                <input list="suppliers-list" type="text" value={supplierName} onChange={e => handleSupplierChange(e.target.value)} className="col-span-2 w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:border-brand-red font-black text-xs shadow-sm" placeholder="Razón Social *" />
                                <input 
                                    list="suppliers-nit-list"
                                    type="text" 
                                    value={supplierNit} 
                                    onChange={e => handleSupplierNitChange(e.target.value)} 
                                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none text-xs font-mono font-bold shadow-sm" 
                                    placeholder="NIT / Cédula *" 
                                />
                                <div className="flex flex-col gap-1">
                                    <label className="text-[8px] font-black text-brand-red uppercase ml-1">Fecha de Compra</label>
                                    <input 
                                        type="date" 
                                        value={purchaseDate} 
                                        onChange={e => setPurchaseDate(e.target.value)} 
                                        className={dateInputClass}
                                    />
                                </div>
                                <input type="text" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none text-xs font-bold shadow-sm" placeholder="WhatsApp" />
                                <input 
                                    type="text" 
                                    value={invoiceRef} 
                                    onChange={e => setInvoiceRef(e.target.value)} 
                                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none text-xs font-bold shadow-sm placeholder:font-sans" 
                                    placeholder="Referencia / Factura (Opcional)" 
                                />
                            </div>
                        </div>

                        <div ref={searchRef} className="flex-1 space-y-3 relative">
                            <p className="text-[10px] font-black text-brand-red uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Agregar Productos</p>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                <input 
                                    ref={searchInputRef}
                                    type="text" 
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setShowSearchDropdown(true); }}
                                    onFocus={() => setShowSearchDropdown(true)}
                                    className="w-full pl-12 p-4 bg-brand-black text-white rounded-2xl outline-none border-2 border-transparent focus:border-brand-red font-black text-sm shadow-xl" 
                                    placeholder="EAN o nombre..." 
                                />
                            </div>

                            {showSearchDropdown && searchTerm.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    {filteredSearch.length === 0 ? (
                                        <div className="p-6 text-center">
                                            <p className="text-xs font-black text-gray-400 uppercase mb-2">Sin coincidencias</p>
                                            <p className="text-[10px] text-gray-500 italic">Cree el ítem en Inventarios primero.</p>
                                        </div>
                                    ) : (
                                        filteredSearch.map(p => (
                                            <button key={p.id} onClick={() => addItemToStage(p)} className="w-full p-4 hover:bg-gray-50 flex items-center gap-4 transition-colors border-b border-gray-50 last:border-0">
                                                {renderProductIcon(p.icon)}
                                                <div className="text-left"><p className="font-black text-xs text-brand-black uppercase">{p.name}</p><p className="text-[10px] text-gray-400 font-mono">EAN: {p.ean || '---'}</p></div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-brand-black text-white text-[9px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4 text-left">EAN-13/EAN-8</th>
                                        <th className="px-6 py-4 text-left">Ítem</th>
                                        <th className="px-6 py-4 text-center">Cantidad</th>
                                        <th className="px-6 py-4 text-center">Costo Unit antes de IVA</th>
                                        <th className="px-6 py-4 text-center">IVA%</th>
                                        <th className="px-6 py-4 text-center">$ IC</th>
                                        <th className="px-6 py-4 text-center">Desc %</th>
                                        <th className="px-6 py-4 text-right">Total Neto</th>
                                        <th className="px-6 py-4 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {stagedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 text-gray-300">
                                                    <ShoppingBag size={48} className="opacity-20"/>
                                                    <p className="font-black uppercase tracking-widest text-sm italic">Sin productos en la lista</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        stagedItems.map((item, idx) => {
                                            const subtotalGross = item.cost * item.quantity;
                                            const discountVal = subtotalGross * (item.discountPerc / 100);
                                            const ivaVal = subtotalGross * (item.product.taxRate / 100);
                                            const icVal = (item.product.consumptionTax || 0) * item.quantity;
                                            // Nueva Lógica: Base bruta no afectada por descuento para cálculo de IVA, pero descuento sí resta al total.
                                            const totalItem = subtotalGross - discountVal + ivaVal + icVal;
                                            
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-mono font-bold text-gray-400 text-xs">
                                                        {item.product.ean || '---'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {renderProductIcon(item.product.icon)}
                                                            <div><p className="font-black text-xs text-brand-black uppercase leading-tight">{item.product.name}</p></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input type="number" className="w-16 p-2 bg-gray-100 rounded-lg font-black text-center outline-none border border-transparent focus:border-brand-red text-xs" value={item.quantity} onChange={e => updateStagedItem(idx, 'quantity', Number(e.target.value))} min="1" />
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input type="number" className="w-24 p-2 bg-gray-100 rounded-lg font-black text-right outline-none border border-transparent focus:border-brand-red text-xs" value={item.cost} onChange={e => updateStagedItem(idx, 'cost', Number(e.target.value))} />
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-black text-gray-500 text-xs">
                                                        {item.product.taxRate}%
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg font-black text-[10px] border border-orange-100">
                                                            $ {(item.product.consumptionTax || 0).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input type="number" className="w-16 p-2 bg-gray-100 rounded-lg font-black text-center outline-none border border-transparent focus:border-brand-red text-xs" value={item.discountPerc} onChange={e => updateStagedItem(idx, 'discountPerc', Number(e.target.value))} />
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-brand-black text-xs">${formatMoney(totalItem)}</td>
                                                    <td className="px-6 py-4 text-center"><button onClick={() => removeItemFromStage(idx)} className="text-gray-300 hover:text-brand-red"><Trash2 size={16}/></button></td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="p-8 bg-brand-black text-white flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex gap-8">
                            <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Base Imponible</p><p className="text-2xl font-black tracking-tighter">${formatDecimal(stagedTotals.base)}</p></div>
                            <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">IVA Facturado</p><p className="text-2xl font-black tracking-tighter text-brand-red">${formatDecimal(stagedTotals.tax)}</p></div>
                            <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">IC Facturado</p><p className="text-2xl font-black tracking-tighter text-orange-400">${formatDecimal(stagedTotals.ic)}</p></div>
                            <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Dto Facturado</p><p className="text-2xl font-black tracking-tighter text-brand-red">-${formatDecimal(stagedTotals.discount)}</p></div>
                            <div className="text-center bg-white/5 px-6 py-2 rounded-2xl border border-white/10"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total a Legalizar</p><p className="text-3xl font-black tracking-tighter text-green-400">${Math.round(stagedTotals.total).toLocaleString()}</p></div>
                        </div>
                        <button disabled={stagedItems.length === 0 || !supplierName} onClick={() => setShowPaymentModal(true)} className="w-full md:w-auto px-12 py-5 bg-brand-red text-white font-black rounded-[2rem] shadow-2xl transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30"><CheckCircle2 size={20}/> Procesar Compra</button>
                    </div>
                </div>
            </div>
        </div>
      ) : activeSubTab === 'HISTORIAL' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="relative">
                       <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-red pointer-events-none z-10"/>
                       <input 
                         type="date" 
                         value={historyStartDate} 
                         onChange={e => setHistoryStartDate(e.target.value)} 
                         className={`${dateInputClass} pl-10 w-44`}
                       />
                    </div>
                    <span className="text-gray-300 font-bold px-2">a</span>
                    <div className="relative">
                       <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-red pointer-events-none z-10"/>
                       <input 
                         type="date" 
                         value={historyEndDate} 
                         onChange={e => setHistoryEndDate(e.target.value)} 
                         className={`${dateInputClass} pl-10 w-44`}
                       />
                    </div>
                </div>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input type="text" placeholder="Buscar por Proveedor, NIT o Batch ID..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-red transition-all" />
                </div>
                <div className="bg-white border-2 border-gray-100 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><History size={14}/> {purchaseHistory.length} Registros Anuales</div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {purchaseHistory.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-gray-100">
                        <ShoppingBag size={48} className="text-gray-200"/>
                        <p className="font-black text-gray-300 uppercase tracking-widest">Sin registros encontrados en este rango (365 días)</p>
                    </div>
                ) : (
                    purchaseHistory.map(batch => {
                        const batchTotalBase = batch.items.reduce((acc, i) => acc + (i.cost * i.quantity), 0);
                        const batchTotalIVA = batch.items.reduce((acc, i) => acc + (i.cost * i.quantity * (i.taxRate/100)), 0);
                        const batchTotalIC = batch.items.reduce((acc, i) => acc + ((i.consumptionTax || 0) * i.quantity), 0);
                        const batchTotalFinal = batch.total;
                        
                        const finalDiscount = batch.totalDiscount > 0 
                            ? batch.totalDiscount 
                            : Math.max(0, (batchTotalBase + batchTotalIVA + batchTotalIC) - batchTotalFinal);

                        return (
                        <div key={batch.batchId} className={`bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden hover:border-brand-red transition-all group ${batch.status === 'ANULADO' ? 'opacity-50 line-through bg-red-50/20' : ''}`}>
                            <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gray-100 text-brand-black rounded-2xl flex items-center justify-center font-black shadow-inner group-hover:bg-brand-red group-hover:text-white transition-all"><Truck size={28}/></div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-black text-lg text-brand-black uppercase leading-tight">{batch.supplier}</p>
                                            {batch.status === 'ANULADO' ? (
                                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[8px] font-black uppercase tracking-tighter no-underline">ANULADA</span>
                                            ) : batch.paymentMethod === PaymentMethod.CXP ? (
                                                batch.isPaid ? (
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[8px] font-black uppercase tracking-tighter">CANCELADO/CXP</span>
                                                ) : batch.paidAmount && batch.paidAmount > 0 ? (
                                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[8px] font-black uppercase tracking-tighter">ABONADO/CXP (${formatMoney(batch.paidAmount)})</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[8px] font-black uppercase tracking-tighter">PENDIENTE/CXP</span>
                                                )
                                            ) : batch.paymentMethod === PaymentMethod.TRANSFER ? (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[8px] font-black uppercase tracking-tighter">CANCELADO/TRANSFERENCIA</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[8px] font-black uppercase tracking-tighter">CANCELADO/EFECTIVO</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 flex flex-wrap items-center gap-2">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-mono">{batch.batchId}</span>
                                            {batch.reference && (
                                                <>
                                                    <span>•</span>
                                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black font-sans">FACTURA/REF: {batch.reference}</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <span>{new Date(batch.date).toLocaleString('es-CO')}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-gray-400 uppercase">Total Legalizado</p>
                                        <p className="text-2xl font-black text-brand-black tracking-tighter">${formatMoney(batch.total)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setExpandedBatch(expandedBatch === batch.batchId ? null : batch.batchId)} className={`p-3 rounded-xl transition-all shadow-sm ${expandedBatch === batch.batchId ? 'bg-brand-black text-white' : 'bg-gray-50 text-gray-400 hover:text-brand-black hover:bg-gray-100'}`}>
                                            {expandedBatch === batch.batchId ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                        </button>
                                        <button onClick={() => handlePrintDocument(batch)} className="p-3 bg-gray-50 text-gray-400 hover:text-brand-black hover:bg-gray-100 rounded-xl transition-all shadow-sm" title="Imprimir Comprobante"><Printer size={20}/></button>
                                        {batch.status !== 'ANULADO' && (
                                            <>
                                                <button onClick={() => handleEditClick(batch)} className="p-3 bg-blue-50 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition-all shadow-sm"><Edit size={20}/></button>
                                                <button onClick={() => { setBatchToDelete(batch.batchId); setShowDeleteConfirm(true); }} className="p-3 bg-red-50 text-red-300 hover:text-brand-red hover:bg-red-100 rounded-xl transition-all shadow-sm"><Trash size={20}/></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {expandedBatch === batch.batchId && (
                                <div className="border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2">
                                    <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row gap-6">
                                        <div className="flex-1 space-y-3">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Truck size={14}/> Datos del Proveedor (Vista Previa)</p>
                                            <div className="grid grid-cols-2 gap-3 opacity-80 pointer-events-none">
                                                <input type="text" value={batch.supplier} readOnly className="col-span-2 w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none font-black text-xs shadow-sm text-gray-600" />
                                                <input type="text" value={batch.supplierNit} readOnly className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none text-xs font-mono font-bold shadow-sm text-gray-600" />
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[8px] font-black text-brand-red uppercase ml-1">Fecha de Compra</label>
                                                    <input 
                                                        type="date" 
                                                        value={batch.date.split('T')[0]} 
                                                        readOnly 
                                                        className={dateInputClass}
                                                    />
                                                </div>
                                                <input type="text" value={batch.paymentMethod || 'CONTADO'} readOnly className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none text-xs font-bold shadow-sm text-gray-600 uppercase" />
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center items-center text-gray-300 border-2 border-dashed border-gray-200 rounded-3xl">
                                            <Package size={48} className="mb-2 opacity-50"/>
                                            <span className="text-xs font-black uppercase tracking-widest">Modo Lectura</span>
                                        </div>
                                    </div>

                                    <div className="px-6 pb-6 pt-2">
                                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                            <table className="w-full text-[10px]">
                                                <thead className="bg-gray-100 text-gray-500 font-black uppercase">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">EAN</th>
                                                        <th className="px-4 py-2 text-left">Ítem</th>
                                                        <th className="px-4 py-2 text-center">Cant.</th>
                                                        <th className="px-4 py-2 text-right">Costo Un.</th>
                                                        <th className="px-4 py-2 text-center">IVA %</th>
                                                        <th className="px-4 py-2 text-center">IC $</th>
                                                        <th className="px-4 py-2 text-center">Desc %</th>
                                                        <th className="px-4 py-2 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {batch.items.map((i, idx) => {
                                                        const rowGross = i.cost * i.quantity;
                                                        const rowDiscount = i.discount || 0;
                                                        const rowIVA = rowGross * (i.taxRate/100);
                                                        const rowIC = (i.consumptionTax || 0) * i.quantity;
                                                        const rowTotal = rowGross - rowDiscount + rowIVA + rowIC;
                                                        const discountPerc = rowGross > 0 ? (rowDiscount / rowGross) * 100 : 0;

                                                        return (
                                                            <tr key={idx}>
                                                                <td className="px-4 py-2 font-mono text-gray-400">{i.ean || '---'}</td>
                                                                <td className="px-4 py-2 font-bold text-gray-700 uppercase">{i.productName}</td>
                                                                <td className="px-4 py-2 text-center font-black">{i.quantity}</td>
                                                                <td className="px-4 py-2 text-right text-gray-500">${formatMoney(i.cost)}</td>
                                                                <td className="px-4 py-2 text-center text-gray-500">{i.taxRate}%</td>
                                                                <td className="px-4 py-2 text-center text-gray-500">${formatMoney(i.consumptionTax || 0)}</td>
                                                                <td className="px-4 py-2 text-center text-gray-500">{discountPerc.toFixed(1)}%</td>
                                                                <td className="px-4 py-2 text-right font-black text-brand-black">${formatMoney(rowTotal)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-brand-black text-white flex flex-col md:flex-row items-center justify-between gap-8">
                                        <div className="flex gap-8 w-full justify-center md:justify-start">
                                            <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Base Imponible</p><p className="text-2xl font-black tracking-tighter">${formatDecimal(batchTotalBase)}</p></div>
                                            <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">IVA Facturado</p><p className="text-2xl font-black tracking-tighter text-brand-red">${formatDecimal(batchTotalIVA)}</p></div>
                                            <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">IC Facturado</p><p className="text-2xl font-black tracking-tighter text-orange-400">${formatDecimal(batchTotalIC)}</p></div>
                                            <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Dto Facturado</p><p className="text-2xl font-black tracking-tighter text-brand-red">-${formatDecimal(finalDiscount)}</p></div>
                                            <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Final</p><p className="text-2xl font-black tracking-tighter text-green-400">${formatDecimal(batchTotalFinal)}</p></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )})
                )}
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-2">
            <div className="md:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-h-[60vh]">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col gap-3">
                    <div className="font-black text-[10px] uppercase text-gray-400 tracking-widest">Proveedores con Saldo</div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                        <input 
                            type="text" 
                            placeholder="Buscar NIT o Nombre..." 
                            value={cxpSearch}
                            onChange={e => setCxpSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-red transition-all"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                    {supplierAccounts.filter(a => a.currentBalance > 0 && (a.supplierName.toLowerCase().includes(cxpSearch.toLowerCase()) || a.id.toLowerCase().includes(cxpSearch.toLowerCase()))).map(acc => (
                        <div key={acc.id} onClick={() => setSelectedSupplierAcc(acc)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedSupplierAcc?.id === acc.id ? 'bg-brand-black border-brand-black text-white' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                            <div className="flex justify-between items-center">
                                <div className="font-black text-xs uppercase">{acc.supplierName}</div>
                                <div className="font-black text-brand-red">${formatMoney(acc.currentBalance)}</div>
                            </div>
                            <div className="text-[9px] mt-1 opacity-60">NIT: {acc.id}</div>
                        </div>
                    ))}
                    {supplierAccounts.filter(a => a.currentBalance > 0 && (a.supplierName.toLowerCase().includes(cxpSearch.toLowerCase()) || a.id.toLowerCase().includes(cxpSearch.toLowerCase()))).length === 0 && <p className="text-center py-10 text-gray-300 font-bold uppercase text-[10px]">Sin cuentas pendientes</p>}
                </div>
            </div>
            
            <div className="md:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                {selectedSupplierAcc ? (
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div><h3 className="font-black text-xl text-brand-black uppercase tracking-tighter">{selectedSupplierAcc.supplierName}</h3><p className="text-xs text-gray-400 font-mono">NIT: {selectedSupplierAcc.id}</p></div>
                            <div className="flex items-center gap-4">
                                <div className="text-right"><p className="text-[9px] font-black text-gray-400 uppercase">Saldo Pendiente</p><p className="text-3xl font-black text-brand-red">${formatMoney(selectedSupplierAcc.currentBalance)}</p></div>
                                <button 
                                  onClick={() => setShowCxpPrintOptions(true)}
                                  className="p-3 bg-brand-black text-white rounded-xl hover:bg-brand-red transition-all shadow-md"
                                  title="Imprimir Historial de Movimientos"
                                >
                                  <Printer size={20}/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><History size={14}/> Historial de Movimientos</p>
                            {selectedSupplierAcc.history.slice(0, 15).map((tx, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'CHARGE' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            {tx.type === 'CHARGE' ? <ArrowRight size={16}/> : <ArrowLeft size={16}/>}
                                        </div>
                                        <div><p className="text-xs font-black text-brand-black uppercase">{tx.description || (tx.type === 'CHARGE' ? 'Compra Facturada' : 'Abono Registrado')}</p><p className="text-[9px] text-gray-400 font-bold">{new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString()}</p></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`font-black ${tx.type === 'CHARGE' ? 'text-red-600' : 'text-green-600'}`}>{tx.type === 'CHARGE' ? '+' : '-'} ${formatMoney(tx.amount)}</div>
                                        {tx.type === 'PAYMENT' && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => {
                                                    setEditingSupplierPayment(tx);
                                                    setEditSupplierPaymentAmount(tx.amount.toString());
                                                    setEditSupplierPaymentDate(new Date(tx.date).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
                                                    setEditSupplierPaymentDescription(tx.description || '');
                                                }} className="p-2 bg-gray-200 rounded-full text-gray-500 hover:text-blue-600" title="Editar Abono">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteSupplierPaymentClick(tx)} className="p-2 bg-gray-200 rounded-full text-gray-500 hover:text-red-600" title="Eliminar Abono">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-6 bg-white border-t border-gray-100">
                            <form onSubmit={handleSupplierPayment} className="flex flex-col gap-3">
                                <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1"><DollarSign size={14}/> Abono a Proveedor</span>
                                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="bg-transparent border-none text-brand-red outline-none cursor-pointer" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="relative flex-1">
                                        <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                                        <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-gray-100 rounded-2xl font-black text-lg outline-none border-2 border-transparent focus:border-brand-red transition-all" placeholder="Monto del abono..." />
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={payDescription} onChange={e => setPayDescription(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent focus:bg-white focus:border-brand-red rounded-xl text-sm text-brand-black outline-none" placeholder="Comentario (opcional)" />
                                        <button type="submit" disabled={!payAmount} className="px-8 bg-brand-black text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-red disabled:opacity-30 transition-all">Registrar</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 p-20">
                        <Wallet size={64} className="mb-4 opacity-10" />
                        <p className="font-black uppercase tracking-widest text-sm text-center">Seleccione un proveedor de la lista lateral para gestionar sus pagos y deudas.</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* MODAL ELIMINAR ABONO PROVEEDOR */}
      {supplierPaymentToDelete && (
          <div className="fixed inset-0 z-[600] bg-brand-black/95 flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden border-t-[12px] border-brand-red shadow-2xl animate-in zoom-in-95 flex flex-col">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2"><AlertCircle className="text-brand-red" /> Eliminar Abono</h3>
                          <p className="text-[10px] text-brand-red font-black uppercase">Ref: {supplierPaymentToDelete.id}</p>
                      </div>
                      <button onClick={() => setSupplierPaymentToDelete(null)} className="p-2 hover:bg-gray-200 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  <div className="p-8">
                      <p className="text-gray-600 mb-6 text-center">¿Está seguro de que desea eliminar el abono por <strong className="text-brand-black">${formatMoney(supplierPaymentToDelete.amount)}</strong>? Esto revertirá el pago en el saldo del proveedor.</p>
                      <div className="flex gap-4">
                          <button onClick={() => setSupplierPaymentToDelete(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all">Cancelar</button>
                          <button onClick={confirmDeleteSupplierPayment} className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/30">Eliminar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL EDICIÓN ABONO PROVEEDOR */}
      {editingSupplierPayment && (
          <div className="fixed inset-0 z-[600] bg-brand-black/95 flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden border-t-[12px] border-blue-600 shadow-2xl animate-in zoom-in-95 flex flex-col">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter">Editar Abono</h3>
                          <p className="text-[10px] text-blue-600 font-black uppercase">Ref: {editingSupplierPayment.id}</p>
                      </div>
                      <button onClick={() => setEditingSupplierPayment(null)} className="p-2 hover:bg-gray-200 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                      <form onSubmit={handleEditSupplierPaymentSubmit} className="space-y-4">
                          <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Monto del Abono</label>
                              <div className="relative">
                                  <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                                  <input 
                                      type="number" 
                                      value={editSupplierPaymentAmount} 
                                      onChange={e => setEditSupplierPaymentAmount(e.target.value)} 
                                      className="w-full pl-10 pr-4 py-4 bg-gray-100 rounded-2xl font-black text-lg outline-none border-2 border-transparent focus:border-blue-500 transition-all" 
                                      placeholder="Monto..." 
                                      required
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Fecha</label>
                              <input 
                                  type="date" 
                                  value={editSupplierPaymentDate} 
                                  onChange={e => setEditSupplierPaymentDate(e.target.value)} 
                                  className="w-full p-4 bg-gray-100 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-blue-500 transition-all" 
                                  required
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Descripción (Opcional)</label>
                              <input 
                                  type="text" 
                                  value={editSupplierPaymentDescription} 
                                  onChange={e => setEditSupplierPaymentDescription(e.target.value)} 
                                  className="w-full p-4 bg-gray-100 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-blue-500 transition-all" 
                                  placeholder="Ej: Abono en efectivo..." 
                              />
                          </div>
                          <div className="pt-4">
                              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30">
                                  Guardar Cambios
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL EDICIÓN COMPLETA */}
      {editingBatch && (
          <div className="fixed inset-0 z-[600] bg-brand-black/95 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-[3rem] w-full max-w-7xl overflow-hidden border-t-[12px] border-blue-600 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[95vh]">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter">Editar Documento Compra</h3>
                          <p className="text-[10px] text-blue-600 font-black uppercase">Ref: {editingBatch.id}</p>
                      </div>
                      <button onClick={() => setEditingBatch(null)} className="p-2 hover:bg-gray-200 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                      {/* Cabecera */}
                      <div className="p-8 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-6 rounded-3xl">
                          <div className="flex-1 space-y-3">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Truck size={14}/> Datos del Proveedor</p>
                              <div className="grid grid-cols-2 gap-3">
                                  <input list="suppliers-list" type="text" value={editingBatch.name} onChange={e => setEditingBatch({...editingBatch, name: e.target.value})} className="col-span-2 w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:border-blue-500 font-black text-xs shadow-sm" placeholder="Razón Social *" />
                                  <input list="suppliers-nit-list" type="text" value={editingBatch.nit} onChange={e => setEditingBatch({...editingBatch, nit: e.target.value})} className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none text-xs font-mono font-bold shadow-sm" placeholder="NIT / Cédula *" />
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[8px] font-black text-blue-600 uppercase ml-1">Fecha de Compra</label>
                                    <input 
                                        type="date" 
                                        value={editingBatch.date} 
                                        onChange={e => setEditingBatch({...editingBatch, date: e.target.value})} 
                                        className={dateInputClass} 
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[8px] font-black text-blue-600 uppercase ml-1">Método de Pago</label>
                                    <select 
                                      value={editingBatch.paymentMethod} 
                                      onChange={(e) => setEditingBatch({...editingBatch, paymentMethod: e.target.value as PaymentMethod})}
                                      className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none font-black text-[10px] uppercase shadow-sm"
                                    >
                                      <option value={PaymentMethod.CASH}>Efectivo (Contado)</option>
                                      <option value={PaymentMethod.TRANSFER}>Transferencia (Contado)</option>
                                      <option value={PaymentMethod.CXP}>CXP (Fiado)</option>
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[8px] font-black text-blue-600 uppercase ml-1">Referencia / Factura (Opcional)</label>
                                    <input 
                                        type="text" 
                                        value={editingBatch.reference || ''} 
                                        onChange={e => setEditingBatch({...editingBatch, reference: e.target.value})} 
                                        className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none text-xs font-bold shadow-sm" 
                                        placeholder="Referencia / Factura" 
                                    />
                                  </div>
                              </div>
                          </div>

                          <div ref={editSearchRef} className="flex-1 space-y-3 relative">
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><Package size={14}/> Agregar Ítems a la Compra</p>
                              <div className="relative">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                  <input 
                                      type="text" 
                                      value={editSearchTerm}
                                      onChange={e => { setEditSearchTerm(e.target.value); setShowEditSearchDropdown(true); }}
                                      onFocus={() => setShowEditSearchDropdown(true)}
                                      className="w-full pl-12 p-4 bg-brand-black text-white rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 font-black text-sm shadow-xl" 
                                      placeholder="EAN o nombre para añadir..." 
                                  />
                              </div>

                              {showEditSearchDropdown && editSearchTerm.length > 0 && (
                                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in">
                                      {filteredEditSearch.map(p => (
                                          <button key={p.id} onClick={() => addItemToEditBatch(p)} className="w-full p-4 hover:bg-blue-50 flex items-center gap-4 transition-colors border-b border-gray-50 last:border-0">
                                              {renderProductIcon(p.icon)}
                                              <div className="text-left"><p className="font-black text-xs text-brand-black uppercase">{p.name}</p><p className="text-[10px] text-gray-400 font-mono">EAN: {p.ean || '---'}</p></div>
                                          </button>
                                      ))}
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Tabla de Items */}
                      <div className="overflow-x-auto rounded-[2rem] border border-gray-100">
                          <table className="w-full">
                              <thead className="bg-brand-black text-white text-[9px] font-black uppercase tracking-widest">
                                  <tr>
                                      <th className="px-6 py-4 text-left">EAN</th>
                                      <th className="px-6 py-4 text-left">Ítem</th>
                                      <th className="px-6 py-4 text-center">Cantidad</th>
                                      <th className="px-6 py-4 text-center">Costo Unit Neto</th>
                                      <th className="px-6 py-4 text-center">IVA %</th>
                                      <th className="px-6 py-4 text-center">$ IC</th>
                                      <th className="px-6 py-4 text-center">Desc %</th>
                                      <th className="px-6 py-4 text-right">Subtotal Neto</th>
                                      <th className="px-6 py-4 text-center"></th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {editingBatch.items.map((item, idx) => {
                                      const rowGross = item.cost * item.quantity;
                                      const rowDiscount = rowGross * (item.discountPerc / 100);
                                      const rowTotalNeto = rowGross - rowDiscount + (rowGross * (item.product.taxRate/100)) + ((item.product.consumptionTax||0)*item.quantity);
                                      
                                      return (
                                          <tr key={idx} className="hover:bg-gray-50/50">
                                              <td className="px-6 py-4 font-mono font-bold text-gray-400 text-xs">
                                                  {item.product.ean || '---'}
                                              </td>
                                              <td className="px-6 py-4">
                                                  <div className="flex items-center gap-3">
                                                      {renderProductIcon(item.product.icon)}
                                                      <span className="font-black text-xs text-brand-black uppercase">{item.product.name}</span>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <input type="number" className="w-20 p-2 bg-gray-100 rounded-lg font-black text-center text-xs" value={item.quantity} onChange={e => updateEditingItem(idx, 'quantity', Number(e.target.value))} />
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <input type="number" className="w-24 p-2 bg-gray-100 rounded-lg font-black text-right text-xs" value={item.cost} onChange={e => updateEditingItem(idx, 'cost', Number(e.target.value))} />
                                              </td>
                                              <td className="px-6 py-4 text-center font-black text-gray-400 text-xs">
                                                  {item.product.taxRate}%
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg font-black text-[9px] border border-orange-100">
                                                      $ {(item.product.consumptionTax || 0).toLocaleString()}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <input type="number" className="w-16 p-2 bg-gray-100 rounded-lg font-black text-center outline-none border border-transparent focus:border-brand-red text-xs" value={item.discountPerc} onChange={e => updateEditingItem(idx, 'discountPerc', Number(e.target.value))} />
                                              </td>
                                              <td className="px-6 py-4 text-right font-black text-brand-black text-xs">
                                                  ${formatMoney(rowTotalNeto)}
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <button onClick={() => setEditingBatch({...editingBatch, items: editingBatch.items.filter((_, i) => i !== idx)})} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button>
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  {/* Resumen Final */}
                  <div className="p-8 bg-brand-black text-white flex flex-col md:flex-row items-center justify-between gap-8 shrink-0">
                      <div className="flex gap-8">
                          {(() => {
                              const editTotals = editingBatch.items.reduce((acc, i) => {
                                  const gross = i.cost * i.quantity;
                                  const discount = gross * (i.discountPerc / 100);
                                  const iva = gross * (i.product.taxRate / 100); 
                                  const ic = (i.product.consumptionTax || 0) * i.quantity;
                                  return {
                                      base: acc.base + gross,
                                      discount: acc.discount + discount,
                                      tax: acc.tax + iva,
                                      ic: acc.ic + ic,
                                      total: acc.total + (gross - discount + iva + ic)
                                  };
                              }, { base: 0, discount: 0, tax: 0, ic: 0, total: 0 });

                              return (
                                  <>
                                      <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Base Imponible</p><p className="text-2xl font-black tracking-tighter">${formatDecimal(editTotals.base)}</p></div>
                                      <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">IVA Recalculado</p><p className="text-2xl font-black tracking-tighter text-brand-red">${formatDecimal(editTotals.tax)}</p></div>
                                      <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">IC Recalculado</p><p className="text-2xl font-black tracking-tighter text-orange-400">${formatDecimal(editTotals.ic)}</p></div>
                                      <div className="text-center"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Dto Recalculado</p><p className="text-2xl font-black tracking-tighter text-brand-red">-${formatDecimal(editTotals.discount)}</p></div>
                                      <div className="text-center bg-white/5 px-6 py-2 rounded-2xl border border-white/10"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Nuevo Total</p><p className="text-3xl font-black tracking-tighter text-green-400">${Math.round(editTotals.total).toLocaleString()}</p></div>
                                  </>
                              );
                          })()}
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setEditingBatch(null)} className="px-8 py-5 bg-gray-700 text-gray-400 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-600 transition-all">Cancelar</button>
                        <button onClick={handleSaveEditBatch} className="px-12 py-5 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center gap-2"><Save size={20}/> Sincronizar Documento</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODALES DE SOPORTE */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[500] bg-brand-black/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden border-t-8 border-brand-red shadow-2xl animate-in zoom-in-95 p-8 text-center">
              <div className="w-20 h-20 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto mb-6"><DollarSign size={40}/></div>
              <h3 className="text-2xl font-black text-brand-black uppercase tracking-tighter mb-2">Método de Pago Compra</h3>
              <p className="text-gray-500 font-bold text-sm mb-8 uppercase tracking-widest">Monto a pagar: <span className="text-brand-red font-black text-xl">${formatMoney(stagedTotals.total)}</span></p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                  <button onClick={() => handleConfirmPurchase(PaymentMethod.CASH)} className="flex flex-col items-center gap-3 p-6 border-2 border-gray-100 rounded-3xl hover:border-brand-red transition-all group">
                    <Banknote size={28} className="text-gray-400 group-hover:text-brand-red"/><span className="text-[10px] font-black uppercase">Efectivo</span>
                  </button>
                  <button onClick={() => handleConfirmPurchase(PaymentMethod.TRANSFER)} className="flex flex-col items-center gap-3 p-6 border-2 border-gray-100 rounded-3xl hover:border-blue-500 transition-all group">
                    <Smartphone size={28} className="text-gray-400 group-hover:text-blue-500"/><span className="text-[10px] font-black uppercase">Transferencia / QR</span>
                  </button>
                  <button onClick={() => handleConfirmPurchase(PaymentMethod.CXP)} className="col-span-2 flex flex-col items-center gap-3 p-6 border-2 border-gray-100 rounded-3xl hover:border-orange-500 transition-all group bg-orange-50/20">
                    <Wallet size={28} className="text-gray-400 group-hover:text-orange-500"/><span className="text-[10px] font-black uppercase">CXP (Fiado de Proveedor)</span>
                  </button>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 font-black uppercase text-[10px] hover:text-brand-red flex items-center justify-center gap-2 mx-auto"><ArrowLeft size={14}/> Volver al listado</button>
          </div>
        </div>
      )}

      {/* MODAL OPCIONES IMPRESIÓN CXP */}
      {showCxpPrintOptions && selectedSupplierAcc && (
          <div className="fixed inset-0 z-[500] bg-brand-black/95 backdrop-blur-lg flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden border-t-[12px] border-brand-red shadow-2xl animate-in zoom-in-95 p-10 text-center">
                  <div className="w-20 h-20 bg-gray-100 text-brand-red rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Printer size={40} /></div>
                  <h3 className="text-2xl font-black text-brand-black uppercase mb-1">IMPRIMIR CXP</h3>
                  <p className="text-gray-500 font-bold mb-8 uppercase text-[10px] tracking-widest">Proveedor: <span className="text-brand-red">{selectedSupplierAcc.supplierName}</span></p>
                  
                  <div className="space-y-4">
                      <button 
                        onClick={() => handlePrintCxpHistory('THERMAL')} 
                        className="w-full py-5 bg-brand-black text-white font-black rounded-2xl hover:bg-gray-800 shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-xs"
                      >
                        <Printer size={20} /> Formato Tirilla (80mm)
                      </button>
                      
                      <button 
                        onClick={() => handlePrintCxpHistory('LETTER')} 
                        className="w-full py-5 bg-white border-4 border-gray-100 text-brand-black font-black rounded-2xl hover:border-brand-black shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-xs"
                      >
                        <FileText size={20} /> Formato Hoja Carta
                      </button>

                      <button 
                        onClick={() => handlePrintCxpHistory('HALF_LETTER')} 
                        className="w-full py-5 bg-white border-4 border-gray-100 text-brand-black font-black rounded-2xl hover:border-brand-black shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-xs"
                      >
                        <FileType size={20} /> Formato Media Carta
                      </button>
                      
                      <button onClick={() => setShowCxpPrintOptions(false)} className="mt-4 text-gray-400 font-black text-[10px] uppercase hover:text-brand-red">Cancelar Impresión</button>
                  </div>
              </div>
          </div>
      )}

      {showDeleteConfirm && (
          <div className="fixed inset-0 z-[600] bg-brand-black/98 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-[4rem] w-full max-w-md overflow-hidden shadow-2xl border-t-[20px] border-brand-red p-12 text-center animate-in zoom-in-95 duration-400">
                  <div className="w-28 h-28 bg-red-50 text-brand-red rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner animate-bounce">
                      <Trash size={56} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-3xl font-black text-brand-black uppercase tracking-tighter mb-4 leading-none">¿BORRAR DOCUMENTO?</h3>
                  <p className="text-gray-500 font-bold text-lg mb-10 leading-snug px-4 uppercase">
                    Al borrar este registro, las cantidades compradas <span className="text-brand-red font-black">se restarán del inventario</span> automáticamente y se ajustarán saldos CXP si aplica.
                  </p>
                  <div className="flex flex-col gap-4">
                      <button onClick={confirmDeleteBatch} className="w-full py-6 bg-brand-red text-white font-black rounded-[2rem] text-xl hover:bg-brand-darkRed shadow-2xl transition-all uppercase tracking-widest">SÍ, REVERTIR Y BORRAR</button>
                      <button onClick={() => { setShowDeleteConfirm(false); setBatchToDelete(null); }} className="w-full py-6 bg-gray-100 text-gray-600 font-black rounded-[2rem] text-lg hover:bg-gray-200 transition-colors uppercase tracking-widest">NO, MANTENER</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
