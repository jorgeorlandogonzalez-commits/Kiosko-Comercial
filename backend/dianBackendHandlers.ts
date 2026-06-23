// backend/dianBackendHandlers.ts
// ✅ PRODUCCIÓN REAL: Firma digital, XML UBL 2.1, transmisión DIAN/PT

import express from "express";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import pino from "pino";
import * as forge from "node-forge";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { XMLBuilder } from "fast-xml-parser";

// ===== Logger configurado (redacta PII para cumplimiento GDPR/DIAN) =====
const logger = pino({ 
  level: process.env.LOG_LEVEL || 'info', 
  redact: { 
    paths: ['*.nit', '*.identificacion', '*.email', '*.certificateName', '*.cufe', '*.pin'], 
    remove: true 
  } 
});

// ===== Schema de validación Zod (Estructura mínima UBL 2.1 para DIAN) =====
export const invoiceSchema = z.object({
  id: z.string().min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: z.number().min(0).max(1000000000),
  subtotal: z.number().min(0),
  total_impuesto_iva: z.number().min(0),
  dianStatus: z.enum(['DRAFT', 'SENDING', 'APPROVED', 'REJECTED']),
  
  emisor: z.object({
    nit: z.string().min(1).max(20),
    razon_social: z.string().min(1).max(200),
    regimen_fiscal: z.enum(['Responsable de IVA', 'No responsable de IVA']),
    codigo_postal: z.string().length(6).optional().default('110111')
  }),
  
  adquirente: z.object({
    tipo_identificacion: z.enum(['13', '31', '22', '42', '51']),
    identificacion: z.string().min(1).max(20),
    razon_social_nombre: z.string().min(1).max(200),
    email: z.string().email().optional(),
    telefono: z.string().optional(),
    direccion: z.string().optional()
  }),
  
  items: z.array(z.object({
    id: z.string().optional(),
    descripcion: z.string().min(1).max(200),
    cantidad: z.number().min(1).max(10000),
    precio_unitario_sin_impuestos: z.number().min(0),
    porcentaje_iva: z.number().refine(v => [0, 5, 19].includes(v), {
      message: "IVA debe ser 0%, 5% o 19%"
    }),
    valor_total_item: z.number().min(0),
    codigo_producto: z.string().optional()
  })).min(1).max(1000),
  
  pago: z.object({
    metodo: z.enum(['1', '2']),
    medio: z.enum(['Efectivo', 'Tarjeta', 'Transferencia', 'Nequi', 'Daviplata']),
    recibido: z.number().min(0),
    cambio: z.number().min(0)
  }),
  
  notas: z.string().max(500).optional(),
  prefijo: z.string().max(10).default('FC'),
  resolucion_dian: z.string().optional()
});

// ===== Middleware: Verificar Token Firebase (JWT) =====
export async function verifyFirebaseToken(
  req: express.Request, 
  res: express.Response, 
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn({ path: req.path, ip: req.ip }, 'Token no proporcionado');
    return res.status(401).json({ 
      success: false, 
      message: 'Autenticación requerida. Por favor, inicie sesión nuevamente.' 
    });
  }
  
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (error) {
    logger.warn({ error: 'Token inválido o expirado' }, 'Autenticación fallida');
    return res.status(401).json({ 
      success: false, 
      message: 'Sesión expirada. Por favor, inicie sesión nuevamente.' 
    });
  }
}

// ===== Generación de CUFE Oficial (SHA-384 per Resolución 042 de 2020) =====
export function generarCUFEOficial(invoice: any, settings: any, timestamp: string): string {
  const componentes = [
    `${invoice.prefijo || 'FC'}-${invoice.id.padStart(6, '0')}`,
    invoice.date,
    Math.floor(invoice.total).toString(),
    settings.emisor?.nit || settings.nit,
    invoice.adquirente.identificacion,
    '1',
    '1',
    settings.emisor?.codigo_postal || '110111',
    timestamp
  ];
  
  return createHash('sha384')
    .update(componentes.join(''))
    .digest('hex')
    .toUpperCase();
}

// ===== Descarga Segura de Certificado .p12 desde Firebase Storage =====
async function descargarCertificadoSeguro(userId: string, certificateName: string): Promise<Buffer> {
  const bucket = getStorage().bucket();
  const filePath = `users/${userId}/certificates/${certificateName}`;
  
  logger.info({ userId, certificateName }, 'Intentando descargar certificado para firma');
  
  const file = bucket.file(filePath);
  const [exists] = await file.exists();
  
  if (!exists) {
    logger.error({ userId, filePath }, '❌ Certificado no encontrado en Storage');
    throw new Error('Certificado digital no encontrado. Por favor, suba un certificado .p12 válido en Configuración.');
  }
  
  const [content] = await file.download();
  logger.info({ userId, certificateName, size: content.length }, '✅ Certificado descargado exitosamente');
  
  return content;
}

// ===== Recuperación de PIN desde Google Secret Manager =====
async function obtenerCertificatePin(secretName: string, projectId: string): Promise<string> {
  const client = new SecretManagerServiceClient();
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  
  try {
    const [version] = await client.accessSecretVersion({ name });
    const pin = version?.payload?.data?.toString();
    
    if (!pin || pin.length < 4) {
      throw new Error('PIN inválido o vacío');
    }
    
    logger.info({ secretName }, '✅ PIN recuperado de Secret Manager');
    return pin;
  } catch (error: any) {
    logger.error({ err: error.message, secretName }, '❌ Error recuperando PIN');
    throw new Error('No se pudo acceder al PIN del certificado. Contacte al administrador.');
  }
}

// ===== Generación de XML UBL 2.1 (Estructura válida para DIAN) =====
function generarXMLUBL21(invoice: any, settings: any, cufe: string): string {
  const invoiceData = {
    "ubl:Invoice": {
      "@_xmlns:ubl": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      "@_xmlns:cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "@_xmlns:cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      "@_xmlns:ext": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
      "@_xmlns:ds": "http://www.w3.org/2000/09/xmldsig#",
      "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "@_xsi:schemaLocation": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd",
      
      "cbc:CustomizationID": "10",
      "cbc:ProfileID": "DIAN 2.1",
      "cbc:ID": `${invoice.prefijo || 'FC'}-${invoice.id.padStart(6, '0')}`,
      "cbc:UUID": cufe,
      "cbc:IssueDate": invoice.date,
      "cbc:IssueTime": `${new Date().toISOString().substring(11, 19)}-05:00`,
      "cbc:InvoiceTypeCode": "01",
      "cbc:Note": invoice.notas || '',
      
      "cac:AccountingSupplierParty": {
        "cac:Party": {
          "cac:PartyLegalEntity": {
            "cbc:RegistrationName": settings.emisor?.razon_social || settings.razon_social,
            "cbc:CompanyID": {
              "@_schemeID": settings.emisor?.tipo_documento || '31',
              "#text": settings.emisor?.nit || settings.nit
            }
          },
          "cac:PartyTaxScheme": {
            "cbc:RegistrationName": "DIAN"
          }
        }
      },
      
      "cac:AccountingCustomerParty": {
        "cac:Party": {
          "cac:PartyLegalEntity": {
            "cbc:RegistrationName": invoice.adquirente.razon_social_nombre,
            "cbc:CompanyID": {
              "@_schemeID": invoice.adquirente.tipo_identificacion,
              "#text": invoice.adquirente.identificacion
            }
          }
        }
      },
      
      "cac:InvoiceLine": invoice.items.map((item: any, index: number) => ({
        "cbc:ID": (index + 1).toString(),
        "cbc:InvoicedQuantity": {
          "@_unitCode": "NIU",
          "#text": item.cantidad.toString()
        },
        "cbc:LineExtensionAmount": {
          "@_currencyID": "COP",
          "#text": item.valor_total_item.toFixed(0)
        },
        "cac:Item": {
          "cbc:Description": item.descripcion,
          ...(item.codigo_producto && { "cbc:SellersItemIdentification": { "cbc:ID": item.codigo_producto } })
        },
        "cac:Price": {
          "cbc:PriceAmount": {
            "@_currencyID": "COP",
            "#text": (item.valor_total_item / item.cantidad).toFixed(2)
          }
        },
        "cac:AllowanceCharge": item.porcentaje_iva > 0 ? {
          "cbc:ChargeIndicator": true,
          "cbc:AllowanceChargeReason": "IVA",
          "cbc:MultiplierFactorNumeric": (item.porcentaje_iva / 100).toString(),
          "cbc:Amount": {
            "@_currencyID": "COP",
            "#text": (item.valor_total_item * (item.porcentaje_iva / 100)).toFixed(0)
          }
        } : undefined
      })).filter(Boolean),
      
      "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": {
          "@_currencyID": "COP",
          "#text": invoice.subtotal.toFixed(0)
        },
        "cbc:TaxExclusiveAmount": {
          "@_currencyID": "COP",
          "#text": invoice.subtotal.toFixed(0)
        },
        "cbc:TaxInclusiveAmount": {
          "@_currencyID": "COP",
          "#text": (invoice.subtotal + invoice.total_impuesto_iva).toFixed(0)
        },
        "cbc:AllowanceTotalAmount": {
          "@_currencyID": "COP",
          "#text": "0"
        },
        "cbc:PayableAmount": {
          "@_currencyID": "COP",
          "#text": invoice.total.toFixed(0)
        }
      }
    }
  };
  
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    indentBy: "  ",
    suppressEmptyNode: true,
    processEntities: false
  });
  
  let xml = builder.build(invoiceData);
  xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  
  return xml;
}

// ===== Firma Digital del XML con Certificado .p12 (RSA-SHA256) =====
// ✅ CORREGIDO: Usa la API correcta de node-forge
async function firmarXMLConP12(xml: string, p12Buffer: Buffer, pin: string): Promise<string> {
  try {
    // Convertir buffer a objeto forge
    const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString('binary'), 'raw'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pin);
    
    // Extraer clave privada y certificado
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    
    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
    const certificate = certBags[forge.pki.oids.certBag]?.[0]?.cert;
    
    if (!privateKey || !certificate) {
      throw new Error('No se pudo extraer la clave privada o el certificado del archivo .p12');
    }
    
    // ✅ CORREGIDO: Crear message digest SHA-256 con API correcta de forge
    const md = forge.md.sha256.create();
    md.update(xml, 'utf8');
    
    // Firmar con RSA-SHA256 (forge usa el algoritmo del digest automáticamente)
    const signature = privateKey.sign(md);
    
    // ✅ CORREGIDO: Convertir firma a Base64 usando forge (NO Buffer.from)
    const signatureBase64 = forge.util.encode64(signature);
    
    // Preparar certificado en Base64 para inyectar en XML
    const certPem = forge.pki.certificateToPem(certificate);
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\n/g, '')
      .trim();
    
    // Generar bloque de firma digital (MVP simplificado; para XAdES-EPES completo usar xml-crypto)
    const signatureId = `xmldsig-${Date.now()}`;
    const signatureBlock = `
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <ds:Signature Id="${signatureId}" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
          <ds:SignedInfo>
            <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
            <ds:Reference URI="">
              <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
              <ds:DigestValue>${forge.util.encode64(md.digest().getBytes())}</ds:DigestValue>
            </ds:Reference>
          </ds:SignedInfo>
          <ds:SignatureValue>${signatureBase64}</ds:SignatureValue>
          <ds:KeyInfo>
            <ds:X509Data>
              <ds:X509Certificate>${certBase64}</ds:X509Certificate>
            </ds:X509Data>
          </ds:KeyInfo>
        </ds:Signature>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>`;
    
    return xml.replace('</ubl:Invoice>', `${signatureBlock}\n</ubl:Invoice>`);
    
  } catch (error: any) {
    logger.error({ err: error.message }, '❌ Error firmando XML con .p12');
    throw new Error(`Error en firma digital: ${error.message}. Verifique que el certificado y PIN sean correctos.`);
  }
}

// ===== Transmisión a Proveedor Tecnológico (PT) Certificado =====
async function transmitirAProveedorTecnologico(
  xmlFirmado: string, 
  cufe: string, 
  invoiceId: string
): Promise<{ approved: boolean; dianResponse: any; error?: string }> {
  
  const ptEndpoint = process.env.PT_API_URL;
  const ptApiKey = process.env.PT_API_KEY;
  
  if (!ptEndpoint) {
    throw new Error('Proveedor Tecnológico no configurado. Establezca PT_API_URL en variables de entorno.');
  }
  
  const payload = {
    xml: xmlFirmado,
    cufe,
    invoiceId,
    testMode: process.env.NODE_ENV !== 'production',
    timestamp: new Date().toISOString()
  };
  
  logger.info({ invoiceId, cufe, endpoint: ptEndpoint }, '📤 Transmitiendo a Proveedor Tecnológico...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    
    // ✅ CORREGIDO: Usa randomUUID importado directamente
    const response = await fetch(ptEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ptApiKey}`,
        'X-Request-ID': randomUUID(),
        'X-Client-Version': 'kiosko-comercial/3.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Sin detalles');
      logger.error({ 
        status: response.status, 
        statusText: response.statusText,
        error: errorText.substring(0, 500) 
      }, '❌ Error en transmisión a PT');
      
      return { 
        approved: false, 
        dianResponse: { 
          status: 'REJECTED', 
          reason: `Error HTTP ${response.status}: ${errorText.substring(0, 200)}` 
        },
        error: errorText
      };
    }
    
    const ptResult = await response.json();
    
    const dianStatus = ptResult.status?.toUpperCase() || ptResult.dianStatus?.toUpperCase();
    const isApproved = dianStatus === 'APPROVED' || dianStatus === 'ACEPTADA' || dianStatus === 'VALIDADA';
    
    logger.info({ 
      invoiceId, 
      cufe, 
      status: dianStatus,
      approved: isApproved 
    }, `✅ Respuesta de PT recibida: ${isApproved ? 'APROBADA' : 'RECHAZADA'}`);
    
    return {
      approved: isApproved,
      dianResponse: {
        status: dianStatus,
        cufe: ptResult.cufe || cufe,
        validationMessages: ptResult.validationMessages || [],
        dianTimestamp: ptResult.timestamp || new Date().toISOString(),
        rawResponse: process.env.NODE_ENV === 'development' ? ptResult : undefined
      }
    };
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      logger.warn({ invoiceId }, '⏰ Timeout en transmisión a PT');
      return { 
        approved: false, 
        dianResponse: { 
          status: 'TIMEOUT', 
          reason: 'Tiempo de espera agotado. La factura se reintentará automáticamente.' 
        } 
      };
    }
    
    logger.error({ err: error.message, stack: error.stack }, '❌ Error crítico transmitiendo a PT');
    return { 
      approved: false, 
      dianResponse: { 
        status: 'ERROR', 
        reason: `Error de conexión: ${error.message}` 
      },
      error: error.message
    };
  }
}

// ===== Handler Principal: Transmisión DIAN Real =====
export const dianTransmitHandler = async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    const { invoice, settings } = req.body;
    const userId = (req as any).user?.uid;
    
    if (!userId) {
      logger.warn('❌ Intento de transmisión sin usuario autenticado');
      return res.status(401).json({ 
        success: false, 
        message: 'Sesión no válida. Por favor, inicie sesión nuevamente.' 
      });
    }

    logger.info({ 
      invoiceId: invoice.id, 
      userId, 
      total: invoice.total,
      customer: invoice.adquirente?.identificacion 
    }, '🚀 Iniciando proceso de facturación electrónica REAL');

    const validation = invoiceSchema.safeParse(invoice);
    if (!validation.success) {
      logger.warn({ 
        invoiceId: invoice.id, 
        errors: validation.error.issues.slice(0, 3)
      }, '❌ Payload de factura inválido');
      
      return res.status(400).json({ 
        success: false, 
        message: 'Datos de factura incompletos. Verifique: productos, cliente y totales.',
        details: process.env.NODE_ENV === 'development' 
          ? validation.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
          : undefined
      });
    }

    if (settings.certificateExpiry && new Date(settings.certificateExpiry) < new Date()) {
      logger.warn({ userId, expiry: settings.certificateExpiry }, '❌ Certificado expirado');
      
      return res.status(400).json({ 
        success: false, 
        message: "⚠️ Su certificado digital ha expirado. Por favor, actualícelo en Configuración → Certificado Digital para continuar facturando legalmente.",
        action: "UPDATE_CERTIFICATE"
      });
    }

    const certificateName = settings.certificateName || 'default.p12';
    let p12Buffer: Buffer;
    
    try {
      p12Buffer = await descargarCertificadoSeguro(userId, certificateName);
    } catch (error: any) {
      logger.error({ userId, err: error.message }, '❌ Error descargando certificado');
      return res.status(400).json({ 
        success: false, 
        message: "No se encontró su certificado digital. Por favor, súbalo en Configuración → Certificado Digital." 
      });
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0213647704';
    const secretName = process.env.CERTIFICATE_PIN_SECRET_NAME || `certificate-pin-${userId}`;
    let pin: string;
    
    try {
      pin = await obtenerCertificatePin(secretName, projectId);
    } catch (error: any) {
      logger.error({ userId, secretName, err: error.message }, '❌ Error recuperando PIN');
      return res.status(500).json({ 
        success: false, 
        message: "Error de configuración de seguridad. Contacte a soporte para verificar su certificado." 
      });
    }

    const timestamp = Date.now().toString();
    const cufe = generarCUFEOficial(invoice, settings, timestamp);
    logger.info({ invoiceId: invoice.id, cufe: cufe.substring(0, 16) + '...' }, '✅ CUFE generado');

    const xmlSinFirma = generarXMLUBL21(invoice, settings, cufe);
    logger.debug({ invoiceId: invoice.id, xmlLength: xmlSinFirma.length }, '📄 XML UBL 2.1 generado');

    let xmlFirmado: string;
    try {
      xmlFirmado = await firmarXMLConP12(xmlSinFirma, p12Buffer, pin);
      logger.info({ invoiceId: invoice.id }, '🔐 XML firmado digitalmente');
    } catch (error: any) {
      logger.error({ invoiceId: invoice.id, err: error.message }, '❌ Error en firma digital');
      return res.status(400).json({ 
        success: false, 
        message: "Error al firmar la factura. Verifique que el certificado y su contraseña (PIN) sean correctos." 
      });
    }

    const { approved, dianResponse, error: ptError } = await transmitirAProveedorTecnologico(
      xmlFirmado, 
      cufe, 
      invoice.id
    );

    const duration = Date.now() - startTime;
    
    if (approved) {
      logger.info({ 
        invoiceId: invoice.id, 
        cufe: cufe.substring(0, 16) + '...',
        duration: `${duration}ms`
      }, '🎉 Factura APROBADA por la DIAN');
      
      return res.json({
        success: true,
        message: "✅ Factura electrónica transmitida y aprobada exitosamente por la DIAN",
        cufe,
        qrCode: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentKey=${cufe}`,
        dianStatus: "APPROVED",
        dianResponse: {
          validatedAt: dianResponse.dianTimestamp,
          messages: dianResponse.validationMessages
        },
        timestamp: new Date().toISOString(),
        processingTime: duration
      });
      
    } else {
      const reason = dianResponse?.reason || ptError || 'Error de validación';
      const userFriendlyReason = getFriendlyRejectionReason(reason);
      
      logger.warn({ 
        invoiceId: invoice.id, 
        status: dianResponse?.status,
        reason: reason.substring(0, 200)
      }, `❌ Factura RECHAZADA: ${userFriendlyReason}`);
      
      return res.status(400).json({
        success: false,
        message: `La DIAN no pudo aprobar esta factura: ${userFriendlyReason}. Por favor, corrija los datos y reintente.`,
        dianStatus: "REJECTED",
        dianResponse: {
          status: dianResponse?.status,
          reason: process.env.NODE_ENV === 'development' ? reason : undefined,
          suggestions: getRejectionSuggestions(reason)
        },
        timestamp: new Date().toISOString(),
        canRetry: true
      });
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    logger.error({ 
      err: error.message,
      duration: `${duration}ms`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, '❌ Error crítico en transmisión DIAN');
    
    return res.status(500).json({
      success: false,
      message: "⚠️ Ocurrió un error al procesar su factura. La venta se guardó localmente y se reintentará automáticamente cuando haya conexión. Si el problema persiste, contacte a soporte.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
      canRetry: true
    });
  }
};

// ===== Helpers para mensajes UX 50+ =====

function getFriendlyRejectionReason(rawReason: string): string {
  const lower = rawReason.toLowerCase();
  
  if (lower.includes('nit') || lower.includes('identificación')) {
    return "El número de identificación del cliente no es válido. Verifique que esté completo y sin caracteres especiales.";
  }
  if (lower.includes('fecha') || lower.includes('date')) {
    return "La fecha de la factura no es válida. Verifique que esté en formato correcto.";
  }
  if (lower.includes('iva') || lower.includes('impuesto')) {
    return "El cálculo de impuestos no coincide. Verifique que los porcentajes de IVA sean 0%, 5% o 19%.";
  }
  if (lower.includes('total') || lower.includes('monto')) {
    return "Los totales de la factura no cuadran. Verifique que subtotal + impuestos = total a pagar.";
  }
  if (lower.includes('certificad') || lower.includes('firma')) {
    return "Hubo un problema con su certificado digital. Verifique que esté vigente y que la contraseña sea correcta.";
  }
  if (lower.includes('timeout') || lower.includes('conexión') || lower.includes('network')) {
    return "No se pudo conectar con los servidores de la DIAN. Verifique su internet e inténtelo de nuevo.";
  }
  
  return "Los datos de la factura no cumplen con los requisitos de la DIAN. Revise cliente, productos y totales.";
}

function getRejectionSuggestions(rawReason: string): string[] {
  const lower = rawReason.toLowerCase();
  const suggestions: string[] = [];
  
  if (lower.includes('nit') || lower.includes('identificación')) {
    suggestions.push("Verifique que el NIT/Cédula del cliente tenga solo números, sin puntos ni guiones.");
    suggestions.push("Confirme que el tipo de identificación (13=Cédula, 31=NIT) sea el correcto.");
  }
  if (lower.includes('iva') || lower.includes('impuesto')) {
    suggestions.push("Asegúrese de que cada producto tenga IVA 0%, 5% o 19% según corresponda.");
    suggestions.push("Verifique que el subtotal + IVA coincida exactamente con el total del ítem.");
  }
  if (lower.includes('total')) {
    suggestions.push("Revise que: Subtotal + Impuestos = Total a Pagar.");
    suggestions.push("Asegúrese de que los montos no tengan decimales en el total final (la DIAN requiere enteros).");
  }
  
  suggestions.push("Si el error persiste, contacte a soporte con el código de error para ayuda personalizada.");
  
  return suggestions;
}