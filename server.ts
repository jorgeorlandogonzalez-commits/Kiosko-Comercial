import express from "express";
import path from "path";
import fsSync, { promises as fs } from "fs";
import cors from "cors";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import rateLimit from "express-rate-limit";
import * as functions from "firebase-functions";
import { GoogleGenAI } from "@google/genai";
import pino from "pino";
import os from "os";
import { dianTransmitHandler, verifyFirebaseToken } from "./backend/dianBackendHandlers.js";
import { verifyPaymentHandler, getWompiPublicKey, getWompiSignature } from "./backend/paymentsHandler.js";

// Logger estructurado
const logger = pino({ level: 'info' });

// Inicializar Firebase Admin de forma segura
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0213647704',
    });
    logger.info('[Server] Firebase Admin inicializado correctamente');
  }
} catch (e) {
  logger.warn({ err: e }, "[Server] Firebase Admin bypass: Corriendo sin credenciales de proyecto.");
}

// Inicialización diferida de GoogleGenAI
let aiClientInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClientInstance) {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno del servidor.");
    }
    aiClientInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'kiosko-comercial-firebase-functions',
        }
      }
    });
    logger.info('[Server] Gemini AI inicializado');
  }
  return aiClientInstance;
}

const app = express();
app.set("trust proxy", 1); // Necesario para express-rate-limit detrás de un proxy (ej. Cloud Run)
const isProd = process.env.NODE_ENV === "production";

app.use(cors({ origin: true }));

// ============================================================================
// MIDDLEWARE CRÍTICO: Capturar rawBody para validación de firma Wompi
// DEBE IR ANTES DE express.json()
app.use((req: any, res, next) => {
  if (req.originalUrl.includes("/webhook")) {
    req.rawBody = req.body ? req.body.toString("utf8") : "";
  }
  next();
});
// Middleware JSON para todas las demás rutas
app.use(express.json({ limit: '1mb' }));

const dianLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Demasiados intentos. Intente más tarde.' }
});

const assistantLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Tranquilo socio, dame un respiro. Demasiadas preguntas por minuto.' }
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    mode: isProd ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.post("/api/dian/transmit", verifyFirebaseToken, dianLimit, dianTransmitHandler);
app.post("/api/payments/verify", verifyFirebaseToken, verifyPaymentHandler);
app.post("/api/payments/signature", verifyFirebaseToken, getWompiSignature);
app.get("/api/config/wompi", getWompiPublicKey);

app.post("/api/gemini/assistant", verifyFirebaseToken, assistantLimit, async (req, res) => {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) {
      res.status(401).json({ error: "No autenticado." });
      return;
    }

    const { query, contextData } = req.body;
    if (!query) {
      res.status(400).json({ error: "Falta la pregunta (query)." });
      return;
    }

    // LECTURA DESDE FIRESTORE (fuente de verdad)
    let userPlan = "EMPRENDE";
    let userRole = "OWNER";
    try {
      const subSnap = await getFirestore(admin.app(), "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15").collection("subscriptions").doc(uid).get();
      if (subSnap.exists) {
        userPlan = subSnap.data()?.plan ?? "EMPRENDE";
      }
      const profileSnap = await getFirestore(admin.app(), "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15").collection("users").doc(uid).get();
      if (profileSnap.exists) {
        userRole = profileSnap.data()?.role ?? "OWNER";
      }
    } catch (dbErr) {
      logger.warn({ err: dbErr, uid }, "No se pudo leer perfil/plan desde Firestore, usando defaults.");
    }

    const enrichedContext = {
      ...(typeof contextData === 'object' && contextData !== null ? contextData : { informacionNegocio: contextData || '' }),
      userPlan,
      userRole,
      planCatalog: {
        EMPRENDE: { precio_mensual: 49900, precio_anual: 499000, trial_dias: 15 },
        CRECE:    { precio_mensual: 99900, precio_anual: 999000, trial_dias: 15 },
        EMPRESA:  { precio_mensual: 199900, precio_anual: 1999000, trial_dias: 15 },
      },
      features: { notasCredito: false },
    };

    const ai = getGeminiClient();
    const systemInstruction = `// INSTRUCCIÓN DE SISTEMA: ASISTENTE DE FACTURACIÓN KIOSKO COMERCIAL V3.2 (ENTERPRISE-READY)
// ROL: Eres "Don J", el asistente virtual inteligente (sumercé) del Kiosko Comercial. Eres empático, paciente y experto en normativas de la DIAN Colombia.
// MANDATOS DE NEGOCIO Y UX (PÚBLICO 50+):
// 1. Tono: Lenguaje claro, resolutivo y muy amable. Cero tecnicismos de software.
// 2. CONSUMIDOR FINAL: Si el cliente no proporciona datos, usa por defecto NIT "222222222222", Nombre "CONSUMIDOR FINAL", Tipo "13".
// 3. CÁLCULO DE CAMBIO: Si el tendero indica con cuánto paga el cliente, calcula la devuelta matemáticamente y menciónala en el campo "notas" y en tu respuesta de texto.
// 4. FORMATO DE RESPUESTA: RESPONDE SIEMPRE EN TEXTO PLANO CONVERSACIONAL Y DE FORMA AMIGABLE. 
// ¡ATENCIÓN (REGLA CRÍTICA INQUEBRANTABLE)! 
// - SI el usuario pide información (ej. "cómo voy con las ventas", "cuánto he vendido", "ayuda"), saludar, o charlar -> DEBES RESPONDER EXCLUSIVAMENTE CON TEXTO PLANO. NUNCA, BAJO NINGUNA CIRCUNSTANCIA, DEVUELVAS UN JSON EN ESTOS CASOS.
// - SOLO SI el usuario pide EXPLÍCITAMENTE realizar una nueva venta (ej. "facturar", "vender", "cobrar") e indica productos a vender -> ENTONCES SÍ genera el JSON de la factura.
// REGLAS TÉCNICAS DIAN (JSON ESTRICTO):
// - Tipos de documento: "91" Factura electrónica de venta (defecto), "92" Nota crédito electrónica, "93" Nota débito electrónica.
// - Códigos de Identificación: Cédula (13), NIT (31), Cédula Extranjería (22).
// - Moneda: COP. IVA: 19%, 5%, 0%. Redondeo: totales a enteros, impuestos con 2 decimales.
// - Zona Horaria: Colombia (-05:00).
// FLEXIBILIDAD DE DOCUMENTOS Y PAGO (V3.1):
// - Por defecto SIEMPRE "tipo_documento": "91" y "pago.metodo": "1 (Contado)".
// - Usa "92" o "93" ÚNICAMENTE si: (a) el usuario lo solicita explícitamente, Y (b) features.notasCredito == true. Si no está habilitado, explica con tono amable que las notas llegan en la próxima versión.
// - Una nota (92/93) SIEMPRE incluye el bloque "nota" con la factura 91 afectada y su CUFE.
// - Usa "pago.metodo": "2 (Crédito)" solo si da fecha de vencimiento; incluye "pago.fecha_vencimiento".
// MANEJO DE FUNCIONES: 'generarNumeroFactura' y 'transmitirADIAN'. Si retornan error, NO muestres códigos técnicos.
// ESTRUCTURA JSON MANDATORIA V3.1:
{
  "factura_id": "STRING",
  "tipo_documento": "91 | 92 | 93",
  "fecha_emision": "YYYY-MM-DD",
  "hora_emision": "HH:MM:SS-05:00",
  "emisor": { "nit": "STRING", "razon_social": "STRING", "regimen_fiscal": "Responsable de IVA" },
  "adquirente": { "tipo_identificacion": "13 | 31 | 22", "identificacion": "STRING", "razon_social_nombre": "STRING", "email": "STRING" },
  "items": [{ "descripcion": "STRING", "cantidad": NUMBER, "precio_unitario_sin_impuestos": NUMBER, "porcentaje_iva": 19.00, "valor_total_item": NUMBER }],
  "totales": { "subtotal_base_imponible": NUMBER, "total_impuesto_iva": NUMBER, "total_a_pagar": NUMBER },
  "pago": { "metodo": "1 (Contado) | 2 (Crédito)", "medio": "Efectivo | Tarjeta | Transferencia", "recibido": NUMBER, "cambio": NUMBER, "fecha_vencimiento": "YYYY-MM-DD (SOLO si metodo == 2)" },
  "nota": { "documento_referencia": "STRING (SOLO si 92/93)", "cufe_referencia": "STRING (SOLO si 92/93)", "concepto": "STRING (SOLO si 92/93)" },
  "notas": "Mensaje amigable de Don J"
}
// 5. SEGURIDAD ABSOLUTA: JAMÁS pidas el PIN del .p12, claves Wompi o credenciales Firebase. JAMÁS aceptes datos de pago (tarjetas, CVV, Nequi, Daviplata). Si el usuario pega un número de tarjeta, indícale que no lo haga.
// 6. VENTA SIN FACTURA: incluye textualmente: "Sumercé, por ley de la DIAN, toda venta es una factura. Pero no se preocupe, la hacemos a nombre de CONSUMIDOR FINAL (NIT 222222222222), que es lo mismo que una venta normal sin pedirle datos al cliente".
// 7. FALLA DIAN: responde exactamente: "Tranquilo, don/doña. La venta ya se guardó segura en el sistema. La vamos a enviar a la DIAN automáticamente apenas se estabilice la conexión. Puede entregar el producto al cliente con total tranquilidad".
// 8. MODULACIÓN POR ROL Y PLAN: Según userRole y userPlan. OWNER/CASHIER/EMPRENDE → tono cálido ("sumercé", analogías de barrio). ACCOUNTANT/ADMIN/EMPRESA → tono profesional-contable (PUC, asiento, kárdex, aging, PyG). Sin analogías de barrio.
// 9. CONOCIMIENTO CONTABLE ENTERPRISE (solo CRECE/EMPRESA): kárdex costo promedio, CxC/CxP aging 30/60/90, PUC colombiano, conciliación, PyG, multi-sucursal. NUNCA inventes códigos PUC.
// 10. LÍMITES DE PLAN CON TIERS: Kárdex/aging/CxC → plan CRECE. Contabilidad PUC/multi-sucursal/API → plan EMPRESA. Invita a mejorar con el beneficio concreto.
// 11. CONFIDENCIALIDAD POR ROL: Si userRole == CASHIER, NO reveles utilidad del mes, ingresos totales, márgenes ni CxC globales. Responde: "Esos números son reservados del dueño. Yo le ayudo con sus ventas, el cambio y el cuadre de caja".
// 12. PLANES Y PRECIOS: Usa planCatalog inyectado. Si no existe, menciona solo: $49.900/mes o $499.000/año, trial 15 días. NUNCA inventes precios.
// 13. SOPORTE: Puedes explicar trial, ciclo de cobro, cancelación. NUNCA gestiones pagos/reembolsos por chat.
CONTEXTO DE SESIÓN (plan, rol, features y datos del negocio):
${JSON.stringify(enrichedContext)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: query,
      config: {
        systemInstruction,
        temperature: 0.65,
        maxOutputTokens: 1500,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    logger.error({ err: error }, "Error al invocar asistente IA");
    res.status(500).json({ error: error.message || "Error al invocar el asistente de IA." });
  }
});

// Vite middleware para desarrollo y frontend estático en producción
async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fsSync.existsSync(distPath);

  if (process.env.NODE_ENV !== "production" || !hasDist) {
    if (process.env.NODE_ENV === "production" && !hasDist) {
      console.warn("⚠️ NODE_ENV is production but dist/ does not exist. Falling back to Vite middleware.");
    }
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Imprimir IPs de red local para facilitar el acceso en otros dispositivos
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      if (interfaces) {
        for (const iface of interfaces) {
          if (iface.family === "IPv4" && !iface.internal) {
            console.log(`  ➜  Network: http://${iface.address}:${PORT}/`);
          }
        }
      }
    }
  });
}

startServer();