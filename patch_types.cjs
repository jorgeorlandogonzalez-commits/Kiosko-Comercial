const fs = require('fs');

let content = fs.readFileSync('types.ts', 'utf8');

// Insert Withholding types
const withholdingTypes = `
export interface Withholding {
  id: string;
  name: string;
  type: 'ReteFuente' | 'ReteICA' | 'ReteIVA';
  percentage: number;
  pucSales?: string;
  pucPurchases?: string;
  isActive: boolean;
}

export interface AppliedWithholding {
  withholdingId: string;
  name: string;
  type: string;
  percentage: number;
  amount: number;
}
`;

if (!content.includes('interface Withholding')) {
  content = content.replace("export type ViewportMode", withholdingTypes + "\nexport type ViewportMode");
}

// Update Invoice
if (!content.includes('withholdings?: AppliedWithholding[]')) {
  content = content.replace("  discount?: number;\n  shippingCost?: number;\n  total: number;", "  discount?: number;\n  shippingCost?: number;\n  withholdings?: AppliedWithholding[];\n  withholdingsTotal?: number;\n  total: number;");
}

// Update Order
if (!content.includes('withholdings?: AppliedWithholding[]')) {
  content = content.replace("  discount?: number; // Valor del descuento aplicado en pesos", "  discount?: number; // Valor del descuento aplicado en pesos\n  withholdings?: AppliedWithholding[];\n  withholdingsTotal?: number;");
}

fs.writeFileSync('types.ts', content);
