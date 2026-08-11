const fs = require('fs');
let content = fs.readFileSync('components/POS.tsx', 'utf8');

const replacement = `
    const totalPagarBruto = subtotalBase + totalTaxIVA + totalTaxIC + shippingCost;
    
    let withholdingsTotal = 0;
    const appliedW: AppliedWithholding[] = appliedWithholdings.map(w => {
      // Calculate amount based on baseImponible (subtotalBase)
      const amount = (subtotalBase * (w.percentage / 100));
      withholdingsTotal += amount;
      return { ...w, amount };
    });

    const totalPagar = totalPagarBruto - withholdingsTotal;

    return {
      subtotalBruto: rawSums.grossTotal,
      discountInPesos,
      shippingCost,
      baseImponible: subtotalBase,
      totalTaxIVA,
      totalTaxIC,
      withholdingsTotal,
      appliedWithholdings: appliedW,
      total: Math.max(0, Math.round(totalPagar)),
      articles: rawSums.articles,
      taxBreakdown: Object.values(taxBreakdown)
    };
`;

content = content.replace(
  /const totalPagar = subtotalBase \+ totalTaxIVA \+ totalTaxIC \+ shippingCost;\s*return \{\s*subtotalBruto: rawSums\.grossTotal,\s*discountInPesos,\s*shippingCost,\s*baseImponible: subtotalBase,\s*totalTaxIVA,\s*totalTaxIC,\s*total: Math\.max\(0, Math\.round\(totalPagar\)\),\s*articles: rawSums\.articles,\s*taxBreakdown: Object\.values\(taxBreakdown\)\s*\};/g,
  replacement
);

fs.writeFileSync('components/POS.tsx', content);
