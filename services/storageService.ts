
import { Product, Customer, Supplier, Invoice, Quote, Order, CreditAccount, KardexEntry, SupplierAccount, Expense } from '../types';
import { saveToFirestore, saveArrayToFirestore, syncCollection, syncArrayDocument } from './firebaseSyncService';

const KEYS = {
  PRODUCTS: 'kiosko_products',
  CUSTOMERS: 'kiosko_customers',
  SUPPLIERS: 'kiosko_suppliers',
  INVOICES: 'kiosko_invoices',
  QUOTES: 'kiosko_quotes',
  ORDERS: 'kiosko_orders',
  CREDIT: 'kiosko_credit_accounts',
  CXP: 'kiosko_supplier_accounts',
  KARDEX: 'kiosko_kardex',
  CATEGORIES: 'kiosko_categories',
  EXPENSES: 'kiosko_expenses',
};

const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Arroz Libra', cost: 1800, price: 2500, taxRate: 0, category: 'Abarrotes', stock: 50, icon: '🍚', ean: '7701001' },
  { id: '2', name: 'Gaseosa 1.5L', cost: 3200, price: 4500, taxRate: 19, category: 'Bebidas', stock: 24, icon: '🥤', ean: '7701002' },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { nit: '222222222222', name: 'Consumidor Final', address: 'Local', phone: '' },
];

const INITIAL_SUPPLIERS: Supplier[] = [
    { nit: '800111222', name: 'Distribuidora Central', contactName: 'Carlos Vendedor' },
];

const INITIAL_CATEGORIES = ['General', 'Abarrotes', 'Bebidas', 'Licores', 'Fruver', 'Lácteos', 'Aseo'];

let currentUserId: string | null = null;
let onSyncUpdateCallback: () => void = () => {};
let unsubscribes: (() => void)[] = [];

// Helper para obtener una clave aislada por usuario
const getScopedKey = (key: string) => {
  if (!currentUserId) return key;
  if (key.includes(currentUserId)) return key;
  return `kiosko_${currentUserId}_${key.replace('kiosko_', '')}`;
};

export const logoutDbService = () => {
  unsubscribes.forEach(unsub => unsub());
  unsubscribes = [];
  currentUserId = null;
};

export const initDbService = (userId: string, onUpdate: () => void) => {
  currentUserId = userId;
  onSyncUpdateCallback = onUpdate;
  
  // Limpiar suscripciones anteriores si las hay
  unsubscribes.forEach(unsub => unsub());
  unsubscribes = [];

  // Iniciar Sincronización en tiempo real desde Firebase hacia localStorage aislado
  unsubscribes.push(
    syncCollection<Product>(userId, 'products', KEYS.PRODUCTS, onUpdate),
    syncCollection<Invoice>(userId, 'invoices', KEYS.INVOICES, onUpdate),
    syncCollection<Quote>(userId, 'quotes', KEYS.QUOTES, onUpdate),
    syncCollection<Order>(userId, 'orders', KEYS.ORDERS, onUpdate),
    syncCollection<Expense>(userId, 'expenses', KEYS.EXPENSES, onUpdate),
    syncCollection<any>(userId, 'storeSettings', 'kiosko_settings_firebase', () => {
      // Custom handler for settings
      const settingsKey = `kiosko_${userId}_settings_firebase`;
      const settingsStr = localStorage.getItem(settingsKey);
      if (settingsStr) {
        const settingsArr = JSON.parse(settingsStr);
        if (settingsArr.length > 0) {
          const settings = settingsArr[0];
          delete settings.id; // Remove the 'default' id
          const activeSettingsKey = `kiosko_${userId}_settings`;
          localStorage.setItem(activeSettingsKey, JSON.stringify(settings));
          onUpdate();
        }
      }
    }),
    syncArrayDocument<Customer>(userId, 'customers', KEYS.CUSTOMERS, onUpdate),
    syncArrayDocument<Supplier>(userId, 'suppliers', KEYS.SUPPLIERS, onUpdate),
    syncArrayDocument<CreditAccount>(userId, 'credit_accounts', KEYS.CREDIT, onUpdate),
    syncArrayDocument<SupplierAccount>(userId, 'supplier_accounts', KEYS.CXP, onUpdate),
    syncArrayDocument<KardexEntry>(userId, 'kardex', KEYS.KARDEX, onUpdate),
    syncArrayDocument<string>(userId, 'categories', KEYS.CATEGORIES, onUpdate)
  );
};

const getFromStorage = <T>(key: string, initialData: T[]): T[] => {
  try {
    const activeKey = getScopedKey(key);
    const item = localStorage.getItem(activeKey);
    if (item) return JSON.parse(item);
    
    // Solo populamos por defecto si hay sesión de usuario
    if (currentUserId) {
      localStorage.setItem(activeKey, JSON.stringify(initialData));
    }
    return initialData;
  } catch (e) {
    return initialData;
  }
};

const saveToStorage = <T>(key: string, data: T[]) => {
  const activeKey = getScopedKey(key);
  localStorage.setItem(activeKey, JSON.stringify(data));
};

export const dbService = {
  getProducts: (): Product[] => getFromStorage(KEYS.PRODUCTS, INITIAL_PRODUCTS),
  saveProducts: (products: Product[]) => {
    saveToStorage(KEYS.PRODUCTS, products);
    if (currentUserId) {
      // Para optimizar, en lugar de guardar todo el array, guardamos cada producto en la colección
      products.forEach(p => saveToFirestore(currentUserId!, 'products', p));
    }
  },
  
  getCustomers: (): Customer[] => getFromStorage(KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
  saveCustomer: (customer: Customer) => {
    const current = dbService.getCustomers();
    const index = current.findIndex(c => c.nit === customer.nit);
    const updated = index >= 0 ? [...current] : [...current, customer];
    if (index >= 0) updated[index] = customer;
    saveToStorage(KEYS.CUSTOMERS, updated);
    if (currentUserId) saveArrayToFirestore(currentUserId, 'customers', updated);
    return updated;
  },

  getSuppliers: (): Supplier[] => getFromStorage(KEYS.SUPPLIERS, INITIAL_SUPPLIERS),
  saveSupplier: (supplier: Supplier) => {
      const current = dbService.getSuppliers();
      const index = current.findIndex(s => s.nit === supplier.nit);
      const updated = index >= 0 ? [...current] : [...current, supplier];
      if (index >= 0) updated[index] = supplier;
      saveToStorage(KEYS.SUPPLIERS, updated);
      if (currentUserId) saveArrayToFirestore(currentUserId, 'suppliers', updated);
      return updated;
  },

  getInvoices: (): Invoice[] => getFromStorage(KEYS.INVOICES, []),
  saveInvoice: (invoice: Invoice) => {
      const current = dbService.getInvoices();
      const existingIndex = current.findIndex(i => i.id === invoice.id);
      let updated;
      if (existingIndex >= 0) {
          current[existingIndex] = invoice;
          updated = current;
      } else {
          updated = [...current, invoice];
      }
      saveToStorage(KEYS.INVOICES, updated);
      if (currentUserId) saveToFirestore(currentUserId, 'invoices', invoice);
      return updated;
  },

  deleteInvoice: (id: string) => {
      const current = dbService.getInvoices();
      const updated = current.filter(i => i.id !== id);
      saveToStorage(KEYS.INVOICES, updated);
      // Nota: Para borrar de firestore se necesitaría una función deleteFromFirestore
      return updated;
  },

  getQuotes: (): Quote[] => getFromStorage(KEYS.QUOTES, []),
  saveQuote: (quote: Quote) => {
      const current = dbService.getQuotes();
      const updated = [quote, ...current];
      saveToStorage(KEYS.QUOTES, updated);
      if (currentUserId) saveToFirestore(currentUserId, 'quotes', quote);
      return updated;
  },
  
  deleteQuote: (id: string) => {
      const updated = dbService.getQuotes().filter(q => q.id !== id);
      saveToStorage(KEYS.QUOTES, updated);
      return updated;
  },

  getOrders: (): Order[] => getFromStorage(KEYS.ORDERS, []),
  saveOrders: (orders: Order[]) => {
    saveToStorage(KEYS.ORDERS, orders);
    if (currentUserId) {
      orders.forEach(o => saveToFirestore(currentUserId!, 'orders', o));
    }
  },

  getCreditAccounts: (): CreditAccount[] => getFromStorage(KEYS.CREDIT, []),
  saveCreditAccounts: (accounts: CreditAccount[]) => {
    saveToStorage(KEYS.CREDIT, accounts);
    if (currentUserId) saveArrayToFirestore(currentUserId, 'credit_accounts', accounts);
  },

  getSupplierAccounts: (): SupplierAccount[] => getFromStorage(KEYS.CXP, []),
  saveSupplierAccounts: (accounts: SupplierAccount[]) => {
    saveToStorage(KEYS.CXP, accounts);
    if (currentUserId) saveArrayToFirestore(currentUserId, 'supplier_accounts', accounts);
  },

  getKardex: (): KardexEntry[] => getFromStorage(KEYS.KARDEX, []),
  saveKardexEntry: (entry: KardexEntry) => {
      const current = dbService.getKardex();
      const updated = [entry, ...current].slice(0, 500); 
      saveToStorage(KEYS.KARDEX, updated);
      if (currentUserId) {
        saveArrayToFirestore(currentUserId, 'kardex', updated);
      }
      return updated;
  },

  getCategories: (): string[] => getFromStorage(KEYS.CATEGORIES, INITIAL_CATEGORIES),
  saveCategories: (categories: string[]) => {
    saveToStorage(KEYS.CATEGORIES, categories);
    if (currentUserId) saveArrayToFirestore(currentUserId, 'categories', categories);
  },

  getExpenses: (): Expense[] => getFromStorage(KEYS.EXPENSES, []),
  saveExpenses: (expenses: Expense[]) => {
    saveToStorage(KEYS.EXPENSES, expenses);
    if (currentUserId) {
      expenses.forEach(e => saveToFirestore(currentUserId!, 'expenses', e));
    }
  },

  getStoreSettings: (): any => {
    const activeKey = currentUserId ? `kiosko_${currentUserId}_settings` : 'kiosko_settings';
    const saved = localStorage.getItem(activeKey);
    return saved ? JSON.parse(saved) : null;
  },
  saveStoreSettings: (settings: any) => {
    const activeKey = currentUserId ? `kiosko_${currentUserId}_settings` : 'kiosko_settings';
    localStorage.setItem(activeKey, JSON.stringify(settings));
    if (currentUserId) {
      saveToFirestore(currentUserId, 'storeSettings', { id: 'default', ...settings });
    }
  }
};
