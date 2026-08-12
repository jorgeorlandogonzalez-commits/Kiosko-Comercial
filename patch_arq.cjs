const fs = require('fs');
let arqFile = fs.readFileSync('ARQUITECTURA.md', 'utf8');

// Patch A
const targetA = '* El manejo del certificado digital (P12) y su contraseña (`CERTIFICATE_PIN`) ocurre estrictamente del lado del servidor.\n';
const patchA = `
#### 2.3.1 Seguridad del Certificado Digital
- **Almacenamiento:** El archivo .p12 se almacena en Firebase Storage bajo el path \`users/{uid}/certificates/\` con reglas de seguridad estrictas que impiden lectura pública. El PIN se almacena en Google Secret Manager con rotación automática.
- **Custodia:** Kiosko Comercial actúa como **custodio técnico** del certificado bajo autorización explícita y revocable del usuario. El certificado NUNCA se expone al frontend ni se transmite fuera de la infraestructura de Google Cloud.
- **Firma:** La firma criptográfica del XML ocurre exclusivamente en el backend (Cloud Run) en memoria efímera, sin persistencia en disco.
- **Auditoría:** Cada uso del certificado se registra en logs estructurados (timestamp, userId, invoiceId) para trazabilidad legal.
- **Eliminación:** Cuando el usuario elimina su certificado desde Configuración, se ejecuta un purge inmediato tanto en Storage como en Secret Manager (no soft-delete).

#### 2.3.2 Pipeline de Reintentos DIAN (Anti-Pérdida)
- **Cola de Reintentos:** Las facturas que fallan en transmisión a DIAN (timeout, error 503, red caída) se encolan automáticamente en Firestore bajo la colección \`users/{userId}/invoices_queue\` con estado \`PENDING_DIAN\`.
- **Estrategia de Reintentos:** Backend job periódico (cada 5 minutos) procesa la cola con reintentos exponenciales (1min, 5min, 15min, 1h, 4h).
- **Idempotencia:** Cada reintento envía el mismo CUFE candidato para evitar duplicados ante la DIAN.
- **Dead Letter Queue:** Después de 5 intentos fallidos, la factura se marca como \`FAILED\` y se notifica al usuario vía email + WhatsApp.
- **Garantía:** At-least-once delivery. La factura se marca como \`APPROVED\` solo al recibir ACK explícito de la DIAN o del Proveedor Tecnológico.
`;

if (arqFile.includes(targetA)) {
    arqFile = arqFile.replace(targetA, targetA + patchA);
} else {
    // try removing the newline
    const targetANoNewline = '* El manejo del certificado digital (P12) y su contraseña (`CERTIFICATE_PIN`) ocurre estrictamente del lado del servidor.';
    if (arqFile.includes(targetANoNewline)) {
        arqFile = arqFile.replace(targetANoNewline, targetANoNewline + '\n' + patchA);
    } else {
        console.error("Patch A target not found");
    }
}

// Patch B
const targetB = '* Asistente conversacional basado en la API de Gemini (Google), que reside de manera segura en el backend (`server.ts`), con System Instruction V3.3 (Enterprise-Ready con discriminador pregunta/venta).';
const patchB = '* Asistente conversacional basado en la API de Gemini (Google), que reside de manera segura en el backend (`server.ts`), con System Instruction V3.5 (Alma + Enterprise-Ready: personalidad original de Don J restaurada + discriminador pregunta/venta + régimen fiscal dinámico).';
if (arqFile.includes(targetB)) {
    arqFile = arqFile.replace(targetB, patchB);
} else {
    console.error("Patch B target not found");
}

// Patch C
const patchC = `
## 📡 Anexo D: API Endpoints Documentados

### Endpoints de Facturación Electrónica
- \`POST /api/dian/transmit\` → Firma XML con certificado .p12 y transmite a DIAN/PT. Requiere Bearer token Firebase.
- \`GET /api/dian/estado/:cufe\` → Consulta estado de factura en DIAN por CUFE.

### Endpoints de Asistente IA
- \`POST /api/gemini/assistant\` → Proxy seguro a Gemini API con contexto inyectado (plan, rol, features). Requiere Bearer token Firebase.

### Endpoints de Pagos
- \`POST /api/payments/webhook\` → Recibe eventos asíncronos de Wompi Bancolombia, valida firma HMAC y actualiza estado de suscripción.
- \`POST /api/payments/create-subscription\` → Crea nueva suscripción y redirige a widget de Wompi.
- \`GET /api/payments/status/:userId\` → Consulta estado de suscripción activa.

### Endpoints de Sistema
- \`GET /api/health\` → Health check del contenedor (uptime, versión, modo).
`;
arqFile += '\n' + patchC;

fs.writeFileSync('ARQUITECTURA.md', arqFile);
console.log('ARQUITECTURA.md patched.');
