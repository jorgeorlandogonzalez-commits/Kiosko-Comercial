const fs = require('fs');
let content = fs.readFileSync('components/POS.tsx', 'utf8');

const invoiceRepl = `
    const invoice: Invoice = {
      id: invoiceId,
      date: invoiceDate,
      customerName, customerNit, customerPhone, customerEmail, customerAddress, customerBranch,
      sellerName: sellerName.trim() !== '' ? sellerName : undefined,
      items: [...cart],
      subtotal: cartTotals.subtotalBruto,
      tax: cartTotals.totalTaxIVA,
      consumptionTaxTotal: cartTotals.totalTaxIC,
      discount: cartTotals.discountInPesos,
      shippingCost: cartTotals.shippingCost,
      withholdings: cartTotals.appliedWithholdings,
      withholdingsTotal: cartTotals.withholdingsTotal,
      total: cartTotals.total,
      paymentMethod: method,
      paymentDetails: mixedData,
      dianStatus: 'DRAFT',
    };
`;

content = content.replace(/const invoice: Invoice = \{[\s\S]*?dianStatus: 'DRAFT',\s*\};/m, invoiceRepl);

fs.writeFileSync('components/POS.tsx', content);
