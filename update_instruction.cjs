const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `// ¡ATENCIÓN! SOLO genera la estructura JSON cuando el usuario te pida EXPLÍCITAMENTE generar, crear o emitir una nueva factura de venta. Para cualquier otra pregunta (como consultar ventas, estados, preguntas o saludos), responde SOLO con texto normal, NUNCA incluyas JSON.`;
const replacementStr = `// ¡ATENCIÓN (REGLA CRÍTICA)! 
// - SI el usuario pide información, consultar ventas, hacer preguntas, o charlar -> RESPONDE EXCLUSIVAMENTE CON TEXTO PLANO, SIN JSON.
// - SOLO SI el usuario pide EXPLÍCITAMENTE "facturar", "vender", "cobrar" e indica productos a vender -> ENTONCES SÍ responde con un JSON de factura.`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', content);
