const fs = require('fs');

let landingCode = fs.readFileSync('components/LandingPage.tsx', 'utf8');
landingCode = landingCode.replace(/Facturación DIAN ilimitada/g, 'Sistema DIAN Dual (Modo Puente o Directo)');
fs.writeFileSync('components/LandingPage.tsx', landingCode);
console.log("REPLACED in LandingPage");

let pricingCode = fs.readFileSync('components/PricingPlans.tsx', 'utf8');
pricingCode = pricingCode.replace(/Facturación DIAN Ilimitada/g, 'Sistema DIAN Dual (Modo Puente o Directo)');
fs.writeFileSync('components/PricingPlans.tsx', pricingCode);
console.log("REPLACED in PricingPlans");

let modalCode = fs.readFileSync('components/PricingModal.tsx.tsx', 'utf8');
modalCode = modalCode.replace(/Facturación Electrónica DIAN Ilimitada/g, 'Sistema DIAN Dual (Modo Puente o Directo)');
fs.writeFileSync('components/PricingModal.tsx.tsx', modalCode);
console.log("REPLACED in PricingModal");

