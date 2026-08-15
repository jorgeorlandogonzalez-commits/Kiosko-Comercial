const fs = require('fs');
let code = fs.readFileSync('backend/dianBackendHandlers.ts', 'utf8');

if (!code.includes('import admin from "firebase-admin";')) {
  code = code.replace(
    'import { getAuth } from "firebase-admin/auth";',
    'import admin from "firebase-admin";\nimport { getAuth } from "firebase-admin/auth";\nimport { getFirestore } from "firebase-admin/firestore";'
  );
}

const targetFirestore = `await admin.firestore().doc("platform/stats").set(
          { facturasEmitidas: admin.firestore.FieldValue.increment(1), ultimaActualizacion: new Date().toISOString() },`;
const replacementFirestore = `await getFirestore(admin.app(), "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15").doc("platform/stats").set(
          { facturasEmitidas: admin.firestore.FieldValue.increment(1), ultimaActualizacion: new Date().toISOString() },`;

if (code.includes('await admin.firestore().doc("platform/stats")')) {
  code = code.replace(targetFirestore, replacementFirestore);
}

fs.writeFileSync('backend/dianBackendHandlers.ts', code);
console.log("Fixed admin import in dianBackendHandlers.ts");
