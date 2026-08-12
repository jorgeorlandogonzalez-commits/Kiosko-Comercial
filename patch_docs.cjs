const fs = require('fs');

// ONBOARDING.md
let onboarding = fs.readFileSync('ONBOARDING.md', 'utf8');
const targetOnboarding = 'Tu archivo .p12 se almacena **cifrado y protegido** en servidores seguros de Google Cloud (infraestructura certificada ISO 27001).';
const patchOnboarding = 'Tu archivo .p12 se almacena **cifrado y protegido** en servidores seguros de Google Cloud (infraestructura con certificaciones SOC 2, ISO 27001 y cumplimiento GDPR).';
onboarding = onboarding.replace(targetOnboarding, patchOnboarding);
fs.writeFileSync('ONBOARDING.md', onboarding);
console.log('ONBOARDING.md patched');

// TERMINOS_Y_CONDICIONES.md
let terms = fs.readFileSync('TERMINOS_Y_CONDICIONES.md', 'utf8');

// Patch A
terms = terms.replace('# TÉRMINOS Y CONDICIONES DE USO - KIOSKO COMERCIAL BETA', '# TÉRMINOS Y CONDICIONES DE USO - KIOSKO COMERCIAL');
terms = terms.replace('**Última actualización:** Mayo 2026', '**Última actualización:** Agosto 2026');

// Patch B
const target63 = '6.3. El Comerciante es responsable de obtener el consentimiento de sus clientes finales para el tratamiento de datos personales en facturación electrónica.';
const patch64 = '\n6.4. El Comerciante y sus clientes pueden ejercer los derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) enviando solicitud a soporte@kioskocomercial.com con asunto "Derechos ARCO". Kiosko Comercial atenderá la solicitud en los términos del Decreto 1377 de 2013.';
if (terms.includes(target63)) {
    terms = terms.replace(target63, target63 + patch64);
} else {
    console.error("Could not find target63 in terms");
}

// Patch C
const target81 = '8.1. La versión Beta se ofrece con fines de validación y mejora continua. Pueden presentarse actualizaciones frecuentes y cambios funcionales.';
const target82 = '8.2. Precio: $49.900 COP/mes por comercio. Incluye acceso completo, soporte prioritario y actualizaciones.';
const patch81 = '8.1. El Servicio se ofrece bajo un modelo de suscripción con mejora continua. Pueden presentarse actualizaciones frecuentes y cambios funcionales.';
const patch82 = '8.2. Precio del plan EMPRENDE: $49.900 COP/mes o $499.000 COP/año (equivalente a 2 meses gratis) por comercio. Incluye acceso completo, soporte prioritario y actualizaciones. Los planes CRECE y EMPRESA estarán sujetos a las tarifas publicadas dentro del sistema.';

if (terms.includes(target81)) {
    terms = terms.replace(target81, patch81);
} else {
    console.error("Could not find target81 in terms");
}

if (terms.includes(target82)) {
    terms = terms.replace(target82, patch82);
} else {
    console.error("Could not find target82 in terms");
}

// Patch D
const target92 = '9.2. El Comerciante puede terminar el servicio en cualquier momento. Los datos podrán exportarse a formato CSV durante los 30 días posteriores a la cancelación.';
const patch92 = '9.2. El Comerciante puede terminar el servicio en cualquier momento. Los datos podrán exportarse a formato CSV durante los 30 días posteriores a la cancelación, tras lo cual se eliminarán definitivamente, salvo las facturas y documentos contables que la ley ordena conservar durante los plazos establecidos por el Código de Comercio y el Estatuto Tributario.';

if (terms.includes(target92)) {
    terms = terms.replace(target92, patch92);
} else {
    console.error("Could not find target92 in terms");
}

fs.writeFileSync('TERMINOS_Y_CONDICIONES.md', terms);
console.log('TERMINOS_Y_CONDICIONES.md patched');

