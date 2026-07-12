import { Request, Response } from 'express';
import admin from 'firebase-admin';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ level: 'info' });

// ============================================================================
// EXTENSIÓN DE TIPOS PARA EXPRESS
// ============================================================================
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

// ============================================================================
// CONFIGURACIÓN DE SUSCRIPCIONES
// ============================================================================
const SUBSCRIPTION_PRICE = 39900; // $39,900 COP/mes
const TRIAL_DAYS = 15;
const SUPERUSER_EMAILS = [
  'info.msdmed@gmail.com',
  'jorge.orlando.gonzalez@gmail.com'
];
const SUPERUSER_TRIAL_DAYS = 999; // Trial perpetuo para superusuarios

// Clave secreta de eventos de Wompi (se configura en Wompi Console)
// En producción, obtener de Google Secret Manager
const WOMPI_EVENT_SECRET = process.env.WOMPI_EVENT_SECRET || '';

// ============================================================================
// TIPOS
// ============================================================================
interface SubscriptionData {
  userId: string;
  userEmail?: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'pending_payment';
  plan: 'monthly' | 'annual';
  amount: number;
  currency: 'COP';
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  trialEndsAt: admin.firestore.Timestamp;
  paidAt?: admin.firestore.FieldValue;
  nextBillingAt?: admin.firestore.Timestamp;
  transactionId?: string;
  cancelledAt?: admin.firestore.FieldValue;
  declinedAt?: admin.firestore.FieldValue;
  pendingAt?: admin.firestore.FieldValue;
  lastWebhookId?: string; // Para idempotencia
}

// ============================================================================
// VALIDACIÓN DE FIRMA DE WOMPI (CRÍTICO PARA SEGURIDAD)
// ============================================================================
function verifyWompiSignature(req: Request): boolean {
  // Si no hay secreto configurado, permitir simulación (útil para la demo de pagos)
  if (!WOMPI_EVENT_SECRET) {
    logger.warn('[Payments] WOMPI_EVENT_SECRET no configurado. Aceptando webhook sin firma para demostración.');
    return true;
  }

  const signature = req.headers['x-wompi-signature'] as string;
  if (!signature) {
    logger.warn('[Payments] Webhook recibido sin header x-wompi-signature');
    return false;
  }

  try {
    // Wompi firma: HMAC-SHA256 del body crudo usando el event secret
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', WOMPI_EVENT_SECRET)
      .update(rawBody)
      .digest('hex');

    // Comparación segura contra timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      logger.warn('[Payments] Firma de webhook inválida');
    }

    return isValid;
  } catch (error) {
    logger.error({ err: error.message, stack: error.stack }, '[Payments] Error validando firma');
    return false;
  }
}

// ============================================================================
// HANDLER: Crear Suscripción (Trial Automático)
// ============================================================================
export const createSubscriptionHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const userEmail = req.user?.email;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autorizado' });
      return;
    }

    // Verificar si ya tiene suscripción
    const existingSub = await admin.firestore()
      .collection('subscriptions')
      .doc(userId)
      .get();

    if (existingSub.exists) {
      const existingData = existingSub.data();
      res.json({
        success: true,
        message: 'Suscripción ya existe',
        subscription: existingData,
        isSuperuser: SUPERUSER_EMAILS.includes(userEmail || '')
      });
      return;
    }

    // Determinar duración del trial
    const isSuperuser = SUPERUSER_EMAILS.includes(userEmail || '');
    const trialDays = isSuperuser ? SUPERUSER_TRIAL_DAYS : TRIAL_DAYS;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    // Crear nueva suscripción con trial
    const subscriptionData = {
      userId,
      userEmail,
      status: 'trial' as const,
      plan: 'monthly' as const,
      amount: SUBSCRIPTION_PRICE,
      currency: 'COP' as const,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      trialEndsAt: admin.firestore.Timestamp.fromDate(trialEndsAt)
    };

    await admin.firestore()
      .collection('subscriptions')
      .doc(userId)
      .set(subscriptionData);

    logger.info({
      message: 'Suscripción creada',
      userId,
      userEmail,
      trialEndsAt: trialEndsAt.toISOString(),
      isSuperuser
    });

    res.json({
      success: true,
      subscriptionId: userId,
      status: 'trial',
      trialEndsAt: trialEndsAt.toISOString(),
      isSuperuser,
      message: isSuperuser 
        ? 'Trial de superusuario activado (999 días)' 
        : `Trial de ${TRIAL_DAYS} días activado`
    });

  } catch (error: any) {
    logger.error({ message: 'Error creando suscripción', error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================================
// HANDLER: Webhook de Wompi (Confirmación de Pago) - CON VALIDACIÓN DE FIRMA
// ============================================================================
export const wompiWebhookHandler = async (req: Request, res: Response) => {
  try {
    // ✅ PASO 1: Validar firma de Wompi (SEGURIDAD CRÍTICA)
    if (!verifyWompiSignature(req)) {
      logger.warn({
        message: 'Webhook rechazado: firma inválida',
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      res.status(401).json({ success: false, message: 'Firma inválida' });
      return;
    }

    const { event, data } = req.body;

    // Validar estructura del webhook
    if (!event || !data) {
      logger.warn({ message: 'Webhook inválido recibido', body: req.body });
      res.status(400).json({ success: false, message: 'Webhook inválido' });
      return;
    }

    const transactionId = data.id;
    const userId = data.reference;

    logger.info({
      message: 'Webhook de Wompi recibido y validado',
      event,
      transactionId,
      userId
    });

    // ✅ PASO 2: Idempotencia - Verificar que no hemos procesado este webhook antes
    if (userId && transactionId) {
      const existingSub = await admin.firestore()
        .collection('subscriptions')
        .doc(userId)
        .get();

      if (existingSub.exists && existingSub.data()?.lastWebhookId === transactionId) {
        logger.info({
          message: 'Webhook duplicado ignorado (idempotencia)',
          transactionId,
          userId
        });
        res.sendStatus(200);
        return;
      }
    }

    // Procesar según el tipo de evento
    switch (event) {
      case 'transaction_approved':
        await handleTransactionApproved(data);
        break;
      
      case 'transaction_declined':
        await handleTransactionDeclined(data);
        break;
      
      case 'transaction_pending':
        await handleTransactionPending(data);
        break;
      
      default:
        logger.info({ message: 'Evento de Wompi no manejado', event });
    }

    // Siempre responder 200 para que Wompi no reenvíe
    res.sendStatus(200);

  } catch (error: any) {
    logger.error({ message: 'Error procesando webhook', error: error.message });
    res.sendStatus(500);
  }
};

// ============================================================================
// HANDLER: Consultar Estado de Suscripción
// ============================================================================
export const getSubscriptionStatusHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const requestUserId = req.user?.uid;

    // Validar que el usuario solo pueda consultar su propia suscripción
    if (requestUserId !== userId) {
      res.status(403).json({ 
        success: false, 
        message: 'No autorizado para consultar esta suscripción' 
      });
      return;
    }

    const subscription = await admin.firestore()
      .collection('subscriptions')
      .doc(userId)
      .get();

    if (!subscription.exists) {
      res.json({ 
        success: true, 
        status: 'no_subscription',
        message: 'No hay suscripción registrada'
      });
      return;
    }

    const data = subscription.data() as SubscriptionData;
    
    // Verificar si el trial ha expirado
    const now = new Date();
    const trialEndsAt = data.trialEndsAt.toDate();
    const isTrialExpired = now > trialEndsAt && data.status === 'trial';

    // Actualizar estado si el trial expiró
    if (isTrialExpired) {
      await admin.firestore()
        .collection('subscriptions')
        .doc(userId)
        .update({ status: 'expired' });
      
      data.status = 'expired';
    }

    // Calcular días restantes de trial
    const daysRemaining = Math.max(
      0,
      Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    res.json({
      success: true,
      subscription: {
        ...data,
        daysRemaining,
        isTrialExpired
      }
    });

  } catch (error: any) {
    logger.error({ message: 'Error consultando suscripción', error: error.message });
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// ============================================================================
// FUNCIONES AUXILIARES (Privadas) - CON VALIDACIONES DE SEGURIDAD
// ============================================================================

async function handleTransactionApproved(data: any): Promise<void> {
  const userId = data.reference as string;
  const transactionId = data.id;

  if (!userId) {
    logger.warn({ message: 'Webhook sin reference (userId)', data });
    return;
  }

  // ✅ PASO 3: Verificar que el usuario existe en Firebase
  try {
    await admin.auth().getUser(userId);
  } catch (error) {
    logger.warn({
      message: 'Webhook para userId inexistente en Firebase Auth',
      userId,
      transactionId
    });
    return;
  }

  // ✅ PASO 4: Verificar que el documento de suscripción existe
  const subRef = admin.firestore().collection('subscriptions').doc(userId);
  const subDoc = await subRef.get();

  if (!subDoc.exists) {
    logger.warn({
      message: 'Webhook para suscripción inexistente',
      userId,
      transactionId
    });
    return;
  }

  // Actualizar suscripción a ACTIVE con idempotencia
  await subRef.update({
    status: 'active',
    transactionId,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    nextBillingAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ),
    lastWebhookId: transactionId // Para idempotencia
  });

  logger.info({
    message: 'Suscripción activada por pago exitoso',
    userId,
    transactionId
  });
}

async function handleTransactionDeclined(data: any): Promise<void> {
  const userId = data.reference as string;
  const transactionId = data.id;

  if (!userId) {
    logger.warn({ message: 'Webhook de rechazo sin reference', data });
    return;
  }

  // Verificar que el documento existe antes de actualizar
  const subRef = admin.firestore().collection('subscriptions').doc(userId);
  const subDoc = await subRef.get();

  if (!subDoc.exists) {
    logger.warn({
      message: 'Webhook de rechazo para suscripción inexistente',
      userId,
      transactionId
    });
    return;
  }

  await subRef.update({
    status: 'trial',
    declinedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastWebhookId: transactionId
  });

  logger.info({
    message: 'Pago rechazado, usuario vuelve a trial',
    userId,
    transactionId
  });
}

async function handleTransactionPending(data: any): Promise<void> {
  const userId = data.reference as string;
  const transactionId = data.id;

  if (!userId) return;

  // Verificar que el documento existe
  const subRef = admin.firestore().collection('subscriptions').doc(userId);
  const subDoc = await subRef.get();

  if (!subDoc.exists) {
    logger.warn({
      message: 'Webhook pendiente para suscripción inexistente',
      userId,
      transactionId
    });
    return;
  }

  await subRef.update({
    status: 'pending_payment',
    pendingAt: admin.firestore.FieldValue.serverTimestamp(),
    lastWebhookId: transactionId
  });

  logger.info({
    message: 'Pago pendiente',
    userId,
    transactionId
  });
}
// ============================================================================
// HANDLER: Simular Pago (Para Demo en frontend)
// ============================================================================
export const simulatePaymentHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    const { transactionId } = req.body;
    
    if (!userId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    
    const subRef = admin.firestore().collection('subscriptions').doc(userId);
    const subDoc = await subRef.get();

    if (!subDoc.exists) {
      res.status(404).json({ success: false, message: 'Suscripción no encontrada' });
      return;
    }

    await subRef.update({
      status: 'active',
      transactionId: transactionId || `sim_${Date.now()}`,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      nextBillingAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      )
    });

    res.json({ success: true, message: 'Suscripción activada (simulada)' });
  } catch (error: any) {
    logger.error({ message: 'Error simulando pago', error: error.message });
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};
