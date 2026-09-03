const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'import { verifyPaymentHandler, getWompiPublicKey, getWompiSignature } from "./backend/paymentsHandler.js";',
  'import { verifyPaymentHandler, getWompiPublicKey, getWompiSignature, wompiWebhookHandler } from "./backend/paymentsHandler.js";'
);

const webhookRoute = `
const webhookLimit = rateLimit({ windowMs: 1 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.post("/api/wompi/webhook", express.json(), webhookLimit, wompiWebhookHandler);
`;

code = code.replace(
  'app.get("/api/config/wompi", getWompiPublicKey);',
  'app.get("/api/config/wompi", getWompiPublicKey);\n' + webhookRoute
);

fs.writeFileSync('server.ts', code);
