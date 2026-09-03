const fs = require('fs');
let code = fs.readFileSync('backend/paymentsHandler.ts', 'utf8');

// find where wompiWebhookHandler starts
const idx = code.indexOf('export const wompiWebhookHandler');
if (idx !== -1) {
  code = code.substring(0, idx); // remove the broken one
}

const correctHandler = `
export const wompiWebhookHandler = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (process.env.NODE_ENV === 'development') {
      logger.info({ body }, 'Webhook Wompi payload recibido');
    }

    const transactionId = body?.data?.transaction?.id;
    const reference = body?.data?.transaction?.reference;

    if (!transactionId || !reference) {
      return res.status(200).json({ ignored: 'faltan datos de transaccion' });
    }

    if (!WOMPI_PRIVATE_KEY) {
      logger.error('Error: WOMPI_PRIVATE_KEY no configurado en entorno.');
      return res.status(500).json({ error: 'Configuracion de pagos incompleta' });
    }

    const wompiUrl = \`https://production.wompi.co/v1/transactions/\${transactionId}\`;
    const response = await global.fetch(wompiUrl, {
      method: 'GET',
      headers: { 'Authorization': \`Bearer \${WOMPI_PRIVATE_KEY}\` }
    });

    if (!response.ok) {
      logger.error({ transactionId }, 'No se pudo obtener la transaccion de Wompi en webhook');
      return res.status(200).json({ ignored: 'transaccion no encontrada en API' });
    }

    const data = await response.json();
    const transaction = data.data;

    if (transaction.status !== 'APPROVED') {
      logger.info({ transactionId, status: transaction.status }, 'Webhook Wompi ignorado por no estar aprobado');
      return res.status(200).json({ ignored: true });
    }

    const db = getAdminDb();
    const intentRef = db.collection('paymentIntents').doc(reference);
    let intentSnap;
    try {
      intentSnap = await intentRef.get();
    } catch (e: any) {
      logger.warn({ reference, err: e.message }, 'No se pudo leer paymentIntents (sandbox)');
      return res.status(200).json({ ignored: 'sandbox_db_error' });
    }

    if (!intentSnap.exists) {
      logger.warn({ reference }, 'Intent no encontrado en Firestore (webhook)');
      return res.status(200).json({ ignored: 'intent no encontrado' });
    }

    const intentData = intentSnap.data();
    const userId = intentData?.uid;

    if (!userId) {
      logger.warn({ reference }, 'Intent sin userId (webhook)');
      return res.status(200).json({ ignored: 'intent sin userId' });
    }

    const subRef = db.collection('subscriptions').doc(userId);
    const existing = await subRef.get();
    const yaAplicada = existing.exists && existing.data()?.wompiTxId === transactionId;

    if (yaAplicada) {
      logger.info({ userId, transactionId }, 'Transacción ya aplicada; respuesta idempotente en webhook');
      return res.status(200).json({ already_applied: true });
    }

    const amountCents = Number(transaction.amount_in_cents || 0);
    const isAnnual = amountCents >= 49900000;
    const now = new Date();
    const next = new Date(now);
    if (isAnnual) {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }

    await db.collection('subscriptions').doc(userId).set({
      status: 'active',
      plan: 'PRO',
      transactionId: transactionId,
      wompiTxId: transactionId,
      paidAt: now.toISOString(),
      nextBillingAt: next.toISOString(),
      trialEndsAt: next.toISOString(),
      amount: amountCents / 100,
      currency: 'COP',
      updatedAt: now.toISOString()
    }, { merge: true });

    await intentRef.set({ status: 'ACTIVATED', updatedAt: now.toISOString() }, { merge: true });

    logger.info({ userId, transactionId, source: 'webhook' }, '✅ Suscripción activada por webhook');
    return res.status(200).json({ success: true });

  } catch (error: any) {
    logger.error({ message: 'Error en webhook wompi', error: error.message });
    return res.status(500).json({ error: 'internal_error' });
  }
};
`;

code = code + correctHandler;
fs.writeFileSync('backend/paymentsHandler.ts', code);
