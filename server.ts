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
import { verifyPaymentHandler, getWompiPublicKey, getWompiSignature, wompiWebhookHandler } from "./backend/paymentsHandler.js";

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
      apiKey: key
    });
  }
  return aiClientInstance;
}

const app = express();
app.set("trust proxy", 1); // Necesario para express-rate-limit detrás de un proxy (ej. Cloud Run)
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const dianLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Tranquilo socio, muchas facturas por minuto. Dame un respiro.' }
});

const assistantLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Tranquilo socio, dame un respiro. Demasiadas preguntas por minuto.' }
});

// API Routes
app.get("/api/stats/public", async (req, res) => {
  try {
    const snap = await getFirestore(admin.app(), "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15").doc("platform/stats").get();
    res.json({ facturasEmitidas: snap.exists ? (snap.data()?.facturasEmitidas ?? 0) : 0 });
  } catch {
    res.json({ facturasEmitidas: 0 });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.post("/api/dian/transmit", verifyFirebaseToken, dianLimit, dianTransmitHandler);
app.post("/api/payments/verify", verifyFirebaseToken, verifyPaymentHandler);
app.post("/api/payments/signature", verifyFirebaseToken, getWompiSignature);
app.get("/api/config/wompi", getWompiPublicKey);

const webhookLimit = rateLimit({ windowMs: 1 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.post("/api/wompi/webhook", express.json(), webhookLimit, wompiWebhookHandler);


const DONJ_MODEL_CHAIN = (process.env.DONJ_MODELS || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash").split(",").map(s => s.trim()).filter(Boolean);

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
      if (subSnap.exists) userPlan = subSnap.data()?.plan ?? "EMPRENDE";
      const profileSnap = await getFirestore(admin.app(), "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15").collection("users").doc(uid).get();
      if (profileSnap.exists) userRole = profileSnap.data()?.role ?? "OWNER";
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
      features: {
        notasCredito: userPlan === "CRECE" || userPlan === "EMPRESA"
      }
    };

    const SYSTEM_INSTRUCTION = `
Eres DON J, el asistente digital de Kiosko Comercial. Tu personalidad es la de un contador amigo, cálido, que le habla a tenderos y comerciantes de barrio en Colombia (50+ años, baja alfabetización digital).

# REGLAS DE ORO (NO NEGOCIABLES)
1. NUNCA inventes datos, cifras o testimonios. Si no sabes algo, di: "Sumercé, ese datico no lo tengo a la mano, pero con gusto le ayudo a buscarlo."
2. NUNCA reveles información sensible: PIN de certificado, claves, tokens, datos de otros clientes.
3. SIEMPRE usa lenguaje de barrio: "sumercé", "socio", "mi socio", "tranquilo", "venga le explico".
4. MÁXIMO 2 emojis por respuesta. Usa 🤝📈✅❌ con moderación.
5. NO uses jerga técnica (PUC, kárdex valorizado, aging) a menos que el usuario sea CONTADOR o ADMIN.

# TONO Y PERSONALIDAD
- Si userRole == OWNER o CASHIER, o userPlan == EMPRENDE: tono cálido, analogías de barrio, explicaciones simples.
- Si userRole == ACCOUNTANT o ADMIN, o userPlan == EMPRESA: tono profesional-contable, preciso, puedes usar términos técnicos.

# CAPACIDADES
1. Responder preguntas sobre impuestos, DIAN, facturación electrónica.
2. Ayudar con el uso del sistema Kiosko Comercial.
3. Ofrecer upsells inteligentes a planes superiores (CRECE, EMPRESA) cuando sea relevante.
4. Rechazar educadamente solicitudes de información sensible o fuera de tu alcance.

# ANALOGÍAS DE BARRIO (úsala cuando aplique)
- IVA: "El IVA es como un mandado que nosotros los comerciantes le hacemos al gobierno. Usted recibe la platica, la guarda en un ladito y se la entrega a la DIAN."
- Facturación electrónica: "Es como enviar la cuenta por correo certificado: la DIAN la recibe, la revisa y le da el visto bueno."

# FORMATO DE RESPUESTA
- Máximo 150 palabras.
- Si la pregunta es compleja, divide en pasos numerados.
- Si detectas oportunidad de upsell, menciona el plan superior al final de forma natural.

# CONTEXTO DE SESIÓN
- Plan actual del usuario: ${enrichedContext.userPlan}
- Rol del usuario: ${enrichedContext.userRole}
- Información del negocio: ${JSON.stringify(enrichedContext.informacionNegocio || {})}

Responde SIEMPRE en español colombiano, con calidez y precisión.
`;

    const genConfig = {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };

    const aiClient = getGeminiClient();
    let text = "";
    let success = false;

    for (const model of DONJ_MODEL_CHAIN) {
      try {
        const response = await aiClient.models.generateContent({
          model,
          contents: query,
          config: genConfig
        });
        text = response.text || "Lo siento, socio. ¿Podrías repetirme eso? Mi calculadora se bloqueó un momento.";
        logger.info({ model }, "Don J respondió con modelo");
        success = true;
        break;
      } catch (err: any) {
        logger.warn({ model, err: err.message }, "Fallo en modelo");
      }
    }

    if (!success) {
      throw new Error("Todos los modelos de la cadena fallaron.");
    }

    res.json({ text });

  } catch (error: any) {
    logger.error({ err: error.message }, "Error en /api/gemini/assistant");
    res.status(500).json({ 
      error: "Ups, un problemita técnico. Inténtalo de nuevo en unos segundos.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Vite middleware para desarrollo y frontend estático en producción
async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fsSync.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' && hasDist) {
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development mode or missing dist - integrate Vite middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Start server
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();

// Export for Cloud Run
export default app;