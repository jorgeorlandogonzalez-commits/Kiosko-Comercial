const fs = require('fs');
let code = fs.readFileSync('backend/paymentsHandler.ts', 'utf8');

const targetStr = `    const transactionId = body?.data?.transaction?.id;
    const reference = body?.data?.transaction?.reference;

    if (!transactionId || !reference) {
      return res.status(200).json({ ignored: 'faltan datos de transaccion' });
    }`;

const replacementStr = `    const tx = body?.data?.transaction || body?.data || body?.transaction || null;
    const transactionId = tx?.id;
    const reference = tx?.reference;

    if (!transactionId || !reference) {
      logger.warn({ keys: Object.keys(body || {}), event_type: body?.event_type }, 'Webhook Wompi con formato no reconocido');
      return res.status(200).json({ ignored: 'faltan datos de transaccion' });
    }`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('backend/paymentsHandler.ts', code);
  console.log("Replacement successful");
} else {
  console.log("Target string not found. Please check format.");
}
