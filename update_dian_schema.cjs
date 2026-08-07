const fs = require('fs');

let fileStr = fs.readFileSync('backend/dianBackendHandlers.ts', 'utf8');

const regex = /const itemSchema = z\.object\(\{[\s\S]*?\}\);[\s\S]*?\}\);/m;
const newSchemaStr = `const itemSchema = z.object({
  descripcion: z.string().min(1),
  cantidad: z.number().positive(),
  precio_unitario_sin_impuestos: z.number().min(0),
  porcentaje_iva: z.union([z.literal(0), z.literal(5), z.literal(19)]),
  valor_total_item: z.number().min(0),
});

const pagoSchema = z.object({
  metodo: z.enum(["1", "2", "1 (Contado)", "2 (Crédito)"]),
  medio: z.enum(["Efectivo", "Tarjeta", "Transferencia"]),
  recibido: z.number().min(0).optional(),
  cambio: z.number().min(0).optional(),
  fecha_vencimiento: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(),
});

const notaSchema = z.object({
  documento_referencia: z.string().min(1),
  cufe_referencia: z.string().min(1),
  concepto: z.string().min(1),
});

export const dianPayloadSchema = z.object({
  factura_id: z.string().min(1),
  tipo_documento: z.enum(["91", "92", "93"]),
  fecha_emision: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  hora_emision: z.string(),
  emisor: z.object({
    nit: z.string().min(1),
    razon_social: z.string().min(1),
    regimen_fiscal: z.string(),
  }),
  adquirente: z.object({
    tipo_identificacion: z.enum(["13", "31", "22"]),
    identificacion: z.string().min(1),
    razon_social_nombre: z.string().min(1),
    email: z.string().optional(),
  }),
  items: z.array(itemSchema).min(1),
  totales: z.object({
    subtotal_base_imponible: z.number().min(0),
    total_impuesto_iva: z.number().min(0),
    total_a_pagar: z.number().min(0),
  }),
  pago: pagoSchema,
  nota: notaSchema.optional(),
  notas: z.string().optional(),
}).superRefine((data, ctx) => {
  const esCredito = data.pago.metodo === "2" || data.pago.metodo === "2 (Crédito)";
  if ((data.tipo_documento === "92" || data.tipo_documento === "93") && !data.nota) {
    ctx.addIssue({ code: "custom", path: ["nota"], message: "Las notas crédito/débito (92/93) deben incluir el bloque 'nota' con la factura de referencia." });
  }
  if (data.tipo_documento === "91" && data.nota) {
    ctx.addIssue({ code: "custom", path: ["nota"], message: "Una factura de venta (91) no puede incluir el bloque 'nota'." });
  }
  if (esCredito && !data.pago.fecha_vencimiento) {
    ctx.addIssue({ code: "custom", path: ["pago", "fecha_vencimiento"], message: "Las ventas a crédito (método 2) deben incluir fecha_vencimiento." });
  }
});`;

// Wait, the regex might be tricky. Let's just find the start and end manually to be safer.
const startIndex = fileStr.indexOf("const itemSchema = z.object({");
const endStr = "  if (data.pago.metodo === \"2\" && !data.pago.fecha_vencimiento) {\n    ctx.addIssue({\n      code: z.ZodIssueCode.custom,\n      path: [\"pago\", \"fecha_vencimiento\"],\n      message: \"Las ventas a crédito (método 2) deben incluir fecha_vencimiento.\",\n    });\n  }\n});";

const endIndex = fileStr.indexOf(endStr);
if (startIndex !== -1 && endIndex !== -1) {
  fileStr = fileStr.substring(0, startIndex) + newSchemaStr + fileStr.substring(endIndex + endStr.length);
  fs.writeFileSync('backend/dianBackendHandlers.ts', fileStr);
  console.log('Schema replaced successfully.');
} else {
  console.error('Could not find schema block bounds.');
  console.log('Start index:', startIndex);
  console.log('End index:', endIndex);
}
