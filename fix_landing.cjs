const fs = require('fs');
let code = fs.readFileSync('components/LandingPage.tsx', 'utf8');

const oldText = "Cumple con todas las normas vigentes. Generación instantánea de facturas electrónicas (.XML y PDF) con tu propio certificado digital.";
const newText = "Cumple con todas las normas vigentes. MODO DUAL: Hazlo gratis con tu propio trabajo en el portal DIAN, o totalmente automático si tienes tu propio certificado digital (.p12).";

code = code.replace(oldText, newText);

fs.writeFileSync('components/LandingPage.tsx', code);
console.log('Fixed LandingPage.tsx');
