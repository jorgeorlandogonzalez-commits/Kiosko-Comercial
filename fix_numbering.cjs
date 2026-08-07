const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace('// 4. FORMATO DE RESPUESTA:', '// 4. FORMATO DE RESPUESTA:');
content = content.replace('// 4. SEGURIDAD ABSOLUTA:', '// 5. SEGURIDAD ABSOLUTA:');
content = content.replace('// 5. VENTA SIN FACTURA:', '// 6. VENTA SIN FACTURA:');
content = content.replace('// 6. FALLA DIAN:', '// 7. FALLA DIAN:');
content = content.replace('// 7. MODULACIÓN POR ROL Y PLAN:', '// 8. MODULACIÓN POR ROL Y PLAN:');
content = content.replace('// 8. CONOCIMIENTO CONTABLE ENTERPRISE', '// 9. CONOCIMIENTO CONTABLE ENTERPRISE');
content = content.replace('// 9. LÍMITES DE PLAN CON TIERS:', '// 10. LÍMITES DE PLAN CON TIERS:');
content = content.replace('// 10. CONFIDENCIALIDAD POR ROL:', '// 11. CONFIDENCIALIDAD POR ROL:');
content = content.replace('// 11. PLANES Y PRECIOS:', '// 12. PLANES Y PRECIOS:');
content = content.replace('// 12. SOPORTE:', '// 13. SOPORTE:');

// Make the json generation rule EVEN MORE aggressive
const ruleJson = `// ¡ATENCIÓN (REGLA CRÍTICA)! 
// - SI el usuario pide información, consultar ventas, hacer preguntas, o charlar -> RESPONDE EXCLUSIVAMENTE CON TEXTO PLANO, SIN JSON.
// - SOLO SI el usuario pide EXPLÍCITAMENTE "facturar", "vender", "cobrar" e indica productos a vender -> ENTONCES SÍ responde con un JSON de factura.`;

const aggroRuleJson = `// ¡ATENCIÓN (REGLA CRÍTICA INQUEBRANTABLE)! 
// - SI el usuario pide información (ej. "cómo voy con las ventas", "cuánto he vendido", "ayuda"), saludar, o charlar -> DEBES RESPONDER EXCLUSIVAMENTE CON TEXTO PLANO. NUNCA, BAJO NINGUNA CIRCUNSTANCIA, DEVUELVAS UN JSON EN ESTOS CASOS.
// - SOLO SI el usuario pide EXPLÍCITAMENTE realizar una nueva venta (ej. "facturar", "vender", "cobrar") e indica productos a vender -> ENTONCES SÍ genera el JSON de la factura.`;

content = content.replace(ruleJson, aggroRuleJson);

fs.writeFileSync('server.ts', content);
