const fs = require('fs');
let content = fs.readFileSync('components/POS.tsx', 'utf8');

content = content.replace(/setShippingCost\(0\);/g, 'setShippingCost(0);\n    setAppliedWithholdings([]);');

fs.writeFileSync('components/POS.tsx', content);
