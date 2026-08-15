const fs = require('fs');
let code = fs.readFileSync('backend/dianBackendHandlers.ts', 'utf8');

const target = `      logger.info({ 
        invoiceId: invoice.factura_id || invoice.id, 
        cufe: cufe.substring(0, 16) + '...',
        duration: \`\${duration}ms\`
      }, '🎉 Factura APROBADA por la DIAN');
      
      return res.json({`;

const replacement = `      logger.info({ 
        invoiceId: invoice.factura_id || invoice.id, 
        cufe: cufe.substring(0, 16) + '...',
        duration: \`\${duration}ms\`
      }, '🎉 Factura APROBADA por la DIAN');

      try {
        await admin.firestore().doc("platform/stats").set(
          { facturasEmitidas: admin.firestore.FieldValue.increment(1), ultimaActualizacion: new Date().toISOString() },
          { merge: true }
        );
      } catch (e) {
        logger.warn({ err: e }, "No se pudo incrementar contador público de facturas.");
      }
      
      return res.json({`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('backend/dianBackendHandlers.ts', code);
  console.log('Patched dianBackendHandlers.ts');
} else {
  console.log('Target not found in dianBackendHandlers.ts');
}
