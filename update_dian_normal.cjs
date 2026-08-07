const fs = require('fs');

let fileStr = fs.readFileSync('backend/dianBackendHandlers.ts', 'utf8');

const targetStr = `    if (settings.certificateExpiry && new Date(settings.certificateExpiry) < new Date()) {`;
const insertStr = `    const parsed = validation;
    // Normalizar método de pago a código DIAN
    parsed.data.pago.metodo = parsed.data.pago.metodo.startsWith("2") ? "2" : "1";
    invoice.pago.metodo = parsed.data.pago.metodo;

    // Guarda: las notas (92/93) quedan bloqueadas hasta implementar su backend
    const NOTAS_CREDITO_HABILITADAS = false;
    if (parsed.data.tipo_documento !== "91" && !NOTAS_CREDITO_HABILITADAS) {
      return res.status(403).json({ success: false, message: "Las notas crédito/débito estarán habilitadas en una próxima versión." });
    }

`;

const index = fileStr.indexOf(targetStr);
if (index !== -1) {
  fileStr = fileStr.substring(0, index) + insertStr + fileStr.substring(index);
  fs.writeFileSync('backend/dianBackendHandlers.ts', fileStr);
  console.log('Normalization inserted successfully.');
} else {
  console.error('Could not find target string for normalization insertion.');
}
