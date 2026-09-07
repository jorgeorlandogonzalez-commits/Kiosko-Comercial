const fs = require('fs');
let code = fs.readFileSync('MainApp.tsx', 'utf8');

const target1 = `  const handleUpdateInvoice = (updatedInvoice: Invoice) => {`;
const replacement1 = `  const handleUpdateMultipleInvoices = (updatedInvoices: Invoice[]) => {
      let currentInvoices = [...invoices];
      for (const updatedInvoice of updatedInvoices) {
         currentInvoices = currentInvoices.map(i => i.id === updatedInvoice.id ? updatedInvoice : i);
      }
      setInvoices(currentInvoices);
      dbService.saveInvoices(currentInvoices);
  };

  const handleUpdateInvoice = (updatedInvoice: Invoice) => {`;
code = code.replace(target1, replacement1);

const target2 = `              {activeTab === 'invoices' && <DianStatus invoices={invoices} onUpdateInvoice={handleUpdateInvoice} storeSettings={storeSettings} userId={currentUser?.id} onIncrementConsecutive={() => {
                const next = Number(storeSettings.currentNumber || 1) + 1;
                handleSaveSettings({ ...storeSettings, currentNumber: next });
              }} />}`;
const replacement2 = `              {activeTab === 'invoices' && <DianStatus invoices={invoices} onUpdateInvoice={handleUpdateInvoice} onUpdateMultipleInvoices={handleUpdateMultipleInvoices} onUpdateSettings={handleSaveSettings} storeSettings={storeSettings} userId={currentUser?.id} onIncrementConsecutive={() => {
                const next = Number(storeSettings.currentNumber || 1) + 1;
                handleSaveSettings({ ...storeSettings, currentNumber: next });
              }} />}`;
code = code.replace(target2, replacement2);

fs.writeFileSync('MainApp.tsx', code);
