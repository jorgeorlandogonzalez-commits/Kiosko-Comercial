import express from "express";
import path from "path";
import fsSync, { promises as fs } from "fs";
import cors from "cors";
import admin from "firebase-admin";
import rateLimit from "express-rate-limit";
import * as functions from "firebase-functions";
import { GoogleGenAI } from "@google/genai";
import pino from "pino";
import os from "os";
import { dianTransmitHandler, verifyFirebaseToken } from "./backend/dianBackendHandlers.js";
import { createSubscriptionHandler, wompiWebhookHandler, getSubscriptionStatusHandler } from "./backend/paymentsHandler.js";

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
const isProd = process.env.NODE_ENV === "production";

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
      logger.error({ err: error }, '[Server] Error parseando JSON del webhook');
      req.body = {};
    }
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
app.post("/api/payments/create-subscription", verifyFirebaseToken, createSubscriptionHandler);
app.post("/api/payments/webhook", wompiWebhookHandler);
app.get("/api/payments/status/:userId", verifyFirebaseToken, getSubscriptionStatusHandler);

app.post("/api/gemini/assistant", assistantLimit, async (req, res) => {
  try {
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
      - Usa palabras de la calle y del comercio de barrio.
      - Explica TODO usando analogías muy simples de la vida diaria (ej: el IVA es como un mandado).
      - Sé breve. Da respuestas al grano. Usa máximo 2 emojis por mensaje 🤝📈.
      - Tu objetivo es que le pierdan el miedo a la DIAN.

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

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error al invocar el asistente de IA:", error);
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