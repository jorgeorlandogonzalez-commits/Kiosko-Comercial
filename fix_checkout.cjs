const fs = require('fs');
let code = fs.readFileSync('components/SaaSCheckout.tsx', 'utf8');

if (!code.includes('import { doc, setDoc }')) {
    code = `import { doc, setDoc } from 'firebase/firestore';\nimport { db } from '../firebase';\n` + code;
}

const target = `    const uniqueReference = \`sub_\${userId}_\${Date.now()}\`;
    const planAmountCOP = 39900;
    const amountInCents = planAmountCOP * 100;`;
const replacement = `    const uniqueReference = \`sub_\${userId}_\${Date.now()}\`;
    const planAmountCOP = 39900;
    const amountInCents = planAmountCOP * 100;

    // TAREA 1.1: Guardar paymentIntent
    try {
      await setDoc(doc(db, 'paymentIntents', uniqueReference), {
        uid: userId,
        plan: 'PRO',
        amountInCents,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      });
    } catch (e) {
      console.warn("No se pudo guardar paymentIntent:", e);
    }`;

code = code.replace(target, replacement);
fs.writeFileSync('components/SaaSCheckout.tsx', code);
