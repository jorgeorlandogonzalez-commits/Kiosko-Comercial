const fs = require('fs');
let content = fs.readFileSync('components/POS.tsx', 'utf8');

// State
content = content.replace(
  "const [discountValue, setDiscountValue] = useState<number>(0);",
  "const [discountValue, setDiscountValue] = useState<number>(0);\n  const [availableWithholdings, setAvailableWithholdings] = useState<Withholding[]>([]);\n  const [appliedWithholdings, setAppliedWithholdings] = useState<AppliedWithholding[]>([]);\n"
);

// Load withholdings
content = content.replace(
  "setCustomers(dbCustomers);",
  "setCustomers(dbCustomers);\n      setAvailableWithholdings(getWithholdings().filter(w => w.isActive));"
);

fs.writeFileSync('components/POS.tsx', content);
