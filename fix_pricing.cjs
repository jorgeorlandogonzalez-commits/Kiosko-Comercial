const fs = require('fs');
let code = fs.readFileSync('components/PricingPlans.tsx', 'utf8');

if (!code.includes('import { doc, setDoc }')) {
    code = code.replace(/import \{.*?\} from 'firebase\/auth';/, "import { auth } from '../firebase';\nimport { doc, setDoc } from 'firebase/firestore';\nimport { db } from '../firebase';");
}

const target = `    const uniqueReference = \`sub_\${user.uid}_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;`;
const replacement = `    const uniqueReference = \`sub_\${user.uid}_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;
    
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

code = code.replace(target, replacement);
fs.writeFileSync('components/PricingPlans.tsx', code);
