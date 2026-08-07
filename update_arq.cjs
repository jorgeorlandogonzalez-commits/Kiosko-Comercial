const fs = require('fs');

let fileStr = fs.readFileSync('ARQUITECTURA.md', 'utf8');

const targetStr = `### 2.5 Asistente de Inteligencia Artificial (Don J - sumercé)
* Asistente conversacional basado en la API de Gemini (Google), que reside de manera segura en el backend (\`server.ts\`).
* **Inyección de Contexto y Features:** El backend inyecta activamente información sobre el negocio y banderas de características habilitadas (features) como \`notasCredito\`, garantizando que la IA adapte su comportamiento y solo ofrezca funcionalidades según el plan del usuario o disponibilidad del sistema.
* Funciones (Function Calling) habilitadas para emitir facturas y guiar al usuario mediante lenguaje natural empático, pensado en usuarios mayores.
* **Seguridad:** Todo el flujo y el uso de \`GEMINI_API_KEY\` ocurre únicamente mediante variables de ambiente en Cloud Run.`;

const newStr = `### 2.5 Asistente de Inteligencia Artificial (Don J - sumercé)
* Asistente conversacional basado en la API de Gemini (Google), que reside de manera segura en el backend (\`server.ts\`), con System Instruction V3.2 (Enterprise-Ready).
* **Inyección de Contexto, Roles y Features:** El backend inyecta activamente en la sesión de Don J el plan activo (\`userPlan\`), el rol del usuario (\`userRole\`, leído de Firestore y nunca del cliente), el catálogo de planes (\`planCatalog\`) y las banderas de características (\`features.notasCredito\`), garantizando que la IA module su tono, respete la confidencialidad por rol y solo ofrezca funcionalidades habilitadas para el plan del usuario.
* **Validación de Payload V3.1:** El endpoint \`/api/dian/transmit\` valida con \`dianPayloadSchema\` (Zod) los tipos de documento 91/92/93 y métodos de pago Contado/Crédito, con validaciones cruzadas (nota obligatoria para 92/93, fecha de vencimiento obligatoria para crédito) y guarda server-side que bloquea notas hasta habilitar su backend.
* Funciones (Function Calling) habilitadas para emitir facturas y guiar al usuario mediante lenguaje natural empático, pensado para usuarios mayores.
* **Seguridad:** Todo el flujo y el uso de \`GEMINI_API_KEY\` ocurre únicamente mediante variables de ambiente en Cloud Run. El endpoint del asistente requiere token Firebase verificado.`;

const index = fileStr.indexOf("### 2.5 Asistente de Inteligencia Artificial (Don J - sumercé)");
if (index !== -1) {
  const endIndex = fileStr.indexOf("## 3. Decisiones de Diseño (UX / UI)");
  fileStr = fileStr.substring(0, index) + newStr + "\n\n" + fileStr.substring(endIndex);
  fs.writeFileSync('ARQUITECTURA.md', fileStr);
  console.log('Arquitectura updated successfully.');
} else {
  console.error('Could not find target string in ARQUITECTURA.md.');
}
