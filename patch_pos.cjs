const fs = require('fs');
let content = fs.readFileSync('components/POS.tsx', 'utf8');

// Imports
content = content.replace("Customer } from '../types';", "Customer, Withholding, AppliedWithholding } from '../types';");

const importStorageRegex = /import \{([^}]+)\} from '\.\.\/services\/storageService';/;
if (content.match(importStorageRegex)) {
    content = content.replace(importStorageRegex, (match, p1) => {
        if (!p1.includes('getWithholdings')) {
            return `import {${p1}, getWithholdings} from '../services/storageService';`;
        }
        return match;
    });
} else {
    // maybe it doesn't import from storageService directly here?
    content = content.replace("import html2canvas from 'html2canvas';", "import html2canvas from 'html2canvas';\nimport { getWithholdings } from '../services/storageService';");
}

fs.writeFileSync('components/POS.tsx', content);
