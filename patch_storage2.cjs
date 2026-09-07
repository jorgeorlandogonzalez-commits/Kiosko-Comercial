const fs = require('fs');
let code = fs.readFileSync('services/storageService.ts', 'utf8');

code = code.replace(
  `  saveInvoices: (invoices: Invoice[]) => {
      saveToStorage(KEYS.INVOICES, invoices);
      notifySync();
  },`,
  `  saveInvoices: (invoices: Invoice[]) => {
      saveToStorage(KEYS.INVOICES, invoices);
      if (currentUserId) {
          invoices.forEach(inv => saveToFirestore(currentUserId, 'invoices', inv));
      }
      return invoices;
  },`
);

fs.writeFileSync('services/storageService.ts', code);
