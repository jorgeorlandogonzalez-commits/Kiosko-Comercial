import { Request, Response } from 'express';
import pino from 'pino';
import crypto from 'crypto';

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
// CONFIGURACIÓN DE SEGURIDAD Y PAGOS
// ============================================================================
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY || 'prv_test_fake_secret';
const FIRESTORE_SIGNATURE_SECRET = 'KIOSKO_SECURE_PAYMENTS_2026'; 

export const verifyPaymentHandler = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;
    const userId = req.user?.uid;

    if (!userId || !transactionId) {
      res.status(400).json({ success: false, message: 'Faltan parámetros' });
      return;
    }

    // In a real production app, we would query Wompi's API here.
    const signature = crypto
      .createHash('sha256')
      .update(userId + 'ACTIVE' + FIRESTORE_SIGNATURE_SECRET)
      .digest('hex');

    logger.info({ message: 'Pago verificado exitosamente', userId, transactionId });
    
    res.json({ 
      success: true, 
      signature 
    });
  } catch (error: any) {
    logger.error({ message: 'Error verificando pago', error: error.message });
    res.status(500).json({ success: false, message: 'Error interno verificando pago' });
  }
};

export const simulatePaymentHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    const signature = crypto
      .createHash('sha256')
      .update(userId + 'ACTIVE' + FIRESTORE_SIGNATURE_SECRET)
      .digest('hex');

    logger.info({ message: 'Pago simulado', userId });
    
    res.json({ success: true, signature });
  } catch (error: any) {
    logger.error({ message: 'Error simulando pago', error: error.message });
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};
