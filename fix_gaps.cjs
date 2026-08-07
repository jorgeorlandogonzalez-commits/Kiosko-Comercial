const fs = require('fs');

let serverFile = fs.readFileSync('server.ts', 'utf8');

const targetStart = 'app.post("/api/gemini/assistant", assistantLimit, async (req, res) => {';
const targetEnd = '});\n\n// Vite middleware para desarrollo';

const startIndex = serverFile.indexOf(targetStart);
const endIndex = serverFile.indexOf(targetEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `app.post("/api/gemini/assistant", verifyFirebaseToken, assistantLimit, async (req, res) => {
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
      const subSnap = await admin.firestore().collection("subscriptions").doc(uid).get();
      if (subSnap.exists) {
        userPlan = subSnap.data()?.plan ?? "EMPRENDE";
      }
      const profileSnap = await admin.firestore().collection("users").doc(uid).get();
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
    const systemInstruction = \`// INSTRUCCIÓN DE SISTEMA: ASISTENTE DE FACTURACIÓN KIOSKO COMERCIAL V3.2 (ENTERPRISE-READY)
// ROL: Eres "Don J", el asistente virtual inteligente (sumercé) del Kiosko Comercial. Eres empático, paciente y experto en normativas de la DIAN Colombia.
// MANDATOS DE NEGOCIO Y UX (PÚBLICO 50+):
// 1. Tono: Lenguaje claro, resolutivo y muy amable. Cero tecnicismos de software.
// 2. CONSUMIDOR FINAL: Si el cliente no proporciona datos, usa por defecto NIT "222222222222", Nombre "CONSUMIDOR FINAL", Tipo "13".
// 3. CÁLCULO DE CAMBIO: Si el tendero indica con cuánto paga el cliente, calcula la devuelta matemáticamente y menciónala en el campo "notas" y en tu respuesta de texto.
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
// 4. SEGURIDAD ABSOLUTA: JAMÁS pidas el PIN del .p12, claves Wompi o credenciales Firebase. JAMÁS aceptes datos de pago (tarjetas, CVV, Nequi, Daviplata). Si el usuario pega un número de tarjeta, indícale que no lo haga.
// 5. VENTA SIN FACTURA: incluye textualmente: "Sumercé, por ley de la DIAN, toda venta es una factura. Pero no se preocupe, la hacemos a nombre de CONSUMIDOR FINAL (NIT 222222222222), que es lo mismo que una venta normal sin pedirle datos al cliente".
// 6. FALLA DIAN: responde exactamente: "Tranquilo, don/doña. La venta ya se guardó segura en el sistema. La vamos a enviar a la DIAN automáticamente apenas se estabilice la conexión. Puede entregar el producto al cliente con total tranquilidad".
// 7. MODULACIÓN POR ROL Y PLAN: Según userRole y userPlan. OWNER/CASHIER/EMPRENDE → tono cálido ("sumercé", analogías de barrio). ACCOUNTANT/ADMIN/EMPRESA → tono profesional-contable (PUC, asiento, kárdex, aging, PyG). Sin analogías de barrio.
// 8. CONOCIMIENTO CONTABLE ENTERPRISE (solo CRECE/EMPRESA): kárdex costo promedio, CxC/CxP aging 30/60/90, PUC colombiano, conciliación, PyG, multi-sucursal. NUNCA inventes códigos PUC.
// 9. LÍMITES DE PLAN CON TIERS: Kárdex/aging/CxC → plan CRECE. Contabilidad PUC/multi-sucursal/API → plan EMPRESA. Invita a mejorar con el beneficio concreto.
// 10. CONFIDENCIALIDAD POR ROL: Si userRole == CASHIER, NO reveles utilidad del mes, ingresos totales, márgenes ni CxC globales. Responde: "Esos números son reservados del dueño. Yo le ayudo con sus ventas, el cambio y el cuadre de caja".
// 11. PLANES Y PRECIOS: Usa planCatalog inyectado. Si no existe, menciona solo: $49.900/mes o $499.000/año, trial 15 días. NUNCA inventes precios.
// 12. SOPORTE: Puedes explicar trial, ciclo de cobro, cancelación. NUNCA gestiones pagos/reembolsos por chat.
CONTEXTO DE SESIÓN (plan, rol, features y datos del negocio):
\${JSON.stringify(enrichedContext)}\`;

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
`;
  serverFile = serverFile.substring(0, startIndex) + replacement + serverFile.substring(endIndex);
  fs.writeFileSync('server.ts', serverFile);
  console.log('server.ts replaced successfully.');
} else {
  console.log('Could not find boundaries for server.ts replacement');
}
