
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Dashboard } from './components/Dashboard';
import { DianStatus } from './components/DianStatus';
import { Settings } from './components/Settings';
import { GeminiAssistant } from './components/GeminiAssistant';
import { CXC } from './components/CXC';
import { Orders } from './components/Orders';
import { Quotes } from './components/Quotes';
import { Reports } from './components/Reports';
import { Expenses } from './components/Expenses';
import { LoginModal } from './components/LoginModal';
import { PricingPlans } from './components/PricingPlans'; 
import { LandingPage } from './components/LandingPage';
import { HabilitadorPage } from './components/HabilitadorPage';
import { TerminosPage } from './components/TerminosPage';
import { Invoice, StoreSettings, CreditAccount, Order, Quote, Operator, CreditTransaction, CreditDebt, Product, KardexEntry, PaymentMethod, SupplierAccount, Customer, Supplier, Subscription, PlanTier, SubscriptionStatus, Expense } from './types';
import { dbService, initDbService, logoutDbService } from './services/storageService';
import { getColombiaISO } from './services/dianService';
import { Clock, ShieldAlert, Star } from 'lucide-react';

const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Mi Kiosko Comercial',
  nit: '900.000.000-1',
  address: 'Calle Principal # 1-23',
  phone: '300 123 4567',
  resolution: '18760000001',
  prefix: 'POS',
  currentNumber: 1,
  vatResponsibility: 'No responsable de IVA'
};

function MainApp() {
  const [activeTab, setActiveTab] = useState('pos');
  const [currentUser, setCurrentUser] = useState<Operator | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentExternalView, setCurrentExternalView] = useState<'LANDING' | 'HABILITADOR' | 'TERMINOS'>('LANDING');

  // Estados SaaS
  const [showPricing, setShowPricing] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([]);
  const [supplierAccounts, setSupplierAccounts] = useState<SupplierAccount[]>([]);
  const [kardexEntries, setKardexEntries] = useState<KardexEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);
  const [pendingQuoteToLoad, setPendingQuoteToLoad] = useState<Quote | null>(null);
  const [pendingEditInvoiceId, setPendingEditInvoiceId] = useState<string | null>(null);
  const [pendingEditBatchId, setPendingEditBatchId] = useState<string | null>(null);
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = dbService.getStoreSettings();
    return saved ? saved : DEFAULT_SETTINGS;
  });

  const loadAllData = useCallback(() => {
    setProducts(dbService.getProducts());
    setInvoices(dbService.getInvoices());
    setQuotes(dbService.getQuotes());
    setOrders(dbService.getOrders());
    setKardexEntries(dbService.getKardex());
    setCategories(dbService.getCategories());
    setSupplierAccounts(dbService.getSupplierAccounts());
    setCustomers(dbService.getCustomers());
    setSuppliers(dbService.getSuppliers());
    setExpenses(dbService.getExpenses());
    
    const settings = dbService.getStoreSettings();
    if (settings) {
      setStoreSettings(settings);
    } else {
      setStoreSettings(DEFAULT_SETTINGS);
    }
    
    const loadedCredits = dbService.getCreditAccounts();
    if (loadedCredits.length > 0) {
        setCreditAccounts(loadedCredits.map(acc => ({
            ...acc,
            debts: Array.isArray(acc.debts) ? acc.debts : [],
            history: Array.isArray(acc.history) ? acc.history : []
        })));
    } else {
        setCreditAccounts([]);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // AUTO LOG-IN WITH FIREBASE SESSION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          id: user.uid,
          name: user.displayName || 'Usuario',
          role: 'ADMIN',
          email: user.email || ''
        });
      } else {
        setCurrentUser(null);
        logoutDbService();
        setStoreSettings(DEFAULT_SETTINGS);
        setProducts([]);
        setInvoices([]);
        setQuotes([]);
        setOrders([]);
        setCreditAccounts([]);
        setSupplierAccounts([]);
        setKardexEntries([]);
        setCategories([]);
        setCustomers([]);
        setSuppliers([]);
        setExpenses([]);
      }
    });
    return unsubscribe;
  }, []);

  // INICIALIZAR FIREBASE SYNC AL LOGUEARSE
  useEffect(() => {
    if (currentUser) {
      initDbService(currentUser.id, loadAllData);
    }
  }, [currentUser, loadAllData]);

  // SINCRONIZACIÓN MULTI-PESTAÑA
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('kiosko_')) {
        loadAllData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadAllData]);

  // VALIDACIÓN DE SUSCRIPCIÓN AL INICIAR
  useEffect(() => {
      if (currentUser) {
          checkSubscriptionStatus();
      }
  }, [currentUser, storeSettings.subscription]);

  // Sincronizar suscripción física de Wompi desde Firestore (Client SDK)
  useEffect(() => {
    const syncSaaSStatus = async () => {
      if (!currentUser?.id) return;
      
      // Salta sincronización para superusuarios de prueba
      const emailLower = currentUser.email?.toLowerCase();
      if (emailLower === 'info.msdmed@gmail.com' || emailLower === 'jorge.orlando.gonzalez@gmail.com') return;

      try {
        const { db } = await import('./firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const subDoc = await getDoc(doc(db, 'subscriptions', currentUser.id));
        
        if (subDoc.exists()) {
          const serverSub = subDoc.data();
          
          let mappedStatus = 'TRIAL';
          if (serverSub.status === 'active') {
             mappedStatus = 'ACTIVE';
          } else if (serverSub.status === 'expired') {
             mappedStatus = 'EXPIRED';
          } else {
             // Calculate if trial expired
             const trialEnds = serverSub.trialEndsAt ? (serverSub.trialEndsAt.toDate ? serverSub.trialEndsAt.toDate() : new Date(serverSub.trialEndsAt)) : new Date();
             if (trialEnds < new Date()) {
                mappedStatus = 'EXPIRED';
             }
          }

          const currentSub = storeSettings.subscription;
          const trialEndIso = serverSub.trialEndsAt ? (serverSub.trialEndsAt.toDate ? serverSub.trialEndsAt.toDate().toISOString() : new Date(serverSub.trialEndsAt).toISOString()) : new Date().toISOString();
          
          // Validar si difiere de lo que tenemos guardado localmente
          if (!currentSub || currentSub.status !== mappedStatus || currentSub.trialEndDate !== trialEndIso) {
            const updatedSub: Subscription = {
              isActive: mappedStatus === 'ACTIVE' || mappedStatus === 'TRIAL',
              plan: (serverSub.plan || 'PRO') as PlanTier,
              status: mappedStatus as SubscriptionStatus,
              startDate: serverSub.createdAt ? (serverSub.createdAt.toDate ? serverSub.createdAt.toDate().toISOString() : new Date(serverSub.createdAt).toISOString()) : new Date().toISOString(),
              trialEndDate: trialEndIso,
              nextBillingDate: serverSub.nextBillingAt ? (serverSub.nextBillingAt.toDate ? serverSub.nextBillingAt.toDate().toISOString() : new Date(serverSub.nextBillingAt).toISOString()) : trialEndIso
            };
            
            const updatedSettings = { ...storeSettings, subscription: updatedSub };
            setStoreSettings(updatedSettings);
            dbService.saveStoreSettings(updatedSettings);
          }
        }
      } catch (err) {
        console.warn("No se pudo sincronizar el estado de la suscripción:", err);
      }
    };
    
    syncSaaSStatus();
  }, [currentUser]);

  // PROTECCIÓN DE RUTAS POR ROL
  useEffect(() => {
      if (currentUser?.role !== 'ADMIN') {
          const restrictedTabs = ['settings', 'reports', 'expenses'];
          if (restrictedTabs.includes(activeTab)) {
              setActiveTab('pos'); // Redirigir a caja si intenta acceder a una ruta prohibida
          }
      }
  }, [activeTab, currentUser]);

  const checkSubscriptionStatus = () => {
      // BYPASS DE SUSCRIPCIÓN PARA ADMIN Y DEVELOPER
      const emailLower = currentUser?.email?.toLowerCase();
      if (emailLower === 'info.msdmed@gmail.com' || emailLower === 'jorge.orlando.gonzalez@gmail.com') {
          setTrialDaysLeft(999);
          setIsSubscriptionExpired(false);
          setShowPricing(false);
          return;
      }
      
      const sub = storeSettings.subscription;
      
      // 1. Si no hay suscripción, mostrar planes
      if (!sub) {
          setShowPricing(true);
          return;
      }

      // 2. Si está en Trial, calcular días restantes
      if (sub.status === 'TRIAL') {
          const now = new Date();
          const end = new Date(sub.trialEndDate);
          const diffTime = end.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 0) {
              // Trial vencido
              setTrialDaysLeft(0);
              setIsSubscriptionExpired(true);
              setShowPricing(true);
          } else {
              setTrialDaysLeft(diffDays);
              setIsSubscriptionExpired(false);
              setShowPricing(false);
          }
      } 
      // 3. Si está activa (Pagada)
      else if (sub.status === 'ACTIVE') {
          setTrialDaysLeft(null);
          setIsSubscriptionExpired(false);
          setShowPricing(false);
      }
  };

  const handleSelectPlan = (plan: PlanTier, isTrial: boolean) => {
      const now = new Date();
      let newSub: Subscription;

      if (isTrial) {
          const endDate = new Date();
          endDate.setDate(now.getDate() + 15); // 15 Días de prueba
          
          newSub = {
              isActive: true,
              plan: plan,
              status: 'TRIAL',
              startDate: now.toISOString(),
              trialEndDate: endDate.toISOString(),
              nextBillingDate: endDate.toISOString()
          };
      } else {
          // Pago confirmado
          const nextBill = new Date();
          nextBill.setMonth(now.getMonth() + 1); // 1 Mes
          
          newSub = {
              isActive: true,
              plan: plan,
              status: 'ACTIVE',
              startDate: now.toISOString(),
              trialEndDate: now.toISOString(), // Ya no aplica
              nextBillingDate: nextBill.toISOString(),
              paymentMethodLast4: '4242' // Mock
          };
      }

      const updatedSettings = { ...storeSettings, subscription: newSub };
      setStoreSettings(updatedSettings);
      dbService.saveStoreSettings(updatedSettings);
      setShowPricing(false);
      setIsSubscriptionExpired(false);
  };

  const handleSaveSettings = (newSettings: StoreSettings) => {
    setStoreSettings(newSettings);
    dbService.saveStoreSettings(newSettings);
  };

  const handleSaveCustomer = (customer: Customer) => {
      const updated = dbService.saveCustomer(customer);
      setCustomers(updated);
  };

  const handleSaveSupplier = (supplier: Supplier) => {
      const updated = dbService.saveSupplier(supplier);
      setSuppliers(updated);
  };

  const handleAddProduct = (newProduct: Product) => {
      const updated = [newProduct, ...products];
      setProducts(updated);
      dbService.saveProducts(updated);
      
      const entry: KardexEntry = {
          id: `KDX-INIT-${Date.now()}`,
          date: getColombiaISO(),
          productId: newProduct.id,
          productName: newProduct.name,
          type: 'AJUSTE_MANUAL',
          quantity: newProduct.stock,
          balance: newProduct.stock,
          note: 'Saldo inicial de creación'
      };
      setKardexEntries(dbService.saveKardexEntry(entry));
  };

  const handleUpdateProducts = (updatedProducts: Product[]) => {
      setProducts(updatedProducts);
      dbService.saveProducts(updatedProducts);
  };

  const handleDeleteProduct = (id: string) => {
      const updated = dbService.deleteProduct(id);
      setProducts(updated);
  };

  const handlePhysicalCount = (productId: string, newStock: number) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const diff = newStock - product.stock;
      if (diff === 0) return;

      const entry: KardexEntry = {
          id: `KDX-ADJ-${Date.now()}`,
          date: getColombiaISO(),
          productId: product.id,
          productName: product.name,
          type: 'AJUSTE_MANUAL',
          quantity: diff,
          balance: newStock,
          note: 'Ajuste manual por conteo físico'
      };
      
      const updatedProducts = products.map(p => p.id === productId ? { ...p, stock: newStock } : p);
      setProducts(updatedProducts);
      dbService.saveProducts(updatedProducts);
      setKardexEntries(dbService.saveKardexEntry(entry));
  };

  const handleInvoiceCreated = (newInvoice: Invoice) => {
    const updatedProducts = products.map(p => {
        const itemInInvoice = newInvoice.items.find(item => item.id === p.id);
        if (itemInInvoice) {
            const newStock = Math.max(0, p.stock - itemInInvoice.quantity);
            const entry: KardexEntry = {
                id: `KDX-SALE-${Date.now()}-${p.id}`,
                date: getColombiaISO(),
                productId: p.id,
                productName: p.name,
                type: 'SALIDA_VENTA',
                quantity: -itemInInvoice.quantity,
                balance: newStock,
                reference: newInvoice.id,
                note: `Venta POS a ${newInvoice.customerName}`
            };
            dbService.saveKardexEntry(entry);
            return { ...p, stock: newStock };
        }
        return p;
    });

    setKardexEntries(dbService.getKardex());
    setProducts(updatedProducts);
    dbService.saveProducts(updatedProducts);
    setInvoices(prev => [...prev, newInvoice]);
    dbService.saveInvoice(newInvoice);

    const updatedSettings = { ...storeSettings, currentNumber: storeSettings.currentNumber + 1 };
    setStoreSettings(updatedSettings);
    dbService.saveStoreSettings(updatedSettings);
  };

  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
      // If it's an edit (items might have changed), we need to revert old and apply new
      const oldInvoice = invoices.find(i => i.id === updatedInvoice.id);
      
      if (oldInvoice && JSON.stringify(oldInvoice.items) !== JSON.stringify(updatedInvoice.items)) {
          let currentProducts = [...products];
          
          // 1. Revert old items
          oldInvoice.items.forEach(oldItem => {
              const pIndex = currentProducts.findIndex(p => p.id === oldItem.id);
              if (pIndex !== -1) {
                  currentProducts[pIndex] = {
                      ...currentProducts[pIndex],
                      stock: currentProducts[pIndex].stock + oldItem.quantity
                  };
                  
                  const entry: KardexEntry = {
                      id: `KDX-REV-SALE-${Date.now()}-${oldItem.id}`,
                      date: getColombiaISO(),
                      productId: oldItem.id,
                      productName: oldItem.name,
                      type: 'AJUSTE_MANUAL',
                      quantity: oldItem.quantity,
                      balance: currentProducts[pIndex].stock,
                      reference: oldInvoice.id,
                      note: `Reversión por edición de venta ${oldInvoice.id}`
                  };
                  dbService.saveKardexEntry(entry);
              }
          });

          // 2. Apply new items
          updatedInvoice.items.forEach(newItem => {
              const pIndex = currentProducts.findIndex(p => p.id === newItem.id);
              if (pIndex !== -1) {
                  currentProducts[pIndex] = {
                      ...currentProducts[pIndex],
                      stock: currentProducts[pIndex].stock - newItem.quantity
                  };
                  
                  const entry: KardexEntry = {
                      id: `KDX-SALE-EDIT-${Date.now()}-${newItem.id}`,
                      date: getColombiaISO(),
                      productId: newItem.id,
                      productName: newItem.name,
                      type: 'SALIDA_VENTA',
                      quantity: -newItem.quantity,
                      balance: currentProducts[pIndex].stock,
                      reference: updatedInvoice.id,
                      note: `Venta POS editada a ${updatedInvoice.customerName}`
                  };
                  dbService.saveKardexEntry(entry);
              }
          });

          setProducts(currentProducts);
          dbService.saveProducts(currentProducts);
          setKardexEntries(dbService.getKardex());
      }

      setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
      dbService.saveInvoice(updatedInvoice);
  };

  const handleDeleteSaleDocument = (invoiceId: string) => {
      const invoiceToDelete = invoices.find(i => i.id === invoiceId);
      if (!invoiceToDelete) return;

      let currentProducts = [...products];

      invoiceToDelete.items.forEach(oldItem => {
          const pIndex = currentProducts.findIndex(p => p.id === oldItem.id);
          if (pIndex !== -1) {
              currentProducts[pIndex] = {
                  ...currentProducts[pIndex],
                  stock: currentProducts[pIndex].stock + oldItem.quantity
              };
              
              const entry: KardexEntry = {
                  id: `KDX-DEL-SALE-${Date.now()}-${oldItem.id}`,
                  date: getColombiaISO(),
                  productId: oldItem.id,
                  productName: oldItem.name,
                  type: 'AJUSTE_MANUAL',
                  quantity: oldItem.quantity,
                  balance: currentProducts[pIndex].stock,
                  reference: invoiceToDelete.id,
                  note: `Reversión por anulación de venta ${invoiceToDelete.id}`
              };
              dbService.saveKardexEntry(entry);
          }
      });

      setProducts(currentProducts);
      dbService.saveProducts(currentProducts);

      if (invoiceToDelete.paymentMethod === PaymentMethod.CREDIT) {
          const now = getColombiaISO();
          const updatedAccounts = creditAccounts.map(acc => {
              if (acc.id === invoiceToDelete.customerNit) {
                  const tx: CreditTransaction = {
                      id: `tx-cxc-del-${Date.now()}`,
                      date: now,
                      type: 'PAYMENT',
                      amount: invoiceToDelete.total,
                      description: `Reversión por anulación de venta - Ref: ${invoiceToDelete.id}`
                  };
                  return {
                      ...acc,
                      currentDebt: Math.max(0, acc.currentDebt - invoiceToDelete.total),
                      lastUpdated: now,
                      history: [tx, ...(acc.history || [])]
                  };
              }
              return acc;
          });
          setCreditAccounts(updatedAccounts);
          dbService.saveCreditAccounts(updatedAccounts);
      }

      const updatedInvoices = invoices.map(i => 
          i.id === invoiceId ? { ...i, status: 'ANNULLED' as const } : i
      );
      setInvoices(updatedInvoices);
      dbService.saveInvoice(updatedInvoices.find(i => i.id === invoiceId)!);
      setKardexEntries(dbService.getKardex());
  };

  const handleProcessBatchPurchase = (supplierData: any, stagedItems: any[], method: PaymentMethod, customDate?: string, invoiceRef?: string) => {
    // Si hay customDate (YYYY-MM-DD), la forzamos a mediodía para evitar problemas de UTC
    const now = customDate ? `${customDate}T12:00:00-05:00` : getColombiaISO();
    const batchId = `BUY-${Date.now()}`;
    let batchTotal = 0;
    
    // Guardar o actualizar proveedor automáticamente
    handleSaveSupplier({
        nit: supplierData.nit,
        name: supplierData.name,
        phone: supplierData.phone,
        email: supplierData.email
    });

    const updatedProducts = products.map(p => {
        const item = stagedItems.find(si => si.product.id === p.id);
        if (item) {
            const newStock = p.stock + item.quantity;
            const subtotal = item.cost * item.quantity;
            const discountVal = subtotal * (item.discountPerc / 100);
            
            // Calculo correcto: (Subtotal - Descuento) + (IVA sobre Subtotal) + (IC)
            const ivaVal = subtotal * (item.product.taxRate / 100);
            const icVal = (item.product.consumptionTax || 0) * item.quantity;
            const itemTotalWithIVA = (subtotal - discountVal) + ivaVal + icVal;
            
            batchTotal += itemTotalWithIVA;

            // Costo promedio ponderado (simplificado aquí como costo última compra efectivo)
            const effectiveUnitCost = (subtotal - discountVal) / item.quantity;

            const entry: KardexEntry = {
                id: `KDX-BUY-${Date.now()}-${p.id}`,
                date: now,
                productId: p.id,
                productName: p.name,
                type: 'ENTRADA_COMPRA',
                quantity: item.quantity,
                balance: newStock,
                reference: batchId,
                note: `Compra legalizada de ${supplierData.name}${invoiceRef ? ` (Ref/Factura: ${invoiceRef})` : ''}`
            };
            dbService.saveKardexEntry(entry);
            return { ...p, stock: newStock, cost: effectiveUnitCost };
        }
        return p;
    });

    setProducts(updatedProducts);
    dbService.saveProducts(updatedProducts);

    const newOrders: Order[] = stagedItems.map((item, idx) => {
        const subtotal = item.cost * item.quantity;
        const discountVal = subtotal * (item.discountPerc / 100);
        
        return {
            id: `ORD-${Date.now()}-${idx}`,
            batchId: batchId,
            date: now,
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            supplier: supplierData.name,
            supplierNit: supplierData.nit,
            supplierPhone: supplierData.phone,
            supplierEmail: supplierData.email,
            ean: item.product.ean || '',
            cost: item.cost, // Guardamos el costo bruto unitario
            taxRate: item.product.taxRate,
            consumptionTax: item.product.consumptionTax,
            discount: discountVal, // NUEVO: Guardamos el valor del descuento
            status: 'PAGADO',
            paymentMethod: method,
            reference: invoiceRef
        };
    });
    const updatedOrders = [...newOrders, ...orders];
    setOrders(updatedOrders);
    dbService.saveOrders(updatedOrders);

    if (method === PaymentMethod.CXP) {
        const existingAcc = supplierAccounts.find(s => s.id === supplierData.nit);
        const tx: CreditTransaction = {
            id: `tx-cxp-${Date.now()}`,
            date: now,
            type: 'CHARGE',
            amount: batchTotal,
            description: `Compra fiada (Multi-ítem) - Ref: ${batchId}`
        };

        let updatedAccounts;
        if (existingAcc) {
            updatedAccounts = supplierAccounts.map(s => s.id === supplierData.nit ? {
                ...s,
                currentBalance: s.currentBalance + batchTotal,
                lastUpdated: now,
                history: [tx, ...s.history]
            } : s);
        } else {
            updatedAccounts = [...supplierAccounts, {
                id: supplierData.nit,
                supplierName: supplierData.name,
                currentBalance: batchTotal,
                lastUpdated: now,
                history: [tx]
            }];
        }
        setSupplierAccounts(updatedAccounts);
        dbService.saveSupplierAccounts(updatedAccounts);
    }

    setKardexEntries(dbService.getKardex());
  };

  const handleDeletePurchaseDocument = (batchId: string) => {
    const ordersToDelete = orders.filter(o => {
        const oBatchId = o.batchId || `legacy-${o.id}`;
        return oBatchId === batchId;
    });
    if (ordersToDelete.length === 0) return;

    let currentProducts = [...products];
    let batchTotal = 0;
    const method = ordersToDelete[0].paymentMethod;
    const supplierNit = ordersToDelete[0].supplierNit;

    ordersToDelete.forEach(o => {
        const subtotal = o.cost * o.quantity;
        const discountVal = o.discount || 0;
        const ivaVal = subtotal * (o.taxRate / 100);
        const icVal = (o.consumptionTax || 0) * o.quantity;
        batchTotal += (subtotal - discountVal) + ivaVal + icVal;

        const pIndex = currentProducts.findIndex(p => p.id === o.productId);
        if (pIndex !== -1) {
            currentProducts[pIndex] = {
                ...currentProducts[pIndex],
                stock: currentProducts[pIndex].stock - o.quantity
            };
            
            const entry: KardexEntry = {
                id: `KDX-DEL-BUY-${Date.now()}-${o.productId}`,
                date: getColombiaISO(),
                productId: o.productId || '',
                productName: o.productName,
                type: 'AJUSTE_MANUAL',
                quantity: -o.quantity,
                balance: currentProducts[pIndex].stock,
                reference: batchId,
                note: `Reversión por anulación de compra ${batchId}`
            };
            dbService.saveKardexEntry(entry);
        }
    });

    setProducts(currentProducts);
    dbService.saveProducts(currentProducts);

    if (method === PaymentMethod.CXP) {
        const now = getColombiaISO();
        const updatedAccounts = supplierAccounts.map(acc => {
            if (acc.id === supplierNit) {
                const tx: CreditTransaction = {
                    id: `tx-cxp-del-${Date.now()}`,
                    date: now,
                    type: 'PAYMENT',
                    amount: batchTotal,
                    description: `Reversión por anulación de compra - Ref: ${batchId}`
                };
                return {
                    ...acc,
                    currentBalance: Math.max(0, acc.currentBalance - batchTotal),
                    lastUpdated: now,
                    history: [tx, ...acc.history]
                };
            }
            return acc;
        });
        setSupplierAccounts(updatedAccounts);
        dbService.saveSupplierAccounts(updatedAccounts);
    }

    const updatedOrders = orders.map(o => {
        const oBatchId = o.batchId || `legacy-${o.id}`;
        return oBatchId === batchId ? { ...o, status: 'ANULADO' as const } : o;
    });
    setOrders(updatedOrders);
    dbService.saveOrders(updatedOrders);
    setKardexEntries(dbService.getKardex());
  };

  const handleEditPurchaseDocument = (batchId: string, supplierName: string, supplierNit: string, newItems: any[], newMethod: PaymentMethod, newDate?: string, invoiceRef?: string) => {
    // 1. Revertir el stock y kardex de la compra original
    const oldOrders = orders.filter(o => {
        const oBatchId = o.batchId || `legacy-${o.id}`;
        return oBatchId === batchId;
    });
    let currentProducts = [...products];
    let oldBatchTotal = 0;
    const oldMethod = oldOrders.length > 0 ? oldOrders[0].paymentMethod : undefined;
    const oldSupplierNit = oldOrders.length > 0 ? oldOrders[0].supplierNit : supplierNit;
    
    oldOrders.forEach(oldOrder => {
        const subtotal = oldOrder.cost * oldOrder.quantity;
        const discountVal = oldOrder.discount || 0;
        const ivaVal = subtotal * (oldOrder.taxRate / 100);
        const icVal = (oldOrder.consumptionTax || 0) * oldOrder.quantity;
        oldBatchTotal += (subtotal - discountVal) + ivaVal + icVal;

        const pIndex = currentProducts.findIndex(p => p.id === oldOrder.productId);
        if (pIndex !== -1) {
            currentProducts[pIndex] = {
                ...currentProducts[pIndex],
                stock: currentProducts[pIndex].stock - oldOrder.quantity
            };
            
            // Revertir en Kardex
            const entry: KardexEntry = {
                id: `KDX-REV-${Date.now()}-${oldOrder.productId}`,
                date: getColombiaISO(),
                productId: oldOrder.productId || '',
                productName: oldOrder.productName,
                type: 'AJUSTE_MANUAL',
                quantity: -oldOrder.quantity,
                balance: currentProducts[pIndex].stock,
                reference: batchId,
                note: `Reversión por edición de compra ${batchId}`
            };
            dbService.saveKardexEntry(entry);
        }
    });

    // 2. Aplicar los nuevos items
    const now = newDate ? `${newDate}T12:00:00-05:00` : getColombiaISO();
    let newBatchTotal = 0;

    const newOrders: Order[] = newItems.map((item, idx) => {
        const subtotal = item.cost * item.quantity;
        const discountVal = subtotal * (item.discountPerc / 100);
        
        const ivaVal = subtotal * (item.product.taxRate / 100);
        const icVal = (item.product.consumptionTax || 0) * item.quantity;
        const itemTotalWithIVA = (subtotal - discountVal) + ivaVal + icVal;
        
        newBatchTotal += itemTotalWithIVA;

        const pIndex = currentProducts.findIndex(p => p.id === item.product.id);
        if (pIndex !== -1) {
            currentProducts[pIndex] = {
                ...currentProducts[pIndex],
                stock: currentProducts[pIndex].stock + item.quantity,
                cost: (subtotal - discountVal) / item.quantity
            };
            
            // Nuevo registro en Kardex
            const entry: KardexEntry = {
                id: `KDX-BUY-EDIT-${Date.now()}-${item.product.id}`,
                date: now,
                productId: item.product.id,
                productName: item.product.name,
                type: 'ENTRADA_COMPRA',
                quantity: item.quantity,
                balance: currentProducts[pIndex].stock,
                reference: batchId,
                note: `Compra editada de ${supplierName}${invoiceRef ? ` (Ref/Factura: ${invoiceRef})` : ''}`
            };
            dbService.saveKardexEntry(entry);
        }

        return {
            id: `ORD-${Date.now()}-${idx}`,
            batchId: batchId,
            date: now,
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            supplier: supplierName,
            supplierNit: supplierNit,
            supplierPhone: '',
            supplierEmail: '',
            ean: item.product.ean || '',
            cost: item.cost,
            taxRate: item.product.taxRate,
            consumptionTax: item.product.consumptionTax,
            discount: discountVal,
            status: 'PAGADO',
            paymentMethod: newMethod,
            reference: invoiceRef
        };
    });

    // 3. Actualizar estado de CXP (Cuentas Por Pagar)
    let updatedAccounts = [...supplierAccounts];
    
    // Si el método original era CXP, revertir el saldo
    if (oldMethod === PaymentMethod.CXP) {
        updatedAccounts = updatedAccounts.map(acc => {
            if (acc.id === oldSupplierNit) {
                const tx: CreditTransaction = {
                    id: `tx-cxp-rev-${Date.now()}`,
                    date: now,
                    type: 'PAYMENT', // Usamos PAYMENT para restar el saldo
                    amount: oldBatchTotal,
                    description: `Reversión por edición de compra - Ref: ${batchId}`
                };
                return {
                    ...acc,
                    currentBalance: Math.max(0, acc.currentBalance - oldBatchTotal),
                    lastUpdated: now,
                    history: [tx, ...acc.history]
                };
            }
            return acc;
        });
    }

    // Si el nuevo método es CXP, agregar el nuevo saldo
    if (newMethod === PaymentMethod.CXP) {
        const existingAcc = updatedAccounts.find(s => s.id === supplierNit);
        const tx: CreditTransaction = {
            id: `tx-cxp-edit-${Date.now()}`,
            date: now,
            type: 'CHARGE',
            amount: newBatchTotal,
            description: `Compra fiada editada (Multi-ítem) - Ref: ${batchId}`
        };

        if (existingAcc) {
            updatedAccounts = updatedAccounts.map(s => s.id === supplierNit ? {
                ...s,
                currentBalance: s.currentBalance + newBatchTotal,
                lastUpdated: now,
                history: [tx, ...s.history]
            } : s);
        } else {
            updatedAccounts = [...updatedAccounts, {
                id: supplierNit,
                supplierName: supplierName,
                currentBalance: newBatchTotal,
                lastUpdated: now,
                history: [tx]
            }];
        }
    }

    setSupplierAccounts(updatedAccounts);
    dbService.saveSupplierAccounts(updatedAccounts);

    // 4. Actualizar estado
    setProducts(currentProducts);
    dbService.saveProducts(currentProducts);
    
    const updatedOrdersList = [...newOrders, ...orders.filter(o => {
        const oBatchId = o.batchId || `legacy-${o.id}`;
        return oBatchId !== batchId;
    })];
    setOrders(updatedOrdersList);
    dbService.saveOrders(updatedOrdersList);
    setKardexEntries(dbService.getKardex());
    
    alert("Documento de compra actualizado exitosamente.");
  };

  const handleAddSupplierPayment = (supplierId: string, amount: number, paymentDate?: string, description?: string) => {
    const now = paymentDate || getColombiaISO();
    const updatedAccounts = supplierAccounts.map(acc => {
        if (acc.id === supplierId) {
            const tx: CreditTransaction = {
                id: `tx-cxp-pay-${Date.now()}`,
                date: now,
                type: 'PAYMENT',
                amount: amount,
                description: description || 'Abono a proveedor'
            };
            return {
                ...acc,
                currentBalance: Math.max(0, acc.currentBalance - amount),
                lastUpdated: now,
                history: [tx, ...acc.history]
            };
        }
        return acc;
    });
    setSupplierAccounts(updatedAccounts);
    dbService.saveSupplierAccounts(updatedAccounts);
  };

  const handleEditSupplierPayment = (supplierId: string, paymentId: string, newAmount: number, newDate: string, newDescription: string) => {
    const updatedAccounts = supplierAccounts.map(acc => {
      if (acc.id === supplierId) {
        const paymentToEdit = acc.history.find(tx => tx.id === paymentId);
        if (!paymentToEdit) return acc;

        const amountDifference = newAmount - paymentToEdit.amount;

        const updatedHistory = acc.history.map(tx => {
          if (tx.id === paymentId) {
            return { ...tx, amount: newAmount, date: newDate, description: newDescription };
          }
          return tx;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
          ...acc,
          currentBalance: Math.max(0, acc.currentBalance - amountDifference),
          history: updatedHistory
        };
      }
      return acc;
    });

    setSupplierAccounts(updatedAccounts);
    dbService.saveSupplierAccounts(updatedAccounts);
    alert("Abono a proveedor editado correctamente.");
  };

  const handleDeleteSupplierPayment = (supplierId: string, paymentId: string) => {
    const updatedAccounts = supplierAccounts.map(acc => {
      if (acc.id === supplierId) {
        const paymentToDelete = acc.history.find(tx => tx.id === paymentId);
        if (!paymentToDelete) return acc;

        const updatedHistory = acc.history.filter(tx => tx.id !== paymentId);

        return {
          ...acc,
          currentBalance: acc.currentBalance + paymentToDelete.amount,
          history: updatedHistory
        };
      }
      return acc;
    });

    setSupplierAccounts(updatedAccounts);
    dbService.saveSupplierAccounts(updatedAccounts);
    alert("Abono a proveedor eliminado correctamente.");
  };

  const handleAddCategory = (newCat: string) => {
    const normalized = newCat.trim();
    if (!normalized || categories.includes(normalized)) return;
    const updated = [...categories, normalized];
    setCategories(updated);
    dbService.saveCategories(updated);
  };

  const handleAddPaymentCXC = (clientId: string, amount: number, specificDebtId?: string, paymentDate?: string, description?: string) => {
    const now = paymentDate || getColombiaISO();
    const updatedAccounts = creditAccounts.map(acc => {
      if (acc.id === clientId) {
        const tx: CreditTransaction = {
          id: `tx-cxc-pay-${Date.now()}`,
          date: now,
          type: 'PAYMENT',
          amount: amount,
          description: description || 'Abono de cliente'
        };

        let remainingPayment = amount;
        let updatedDebts = [...(acc.debts || [])];

        if (specificDebtId) {
          updatedDebts = updatedDebts.map(d => {
            if (d.id === specificDebtId && !d.isPaid) {
              const paymentToApply = Math.min(d.currentBalance, remainingPayment);
              remainingPayment -= paymentToApply;
              const newBalance = d.currentBalance - paymentToApply;
              return { ...d, currentBalance: newBalance, isPaid: newBalance <= 0 };
            }
            return d;
          });
        }

        // Apply remaining payment to oldest unpaid debts
        if (remainingPayment > 0) {
          updatedDebts = updatedDebts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(d => {
            if (!d.isPaid && remainingPayment > 0) {
              const paymentToApply = Math.min(d.currentBalance, remainingPayment);
              remainingPayment -= paymentToApply;
              const newBalance = d.currentBalance - paymentToApply;
              return { ...d, currentBalance: newBalance, isPaid: newBalance <= 0 };
            }
            return d;
          });
        }

        return {
          ...acc,
          currentDebt: Math.max(0, acc.currentDebt - amount),
          lastUpdated: now,
          debts: updatedDebts,
          history: [tx, ...(acc.history || [])]
        };
      }
      return acc;
    });
    setCreditAccounts(updatedAccounts);
    dbService.saveCreditAccounts(updatedAccounts);
  };

  const handleDeletePaymentCXC = (clientId: string, transactionId: string) => {
    const updatedAccounts = creditAccounts.map(acc => {
      if (acc.id === clientId) {
        const txToDelete = acc.history?.find(tx => tx.id === transactionId);
        if (!txToDelete || txToDelete.type !== 'PAYMENT') return acc;

        let amountToRevert = txToDelete.amount;
        let updatedDebts = [...(acc.debts || [])];

        // Revert payment by adding amount back to newest paid debts
        updatedDebts = updatedDebts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(d => {
          if (amountToRevert > 0 && d.currentBalance < d.originalAmount) {
            const space = d.originalAmount - d.currentBalance;
            const revertAmount = Math.min(space, amountToRevert);
            amountToRevert -= revertAmount;
            const newBalance = d.currentBalance + revertAmount;
            return { ...d, currentBalance: newBalance, isPaid: newBalance <= 0 };
          }
          return d;
        });

        return {
          ...acc,
          currentDebt: acc.currentDebt + txToDelete.amount,
          lastUpdated: getColombiaISO(),
          debts: updatedDebts,
          history: acc.history?.filter(tx => tx.id !== transactionId) || []
        };
      }
      return acc;
    });
    setCreditAccounts(updatedAccounts);
    dbService.saveCreditAccounts(updatedAccounts);
  };

  const handleEditPaymentCXC = (clientId: string, transactionId: string, newAmount: number, newDate: string, newDescription: string) => {
    const updatedAccounts = creditAccounts.map(acc => {
      if (acc.id === clientId) {
        const txToEdit = acc.history?.find(tx => tx.id === transactionId);
        if (!txToEdit || txToEdit.type !== 'PAYMENT') return acc;

        const amountDifference = newAmount - txToEdit.amount;
        let updatedDebts = [...(acc.debts || [])];

        if (amountDifference < 0) {
          // Payment decreased, need to revert the difference
          let amountToRevert = Math.abs(amountDifference);
          updatedDebts = updatedDebts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(d => {
            if (amountToRevert > 0 && d.currentBalance < d.originalAmount) {
              const space = d.originalAmount - d.currentBalance;
              const revertAmount = Math.min(space, amountToRevert);
              amountToRevert -= revertAmount;
              const newBalance = d.currentBalance + revertAmount;
              return { ...d, currentBalance: newBalance, isPaid: newBalance <= 0 };
            }
            return d;
          });
        } else if (amountDifference > 0) {
          // Payment increased, need to apply the difference
          let remainingPayment = amountDifference;
          updatedDebts = updatedDebts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(d => {
            if (!d.isPaid && remainingPayment > 0) {
              const paymentToApply = Math.min(d.currentBalance, remainingPayment);
              remainingPayment -= paymentToApply;
              const newBalance = d.currentBalance - paymentToApply;
              return { ...d, currentBalance: newBalance, isPaid: newBalance <= 0 };
            }
            return d;
          });
        }

        const updatedHistory = acc.history?.map(tx => 
          tx.id === transactionId 
            ? { ...tx, amount: newAmount, date: newDate, description: newDescription } 
            : tx
        ) || [];

        return {
          ...acc,
          currentDebt: Math.max(0, acc.currentDebt - amountDifference),
          lastUpdated: getColombiaISO(),
          debts: updatedDebts,
          history: updatedHistory
        };
      }
      return acc;
    });
    setCreditAccounts(updatedAccounts);
    dbService.saveCreditAccounts(updatedAccounts);
  };

  const handleAddDebtCXC = (clientId: string, amount: number, description: string, date: string) => {
    const updatedAccounts = creditAccounts.map(acc => {
      if (acc.id === clientId) {
        const debt: CreditDebt = {
          id: `debt-${Date.now()}`,
          date: date,
          description: description,
          originalAmount: amount,
          currentBalance: amount,
          isPaid: false
        };
        const tx: CreditTransaction = {
          id: `tx-cxc-charge-${Date.now()}`,
          date: date,
          type: 'CHARGE',
          amount: amount,
          description: description
        };
        return {
          ...acc,
          currentDebt: acc.currentDebt + amount,
          lastUpdated: date,
          debts: [debt, ...(acc.debts || [])],
          history: [tx, ...(acc.history || [])]
        };
      }
      return acc;
    });
    setCreditAccounts(updatedAccounts);
    dbService.saveCreditAccounts(updatedAccounts);
  };

  const handleCreditSale = (amount: number, clientName: string, clientNit: string, date: string) => {
    const existing = creditAccounts.find(a => a.id === clientNit);
    const debt: CreditDebt = {
      id: `debt-${Date.now()}`,
      date: date,
      description: 'Venta fiada POS',
      originalAmount: amount,
      currentBalance: amount,
      isPaid: false
    };
    const tx: CreditTransaction = {
      id: `tx-cxc-charge-${Date.now()}`,
      date: date,
      type: 'CHARGE',
      amount: amount,
      description: 'Venta fiada POS'
    };
    if (existing) {
      const updated = creditAccounts.map(a => a.id === clientNit ? {
        ...a,
        currentDebt: a.currentDebt + amount,
        lastUpdated: date,
        debts: [debt, ...(a.debts || [])],
        history: [tx, ...(a.history || [])]
      } : a);
      setCreditAccounts(updated);
      dbService.saveCreditAccounts(updated);
    } else {
      const newAcc: CreditAccount = {
        id: clientNit,
        customerName: clientName,
        phone: '',
        currentDebt: amount,
        lastUpdated: date,
        debts: [debt],
        history: [tx]
      };
      const updated = [...creditAccounts, newAcc];
      setCreditAccounts(updated);
      dbService.saveCreditAccounts(updated);
    }
  };

  const handleDeleteQuote = (id: string) => {
      setQuotes(prev => {
          const updated = prev.filter(q => q.id !== id);
          dbService.deleteQuote(id);
          return updated;
      });
  };

  const handleRestoreQuote = (quote: Quote) => {
      setPendingQuoteToLoad(quote);
      setActiveTab('pos');
  };

  const handleAddExpense = (expense: Expense) => {
      setExpenses(prev => {
          const updated = [expense, ...prev];
          dbService.saveExpenses(updated);
          return updated;
      });
  };

  const handleDeleteExpense = (id: string) => {
      const updated = dbService.deleteExpense(id);
      setExpenses(updated);

  };
  const handleEditExpense = (updatedExpense: Expense) => {
      setExpenses(prev => {
          const updated = prev.map(e => e.id === updatedExpense.id ? updatedExpense : e);
          dbService.saveExpenses(updated);
          return updated;
      });
  };

  const handleQuoteCreated = (q: Quote) => {
      setQuotes(prev => [q, ...prev]);
      dbService.saveQuote(q);
  };

  const getContextData = () => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
      const todaysInvoices = invoices.filter(i => {
          const invDate = new Date(i.date).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
          return invDate === today;
      });
      const todaysExpenses = expenses.filter(e => {
          const expDate = new Date(e.date).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
          return expDate === today;
      });
      
      const salesToday = todaysInvoices.reduce((s, i) => s + i.total, 0);
      const taxesToday = todaysInvoices.reduce((s, i) => s + i.tax + (i.consumptionTaxTotal || 0), 0);
      const expensesToday = todaysExpenses.reduce((s, e) => s + e.amount, 0);
      const cxpTotal = supplierAccounts.reduce((s, a) => s + a.currentBalance, 0);
      const cxcTotal = creditAccounts.reduce((s, a) => s + a.currentDebt, 0);
      
      const lowStockProducts = products
          .filter(p => p.stock <= 5)
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 5)
          .map(p => `${p.name} (${p.stock} unds)`)
          .join(', ');

      return `
        Negocio: ${storeSettings.name}
        NIT: ${storeSettings.nit}
        Ventas de hoy: $${salesToday.toLocaleString('es-CO')}
        Gastos de hoy: $${expensesToday.toLocaleString('es-CO')}
        Impuestos recaudados hoy (IVA+IC): $${taxesToday.toLocaleString('es-CO')}
        Cuentas por Cobrar (Fiados/CXC): $${cxcTotal.toLocaleString('es-CO')}
        Cuentas por Pagar (Proveedores/CXP): $${cxpTotal.toLocaleString('es-CO')}
        Productos con bajo inventario (Top 5): ${lowStockProducts || 'Ninguno'}
      `;
  };

  if (!currentUser) {
    return (
      <>
        {currentExternalView === 'LANDING' && (
          <LandingPage 
            onLoginClick={() => setShowLoginModal(true)} 
            onTerminosClick={() => setCurrentExternalView('TERMINOS')}
            onHabilitadorClick={() => setCurrentExternalView('HABILITADOR')}
          />
        )}
        {currentExternalView === 'HABILITADOR' && (
          <HabilitadorPage onBackToApp={() => setCurrentExternalView('LANDING')} />
        )}
        {currentExternalView === 'TERMINOS' && (
          <TerminosPage onBackToApp={() => setCurrentExternalView('LANDING')} />
        )}
        {showLoginModal && (
          <LoginModal 
            isOpen={showLoginModal} 
            onClose={() => setShowLoginModal(false)} 
            onLogin={(user) => {
              setCurrentUser(user);
              setShowLoginModal(false);
            }} 
            canClose={true} 
          />
        )}
      </>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 transition-all">
      {/* SaaS Pricing Overlay */}
      {showPricing && (
          <PricingPlans onSelectPlan={handleSelectPlan} isTrialExpired={isSubscriptionExpired} isInTrial={trialDaysLeft !== null && trialDaysLeft > 0} />
      )}

      <div className="w-full h-full min-h-screen bg-gray-50 flex flex-col transition-all duration-300 ease-in-out relative">
        
        {/* Banner de Periodo de Prueba SaaS */}
        {trialDaysLeft !== null && trialDaysLeft <= 15 && (
            <div className="bg-brand-black text-white px-4 py-2 text-center text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 relative z-50 shadow-md">
                <Clock size={14} className="text-brand-red animate-pulse"/>
                <span>{trialDaysLeft} Días Restantes de tu Prueba Gratuita</span>
                <button onClick={() => setShowPricing(true)} className="ml-4 bg-brand-red px-3 py-1 rounded text-[10px] hover:bg-white hover:text-brand-red transition-all">
                    Suscribirse Ahora
                </button>
            </div>
        )}

        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          currentUser={currentUser} 
          onLoginClick={() => {}} 
          onLogoutClick={() => signOut(auth)} 
          storeSettings={storeSettings}
        />
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto no-scrollbar">
              {activeTab === 'pos' && <POS productsProp={products} storeSettings={storeSettings} onInvoiceCreated={handleInvoiceCreated} onUpdateInvoice={handleUpdateInvoice} onQuoteCreated={handleQuoteCreated} onCreditSale={handleCreditSale} onOpenGemini={() => setIsGeminiOpen(true)} pendingQuote={pendingQuoteToLoad} onQuoteLoaded={() => setPendingQuoteToLoad(null)} customers={customers} onSaveCustomer={handleSaveCustomer} pendingEditInvoiceId={pendingEditInvoiceId} onEditLoaded={() => setPendingEditInvoiceId(null)} invoices={invoices} userId={currentUser?.id} />}
              {activeTab === 'inventory' && <Inventory products={products} kardexEntries={kardexEntries} categories={categories} onAddCategory={handleAddCategory} onAddProduct={handleAddProduct} onUpdateProducts={handleUpdateProducts} onDeleteProduct={handleDeleteProduct} onPhysicalCount={handlePhysicalCount} />}
              {activeTab === 'dashboard' && <Dashboard invoices={invoices} products={products} expenses={expenses} totalDebt={creditAccounts.reduce((s,a)=>s+a.currentDebt,0)} cxpTotal={supplierAccounts.reduce((s,a)=>s+a.currentBalance,0)} onRefresh={async () => { loadAllData(); }} />}
              {activeTab === 'invoices' && <DianStatus invoices={invoices} onUpdateInvoice={handleUpdateInvoice} storeSettings={storeSettings} userId={currentUser?.id} />}
              {activeTab === 'cxc' && <CXC accounts={creditAccounts} onAddPayment={handleAddPaymentCXC} onAddDebt={handleAddDebtCXC} onDeletePayment={handleDeletePaymentCXC} onEditPayment={handleEditPaymentCXC} />}
              {activeTab === 'orders' && <Orders products={products} orders={orders} onProcessBatchPurchase={handleProcessBatchPurchase} supplierAccounts={supplierAccounts} onAddSupplierPayment={handleAddSupplierPayment} onDeleteSupplierPayment={handleDeleteSupplierPayment} onEditSupplierPayment={handleEditSupplierPayment} onDeletePurchaseDocument={handleDeletePurchaseDocument} onEditPurchaseDocument={handleEditPurchaseDocument} storeSettings={storeSettings} suppliers={suppliers} onSaveSupplier={handleSaveSupplier} pendingEditBatchId={pendingEditBatchId} onEditLoaded={() => setPendingEditBatchId(null)} />}
              {activeTab === 'quotes' && <Quotes quotes={quotes} onDeleteQuote={handleDeleteQuote} onRestoreQuote={handleRestoreQuote} />}
              {activeTab === 'expenses' && <Expenses expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} onEditExpense={handleEditExpense} storeSettings={storeSettings} />}
              {activeTab === 'reports' && <Reports invoices={invoices} orders={orders} products={products} storeSettings={storeSettings} expenses={expenses} onNavigate={setActiveTab} onEditPurchase={(batchId) => { setPendingEditBatchId(batchId); setActiveTab('orders'); }} onEditSale={(invoiceId) => { setPendingEditInvoiceId(invoiceId); setActiveTab('pos'); }} onDeletePurchase={handleDeletePurchaseDocument} onDeleteSale={handleDeleteSaleDocument} />}
              {activeTab === 'settings' && <Settings settings={storeSettings} onSave={handleSaveSettings} userId={currentUser?.id} onNavigateActiveTab={setActiveTab} />}
              {activeTab === 'habilitador' && <HabilitadorPage onBackToApp={() => setActiveTab('settings')} />}
              {activeTab === 'terminos' && <TerminosPage onBackToApp={() => setActiveTab('settings')} />}
          </div>
        </main>
        <GeminiAssistant contextData={getContextData()} isOpen={isGeminiOpen} onOpen={() => setIsGeminiOpen(true)} onClose={() => setIsGeminiOpen(false)} showFloatingButton={true} />
      </div>
    </div>
  );
}

export default MainApp;
