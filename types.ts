// Definición de tipos para el sistema POS y DIAN

export enum PaymentMethod {
  CASH = 'Efectivo',
  QR = 'Código QR',
  TRANSFER = 'Nequi / Daviplata',
  CREDIT = 'CxC (Fiado)',
  CXP = 'CXP (Fiado Proveedor)',
  MIXED = 'Pago Mixto',
  CARD = 'Tarjeta'
}

export type ViewportMode = 'desktop' | 'laptop' | 'tablet' | 'mobile' | 'auto';

// TIPOS SAAS (NUEVOS)
export type PlanTier = 'BASIC' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Subscription {
  isActive: boolean;
  plan: PlanTier;
  status: SubscriptionStatus;
  startDate: string; // ISO Date
  trialEndDate: string; // ISO Date
  nextBillingDate: string; // ISO Date
  paymentMethodLast4?: string;
}

export interface StoreSettings {
  name: string;
  businessName?: string;
  nit: string;
  address: string;
  phone: string;
  resolution: string;
  resolutionDate?: string;
  prefix: string;
  rangeStart?: number;
  rangeEnd?: number;
  resolutionValidity?: string;
  currentNumber: number;
  vatResponsibility: string;
  isRetainer?: boolean;
  softwareName?: string;
  softwareManufacturer?: string;
  customFooter?: string; // NUEVO: Notas al pie personalizables
  logoUrl?: string; // NUEVO: Logo de la tienda en Cloud Storage
  subscription?: Subscription; 
  // Integración DIAN / Proveedor Tecnológico
  techProvider?: 'KIOSKO_COMERCIAL' | 'DIAN_DIRECTO' | 'FACTURADOR_PRO' | 'ALEGRA' | 'SIIGO';
  dianApiKey?: string;
  dianSoftwareId?: string;
  dianPin?: string;
  dianTestSetId?: string;
  certificateName?: string;
  certificateBase64?: string;
}

export interface Operator {
  id: string; // Cédula o UID de Firebase
  name: string;
  role: 'ADMIN' | 'CAJERO';
  email?: string;
}

export interface Product {
  id: string;
  name: string;
  cost: number;        // Costo antes de IVA
  price: number;       // Precio de venta con IVA e IC
  taxRate: number;     // IVA (0, 5, 19)
  consumptionTax?: number; // Impuesto al Consumo (8%, etc. para licores)
  category: string;
  stock: number;
  icon?: string;
  ean?: string;
  lastCountDate?: string;
  isQuickAccess?: boolean; 
}

export interface KardexEntry {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: 'ENTRADA_COMPRA' | 'SALIDA_VENTA' | 'AJUSTE_MANUAL' | 'DEVOLUCION';
  quantity: number;    
  balance: number;     
  reference?: string;  
  note?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  nit: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Supplier {
  nit: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  visitDays?: string;
  deliveryDays?: string;
}

export interface SupplierAccount {
  id: string; // NIT del proveedor
  supplierName: string;
  currentBalance: number;
  lastUpdated: string;
  history: CreditTransaction[];
}

export interface Invoice {
  id: string;
  date: string;
  customerName: string;
  customerNit: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  sellerName?: string; // NUEVO CAMPO: Vendedor / Asesor
  items: CartItem[];
  subtotal: number;
  tax: number;
  consumptionTaxTotal?: number;
  discount?: number;
  shippingCost?: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: { method: PaymentMethod; amount: number }[];
  dianStatus: 'DRAFT' | 'SENDING' | 'APPROVED' | 'REJECTED';
  cufe?: string;
  operatorName?: string;
  status?: 'ACTIVE' | 'ANNULLED';
}

export interface Quote {
  id: string;
  date: string;
  customerName: string;
  customerNit: string;
  customerPhone: string;
  customerEmail: string; 
  customerAddress?: string;
  items: CartItem[];
  total: number;
}

export interface Order {
  id: string;
  batchId?: string; // Identificador del documento de compra completo
  date: string;
  productId?: string; 
  productName: string;
  quantity: number;
  supplier: string;
  supplierNit: string;
  supplierContactName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  ean: string;
  cost: number;
  taxRate: number;
  consumptionTax?: number;
  status: 'PENDIENTE' | 'RECIBIDO' | 'DEVUELTO' | 'PAGADO' | 'ANULADO';
  returnReason?: string;
  paymentMethod?: PaymentMethod;
  discount?: number; // Valor del descuento aplicado en pesos
  reference?: string; // Nº de factura / Referencia (Opcional)
}

export interface CreditTransaction {
  id: string;
  date: string;
  type: 'CHARGE' | 'PAYMENT';
  amount: number;
  description?: string;
  relatedDebtId?: string;
}

export interface CreditDebt {
    id: string;
    date: string;
    description: string;
    originalAmount: number;
    currentBalance: number;
    isPaid: boolean;
}

export interface CreditAccount {
  id: string;
  customerName: string;
  phone: string;
  currentDebt: number;
  lastUpdated: string;
  debts?: CreditDebt[];
  history?: CreditTransaction[];
}

export type ExpenseCategory = string;

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  reference?: string;
}