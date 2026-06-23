import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, CartItem, Invoice, PaymentMethod, Quote, StoreSettings, Customer } from '../types';
import { 
  Plus, Minus, Trash2, Search, ShoppingBag, X, Lock,
  DollarSign, CreditCard, Printer, Bot, 
  CheckCircle2, Smartphone, Loader2, MessageCircle, UserPlus, QrCode,
  Package, AlertTriangle, Mail, Phone, User, FileText, Layers, Tag, CloudUpload, Percent,
  Hash, LayersIcon, Calculator, ArrowRight, CornerDownRight, Banknote, ShieldCheck, Globe, Send, ArrowLeft, ScanBarcode, Star, ReceiptText, Wallet, FileCode, HandCoins, Info, Boxes, MapPin, UserCheck, Save, BadgeCheck, FileType, PlusCircle, Truck, Download
} from 'lucide-react';
import { 
  transmitToDian, 
  encolarParaTransmision, 
  iniciarSincronizacionDIAN,
  generateCufePreview,
  getColombiaISO
} from '../services/dianService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface POSProps {
  onInvoiceCreated: (invoice: Invoice) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onQuoteCreated: (quote: Quote) => void;
  onCreditSale: (amount: number, clientName: string, clientNit: string, date: string) => void;
  onCreditDebtUpdated?: (clientId: string, amount: number) => void;
  onOpenGemini: () => void;
  pendingQuote?: Quote | null;
  onQuoteLoaded?: () => void;
  productsProp: Product[];
  storeSettings: StoreSettings;
  onCartStatusChange?: (hasItems: boolean) => void;
  customers: Customer[];
  onSaveCustomer: (customer: Customer) => void;
  pendingEditInvoiceId?: string | null;
  onEditLoaded?: () => void;
  invoices?: Invoice[];
  userId?: string;
}

type TransmissionStep = 'IDLE' | 'VALIDATING_DATA' | 'SIGNING' | 'SENDING' | 'WAITING_DIAN' | 'AUTHORIZED' | 'ERROR';
type PaymentView = 'METHODS' | 'CASH_DETAIL' | 'MIXED_DETAIL';
type PrintFormat = 'THERMAL' | 'LETTER' | 'HALF_LETTER';

interface TaxDetail {
  type: string;
  rate: number;
  base: number;
  tax: number;
  total: number;
}

export const POS: React.FC<POSProps> = ({ 
  onInvoiceCreated, 
  onUpdateInvoice,
  onQuoteCreated,
  onCreditSale,
  onOpenGemini, 
  productsProp,
  storeSettings,
  pendingQuote,
  onQuoteLoaded,
  customers,
  onSaveCustomer,
  pendingEditInvoiceId,
  onEditLoaded,
  invoices = [],
  userId
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState<string | null>(null);
  const [customerNit, setCustomerNit] = useState('222222222222');
  const [customerName, setCustomerName] = useState('Consumidor Final');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [sellerName, setSellerName] = useState('');
  
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isPercentDiscount, setIsPercentDiscount] = useState(false);
  const [shippingCost, setShippingCost] = useState<number>(0);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentView, setPaymentView] = useState<PaymentView>('METHODS');
  const [cashReceived, setCashReceived] = useState<number>(0);
  
  const [mixedPayments, setMixedPayments] = useState<{ method: PaymentMethod, amount: number }[]>([]);
  const [activeMixedMethod, setActiveMixedMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [mixedAmountInput, setMixedAmountInput] = useState<string>('');
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showEmitConfirmation, setShowEmitConfirmation] = useState(false);
  const [baseCash, setBaseCash] = useState<number>(0);
  const [countedCash, setCountedCash] = useState<number>(0);
  
  const [dianStep, setDianStep] = useState<TransmissionStep>('IDLE');
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);

  // ===== NUEVOS ESTADOS PARA MANEJO DE ERRORES UX 50+ =====
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [rejectionSuggestions, setRejectionSuggestions] = useState<string[]>([]);
  const [customerFieldError, setCustomerFieldError] = useState<'nit' | 'name' | 'phone' | 'email' | null>(null);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  const formatMoney = (val: number) => Math.round(val).toLocaleString('es-CO');
  
  const closureData = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const todaysInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.date).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
      return invDate === today;
    });

    let totalSales = 0;
    let cashSales = 0;
    let transferSales = 0;
    let cardSales = 0;
    let creditSales = 0;

    todaysInvoices.forEach(inv => {
      totalSales += inv.total;
      if (inv.paymentMethod === PaymentMethod.MIXED && inv.paymentDetails) {
        inv.paymentDetails.forEach(pd => {
          if (pd.method === PaymentMethod.CASH) cashSales += pd.amount;
          if (pd.method === PaymentMethod.TRANSFER) transferSales += pd.amount;
          if (pd.method === PaymentMethod.CARD) cardSales += pd.amount;
          if (pd.method === PaymentMethod.CREDIT) creditSales += pd.amount;
        });
      } else {
        if (inv.paymentMethod === PaymentMethod.CASH) cashSales += inv.total;
        if (inv.paymentMethod === PaymentMethod.TRANSFER) transferSales += inv.total;
        if (inv.paymentMethod === PaymentMethod.CARD) cardSales += inv.total;
        if (inv.paymentMethod === PaymentMethod.CREDIT) creditSales += inv.total;
      }
    });

    const expectedCash = baseCash + cashSales;
    const difference = countedCash - expectedCash;

    return {
      totalSales,
      cashSales,
      transferSales,
      cardSales,
      creditSales,
      expectedCash,
      difference,
      invoiceCount: todaysInvoices.length
    };
  }, [invoices, baseCash, countedCash]);

  const handlePrintClosure = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

    const pageContent = `
      <div class="center">
        <div class="bold" style="font-size: 14px;">${storeSettings.name.toUpperCase()}</div>
        <div>NIT: ${storeSettings.nit}</div>
        <div class="line"></div>
        <div class="bold">CIERRE DE CAJA</div>
        <div class="line"></div>
      </div>
      <div>FECHA: ${formattedDate}</div>
      <div>VENDEDOR: ${sellerName || 'General'}</div>
      <div class="line"></div>
      <div class="flex"><span>Facturas Emitidas:</span> <span>${closureData.invoiceCount}</span></div>
      <div class="flex bold"><span>TOTAL VENTAS:</span> <span>$${formatMoney(closureData.totalSales)}</span></div>
      <div class="line"></div>
      <div class="center bold" style="margin-top:5px;">DESGLOSE POR MÉTODO</div>
      <div class="flex"><span>Efectivo:</span> <span>$${formatMoney(closureData.cashSales)}</span></div>
      <div class="flex"><span>Transferencia:</span> <span>$${formatMoney(closureData.transferSales)}</span></div>
      <div class="flex"><span>Tarjeta:</span> <span>$${formatMoney(closureData.cardSales)}</span></div>
      <div class="flex"><span>Fiado (CxC):</span> <span>$${formatMoney(closureData.creditSales)}</span></div>
      <div class="line"></div>
      <div class="center bold" style="margin-top:5px;">CUADRE DE EFECTIVO</div>
      <div class="flex"><span>Base Inicial:</span> <span>$${formatMoney(baseCash)}</span></div>
      <div class="flex"><span>Ventas Efectivo:</span> <span>+$${formatMoney(closureData.cashSales)}</span></div>
      <div class="flex bold"><span>Efectivo Esperado:</span> <span>$${formatMoney(closureData.expectedCash)}</span></div>
      <div class="line"></div>
      <div class="flex"><span>Efectivo Contado:</span> <span>$${formatMoney(countedCash)}</span></div>
      <div class="flex bold"><span>Diferencia:</span> <span>$${formatMoney(closureData.difference)}</span></div>
      <div class="line"></div>
      <div class="center" style="margin-top:20px;">
        _______________________<br>
        Firma Cajero
      </div>
    `;

    const cssStyles = `
      @page { margin: 0; size: 80mm auto; }
      body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 10px 2px; font-size: 11px; color: #000; }
      .center { text-align: center; } .bold { font-weight: bold; } 
      .line { border-bottom: 1px dashed #000; margin: 5px 0; }
      .flex { display: flex; justify-content: space-between; } 
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cierre de Caja</title>
        <style>${cssStyles}</style>
      </head>
      <body>${pageContent}</body>
      <script>
        window.onload = function() { 
          window.print(); 
          setTimeout(() => window.close(), 500); 
        }
      </script>
      </html>
    `);
    printWindow.document.close();
  };
  
  useEffect(() => {
    if (pendingEditInvoiceId && invoices.length > 0) {
      const inv = invoices.find(i => i.id === pendingEditInvoiceId);
      if (inv) {
        setCart(inv.items);
        setOriginalInvoiceDate(inv.date);
        setCustomerNit(inv.customerNit);
        setCustomerName(inv.customerName);
        setCustomerPhone(inv.customerPhone || '');
        setCustomerEmail(inv.customerEmail || '');
        setCustomerAddress(inv.customerAddress || '');
        setSellerName(inv.sellerName || '');
        setDiscountValue(inv.discount || 0);
        setShippingCost(inv.shippingCost || 0);
        setIsPercentDiscount(false);
        if (onEditLoaded) onEditLoaded();
      }
    }
  }, [pendingEditInvoiceId, invoices, onEditLoaded]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showCustomerModal) {
        setShowCustomerModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showCustomerModal]);

  // ===== LISTENER DE SINCRONIZACIÓN AUTOMÁTICA (al montar componente) =====
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = iniciarSincronizacionDIAN(userId);
    return () => unsubscribe();
  }, [userId]);

  const isCustomerInfoComplete = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      customerName.trim().length > 3 &&
      customerName !== 'Consumidor Final' &&
      customerNit.trim().length > 4 &&
      customerNit !== '222222222222' &&
      customerPhone.trim().length > 6 &&
      emailRegex.test(customerEmail)
    );
  }, [customerName, customerNit, customerPhone, customerEmail]);

  useEffect(() => {
    if (pendingQuote) {
      setCart(pendingQuote.items);
      setCustomerName(pendingQuote.customerName);
      setCustomerNit(pendingQuote.customerNit);
      setCustomerEmail(pendingQuote.customerEmail);
      setCustomerPhone(pendingQuote.customerPhone);
      
      const existing = customers.find(c => c.nit === pendingQuote.customerNit);
      if (existing) {
        setCustomerAddress(existing.address || '');
      } else {
        setCustomerAddress('');
      }

      if (onQuoteLoaded) onQuoteLoaded();
    }
  }, [pendingQuote, customers]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      return productsProp.filter(p => p.isQuickAccess);
    }
    return productsProp.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.ean && p.ean.toLowerCase().includes(term))
    );
  }, [productsProp, searchTerm]);

  const handleCustomerNitChange = (val: string) => {
    setCustomerNit(val);
    const existing = customers.find(c => c.nit === val);
    if (existing) {
      setCustomerName(existing.name);
      setCustomerPhone(existing.phone || '');
      setCustomerEmail(existing.email || '');
      setCustomerAddress(existing.address || '');
    }
  };

  const saveCurrentCustomer = () => {
    if (customerNit !== '222222222222') {
      onSaveCustomer({
        nit: customerNit,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        address: customerAddress
      });
    }
  };

  // ===== VALIDACIÓN GRANULAR DE CLIENTE (UX 50+ con mensajes accionables) =====
  const validateCustomerForDIAN = (): { 
    valid: boolean; 
    missingField?: 'nit' | 'name' | 'phone' | 'email'; 
    message?: string 
  } => {
    if (!customerNit || customerNit.trim() === '' || customerNit === '222222222222') {
      return { valid: false, missingField: 'nit', message: 'Ingrese el NIT o Cédula del cliente (solo números, sin puntos ni guiones).' };
    }
    if (!customerName || customerName.trim() === '' || customerName === 'Consumidor Final') {
      return { valid: false, missingField: 'name', message: 'Ingrese el nombre completo o razón social del cliente.' };
    }
    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 7) {
      return { valid: false, missingField: 'phone', message: 'Ingrese un celular válido (mínimo 7 dígitos).' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(customerEmail)) {
      return { valid: false, missingField: 'email', message: 'Ingrese un correo válido para enviar la factura electrónica.' };
    }
    return { valid: true };
  };

  const cartTotals = useMemo(() => {
    const rawSums = cart.reduce((acc, item) => {
      const ivaPerc = item.taxRate / 100;
      const icUnitValue = Number(item.consumptionTax || 0); 
      const salePriceWithoutIC = item.price - icUnitValue;
      const baseUnit = salePriceWithoutIC / (1 + ivaPerc);
      const ivaUnit = baseUnit * ivaPerc;
      
      return { 
        subtotalBase: acc.subtotalBase + (baseUnit * item.quantity),
        totalTaxIVA: acc.totalTaxIVA + (ivaUnit * item.quantity),
        totalTaxIC: acc.totalTaxIC + (icUnitValue * item.quantity),
        articles: acc.articles + item.quantity
      };
    }, { subtotalBase: 0, totalTaxIVA: 0, totalTaxIC: 0, articles: 0 });

    const discountInPesos = isPercentDiscount 
      ? (rawSums.subtotalBase * (discountValue / 100)) 
      : discountValue;

    const baseImponible = Math.max(0, rawSums.subtotalBase - discountInPesos);
    const totalIVA = baseImponible * (rawSums.totalTaxIVA / (rawSums.subtotalBase || 1));
    const totalPagar = baseImponible + rawSums.totalTaxIVA + rawSums.totalTaxIC + shippingCost;

    const taxBreakdown: Record<string, TaxDetail> = {};
    cart.forEach(item => {
      const icUnitValue = Number(item.consumptionTax || 0);
      const salePriceWithoutIC = item.price - icUnitValue;
      const baseUnit = salePriceWithoutIC / (1 + (item.taxRate/100));
      
      const itemSubtotalBase = baseUnit * item.quantity;
      const ratio = rawSums.subtotalBase > 0 ? itemSubtotalBase / rawSums.subtotalBase : 0;
      const itemDiscount = discountInPesos * ratio;
      const itemEffectiveBase = Math.max(0, itemSubtotalBase - itemDiscount);

      const ivaKey = `IVA ${item.taxRate}%`;
      if (!taxBreakdown[ivaKey]) taxBreakdown[ivaKey] = { type: ivaKey, rate: item.taxRate, base: 0, tax: 0, total: 0 };
      const ivaVal = (itemEffectiveBase * (item.taxRate/100));
      taxBreakdown[ivaKey].base += itemEffectiveBase;
      taxBreakdown[ivaKey].tax += ivaVal;
      taxBreakdown[ivaKey].total += itemEffectiveBase + ivaVal;

      if (icUnitValue > 0) {
        const icKey = `IC`;
        if (!taxBreakdown[icKey]) taxBreakdown[icKey] = { type: icKey, rate: 0, base: 0, tax: 0, total: 0 };
        taxBreakdown[icKey].base = 0; 
        taxBreakdown[icKey].tax += icUnitValue * item.quantity;
        taxBreakdown[icKey].total += icUnitValue * item.quantity;
      }
    });

    return {
      subtotalBruto: rawSums.subtotalBase,
      discountInPesos,
      shippingCost,
      baseImponible,
      totalTaxIVA: rawSums.totalTaxIVA,
      totalTaxIC: rawSums.totalTaxIC,
      total: Math.max(0, Math.round(totalPagar)),
      articles: rawSums.articles,
      taxBreakdown: Object.values(taxBreakdown)
    };
  }, [cart, discountValue, isPercentDiscount, shippingCost]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`¡Lo sentimos! El producto "${product.name}" está agotado.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      
      if (existing) {
        if (existing.quantity + 1 > product.stock) {
          alert(`¡Stock insuficiente! Solo tienes ${product.stock} unidades de ${product.name}.`);
          return prev; 
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, newValue: number, maxStock: number) => {
    if (newValue > maxStock) {
      alert(`Cantidad excede el stock disponible (${maxStock}).`);
      setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: maxStock } : i));
    } else if (newValue < 1) {
      setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: 1 } : i));
    } else {
      setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newValue } : i));
    }
  };

  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, price: newPrice } : i));
  };

  // ===== HANDLE TRANSMIT DIAN OPTIMIZADO =====
  const handleTransmitDianNow = async () => {
    if (!lastInvoice) return;
    
    // 1. Validación granular con mensajes accionables (UX 50+)
    const validation = validateCustomerForDIAN();
    if (!validation.valid) {
      setShowCustomerModal(true);
      setCustomerFieldError(validation.missingField || null);
      alert(validation.message);
      return;
    }

    saveCurrentCustomer();
    setShowEmitConfirmation(false);

    setIsProcessing(true);
    setDianStep('VALIDATING_DATA');
    
    try {
      const response = await transmitToDian(lastInvoice, storeSettings, userId || '');
      
      if (response.success && response.cufe) {
        // ✅ Éxito: actualizar factura con CUFE y estado APPROVED
        setDianStep('AUTHORIZED');
        const updatedInvoice = { 
          ...lastInvoice, 
          dianStatus: 'APPROVED' as const, 
          cufe: response.cufe
        };
        onUpdateInvoice(updatedInvoice);
        setLastInvoice(updatedInvoice);
      } else if (response.dianStatus === 'REJECTED') {
        // ❌ Rechazo: mostrar modal con sugerencias accionables
        setDianStep('ERROR');
        setRejectionMessage(response.message || 'La DIAN rechazó esta factura por datos inválidos.');
        setRejectionSuggestions(response.suggestions || [
          'Verifique que el NIT/Cédula del cliente tenga solo números',
          'Confirme que los totales cuadren: Subtotal + IVA = Total a Pagar',
          'Asegúrese de que el correo electrónico del cliente sea válido'
        ]);
        setShowRejectionModal(true);
      } else {
        // ⚠️ Error genérico
        setDianStep('ERROR');
        alert(response.message || 'La DIAN no pudo procesar esta factura. Intente de nuevo.');
      }
    } catch (error: any) {
      // Manejo específico por tipo de error
      if (error.name === 'AbortError') {
        // ⏰ Timeout explícito
        setDianStep('ERROR');
        setShowTimeoutModal(true);
        return;
      }
      
      if (!navigator.onLine || error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
        // 📴 Sin conexión: encolar para reintento automático
        await encolarParaTransmision(lastInvoice, storeSettings, userId || '');
        setDianStep('ERROR');
        alert("📴 Sin conexión. La factura se guardó y se transmitirá automáticamente cuando vuelva el internet.");
        return;
      }

      // Error genérico del servidor
      setDianStep('ERROR');
      alert("⚠️ Ocurrió un error al comunicar con la DIAN. La venta se guardó localmente y se reintentará automáticamente.");
    } finally {
      setIsProcessing(false);
      if (dianStep !== 'ERROR') {
        setDianStep('IDLE');
      }
    }
  };

  const handleProcessSale = async (method: PaymentMethod, mixedData?: { method: PaymentMethod, amount: number }[]) => {
    const hasCreditComponent = method === PaymentMethod.CREDIT || mixedData?.some(p => p.method === PaymentMethod.CREDIT);
    
    if (hasCreditComponent && !isCustomerInfoComplete) {
      alert("Socio, para registrar una deuda (Fiado/CxC) es obligatorio identificar plenamente al cliente.");
      setShowCustomerModal(true);
      return;
    }

    saveCurrentCustomer();

    setIsProcessing(true);
    const invoiceId = pendingEditInvoiceId || `${storeSettings.prefix}-${storeSettings.currentNumber}`;
    const invoiceDate = originalInvoiceDate || getColombiaISO();
    const invoice: Invoice = {
      id: invoiceId,
      date: invoiceDate,
      customerName, customerNit, customerPhone, customerEmail, customerAddress,
      sellerName: sellerName.trim() !== '' ? sellerName : undefined,
      items: [...cart],
      subtotal: cartTotals.subtotalBruto,
      tax: cartTotals.totalTaxIVA,
      consumptionTaxTotal: cartTotals.totalTaxIC,
      discount: cartTotals.discountInPesos,
      shippingCost: cartTotals.shippingCost,
      total: cartTotals.total,
      paymentMethod: method,
      paymentDetails: mixedData,
      dianStatus: 'DRAFT',
    };

    if (pendingEditInvoiceId) {
      onUpdateInvoice(invoice);
      if (onEditLoaded) onEditLoaded();
    } else {
      onInvoiceCreated(invoice);
    }
    
    if (method === PaymentMethod.CREDIT) {
      onCreditSale(cartTotals.total, customerName, customerNit, invoiceDate);
    } else if (mixedData) {
      const creditPart = mixedData.find(p => p.method === PaymentMethod.CREDIT);
      if (creditPart) {
        onCreditSale(creditPart.amount, customerName, customerNit, invoiceDate);
      }
    }

    setLastInvoice(invoice);
    setShowPaymentModal(false);
    setShowSuccessModal(true);
    
    setCart([]);
    setDiscountValue(0);
    setShippingCost(0);
    setIsPercentDiscount(false);
    setMixedPayments([]);
    
    setCustomerNit('222222222222');
    setCustomerName('Consumidor Final');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    
    setSellerName(''); 
    
    setSearchTerm('');
    setCashReceived(0);
    setIsProcessing(false);
  };

  const getInvoiceHTMLData = (format: PrintFormat) => {
    if (!lastInvoice) return { cssStyles: '', pageContent: '' };

    const fiscalSummary: Record<string, { base: number, iva: number, ic: number }> = {};
    const rawItemsSubtotal = lastInvoice.items.reduce((acc, item) => {
      const baseUnit = (item.price - (item.consumptionTax || 0)) / (1 + (item.taxRate/100));
      return acc + (baseUnit * item.quantity);
    }, 0);
    const discountRatio = lastInvoice.discount ? lastInvoice.discount / (rawItemsSubtotal || 1) : 0;

    lastInvoice.items.forEach(item => {
      const icUnit = Number(item.consumptionTax || 0);
      const baseUnit = (item.price - icUnit) / (1 + (item.taxRate/100));
      const itemBaseTotal = baseUnit * item.quantity;
      const effectiveBase = itemBaseTotal - (itemBaseTotal * discountRatio);
      const ivaTotal = effectiveBase * (item.taxRate/100);
      const icTotal = icUnit * item.quantity;

      const ivaKey = `IVA ${item.taxRate}%`;
      if (!fiscalSummary[ivaKey]) fiscalSummary[ivaKey] = { base: 0, iva: 0, ic: 0 };
      fiscalSummary[ivaKey].base += effectiveBase;
      fiscalSummary[ivaKey].iva += ivaTotal;

      if (icTotal > 0) {
        const icKey = 'IC';
        if (!fiscalSummary[icKey]) fiscalSummary[icKey] = { base: 0, iva: 0, ic: 0 };
        fiscalSummary[icKey].ic += icTotal;
      }
    });

    const qrUrl = lastInvoice.cufe 
      ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentKey=${lastInvoice.cufe}`
      : `${storeSettings.nit}|${lastInvoice.id}|${lastInvoice.total}`;

    const formattedDate = new Date(lastInvoice.date).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const customFooter = storeSettings.customFooter ? storeSettings.customFooter.replace(/\n/g, '<br>') : '';

    let cssStyles = '';
    let pageContent = '';

    if (format === 'THERMAL') {
      cssStyles = `
        @page { margin: 0; size: 80mm auto; }
        body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 10px 2px; font-size: 11px; color: #000; background: #fff; }
        .center { text-align: center; } .bold { font-weight: bold; } 
        .line { border-bottom: 1px dashed #000; margin: 5px 0; }
        .flex { display: flex; justify-content: space-between; } 
        .table-items { width: 100%; border-collapse: collapse; font-size: 9px; margin-top:5px; }
        .table-items th { text-align: left; border-bottom: 1px solid #000; }
        .table-items td { text-align: right; padding: 2px 0; }
        .table-items td:first-child { text-align: left; }
        .fiscal-table { width: 100%; font-size: 8px; border-collapse: collapse; margin-top: 5px; }
        .qr-box { width: 40mm; height: 40mm; margin: 10px auto; }
        .custom-footer { margin-top: 10px; font-size: 9px; text-align: center; font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; }
      `;
    } else {
      const pageSize = format === 'LETTER' ? 'Letter' : '140mm 216mm';
      cssStyles = `
        @page { size: ${pageSize}; margin: 15mm; }
        body { font-family: 'Arial', sans-serif; color: #111; line-height: 1.3; font-size: 11px; background: #fff; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
        .company-info h1 { font-size: 18px; margin: 0; font-weight: 900; text-transform: uppercase; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { font-size: 16px; margin: 0; color: #D62828; }
        .box-section { background: #f8f9fa; border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
        .table-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table-items th { background: #111; color: #fff; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
        .table-items td { border-bottom: 1px solid #eee; padding: 8px; }
        .totals-container { display: flex; justify-content: flex-end; }
        .totals-box { width: 250px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .grand-total { font-size: 14px; font-weight: 900; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px; }
        .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
        .qr-section { display: flex; align-items: center; justify-content: center; margin-top: 20px; gap: 20px; }
        .fiscal-table { width: 100%; font-size: 9px; margin-top: 10px; border: 1px solid #eee; }
        .fiscal-table th { background: #eee; color: #000; padding: 4px; }
        .fiscal-table td { padding: 4px; text-align: right; border-bottom: 1px solid #eee; }
        .custom-footer-box { margin-top: 20px; padding: 10px; border: 1px dashed #ccc; background: #fffbe6; font-size: 10px; text-align: center; border-radius: 5px; }
      `;
    }

    if (format === 'THERMAL') {
      pageContent = `
        <div class="center">
          <div class="bold" style="font-size: 14px;">${storeSettings.name.toUpperCase()}</div>
          <div>NIT: ${storeSettings.nit}</div>
          <div>${storeSettings.address}</div>
          <div>TEL: ${storeSettings.phone}</div>
          <div>${storeSettings.vatResponsibility}</div>
          ${storeSettings.isRetainer ? '<div class="bold">SOMOS AGENTES RETENEDORES DE IVA</div>' : ''}
          <div class="line"></div>
          <div class="bold">${lastInvoice.cufe ? 'FACTURA ELECTRÓNICA' : 'TIQUETE POS'}</div>
          <div class="bold">No: ${lastInvoice.id}</div>
          <div class="line"></div>
        </div>
        <div>FECHA: ${formattedDate}</div>
        <div class="line"></div>
        <div class="bold">CLIENTE:</div>
        <div>${lastInvoice.customerName.toUpperCase()}</div>
        <div>NIT/CC: ${lastInvoice.customerNit}</div>
        ${lastInvoice.customerPhone ? `<div>TEL: ${lastInvoice.customerPhone}</div>` : ''}
        ${lastInvoice.customerAddress ? `<div>DIR: ${lastInvoice.customerAddress}</div>` : ''}
        ${lastInvoice.customerEmail ? `<div>EMAIL: ${lastInvoice.customerEmail}</div>` : ''}
        <div class="line"></div>
        <table class="table-items">
          <thead><tr><th>DESC</th><th>CANT</th><th>TOTAL</th></tr></thead>
          <tbody>
            ${lastInvoice.items.map(i => `
              <tr>
                <td>
                  ${i.name.substring(0, 20)}<br>
                  <span style="font-size:8px; color:#444;">${i.ean || 'S/N'} | $${formatMoney(i.price)}</span>
                </td>
                <td class="center" style="vertical-align: top;">${i.quantity}</td>
                <td style="vertical-align: top;">$${formatMoney(i.price * i.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="line"></div>
        <div class="flex"><span>SUBTOTAL:</span> <span>$${formatMoney(lastInvoice.subtotal)}</span></div>
        ${lastInvoice.discount ? `<div class="flex"><span>DESCUENTO:</span> <span>-$${formatMoney(lastInvoice.discount)}</span></div>` : ''}
        ${lastInvoice.shippingCost ? `<div class="flex"><span>FLETE:</span> <span>$${formatMoney(lastInvoice.shippingCost)}</span></div>` : ''}
        <div class="flex"><span>IVA:</span> <span>$${formatMoney(lastInvoice.tax)}</span></div>
        ${lastInvoice.consumptionTaxTotal ? `<div class="flex"><span>INC:</span> <span>$${formatMoney(lastInvoice.consumptionTaxTotal)}</span></div>` : ''}
        <div class="flex bold" style="font-size:13px; margin-top:5px;"><span>TOTAL:</span> <span>$${formatMoney(lastInvoice.total)}</span></div>
        <div class="line"></div>
        
        ${lastInvoice.paymentDetails && lastInvoice.paymentDetails.length > 0 ? `
          <div class="center bold" style="margin-top:5px;">FORMAS DE PAGO:</div>
          ${lastInvoice.paymentDetails.map(pd => `<div class="flex"><span>${pd.method}:</span> <span>$${formatMoney(pd.amount)}</span></div>`).join('')}
          <div class="line"></div>
        ` : ''}

        <div class="center bold" style="margin-top:5px; font-size:9px;">DISCRIMINACIÓN TRIBUTARIA</div>
        <table class="fiscal-table">
          <thead><tr><th>IMP</th><th>BASE</th><th>VALOR</th></tr></thead>
          <tbody>
            ${Object.entries(fiscalSummary).map(([key, val]) => `
              <tr>
                <td style="text-align:left;">${key}</td>
                <td>$${formatMoney(val.base)}</td>
                <td>$${formatMoney(val.iva || val.ic)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="line"></div>

        ${customFooter ? `<div class="custom-footer">${customFooter}</div>` : ''}

        <div class="center" style="font-size:9px; margin-top:10px;">RESOLUCIÓN DIAN No. ${storeSettings.resolution}</div>
        <div class="center" style="font-size:9px;">Prefijo ${storeSettings.prefix} del ${storeSettings.rangeStart} al ${storeSettings.rangeEnd}</div>
        ${lastInvoice.cufe ? `
          <div class="center bold" style="margin-top:5px;">CUFE:</div>
          <div style="font-size:8px; overflow-wrap: break-word; text-align:center;">${lastInvoice.cufe}</div>
          <div class="qr-box"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" style="width:100%"/></div>
        ` : ''}
        <div class="center" style="margin-top:10px; font-size:8px;">Software: ${storeSettings.softwareName || 'Kiosko Comercial'}</div>
      `;
    } else {
      pageContent = `
        <div class="header">
          <div class="company-info">
            <h1>${storeSettings.name.toUpperCase()}</h1>
            <p>
              NIT: ${storeSettings.nit}<br>
              ${storeSettings.address}<br>
              Tel: ${storeSettings.phone}<br>
              ${storeSettings.businessName || ''}<br>
              ${storeSettings.vatResponsibility}
            </p>
          </div>
          <div class="invoice-info">
            <h2>${lastInvoice.cufe ? 'FACTURA ELECTRÓNICA DE VENTA' : 'DOCUMENTO EQUIVALENTE POS'}</h2>
            <h3 style="margin:5px 0; font-size: 14px;">No. ${lastInvoice.id}</h3>
            <p>
              Fecha de Emisión: ${formattedDate}<br>
              Vendedor: ${lastInvoice.sellerName || 'General'}<br>
              Forma de Pago: ${lastInvoice.paymentMethod}
            </p>
          </div>
        </div>

        <div class="box-section">
          <div style="width: 48%;">
            <strong style="text-transform:uppercase; font-size:10px; color:#666;">Adquirente / Cliente</strong><br>
            <span style="font-weight:bold; font-size:12px;">${lastInvoice.customerName.toUpperCase()}</span><br>
            NIT/CC: ${lastInvoice.customerNit}<br>
            ${lastInvoice.customerPhone ? `Tel: ${lastInvoice.customerPhone}<br>` : ''}
            ${lastInvoice.customerAddress ? `Dir: ${lastInvoice.customerAddress}<br>` : ''}
            ${lastInvoice.customerEmail ? `Email: ${lastInvoice.customerEmail}` : ''}
          </div>
          <div style="width: 48%;">
            <strong style="text-transform:uppercase; font-size:10px; color:#666;">Resolución de Facturación</strong><br>
            Res. No. ${storeSettings.resolution} de ${storeSettings.resolutionDate || '---'}<br>
            Prefijo: ${storeSettings.prefix} | Rango: ${storeSettings.rangeStart} al ${storeSettings.rangeEnd}<br>
            Vigencia: ${storeSettings.resolutionValidity || '---'}
          </div>
        </div>

        <table class="table-items">
          <thead>
            <tr>
              <th style="width: 10%;">CANT</th>
              <th style="width: 40%;">DESCRIPCIÓN</th>
              <th style="width: 15%; text-align:right;">PRECIO UN.</th>
              <th style="width: 10%; text-align:center;">IVA</th>
              <th style="width: 10%; text-align:center;">INC</th>
              <th style="width: 15%; text-align:right;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${lastInvoice.items.map(i => `
              <tr>
                <td style="text-align:center;">${i.quantity}</td>
                <td>${i.name.toUpperCase()}<br><span style="font-size:9px; color:#666;">EAN: ${i.ean || 'N/A'}</span></td>
                <td style="text-align:right;">$${formatMoney(i.price)}</td>
                <td style="text-align:center;">${i.taxRate}%</td>
                <td style="text-align:center;">$${formatMoney(i.consumptionTax || 0)}</td>
                <td style="text-align:right;">$${formatMoney(i.price * i.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between;">
          <div style="width: 50%;">
            <strong style="font-size:10px;">Discrimación Tributaria</strong>
            <table class="fiscal-table">
              <thead><tr><th>Impuesto</th><th>Base Gravable</th><th>Valor</th></tr></thead>
              <tbody>
                ${Object.entries(fiscalSummary).map(([key, val]) => `
                  <tr>
                    <td style="text-align:left;">${key}</td>
                    <td>$${formatMoney(val.base)}</td>
                    <td>$${formatMoney(val.iva || val.ic)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            ${lastInvoice.paymentDetails && lastInvoice.paymentDetails.length > 0 ? `
              <div style="margin-top:15px;">
                <strong style="font-size:10px;">Detalle Pagos:</strong>
                <ul style="margin:2px 0 0 15px; padding:0; font-size:10px;">
                  ${lastInvoice.paymentDetails.map(pd => `<li>${pd.method}: $${formatMoney(pd.amount)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <p style="font-size:9px; margin-top:10px; font-style:italic;">
              Valor en Letras: SON ${lastInvoice.total} PESOS M/CTE.
            </p>
          </div>
          <div class="totals-box">
            <div class="total-row"><span>Subtotal Bruto:</span> <span>$${formatMoney(lastInvoice.subtotal + (lastInvoice.discount || 0))}</span></div>
            ${lastInvoice.discount ? `<div class="total-row" style="color:red;"><span>Descuentos:</span> <span>-$${formatMoney(lastInvoice.discount)}</span></div>` : ''}
            ${lastInvoice.shippingCost ? `<div class="total-row"><span>Flete:</span> <span>$${formatMoney(lastInvoice.shippingCost)}</span></div>` : ''}
            <div class="total-row"><span>Subtotal Neto:</span> <span>$${formatMoney(lastInvoice.subtotal)}</span></div>
            <div class="total-row"><span>Total IVA:</span> <span>$${formatMoney(lastInvoice.tax)}</span></div>
            ${lastInvoice.consumptionTaxTotal ? `<div class="total-row"><span>Impoconsumo:</span> <span>$${formatMoney(lastInvoice.consumptionTaxTotal)}</span></div>` : ''}
            <div class="total-row grand-total"><span>TOTAL A PAGAR:</span> <span>$${formatMoney(lastInvoice.total)}</span></div>
          </div>
        </div>

        ${customFooter ? `<div class="custom-footer-box">${customFooter}</div>` : ''}

        ${lastInvoice.cufe ? `
          <div class="qr-section">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrUrl)}" style="width:80px; height:80px;"/>
            <div style="flex:1;">
              <strong style="font-size:10px;">CUFE (Código Único de Facturación Electrónica):</strong><br>
              <span style="font-size:9px; word-break:break-all;">${lastInvoice.cufe}</span><br>
              <span style="font-size:9px; color:#666;">Representación Gráfica de la Factura Electrónica. Validado por la DIAN.</span>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          Software: ${storeSettings.softwareName || 'Kiosko Comercial POS'} | Proveedor Tecnológico: ${storeSettings.softwareManufacturer || 'Kiosko Dev Studio S.A.S.'}<br>
          ¡GRACIAS POR SU COMPRA!
        </div>
      `;
    }

    return { cssStyles, pageContent };
  };

  const handlePrintInvoice = (format: PrintFormat) => {
    if (!lastInvoice) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const { cssStyles, pageContent } = getInvoiceHTMLData(format);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${format === 'LETTER' ? 'Factura Carta' : format === 'HALF_LETTER' ? 'Factura Media Carta' : 'Tirilla'} - ${lastInvoice.id}</title>
        <style>${cssStyles}</style>
      </head>
      <body>${pageContent}</body>
      <script>
        window.onload = function() { 
          window.print(); 
          setTimeout(() => window.close(), 500); 
        }
      </script>
      </html>
    `);
    printWindow.document.close();
    setShowPrintOptions(false);
  };

  const handleDownloadPDF = async (format: PrintFormat) => {
    if (!lastInvoice) return;
    setIsProcessing(true);
    
    try {
      const { cssStyles, pageContent } = getInvoiceHTMLData(format);
      
      const container = document.createElement('div');
      container.innerHTML = `
        <style>${cssStyles}</style>
        <div id="pdf-content" style="background: white; padding: 20px; width: ${format === 'THERMAL' ? '300px' : '800px'};">
          ${pageContent}
        </div>
      `;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      const element = container.querySelector('#pdf-content') as HTMLElement;
      
      const images = element.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const canvas = await html2canvas(element, { useCORS: true, scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: format === 'THERMAL' ? [80, (canvas.height * 80) / canvas.width] : 'letter'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Factura_${lastInvoice.id}.pdf`);
      
      document.body.removeChild(container);
    } catch (error) {
      console.error("Error generating PDF", error);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsProcessing(false);
      setShowPrintOptions(false);
    }
  };

  const handleQuoteClick = () => {
    if (!isCustomerInfoComplete) {
      alert("¡Atención socio! Para generar una cotización formal es obligatorio tener los datos completos del cliente.");
      setShowCustomerModal(true);
      return;
    }
    
    saveCurrentCustomer();

    const qId = `COT-${Date.now()}`;
    onQuoteCreated({ 
      id: qId, 
      date: getColombiaISO(), 
      customerName, 
      customerNit, 
      customerPhone, 
      customerEmail, 
      customerAddress,
      items: [...cart], 
      total: cartTotals.total 
    });
    
    alert("Cotización guardada exitosamente.");

    setCart([]);
    setDiscountValue(0);
    setShippingCost(0);
    setIsPercentDiscount(false);
    setMixedPayments([]);
    
    setCustomerNit('222222222222');
    setCustomerName('Consumidor Final');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setSellerName('');
    
    setSearchTerm('');
    setCashReceived(0);
  };

  const handleWhatsAppInvoice = () => {
    if (!lastInvoice) return;

    let msg = `*${storeSettings.name.toUpperCase()}*\n`;
    if (storeSettings.businessName) msg += `${storeSettings.businessName.toUpperCase()}\n`;
    msg += `NIT: ${storeSettings.nit}\n`;
    msg += `${storeSettings.address}\n`;
    msg += `Tel: ${storeSettings.phone}\n`;
    msg += `--------------------------------\n`;

    msg += `*${lastInvoice.cufe ? 'FACTURA ELECTRÓNICA' : 'TIQUETE POS'}*\n`;
    msg += `*No: ${lastInvoice.id}*\n`;
    msg += `Fecha: ${new Date(lastInvoice.date).toLocaleString('es-CO')}\n`;
    if (lastInvoice.sellerName) msg += `Vendedor: ${lastInvoice.sellerName}\n`;
    msg += `--------------------------------\n`;

    msg += `*CLIENTE:*\n${lastInvoice.customerName.toUpperCase()}\n`;
    msg += `CC/NIT: ${lastInvoice.customerNit}\n`;
    if (lastInvoice.customerPhone) msg += `Tel: ${lastInvoice.customerPhone}\n`;
    if (lastInvoice.customerAddress) msg += `Dir: ${lastInvoice.customerAddress}\n`;
    if (lastInvoice.customerEmail) msg += `Email: ${lastInvoice.customerEmail}\n`;
    msg += `--------------------------------\n`;

    msg += `*ARTÍCULOS:*\n`;
    lastInvoice.items.forEach(item => {
      const totalItem = item.price * item.quantity;
      msg += `• ${item.quantity}x ${item.name} \n   ${item.ean ? `[${item.ean}] ` : ''}$${formatMoney(item.price)} c/u = $${formatMoney(totalItem)}\n`;
    });
    msg += `--------------------------------\n`;

    msg += `Subtotal: $${formatMoney(lastInvoice.subtotal)}\n`;
    if (lastInvoice.discount && lastInvoice.discount > 0) {
      msg += `Descuentos: -$${formatMoney(lastInvoice.discount)}\n`;
    }
    if (lastInvoice.shippingCost && lastInvoice.shippingCost > 0) {
      msg += `Flete: $${formatMoney(lastInvoice.shippingCost)}\n`;
    }
    if (lastInvoice.tax > 0) {
      msg += `Total IVA: $${formatMoney(lastInvoice.tax)}\n`;
    }
    if (lastInvoice.consumptionTaxTotal && lastInvoice.consumptionTaxTotal > 0) {
      msg += `Imp. Consumo: $${formatMoney(lastInvoice.consumptionTaxTotal)}\n`;
    }
    
    msg += `\n*TOTAL A PAGAR: $${formatMoney(lastInvoice.total)}*\n`;
    msg += `--------------------------------\n`;

    msg += `*MEDIO DE PAGO:*\n`;
    if (lastInvoice.paymentDetails && lastInvoice.paymentDetails.length > 0) {
      lastInvoice.paymentDetails.forEach(pd => {
        msg += `${pd.method}: $${formatMoney(pd.amount)}\n`;
      });
    } else {
      msg += `${lastInvoice.paymentMethod}: $${formatMoney(lastInvoice.total)}\n`;
    }

    if (lastInvoice.cufe) {
      msg += `--------------------------------\n`;
      msg += `*CONSULTA FACTURA ELECTRÓNICA:*\n`;
      msg += `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentKey=${lastInvoice.cufe}\n`;
    }

    msg += `\n¡Gracias por su compra! 🤝`;

    const phone = lastInvoice.customerPhone?.replace(/\D/g, '') || '';
    window.open(`https://wa.me/57${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const renderProductIcon = (iconStr?: string) => {
    const icon = iconStr || '📦';
    const isImage = icon.startsWith('http') || icon.startsWith('data:image');
    if (isImage) {
      return <img src={icon} alt="Icono" className="w-12 h-12 object-cover rounded-lg group-hover:scale-110 transition-transform shadow-sm" />;
    }
    return <span className="text-3xl group-hover:scale-110 transition-transform">{icon}</span>;
  };

  const addMixedPayment = () => {
    const amount = Number(mixedAmountInput);
    const mixedTotal = mixedPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = cartTotals.total - mixedTotal;

    if (!amount || amount <= 0) return;
    if (amount > remaining) {
      alert('El monto ingresado supera el saldo pendiente.');
      return;
    }

    setMixedPayments(prev => [...prev, { method: activeMixedMethod, amount }]);
    setMixedAmountInput('');
  };

  const removeMixedPayment = (index: number) => {
    setMixedPayments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 overflow-hidden">
      <div className="lg:w-[25%] flex flex-col border-r border-gray-200 bg-white shrink-0">
        <div className="p-4 bg-brand-black">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Escanear o Buscar..." 
              className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-xl outline-none border border-white/5 focus:border-brand-red font-black text-xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.length === 0 && !searchTerm && (
              <div className="col-span-2 flex flex-col items-center justify-center text-gray-300 py-20">
                <Star size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-black uppercase text-center opacity-50">Sin Favoritos</p>
                <p className="text-[9px] font-bold uppercase text-center opacity-40 mt-1">Marque productos con la estrella<br/>en el inventario para verlos aquí.</p>
              </div>
            )}
            {filteredProducts.map(p => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)} 
                disabled={p.stock <= 0}
                className={`p-4 rounded-2xl border-2 border-transparent transition-all flex flex-col items-center text-center gap-2 group shadow-sm relative overflow-hidden ${p.stock <= 0 ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-gray-50 hover:border-brand-red'}`}
              >
                {p.stock <= 0 && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rotate-[-15deg] shadow-lg">AGOTADO</span>
                  </div>
                )}
                {renderProductIcon(p.icon)}
                <p className="text-[10px] font-black text-gray-800 uppercase line-clamp-2 h-6">{p.name}</p>
                <div className="flex flex-col gap-0.5 w-full">
                  <p className="text-brand-red font-black text-xs">${formatMoney(p.price)}</p>
                  <p className={`text-[9px] font-bold ${p.stock <= 5 ? 'text-red-500' : 'text-gray-400'}`}>{p.stock} Unds</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-black text-xs uppercase flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-red"/> Terminal de Caja 
            <span className="ml-2 bg-brand-black text-white px-2 py-0.5 rounded-full text-[9px]">{cartTotals.articles} Items</span>
          </h3>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowClosureModal(true)} className="text-[9px] font-black uppercase text-gray-500 hover:text-brand-black flex items-center gap-1 bg-gray-200 px-3 py-1.5 rounded-lg transition-all"><Lock size={12}/> Cierre de Caja</button>
            <button onClick={() => cart.length > 0 && setShowClearConfirm(true)} className="text-[9px] font-black uppercase text-gray-400 hover:text-brand-red">Vaciar Carrito</button>
          </div>
        </div>
        
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-brand-black text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-white/5">
          <div className="col-span-1">Cant</div>
          <div className="col-span-3">EAN-13/8</div>
          <div className="col-span-3">Descripción (IVA Ref)</div>
          <div className="col-span-2 text-right">Precio Unidad</div>
          <div className="col-span-3 text-right">Subtotal</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar bg-gray-50/30">
          {cart.map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-2 px-4 bg-white rounded-xl border border-gray-100 shadow-sm group hover:border-brand-red transition-all">
              <div className="col-span-1">
                <input 
                  type="number" 
                  value={item.quantity} 
                  onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value), item.stock)} 
                  className="w-full bg-gray-100 rounded-lg py-1 text-center font-black text-xs outline-none focus:ring-1 focus:ring-brand-red" 
                  min="1" 
                  max={item.stock}
                />
              </div>
              <div className="col-span-3">
                <p className="text-[10px] font-mono font-bold text-gray-400 truncate">{item.ean || '---'}</p>
              </div>
              <div className="col-span-3 flex items-center gap-2">
                <p className="text-[10px] font-black text-gray-800 uppercase truncate">{item.name}</p>
                <span className="text-[8px] bg-gray-100 px-1 rounded font-bold text-gray-400">IVA {item.taxRate}%</span>
              </div>
              <div className="col-span-2 text-right flex items-center justify-end gap-1">
                <span className="text-[11px] font-bold text-gray-500 font-mono">$</span>
                <input 
                  type="number" 
                  value={item.price} 
                  onChange={(e) => handleUpdatePrice(item.id, Number(e.target.value))} 
                  className="w-full max-w-[70px] bg-gray-100 rounded-lg py-1 px-2 text-right font-bold text-[11px] font-mono outline-none focus:ring-1 focus:ring-brand-red" 
                  min="0"
                />
              </div>
              <div className="col-span-3 text-right pr-6 relative">
                <p className="text-[11px] font-black text-brand-black font-mono">${formatMoney(item.price * item.quantity)}</p>
                <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-gray-200 hover:text-brand-red opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-brand-red" />
              <span className="text-[10px] font-black uppercase text-gray-500">Descuento Global:</span>
            </div>
            <div className="flex items-center gap-1 bg-brand-black rounded-xl border border-white/10 p-1 shadow-sm">
              <button onClick={() => setIsPercentDiscount(false)} className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${!isPercentDiscount ? 'bg-brand-red text-white' : 'text-gray-500'}`}>$</button>
              <button onClick={() => setIsPercentDiscount(true)} className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${isPercentDiscount ? 'bg-brand-red text-white' : 'text-gray-500'}`}>%</button>
              <input 
                type="number" 
                value={discountValue || ''} 
                onChange={e => setDiscountValue(Number(e.target.value))} 
                className="w-20 px-2 py-1 text-right font-black text-sm outline-none bg-transparent text-white placeholder-gray-600" 
                placeholder="0" 
              />
            </div>
            <div className="flex-1 text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase mr-2">Total Descuento:</span>
              <span className="text-xs font-black text-brand-red">-${formatMoney(cartTotals.discountInPesos)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-brand-red" />
              <span className="text-[10px] font-black uppercase text-gray-500">Flete / Domicilio:</span>
            </div>
            <div className="flex items-center gap-1 bg-brand-black rounded-xl border border-white/10 p-1 shadow-sm">
              <span className="px-3 py-1 rounded-lg text-[9px] font-black text-gray-500">$</span>
              <input 
                type="number" 
                value={shippingCost || ''} 
                onChange={e => setShippingCost(Number(e.target.value))} 
                className="w-20 px-2 py-1 text-right font-black text-sm outline-none bg-transparent text-white placeholder-gray-600" 
                placeholder="0" 
              />
            </div>
            <div className="flex-1 text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase mr-2">Total Flete:</span>
              <span className="text-xs font-black text-green-600">+${formatMoney(shippingCost)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:w-[360px] bg-brand-black text-white flex flex-col shadow-2xl">
        <div className="p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Adquirente</span>
              <button onClick={() => setShowCustomerModal(true)} className="p-2 bg-white/10 hover:bg-brand-red rounded-lg transition-all"><UserPlus size={16}/></button>
            </div>
            <div className={`bg-white/5 p-4 rounded-2xl border ${isCustomerInfoComplete ? 'border-green-500/50' : 'border-brand-red/50'}`}>
              <div className="flex justify-between items-start">
                <p className="text-sm font-black uppercase truncate">{customerName}</p>
                {!isCustomerInfoComplete && <AlertTriangle size={14} className="text-brand-red animate-pulse"/>}
              </div>
              <p className="text-[10px] text-gray-500 font-mono">{customerNit}</p>
              {customerAddress && <p className="text-[9px] text-gray-400 truncate mt-1 flex items-center gap-1"><MapPin size={10}/> {customerAddress}</p>}
              {!isCustomerInfoComplete && <p className="text-[8px] text-brand-red font-black uppercase mt-1">Datos Incompletos para FE/Fiado/Cotizar</p>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><BadgeCheck size={14} className="text-blue-500"/> Vendedor / Asesor</span>
            </div>
            <input 
              type="text"
              placeholder="Nombre del Vendedor (Opcional)" 
              value={sellerName}
              onChange={e => setSellerName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500 transition-all font-bold"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><LayersIcon size={14} className="text-brand-red"/> Resumen Fiscal Detallado</p>
            <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 font-mono">
              <table className="w-full text-[9px] text-left">
                <thead className="bg-white/10 text-gray-400 font-black uppercase">
                  <tr><th className="p-2">IMP</th><th className="p-2">BASE</th><th className="p-2">IMP</th><th className="p-2 text-right">VALOR</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cartTotals.taxBreakdown.map(tax => (
                    <tr key={tax.type} className="hover:bg-white/5">
                      <td className="p-2 text-gray-500 uppercase">{tax.type}</td>
                      <td className="p-2 text-white">${tax.type === 'IC' ? '0' : formatMoney(tax.base)}</td>
                      <td className="p-2 text-brand-red">${formatMoney(tax.tax)}</td>
                      <td className="p-2 text-right text-green-400 font-black">${formatMoney(tax.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] mb-2">TOTAL A PAGAR</p>
            <div className="bg-brand-red/10 py-6 rounded-3xl border border-brand-red/20">
              <p className="text-6xl font-black tracking-tighter text-white"><span className="text-xl text-brand-red mr-1">$</span>{formatMoney(cartTotals.total)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-brand-black border-t border-white/10 grid grid-cols-2 gap-3">
          <button onClick={handleQuoteClick} disabled={cart.length === 0} className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-1">
            <ReceiptText size={18} /> Cotizar
          </button>
          <button disabled={cart.length === 0 || isProcessing} onClick={() => { setPaymentView('METHODS'); setShowPaymentModal(true); }} className={`py-4 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl transition-all flex flex-col items-center justify-center gap-1 ${cart.length > 0 ? 'bg-brand-red text-white' : 'bg-gray-800 text-gray-600'}`}>
            <CheckCircle2 size={24} /> Pagar
          </button>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-[500] bg-brand-black/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 text-center shadow-2xl border-t-[12px] border-brand-red">
            <div className="w-20 h-20 bg-red-50 text-brand-red rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={40}/></div>
            <h3 className="text-2xl font-black text-brand-black uppercase tracking-tighter mb-2">¿VACIAR CARRITO?</h3>
            <p className="text-gray-500 font-bold mb-8 uppercase text-[10px]">Esta acción borrará todos los productos registrados.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setCart([]); setShowClearConfirm(false); }} className="w-full py-5 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest">SÍ, VACIAR TODO</button>
              <button onClick={() => setShowClearConfirm(false)} className="w-full py-5 bg-gray-100 text-gray-600 font-black rounded-2xl uppercase tracking-widest">NO, VOLVER</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 z-[500] bg-brand-black/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden border-t-8 border-brand-red shadow-2xl animate-in zoom-in-95 p-8 text-center">
            <div className="w-20 h-20 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto mb-6"><DollarSign size={40}/></div>
            <h3 className="text-2xl font-black text-brand-black uppercase tracking-tighter mb-2">Método de Pago</h3>
            <p className="text-gray-500 font-bold text-sm mb-8 uppercase tracking-widest">Monto a pagar: <span className="text-brand-red font-black text-xl">${formatMoney(cartTotals.total)}</span></p>
            
            {paymentView === 'METHODS' && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button onClick={() => { setPaymentView('CASH_DETAIL'); setCashReceived(0); setTimeout(() => cashInputRef.current?.focus(), 100); }} className="flex flex-col items-center gap-3 p-6 border-2 border-gray-100 rounded-3xl hover:border-brand-red transition-all group">
                  <Banknote size={28} className="text-gray-400 group-hover:text-brand-red"/><span className="text-[10px] font-black uppercase">Efectivo</span>
                </button>
                <button onClick={() => handleProcessSale(PaymentMethod.TRANSFER)} className="flex flex-col items-center gap-3 p-6 border-2 border-gray-100 rounded-3xl hover:border-blue-500 transition-all group">
                  <Smartphone size={28} className="text-gray-400 group-hover:text-blue-500"/><span className="text-[10px] font-black uppercase">Transferencia / QR</span>
                </button>
                <button onClick={() => handleProcessSale(PaymentMethod.CARD)} className="flex flex-col items-center gap-3 p-6 border-2 border-gray-100 rounded-3xl hover:border-purple-500 transition-all group">
                  <CreditCard size={28} className="text-gray-400 group-hover:text-purple-500"/><span className="text-[10px] font-black uppercase">Tarjeta</span>
                </button>
                <button onClick={() => handleProcessSale(PaymentMethod.CREDIT)} className="flex flex-col items-center gap-3 p-6 border-2 border-gray-100 rounded-3xl hover:border-orange-500 transition-all group bg-orange-50/20">
                  <Wallet size={28} className="text-gray-400 group-hover:text-orange-500"/><span className="text-[10px] font-black uppercase">Fiado (CxC)</span>
                </button>
                <button onClick={() => { setPaymentView('MIXED_DETAIL'); setMixedPayments([]); setActiveMixedMethod(PaymentMethod.CASH); }} className="col-span-2 flex flex-col items-center gap-3 p-4 border-2 border-gray-100 rounded-3xl hover:border-brand-black transition-all group bg-gray-50">
                  <Layers size={28} className="text-gray-400 group-hover:text-brand-black"/><span className="text-[10px] font-black uppercase">Pago Mixto (Combinado)</span>
                </button>
              </div>
            )}

            {paymentView === 'CASH_DETAIL' && (
              <div className="mb-8 animate-in slide-in-from-right-10">
                <div className="relative mb-4">
                  <DollarSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input 
                    ref={cashInputRef}
                    type="number" 
                    value={cashReceived || ''} 
                    onChange={e => setCashReceived(Number(e.target.value))} 
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl font-black text-2xl outline-none focus:ring-2 focus:ring-brand-red" 
                    placeholder="Monto Recibido"
                    onKeyDown={e => e.key === 'Enter' && cashReceived >= cartTotals.total && handleProcessSale(PaymentMethod.CASH)}
                  />
                </div>
                
                <div className="flex gap-2 mb-6 justify-center">
                  {[5000, 10000, 20000, 50000, 100000].map(amt => (
                    <button key={amt} onClick={() => setCashReceived(amt)} className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-200">${amt/1000}k</button>
                  ))}
                  <button onClick={() => setCashReceived(cartTotals.total)} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100">Exacto</button>
                </div>

                {cashReceived > 0 && (
                  <div className={`p-4 rounded-2xl mb-4 ${cashReceived >= cartTotals.total ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className="text-[10px] font-black uppercase mb-1">{cashReceived >= cartTotals.total ? 'Cambio a Devolver' : 'Faltante'}</p>
                    <p className={`text-2xl font-black ${cashReceived >= cartTotals.total ? 'text-green-600' : 'text-red-600'}`}>${formatMoney(Math.abs(cashReceived - cartTotals.total))}</p>
                  </div>
                )}

                <button 
                  disabled={cashReceived < cartTotals.total} 
                  onClick={() => handleProcessSale(PaymentMethod.CASH)} 
                  className="w-full py-4 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                >
                  Confirmar Cobro
                </button>
              </div>
            )}

            {paymentView === 'MIXED_DETAIL' && (
              <div className="mb-8 animate-in slide-in-from-right-10 text-left">
                <div className="flex justify-between items-end mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Total a Pagar</p>
                    <p className="text-xl font-black text-brand-black">${formatMoney(cartTotals.total)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Faltante</p>
                    <p className="text-xl font-black text-brand-red">${formatMoney(Math.max(0, cartTotals.total - mixedPayments.reduce((acc, curr) => acc + curr.amount, 0)))}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <div className="flex-1">
                    <select 
                      value={activeMixedMethod} 
                      onChange={(e) => setActiveMixedMethod(e.target.value as PaymentMethod)}
                      className="w-full p-3 bg-gray-100 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-brand-black"
                    >
                      <option value={PaymentMethod.CASH}>Efectivo</option>
                      <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                      <option value={PaymentMethod.CARD}>Tarjeta</option>
                      <option value={PaymentMethod.CREDIT}>Fiado</option>
                    </select>
                  </div>
                  <div className="w-32 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input 
                      type="number" 
                      value={mixedAmountInput} 
                      onChange={(e) => setMixedAmountInput(e.target.value)}
                      className="w-full pl-6 pr-2 py-3 bg-gray-100 rounded-xl font-black text-xs outline-none focus:ring-1 focus:ring-brand-black"
                      placeholder="Monto"
                    />
                  </div>
                  <button 
                    onClick={addMixedPayment}
                    disabled={!mixedAmountInput}
                    className="p-3 bg-brand-black text-white rounded-xl hover:bg-brand-red transition-colors disabled:opacity-50"
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>

                <div className="space-y-2 mb-6 max-h-40 overflow-y-auto pr-1">
                  {mixedPayments.map((payment, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                      <span className="text-xs font-bold uppercase text-gray-600">{payment.method}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-brand-black">${formatMoney(payment.amount)}</span>
                        <button onClick={() => removeMixedPayment(idx)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {mixedPayments.length === 0 && (
                    <p className="text-center text-xs text-gray-400 italic py-4">Agrega los métodos de pago para completar el total.</p>
                  )}
                </div>

                <button 
                  disabled={mixedPayments.reduce((acc, curr) => acc + curr.amount, 0) < cartTotals.total} 
                  onClick={() => handleProcessSale(PaymentMethod.MIXED, mixedPayments)} 
                  className="w-full py-4 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                >
                  Confirmar Pago Mixto
                </button>
              </div>
            )}

            <button onClick={() => { setShowPaymentModal(false); setPaymentView('METHODS'); }} className="text-gray-400 font-black uppercase text-[10px] hover:text-brand-red flex items-center justify-center gap-2 mx-auto"><ArrowLeft size={14}/> Cancelar / Volver</button>
          </div>
        </div>
      )}

      {showSuccessModal && lastInvoice && (
        <div className="fixed inset-0 z-[200] bg-brand-black/98 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] w-full max-md p-10 text-center shadow-2xl animate-in zoom-in-95 border-t-[12px] border-green-500">
            {showQrPreview ? (
              <div className="animate-in fade-in zoom-in-95">
                <div className="bg-gray-100 p-6 rounded-[2rem] mb-6">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(lastInvoice.cufe ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentKey=${lastInvoice.cufe}` : lastInvoice.id)}`} alt="QR DIAN" className="mx-auto mix-blend-multiply" />
                </div>
                <button onClick={() => setShowQrPreview(false)} className="w-full py-4 bg-brand-black text-white rounded-2xl font-black uppercase text-xs">Cerrar QR</button>
              </div>
            ) : showPrintOptions ? (
              <div className="animate-in fade-in zoom-in-95 space-y-4">
                <div className="w-20 h-20 bg-gray-100 text-brand-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Printer size={40}/></div>
                <h3 className="text-2xl font-black text-brand-black uppercase tracking-tighter mb-4">Seleccione Formato</h3>
                
                <button 
                  onClick={() => handlePrintInvoice('THERMAL')} 
                  className="w-full py-4 px-6 bg-brand-black text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-brand-red transition-all flex items-center justify-center gap-3 shadow-lg"
                >
                  <ReceiptText size={20} /> Formato Tirilla (80mm)
                </button>
                
                <button 
                  onClick={() => handlePrintInvoice('LETTER')} 
                  className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-brand-black font-black rounded-2xl uppercase tracking-widest text-xs hover:border-brand-black transition-all flex items-center justify-center gap-3"
                >
                  <FileText size={20} /> Hoja Carta Completa
                </button>
                
                <button 
                  onClick={() => handlePrintInvoice('HALF_LETTER')} 
                  className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-brand-black font-black rounded-2xl uppercase tracking-widest text-xs hover:border-brand-black transition-all flex items-center justify-center gap-3"
                >
                  <FileType size={20} /> Media Carta
                </button>

                <button onClick={() => setShowPrintOptions(false)} className="mt-4 text-gray-400 font-black text-[10px] uppercase hover:text-red-500">Volver</button>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldCheck size={48}/></div>
                <h2 className="text-3xl font-black mb-1 uppercase tracking-tighter text-brand-black">Venta Autorizada</h2>
                <p className="text-[10px] font-bold text-gray-400 mb-6 uppercase tracking-widest">Documento: ${lastInvoice.id}</p>
                
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-6 space-y-4">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center gap-3">
                      <CloudUpload size={24} className={lastInvoice.dianStatus === 'APPROVED' ? 'text-green-600' : 'text-brand-red'} />
                      <div className="text-left">
                        <p className="text-xs font-black uppercase text-gray-800">Estado del Documento</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{lastInvoice.dianStatus === 'APPROVED' ? 'Factura Electrónica (Sincronizada)' : 'Recibo POS (Uso Interno)'}</p>
                      </div>
                    </div>
                    {lastInvoice.dianStatus !== 'APPROVED' && (
                      <button 
                        onClick={() => setShowEmitConfirmation(true)} 
                        className="w-full py-4 bg-brand-red text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                      >
                        <Send size={18} /> Emitir Factura Electrónica
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button onClick={() => setShowPrintOptions(true)} className="flex flex-col items-center gap-2 py-4 bg-brand-black text-white font-black rounded-2xl uppercase text-[9px] hover:bg-gray-800 transition-colors"><Printer size={20}/> Imprimir Doc</button>
                  <button onClick={() => handleDownloadPDF('LETTER')} className="flex flex-col items-center gap-2 py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[9px] hover:bg-blue-700 transition-colors"><Download size={20}/> Descargar PDF</button>
                  <button onClick={handleWhatsAppInvoice} className="flex flex-col items-center gap-2 py-4 bg-green-600 text-white font-black rounded-2xl uppercase text-[9px] hover:bg-green-700 transition-colors col-span-2"><MessageCircle size={20}/> Enviar por WhatsApp</button>
                </div>

                {lastInvoice.cufe && (
                  <button onClick={() => setShowQrPreview(true)} className="w-full mb-4 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 font-black rounded-2xl uppercase text-[10px] hover:bg-blue-100 transition-all border border-blue-100">
                    <QrCode size={18}/> Ver Código QR Legal
                  </button>
                )}

                <button onClick={() => { setShowSuccessModal(false); setLastInvoice(null); setCashReceived(0); setShowQrPreview(false); setShowPrintOptions(false); }} className="w-full py-4 bg-gray-100 text-gray-600 font-black rounded-2xl uppercase text-xs">Siguiente Cliente</button>
              </>
            )}
          </div>
        </div>
      )}

      {dianStep !== 'IDLE' && dianStep !== 'AUTHORIZED' && (
        <div className="fixed inset-0 z-[600] bg-brand-black/95 flex items-center justify-center p-6">
          <div className="bg-white rounded-[4rem] w-full max-w-sm p-12 text-center shadow-2xl animate-in zoom-in-95 border-b-[15px] border-brand-red">
            <div className="relative mb-8">
              <div className="relative">
                <Loader2 size={100} className="text-brand-red animate-spin mx-auto" strokeWidth={3} />
                <FileCode className="absolute inset-0 m-auto text-brand-black" size={32} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-brand-black uppercase tracking-tighter">
              {dianStep === 'VALIDATING_DATA' && 'Validando XML...'}
              {dianStep === 'SIGNING' && 'Firmando Digital...'}
              {dianStep === 'SENDING' && 'Enviando a DIAN...'}
              {dianStep === 'WAITING_DIAN' && 'Autorizando...'}
            </h3>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 z-[300] bg-brand-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-brand-black uppercase tracking-tighter flex items-center gap-2"><UserPlus className="text-brand-red"/> Datos del Cliente</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Obligatorio para Facturación Electrónica</p>
              </div>
              <button onClick={() => setShowCustomerModal(false)} className="bg-gray-200 hover:bg-gray-300 p-2 rounded-full transition-all"><X size={20}/></button>
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
                    onBlur={() => setShowCustomerDropdown(false)}
                    className="w-full pl-12 pr-4 py-4 bg-blue-50 text-blue-900 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-400 transition-all placeholder:text-blue-300"
                    placeholder="Buscar por NIT o Nombre..."
                  />
                  {showCustomerDropdown && customerSearchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-50">
                      {customers.filter(c => c.nit.includes(customerSearchQuery) || c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).length > 0 ? (
                        customers.filter(c => c.nit.includes(customerSearchQuery) || c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).map(c => (
                          <div 
                            key={c.nit} 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleCustomerNitChange(c.nit);
                              setCustomerSearchQuery('');
                              setShowCustomerDropdown(false);
                            }}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                          >
                            <div className="font-bold text-sm text-gray-800">{c.name}</div>
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
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => { saveCurrentCustomer(); setShowCustomerModal(false); setCustomerFieldError(null); }}
                className="flex-1 py-4 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-brand-darkRed shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Save size={18}/> Guardar Datos
              </button>
            </div>
          </div>
        </div>
      )}

      {showClosureModal && (
        <div className="fixed inset-0 z-[600] bg-brand-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-brand-black uppercase tracking-tighter flex items-center gap-2"><Lock className="text-brand-red"/> Cierre de Caja</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Resumen del día actual</p>
              </div>
              <button onClick={() => setShowClosureModal(false)} className="bg-gray-200 hover:bg-gray-300 p-2 rounded-full transition-all"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Ventas</p>
                  <p className="text-2xl font-black text-brand-black">${formatMoney(closureData.totalSales)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Facturas</p>
                  <p className="text-2xl font-black text-brand-black">{closureData.invoiceCount}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Desglose por Método</p>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Efectivo</span><span className="text-sm font-black text-brand-black">${formatMoney(closureData.cashSales)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Transferencia</span><span className="text-sm font-black text-brand-black">${formatMoney(closureData.transferSales)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Tarjeta</span><span className="text-sm font-black text-brand-black">${formatMoney(closureData.cardSales)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Fiado (CxC)</span><span className="text-sm font-black text-brand-black">${formatMoney(closureData.creditSales)}</span></div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cuadre de Efectivo</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Base Inicial</label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                      <input type="number" value={baseCash || ''} onChange={e => setBaseCash(Number(e.target.value))} className="w-full pl-9 pr-3 py-3 bg-gray-100 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-brand-red transition-all" placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Efectivo Contado</label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                      <input type="number" value={countedCash || ''} onChange={e => setCountedCash(Number(e.target.value))} className="w-full pl-9 pr-3 py-3 bg-gray-100 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-brand-red transition-all" placeholder="0" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Efectivo Esperado (Base + Ventas)</span><span className="text-sm font-black text-brand-black">${formatMoney(closureData.expectedCash)}</span></div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-xs font-bold text-gray-500">Diferencia</span>
                    <span className={`text-lg font-black ${closureData.difference === 0 ? 'text-green-500' : closureData.difference > 0 ? 'text-blue-500' : 'text-brand-red'}`}>
                      {closureData.difference > 0 ? '+' : ''}${formatMoney(closureData.difference)}
                    </span>
                  </div>
                  {closureData.difference !== 0 && (
                    <p className={`text-[10px] font-bold text-right ${closureData.difference > 0 ? 'text-blue-500' : 'text-brand-red'}`}>
                      {closureData.difference > 0 ? 'Sobrante de caja' : 'Faltante de caja'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowClosureModal(false)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-100 transition-all">Cerrar</button>
              <button onClick={handlePrintClosure} className="flex-1 py-4 bg-brand-black text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-800 shadow-xl transition-all flex items-center justify-center gap-2"><Printer size={18}/> Imprimir Cierre</button>
            </div>
          </div>
        </div>
      )}

      {showEmitConfirmation && (
        <div className="fixed inset-0 z-[700] bg-brand-black/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 text-center shadow-2xl border-t-[12px] border-brand-red animate-in zoom-in-95">
            <div className="w-20 h-20 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={40}/>
            </div>
            <h3 className="text-2xl font-black text-brand-black uppercase tracking-tighter mb-2">⚠️ AVISO LEGAL</h3>
            <p className="text-gray-500 font-bold mb-8 uppercase text-[10px] leading-relaxed">
              Esta factura tendrá validez legal real ante la DIAN.<br/>
              <span className="text-brand-red">No podrá ser eliminada</span> una vez emitida.<br/>
              ¿Desea reportar esta venta oficialmente?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleTransmitDianNow} 
                className="w-full py-5 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest hover:bg-brand-darkRed transition-all"
              >
                SÍ, EMITIR A LA DIAN
              </button>
              <button 
                onClick={() => setShowEmitConfirmation(false)} 
                className="w-full py-5 bg-gray-100 text-gray-600 font-black rounded-2xl uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                VOLVER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE RECHAZO CON SUGERENCIAS ACCIONABLES (UX 50+) ===== */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-[700] bg-brand-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center shadow-2xl border-t-[12px] border-brand-red">
            <div className="w-16 h-16 bg-red-50 text-brand-red rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32}/>
            </div>
            <h3 className="text-xl font-black text-brand-black uppercase tracking-tighter mb-2">Factura Rechazada</h3>
            <p className="text-gray-600 font-bold text-sm mb-4">{rejectionMessage}</p>
            
            {rejectionSuggestions.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Sugerencias para corregir:</p>
                <ul className="space-y-1">
                  {rejectionSuggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className="text-brand-red font-black">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { 
                  setShowRejectionModal(false); 
                  setShowCustomerModal(true);
                  setCustomerFieldError(null);
                }} 
                className="w-full py-4 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-brand-darkRed transition-all"
              >
                Corregir Datos
              </button>
              <button 
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionSuggestions([]);
                  setRejectionMessage('');
                }} 
                className="w-full py-4 bg-gray-100 text-gray-600 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE TIMEOUT (opcional pero recomendado) ===== */}
      {showTimeoutModal && (
        <div className="fixed inset-0 z-[700] bg-brand-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center shadow-2xl border-t-[12px] border-brand-red">
            <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 size={32} className="animate-spin"/>
            </div>
            <h3 className="text-xl font-black text-brand-black uppercase tracking-tighter mb-2">Tiempo de Espera Agotado</h3>
            <p className="text-gray-600 font-bold text-sm mb-6">La transmisión a la DIAN tardó más de lo esperado. ¿Qué desea hacer?</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { 
                  setShowTimeoutModal(false); 
                  handleTransmitDianNow();
                }} 
                className="w-full py-4 bg-brand-red text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-brand-darkRed transition-all"
              >
                Reintentar Ahora
              </button>
              <button 
                onClick={async () => {
                  if (lastInvoice) {
                    await encolarParaTransmision(lastInvoice, storeSettings, userId || '');
                  }
                  setShowTimeoutModal(false);
                  setDianStep('IDLE');
                  alert("✅ La factura se guardó y se transmitirá automáticamente cuando haya conexión estable.");
                }} 
                className="w-full py-4 bg-gray-100 text-gray-600 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
              >
                Guardar para Después
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};