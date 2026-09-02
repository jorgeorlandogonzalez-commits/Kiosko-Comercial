const fs = require('fs');
let code = fs.readFileSync('backend/dianBackendHandlers.ts', 'utf8');

const oldFunc = `async function transmitirAProveedorTecnologico(
  xmlFirmado: string, 
  cufe: string, 
  invoiceId: string
): Promise<{ approved: boolean; dianResponse: any; error?: string }> {
  
  const ptEndpoint = process.env.PT_API_URL;
  const ptApiKey = process.env.PT_API_KEY;
  
  if (!ptEndpoint) {
    throw new Error('Proveedor Tecnológico no configurado. Establezca PT_API_URL en variables de entorno.');
  }`;

const newFunc = `async function transmitirAProveedorTecnologico(
  xmlFirmado: string, 
  cufe: string, 
  invoiceId: string,
  settings: any
): Promise<{ approved: boolean; dianResponse: any; error?: string }> {
  
  const isHab = settings?.dianAmbiente === 'HABILITACION';
  let ptEndpoint = isHab ? (process.env.DIAN_HAB_URL || process.env.PT_API_URL) : process.env.PT_API_URL;
  let ptApiKey = settings?.dianApiKey || process.env.PT_API_KEY;
  
  // Si Kiosko_Comercial usa la configuración por defecto
  if (!ptEndpoint) {
    throw new Error('Configura tu proveedor/ambiente en Ajustes');
  }`;

code = code.replace(oldFunc, newFunc);

const oldCall = `    const { approved, dianResponse, error: ptError } = await transmitirAProveedorTecnologico(
      xmlFirmado, 
      cufe, 
      invoice.factura_id || invoice.id
    );`;

const newCall = `    const { approved, dianResponse, error: ptError } = await transmitirAProveedorTecnologico(
      xmlFirmado, 
      cufe, 
      invoice.factura_id || invoice.id,
      settings
    );`;

code = code.replace(oldCall, newCall);

fs.writeFileSync('backend/dianBackendHandlers.ts', code);
console.log('Fixed dianBackendHandlers.ts');
