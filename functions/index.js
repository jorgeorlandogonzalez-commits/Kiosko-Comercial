const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const { createHash } = require("crypto");
const { z } = require("zod");

// Inicializar Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Schema de validación (ligero para Functions)
const invoiceSchema = z.object({
  id: z.string().min(1),
  total: z.number().min(0),
  customerNit: z.string().min(1),
  items: z.array(z.any()).min(1)
});

// ✅ RUTA CORREGIDA: Coincide con el rewrite de firebase.json
app.post("/api/dian/transmit", async (req, res) => {
  try {
    const { invoice, settings } = req.body;
    
    // Auth Check
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No Auth Token' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    await admin.auth().verifyIdToken(token);

    // Validation
    const validation = invoiceSchema.safeParse(invoice);
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Datos inválidos',
        errors: validation.error.errors 
      });
    }

    // CUFE (SHA-384) - Campos mínimos para MVP
    const seed = `${invoice.id}${Math.floor(invoice.total)}${settings.nit}${invoice.customerNit}111${Date.now()}`;
    const cufe = createHash('sha384').update(seed).digest('hex').toUpperCase();

    // Mock DIAN Delay (para MVP; en prod, llamar al PT real)
    await new Promise(r => setTimeout(r, 800));

    res.json({
      success: true,
      message: "Factura Transmitida con Éxito (APPROVED)",
      cufe,
      qrCode: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentKey=${cufe}`,
      dianStatus: "APPROVED",
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error en Cloud Function:", e);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? e.message : undefined 
    });
  }
});

// Endpoint de salud para monitoreo
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "kiosko-api", timestamp: new Date().toISOString() });
});

// ✅ Exportar como "kiosko_api" (coincide con firebase.json)
exports.kiosko_api = functions.https.onRequest(app);