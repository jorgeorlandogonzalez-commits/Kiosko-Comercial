const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `// REGLAS TÉCNICAS DIAN (JSON ESTRICTO):`;
const insertStr = `// 4. FORMATO DE RESPUESTA: RESPONDE SIEMPRE EN TEXTO PLANO CONVERSACIONAL Y DE FORMA AMIGABLE. 
// ¡ATENCIÓN! SOLO genera la estructura JSON cuando el usuario te pida EXPLÍCITAMENTE generar, crear o emitir una nueva factura de venta. Para cualquier otra pregunta (como consultar ventas, estados, preguntas o saludos), responde SOLO con texto normal, NUNCA incluyas JSON.
// REGLAS TÉCNICAS DIAN (JSON ESTRICTO):`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, insertStr);
  fs.writeFileSync('server.ts', content);
  console.log("Prompt fixed.");
} else {
  console.log("target string not found.");
}
