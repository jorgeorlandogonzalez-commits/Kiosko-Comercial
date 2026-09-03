const fs = require('fs');
let code = fs.readFileSync('backend/paymentsHandler.ts', 'utf8');

code = code.replace(/\\\`Bearer \\\$\\{WOMPI_PRIVATE_KEY\\}\\\`/g, "\`Bearer \${WOMPI_PRIVATE_KEY}\`");

fs.writeFileSync('backend/paymentsHandler.ts', code);
