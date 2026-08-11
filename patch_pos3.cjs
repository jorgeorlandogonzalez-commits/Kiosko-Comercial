const fs = require('fs');
let content = fs.readFileSync('components/POS.tsx', 'utf8');

const loadW = `
  useEffect(() => {
    setAvailableWithholdings(getWithholdings().filter(w => w.isActive));
  }, []);
`;

content = content.replace("useEffect(() => {\n    if (pendingEditInvoiceId", loadW + "  useEffect(() => {\n    if (pendingEditInvoiceId");

fs.writeFileSync('components/POS.tsx', content);
