const fs = require('fs');
let code = fs.readFileSync('services/storageService.ts', 'utf8');

code = code.replace(
  `  saveInvoice: (invoice: Invoice) => {`,
  `  saveInvoices: (invoices: Invoice[]) => {
      saveToStorage(KEYS.INVOICES, invoices);
      notifySync();
  },
  saveInvoice: (invoice: Invoice) => {`
);

fs.writeFileSync('services/storageService.ts', code);
