import { Request, Response } from 'express';
import pino from 'pino';
import crypto from 'crypto';
import { getApps, getApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const logger = pino({ level: 'info' });

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
      };
    }
  }
}

// Secretos
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY_PROD || process.env.WOMPI_PRIVATE_KEY;
const FIRESTORE_SIGNATURE_SECRET = 'KIOSKO_SECURE_PAYMENTS_2026';
const FIRESTORE_DB_ID = 'ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15';

const getAdminDb = () => {
  const app = getApps().length > 0 ? getApp() : initializeApp();
  return getFirestore(app, FIRESTORE_DB_ID);
};

export const getWompiSignature = (req: Request, res: Response) => {
  const { reference, amountInCents, currency } = req.body;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET || process.env.WOMPI_INTEGRITY_SECRET_PROD || process.env.WOMPI_EVENT_SECRET;

  if (!integritySecret) {
    logger.warn('Wompi integrity secret not found in environment');
    res.json({ success: true, integrity: null });
    return;
  }

  if (!reference || !amountInCents || !currency) {
    res.status(400).json({ success: false, message: 'Missing parameters' });
    return;
  }

  const str = `${reference}${amountInCents}${currency}${integritySecret}`;
  const integrity = crypto.createHash('sha256').update(str).digest('hex');
  res.json({ success: true, integrity });
};

export const getWompiPublicKey = (req: Request, res: Response) => {
  const publicKey = process.env.WOMPI_PUBLIC_KEY_PROD || process.env.VITE_WOMPI_PUBLIC_KEY;
  if (!publicKey) {
    logger.warn('Wompi public key not found in environment');
    res.status(500).json({ success: false, message: 'Public key not configured' });
    return;
  }
  res.json({ success: true, publicKey });
};

export const verifyPaymentHandler = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;
    const userId = req.user?.uid;

    if (!userId || !transactionId) {
      res.status(400).json({ success: false, message: 'Faltan parámetros' });
      return;
    }

    if (!WOMPI_PRIVATE_KEY) {
      logger.error('Error: WOMPI_PRIVATE_KEY no configurado en entorno.');
      res.status(500).json({ success: false, message: 'Configuración de pagos incompleta en el servidor.' });
      return;
    }

    // 1. Consultar a Wompi Producción el estado real de la transacción
    const wompiUrl = `https://production.wompi.co/v1/transactions/${transactionId}`;
    const response = await global.fetch(wompiUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}` }
    });

    if (!response.ok) {
      logger.error({ transactionId, status: response.status }, 'No se pudo obtener la transacción de Wompi');
      res.status(400).json({ success: false, message: 'Transacción no encontrada en Wompi' });
      return;
    }

    const data = await response.json();
    const transaction = data.data;

    // 2. Validar que fue aprobada
    if (transaction.status !== 'APPROVED') {
      logger.warn({ transactionId, status: transaction.status }, 'Transacción Wompi no está aprobada');
      res.status(400).json({ success: false, message: `Transacción no aprobada (Estado: ${transaction.status})` });
      return;
    }

    // 3. EL BACKEND ACTIVA LA SUSCRIPCIÓN (privilegios de admin, sin depender de rules del cliente)
    const amountCents = Number(transaction.amount_in_cents || 0);
    const isAnnual = amountCents >= 49900000; // $499.000 COP = anual
    const now = new Date();
    const next = new Date(now);
    if (isAnnual) {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }

    try {
      const db = getAdminDb();
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
    } catch (e: any) {
      logger.warn({ err: e.message, userId }, 'No se pudo guardar la suscripción en Firestore (sandbox).');
    }

    logger.info({ userId, transactionId, source: 'verify' }, '✅ Suscripción activada por el backend');

    // 4. Firma legacy para compatibilidad
    const signature = crypto
      .createHash('sha256')
      .update(userId + 'ACTIVE' + FIRESTORE_SIGNATURE_SECRET)
      .digest('hex');

    res.json({ success: true, signature });
  } catch (error: any) {
    logger.error({ message: 'Error verificando pago', error: error.message });
    res.status(500).json({ success: false, message: 'Error interno verificando pago' });
  }
};