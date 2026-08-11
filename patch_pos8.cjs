const fs = require('fs');
let content = fs.readFileSync('components/POS.tsx', 'utf8');

// For receipt
content = content.replace(
  /\$\{lastInvoice\.consumptionTaxTotal \? \`<div class="total-row"><span>Impoconsumo:<\/span> <span>\$\$\{formatMoney\(lastInvoice\.consumptionTaxTotal\)\}<\/span><\/div>\` : ''\}/g,
  `\${lastInvoice.consumptionTaxTotal ? \`<div class="total-row"><span>Impoconsumo:</span> <span>$\${formatMoney(lastInvoice.consumptionTaxTotal)}</span></div>\` : ''}
            \${lastInvoice.withholdings && lastInvoice.withholdings.length > 0 ? lastInvoice.withholdings.map(w => \`<div class="total-row" style="color:red;"><span>\${w.name}:</span> <span>-$\${formatMoney(w.amount)}</span></div>\`).join('') : ''}`
);

// For whatsapp
content = content.replace(
  /if \(lastInvoice\.consumptionTaxTotal && lastInvoice\.consumptionTaxTotal > 0\) \{\n      msg \+= \`Imp\. Consumo: \$\$\{formatMoney\(lastInvoice\.consumptionTaxTotal\)\}\\n\`;\n    \}/g,
  `if (lastInvoice.consumptionTaxTotal && lastInvoice.consumptionTaxTotal > 0) {
      msg += \`Imp. Consumo: $\${formatMoney(lastInvoice.consumptionTaxTotal)}\\n\`;
    }
    if (lastInvoice.withholdings && lastInvoice.withholdings.length > 0) {
      lastInvoice.withholdings.forEach(w => {
        msg += \`\${w.name}: -$\${formatMoney(w.amount)}\\n\`;
      });
    }`
);

fs.writeFileSync('components/POS.tsx', content);
