import { Request, Response } from 'express';
import pino from 'pino';
import crypto from 'crypto';

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
    
    // Si tienes node 18+, fetch es global, pero por compatibilidad intentamos usar global.fetch
    const response = await global.fetch(wompiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`
      }
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

    // 3. Generar la firma criptográfica segura para que el frontend autorice la actualización
    const signature = crypto
      .createHash('sha256')
      .update(userId + 'ACTIVE' + FIRESTORE_SIGNATURE_SECRET)
      .digest('hex');

    logger.info({ message: 'Pago verificado exitosamente con Wompi LIVE', userId, transactionId });
    
    res.json({ 
      success: true, 
      signature 
    });
  } catch (error: any) {
    logger.error({ message: 'Error verificando pago', error: error.message });
    res.status(500).json({ success: false, message: 'Error interno verificando pago' });
  }
};
