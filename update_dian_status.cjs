const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

// 1. Add props
code = code.replace(
  `  onIncrementConsecutive?: () => void;`,
  `  onIncrementConsecutive?: () => void;
  onUpdateMultipleInvoices?: (invoices: Invoice[]) => void;
  onUpdateSettings?: (settings: StoreSettings) => void;`
);
code = code.replace(
  `export const DianStatus: React.FC<DianStatusProps> = ({ invoices, onUpdateInvoice, storeSettings, userId, onIncrementConsecutive }) => {`,
  `export const DianStatus: React.FC<DianStatusProps> = ({ invoices, onUpdateInvoice, storeSettings, userId, onIncrementConsecutive, onUpdateMultipleInvoices, onUpdateSettings }) => {`
);

fs.writeFileSync('components/DianStatus.tsx', code);
