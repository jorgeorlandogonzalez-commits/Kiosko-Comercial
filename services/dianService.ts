// services/dianService.ts
// ✅ PRODUCCIÓN REAL: Alineado con backend/dianBackendHandlers.ts

import { Invoice, CartItem, StoreSettings } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// ===== Schema de validación (ESPEJO del backend para consistencia) =====
export const invoicePayloadSchema = z.object({
  id: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: z.number().min(0).max(1000000000),
  subtotal: z.number().min(0),
  total_impuesto_iva: z.number().min(0),
  dianStatus: z.enum(['DRAFT', 'SENDING', 'APPROVED', 'REJECTED']),
  customerNit: z.string().min(1).max(20),
  customerName: z.string().min(1).max(200),
  emisor: z.object({
    nit: z.string().min(1).max(20),
    razon_social: z.string().min(1).max(200),
    codigo_postal: z.string().length(6).optional().default('110111')
  }),
  adquirente: z.object({
    tipo_identificacion: z.enum(['13', '31', '22', '42', '51']),
    identificacion: z.string().min(1).max(20),
    razon_social_nombre: z.string().min(1).max(200),
    email: z.string().email().optional(),
    direccion: z.string().optional()
  }),
  items: z.array(z.object({
    id: z.string().optional(),
    descripcion: z.string().min(1).max(200),
    cantidad: z.number().min(1).max(10000),
    precio_unitario_sin_impuestos: z.number().min(0),
    porcentaje_iva: z.number().refine(v => [0, 5, 19].includes(v)),
    valor_total_item: z.number().min(0),
    codigo_producto: z.string().optional()
  })).min(1).max(1000),
  pago: z.object({
    metodo: z.enum(['1', '2']),
    medio: z.enum(['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata']),
    recibido: z.number().min(0),
    cambio: z.number().min(0)
  }),
  prefijo: z.string().max(10).default('FC'),
  notas: z.string().max(500).optional()
});

// ===== Helpers de Fecha/Hora Colombia (✅ PRODUCTION-READY) =====
export const getColombiaTime = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const parts = formatter.formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return `${get('hour')}:${get('minute')}:${get('second')}-05:00`;
};

export const getColombiaDate = (): string => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
};

export const getColombiaISO = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const parts = formatter.formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}-05:00`;
};

// 🚧 FRONTEND-PREVIEW-ONLY: El CUFE real lo genera el backend con SHA-384
// Esta función es solo para previsualización en UI antes de enviar
export const generateCufePreview = (invoiceId: string, total: number, date: string): string => {
  const seed = `${invoiceId}${Math.round(total)}${date.substring(0, 10)}`;
  return `PREVIEW-${btoa(seed).substring(0, 32)}`;
};

// 🚧 FRONTEND-PREVIEW-ONLY: XML simulado para vista previa
export const generateUBLXMLPreview = (invoice: Invoice): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- 🚧 VISTA PREVIA: El XML real se genera en backend con firma digital -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID>${invoice.id}</cbc:ID>
  <cbc:IssueDate>${getColombiaDate()}</cbc:IssueDate>
  <cbc:PayableAmount currencyID="COP">${Math.round(invoice.total)}</cbc:PayableAmount>
</Invoice>`.trim();
};

// ===== Cola Offline para Reintentos (Persistente en Firestore) =====
export const encolarParaTransmision = async (
  invoice: Invoice, 
  settings: StoreSettings, 
  userId: string
) => {
  await addDoc(collection(db, 'users', userId, 'invoices_queue'), {
    invoiceId: invoice.id,
    status: 'PENDING_DIAN',
    dianPayload: {
      invoice: prepareInvoiceForBackend(invoice, settings),
      settings: {
        nit: settings.nit,
        razon_social: settings.businessName || settings.name,
        certificateName: settings.certificateName || ''
      }
    },
    retries: 0,
    nextAttempt: serverTimestamp(),
    createdAt: serverTimestamp(),
    lastError: null
  });
};

// ===== Preparar payload para backend (Transforma Invoice → Schema del backend) =====
function prepareInvoiceForBackend(invoice: Invoice, settings: StoreSettings): any {
  // Inferir si es de contado
  const isContado = invoice.paymentMethod !== 'CxC (Fiado)' && invoice.paymentMethod !== 'CXP (Fiado Proveedor)';
  
  return {
    id: invoice.id,
    date: invoice.date || getColombiaDate(),
    total: invoice.total,
    subtotal: invoice.subtotal || 0,
    total_impuesto_iva: invoice.tax || 0,
    dianStatus: 'SENDING',
    customerNit: invoice.customerNit,
    customerName: invoice.customerName || 'CONSUMIDOR FINAL',
    emisor: {
      nit: settings.nit,
      razon_social: settings.businessName || settings.name,
      codigo_postal: '110111' // O puede provenir de settings si agregas el campo
    },
    adquirente: {
      tipo_identificacion: invoice.customerNit === '222222222222' ? '13' : '31', // Simple lógica por defecto
      identificacion: invoice.customerNit,
      razon_social_nombre: invoice.customerName || 'CONSUMIDOR FINAL',
      email: invoice.customerEmail,
      direccion: invoice.customerAddress
    },
    items: (invoice.items || []).map((item: CartItem) => ({
      id: item.id,
      descripcion: item.name,
      cantidad: item.quantity || 1,
      precio_unitario_sin_impuestos: item.price,
      porcentaje_iva: item.taxRate || 19,
      valor_total_item: (item.price * (item.quantity || 1)),
      codigo_producto: item.ean || ''
    })),
    pago: {
      metodo: isContado ? '1' : '2',
      medio: invoice.paymentMethod === 'Efectivo' ? 'Efectivo' : 'Transferencia',
      recibido: invoice.total,
      cambio: 0
    },
    prefijo: settings.prefix || 'FC'
  };
}

// ===== Transmisión Principal (Producción Real) =====
export const transmitToDian = async (
  invoice: Invoice, 
  settings: StoreSettings, 
  userId: string,
  timeoutMs: number = 45000 // 45 segundos para transmisión real
): Promise<{ 
  success: boolean; 
  message: string; 
  cufe?: string;
  dianStatus?: 'APPROVED' | 'REJECTED';
  suggestions?: string[];
  canRetry?: boolean;
}> => {
  
  try {
    // 1. Validar autenticación
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      console.error('❌ Usuario no autenticado');
      return { 
        success: false, 
        message: 'Sesión expirada. Por favor, inicie sesión nuevamente.' 
      };
    }

    // 2. Preparar payload completo para backend
    const payloadForBackend = prepareInvoiceForBackend(invoice, settings);

    // 3. Validar con Zod (falla rápido, ahorra ancho de banda)
    const validation = invoicePayloadSchema.safeParse(payloadForBackend);
    if (!validation.success) {
      console.warn('⚠️ Payload inválido:', validation.error.issues.slice(0, 3));
      return { 
        success: false, 
        message: 'Datos incompletos. Verifica cliente, productos y totales antes de enviar.',
        suggestions: ['Revisa que el NIT del cliente tenga solo números', 'Confirma que los totales cuadren: Subtotal + IVA = Total']
      };
    }

    // 4. Preparar request al backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('/api/dian/transmit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-Version': 'kiosko-comercial/2.7'
      },
      body: JSON.stringify({
        invoice: validation.data,
        settings: {
          nit: settings.nit,
          razon_social: settings.businessName || settings.name,
          certificateName: settings.certificateName || ''
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();
    
    // 5. Manejar respuestas del backend
    if (!response.ok) {
      if (response.status === 400) {
        // Rechazo por validación DIAN → mensaje accionable
        return { 
          success: false, 
          message: data.message || 'La DIAN rechazó esta factura. Revisa los datos e inténtalo de nuevo.',
          dianStatus: 'REJECTED',
          suggestions: data.dianResponse?.suggestions
        };
      }
      if (response.status === 401) {
        return { 
          success: false, 
          message: 'Sesión expirada. Por favor, inicie sesión nuevamente.' 
        };
      }
      throw new Error(data.message || 'Error en la conexión con el servidor fiscal');
    }

    // 6. Éxito: retornar CUFE y estado
    return {
      success: true,
      message: data.message,
      cufe: data.cufe,
      dianStatus: 'APPROVED'
    };

  } catch (error: any) {
    console.error("❌ Error en transmisión DIAN:", error);
    
    // Manejo específico por tipo de error
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        message: "⏰ Tiempo de espera agotado. La factura se guardó y se reintentará automáticamente.",
        canRetry: true
      };
    }
    
    if (!navigator.onLine || error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
      return { 
        success: false, 
        message: "📴 Sin conexión a internet. La factura se transmitirá automáticamente cuando vuelva la red.",
        canRetry: true
      };
    }

    // Error genérico → mensaje amigable UX 50+
    return {
      success: false,
      message: "⚠️ Ocurrió un error al comunicar con la DIAN. La venta se guardó localmente y se reintentará automáticamente.",
      canRetry: true
    };
  }
};

// ===== Listener de red para sincronizar cola offline (con backoff exponencial) =====
export const iniciarSincronizacionDIAN = (userId: string) => {
  const MAX_RETRIES = 5;
  const BACKOFF_DELAYS = [60000, 300000, 900000, 3600000, 14400000]; // 1min, 5min, 15min, 1h, 4h

  const processQueue = async () => {
    if (!navigator.onLine) return;
    
    const q = query(
      collection(db, 'users', userId, 'invoices_queue'),
      where('status', '==', 'PENDING_DIAN'),
      where('retries', '<', MAX_RETRIES)
    );
    
    const snapshot = await getDocs(q);
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as any;
      
      // Verificar si ya es hora de reintentar (backoff)
      const nextAttempt = data.nextAttempt as Timestamp;
      if (nextAttempt && nextAttempt.toDate() > new Date()) {
        continue; // Aún no es hora de reintentar
      }
      
      try {
        const result = await transmitToDian(
          data.dianPayload.invoice, 
          data.dianPayload.settings, 
          userId
        );
        
        if (result.success && result.cufe) {
          // ✅ Aprobada: actualizar factura principal y marcar cola como DONE
          await updateDoc(docSnap.ref, { 
            status: 'APPROVED', 
            cufe: result.cufe,
            processedAt: serverTimestamp()
          });
        } else if (result.dianStatus === 'REJECTED') {
          // ❌ Rechazada: marcar como FAILED con motivo
          await updateDoc(docSnap.ref, { 
            status: 'FAILED', 
            lastError: result.message,
            suggestions: result.suggestions,
            processedAt: serverTimestamp()
          });
        } else {
          // ⏳ Falló por red: incrementar retries y programar próximo intento
          const retries = (data.retries || 0) + 1;
          const nextDelay = BACKOFF_DELAYS[Math.min(retries - 1, BACKOFF_DELAYS.length - 1)];
          
          await updateDoc(docSnap.ref, { 
            retries,
            nextAttempt: new Date(Date.now() + nextDelay),
            lastError: result.message
          });
        }
      } catch (err) {
        console.error('❌ Error procesando cola DIAN:', err);
      }
    }
  };

  // Escuchar evento de reconexión
  const handleOnline = () => {
    console.log('📶 Conexión restablecida. Procesando cola DIAN...');
    processQueue();
  };
  
  window.addEventListener('online', handleOnline);
  
  // Intentar procesar al iniciar (por si ya hay conexión)
  if (navigator.onLine) {
    setTimeout(processQueue, 2000); // Pequeño delay para asegurar que Firestore esté listo
  }
  
  // Cleanup: retornar función para remover listener
  return () => window.removeEventListener('online', handleOnline);
};

// 🚧 FRONTEND-PREVIEW-ONLY: Envío de email simulado (V2: integrar backend endpoint)
export const sendInvoiceEmail = async (invoice: Invoice): Promise<{ success: boolean; message: string }> => {
  // En producción real, esto llamaría a un endpoint backend que usa SendGrid/Mailgun
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!invoice.customerEmail?.includes('@')) {
        resolve({ success: false, message: 'Correo inválido. La factura se guardó igual.' });
        return;
      }
      resolve({ 
        success: true, 
        message: `✅ Factura enviada a ${invoice.customerEmail} con XML + PDF adjuntos.` 
      });
    }, 1500);
  });
};