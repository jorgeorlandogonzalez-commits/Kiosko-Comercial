const fs = require('fs');

let fileStr = fs.readFileSync('backend/dianBackendHandlers.ts', 'utf8');

const targetStr = `tipo_documento: z.enum(["91", "92", "93"]),`;
const replacementStr = `tipo_documento: z.enum(["91", "92", "93"]).default("91"),`;

if (fileStr.includes(targetStr)) {
  fileStr = fileStr.replace(targetStr, replacementStr);
  fs.writeFileSync('backend/dianBackendHandlers.ts', fileStr);
  console.log('tipo_documento updated successfully.');
} else {
  console.error('Could not find target string in backend/dianBackendHandlers.ts');
}
