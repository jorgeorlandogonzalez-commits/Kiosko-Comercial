/**
 * Kiosko Comercial - Servidor para Cloud Run
 * Versión minimalista SIN Vite, SOLO APIs de producción
 * Con middleware para validación de firma de webhooks Wompi
 */

import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import { dianTransmitHandler, verifyFirebaseToken } from "./backend/dianBackendHandlers.js";
import { createSubscriptionHandler, wompiWebhookHandler, getSubscriptionStatusHandler } from "./backend/paymentsHandler.js";

// ============================================================================
// LOGGING INICIAL (Crítico para debugging en Cloud Run)
// ============================================================================
console.log("🚀 [CloudRun] Iniciando servidor Kiosko Comercial...");
console.log(`📍 [CloudRun] NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`📍 [CloudRun] PORT: ${process.env.PORT || 'undefined'}`);
console.log(`📍 [CloudRun] FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID || 'undefined'}`);
console.log(`📍 [CloudRun] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '***CONFIGURED***' : '❌ MISSING'}`);
console.log(`📍 [CloudRun] WOMPI_EVENT_SECRET: ${process.env.WOMPI_EVENT_SECRET ? '***CONFIGURED***' : '⚠️  NOT SET (webhooks will be rejected in production)'}`);

// Capturar errores no manejados
process.on('uncaughtException', (error) => {
  console.error("❌ [CloudRun] UNCAUGHT EXCEPTION:", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("❌ [CloudRun] UNHANDLED REJECTION at:", promise, "reason:", reason);
  process.exit(1);
});

// ============================================================================
// FIREBASE ADMIN (Con manejo robusto de errores)
// ============================================================================
try {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0213647704';
    console.log(`🔥 [CloudRun] Inicializando Firebase Admin para proyecto: ${projectId}`);
    
    admin.initializeApp({
      projectId,
    });
    
    console.log("✅ [CloudRun] Firebase Admin inicializado correctamente");
  }
} catch (error) {
  console.error("❌ [CloudRun] Error inicializando Firebase Admin:", error);
  console.warn("⚠️  [CloudRun] Continuando sin Firebase Admin...");
}

// ============================================================================
// GEMINI AI (Lazy initialization)
// ============================================================================
let aiClientInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClientInstance) {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) {
      throw new Error("[CloudRun] GEMINI_API_KEY no está configurada en las variables de entorno.");
    }
    console.log("🤖 [CloudRun] Inicializando cliente Gemini AI...");
    aiClientInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'kiosko-comercial-cloudrun',
        }
      }
    });
    console.log("✅ [CloudRun] Gemini AI inicializado");
  }
  return aiClientInstance;
}

// ============================================================================
// EXPRESS APP
// ============================================================================
const app = express();

app.use(cors({ origin: true }));

// ============================================================================
// MIDDLEWARE CRÍTICO: Capturar rawBody para validación de firma Wompi
// DEBE IR ANTES DE express.json()
// ============================================================================
app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

app.use((req: any, res, next) => {
  if (req.url === '/api/payments/webhook' && Buffer.isBuffer(req.body)) {
    req.rawBody = req.body.toString('utf8');
    try {
      req.body = JSON.parse(req.rawBody);
    } catch (error) {
      console.error('[CloudRun] Error parseando JSON del webhook:', error);
      req.body = {};
    }
  }
  next();
});

// Middleware JSON para todas las demás rutas
app.use(express.json({ limit: '1mb' }));

// Rate limiters
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

// ============================================================================
// RUTAS API
// ============================================================================

// Health check (CRÍTICO para Cloud Run)
app.get("/api/health", (req, res) => {
  console.log("✅ [CloudRun] Health check recibido");
  res.json({ 
    status: "ok", 
    service: "kiosko-api",
    mode: "cloud-run",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// DIAN Transmission
app.post("/api/dian/transmit", verifyFirebaseToken, dianLimit, dianTransmitHandler);

// Wompi Payments
app.post("/api/payments/create-subscription", verifyFirebaseToken, createSubscriptionHandler);
app.post("/api/payments/webhook", wompiWebhookHandler);
app.get("/api/payments/status/:userId", verifyFirebaseToken, getSubscriptionStatusHandler);

// Gemini Assistant (Don J)
app.post("/api/gemini/assistant", assistantLimit, async (req, res) => {
  try {
    console.log("[CloudRun] Recibida consulta a Don J");
    const { query, contextData } = req.body;
    
    if (!query) {
      res.status(400).json({ error: "Falta la pregunta (query)." });
      return;
    }

    const ai = getGeminiClient();
    const systemInstruction = `
      IDENTIDAD: Te llamas "Don J". Eres el asistente, contador y mejor amigo del pequeño comerciante colombiano.
      AUDIENCIA: Comerciantes, dueños de tienda, panaderos y dueños de ferretería (personas de 50+ años, con muy poco conocimiento de tecnología o contabilidad).
      
      ESTILO DE COMUNICACIÓN (REGLA DE ORO INQUEBRANTABLE):
      - ¡ESTÁ TOTALMENTE PROHIBIDO USAR LENGUAJE TÉCNICO, CONTABLE COMPLEJO O ABURRIDO! 
      - Háblales con muchísimo respeto, calidez, paciencia y empatía. Trátalos de "sumercé", "don/doña", "socio".
      - Usa palabras de la calle y del comercio de barrio (ej: "la ganancia libre", "la plata que entra", "el surtido", "los gastos del local").
      - Explica TODO usando analogías muy simples de la vida diaria (ej: "el IVA es como un mandado que le hacemos al gobierno, usted cobra la plata pero se la guarda aparte para dársela después a la DIAN, esa platica no es suya").
      - Sé breve. Da respuestas al grano. Usa máximo 2 emojis por mensaje 🤝📈.
      - Tu objetivo es que le pierdan el miedo a la DIAN, a los impuestos y a la contabilidad.

      CONOCIMIENTOS DE CONTABILIDAD BÁSICA PARA EXPLICAR FÁCIL:
      - IVA: Es el impuesto al valor agregado. Explícalo como "un recaudo". Si el tendero cobra 19% o 5%, solo está de intermediario. Aconséjales apartar esa plata para fin de mes.
      - Utilidad (Ganancia real): Diferencia muy bien entre "la plata de la venta" (ingreso total) y "lo que queda para el bolsillo" (la utilidad libre). Enséñales que del total de la venta hay que sacar lo que costó el producto y los recibos/arriendo.
      - Papeles y DIAN (Facturación Electrónica): Diles que formalizarse y facturar electrónicamente no es un dolor de cabeza, es una llave mágica que les abre las puertas de los bancos para sacar créditos fáciles y tener tranquilidad de que nadie los va a multar.

      CONTEXTO DEL NEGOCIO DEL USUARIO EN ESTE MOMENTO:
      ${contextData || ''}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: query,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.65,
        maxOutputTokens: 1500,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    console.log("✅ [CloudRun] Don J respondió exitosamente");
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("❌ [CloudRun] Error en endpoint /api/gemini/assistant:", error);
    res.status(500).json({ error: error.message || "Error al invocar el asistente de IA." });
  }
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================
const PORT = Number(process.env.PORT) || 8080;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ [CloudRun] Servidor escuchando en puerto ${PORT}`);
  console.log(`✅ [CloudRun] Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ [CloudRun] Listo para recibir tráfico`);
});

// Manejar terminación graceful
process.on('SIGTERM', () => {
  console.log('[CloudRun] SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('[CloudRun] Servidor cerrado');
    process.exit(0);
  });
});
