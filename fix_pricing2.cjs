const fs = require('fs');
let code = fs.readFileSync('components/PricingPlans.tsx', 'utf8');

// fix imports
if (!code.includes('import { doc, setDoc }')) {
  code = `import { doc, setDoc } from 'firebase/firestore';\nimport { db } from '../firebase';\n` + code;
}

// fix order
const oldBlock = `    const uniqueReference = \`sub_\${user.uid}_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;
    
    // TAREA 1.1: Guardar paymentIntent
    try {
      await setDoc(doc(db, 'paymentIntents', uniqueReference), {
        uid: user.uid,
        plan: billingCycle === 'MONTHLY' ? 'PRO_MONTHLY' : 'PRO_YEARLY',
        amountInCents,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      });
    } catch (e) {
      console.warn("No se pudo guardar paymentIntent:", e);
    }
    const planAmountCOP = billingCycle === 'MONTHLY' ? 49900 : 499000;
    const amountInCents = planAmountCOP * 100;
    const currency = 'COP';`;

const newBlock = `    const planAmountCOP = billingCycle === 'MONTHLY' ? 49900 : 499000;
    const amountInCents = planAmountCOP * 100;
    const currency = 'COP';
    const uniqueReference = \`sub_\${user.uid}_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;

    // TAREA 1.1: Guardar paymentIntent
    try {
      await setDoc(doc(db, 'paymentIntents', uniqueReference), {
        uid: user.uid,
        plan: billingCycle === 'MONTHLY' ? 'PRO_MONTHLY' : 'PRO_YEARLY',
        amountInCents,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      });
    } catch (e) {
      console.warn("No se pudo guardar paymentIntent:", e);
    }`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('components/PricingPlans.tsx', code);
