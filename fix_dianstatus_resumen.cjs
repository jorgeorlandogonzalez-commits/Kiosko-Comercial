const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

const summaryFunc = `
  const downloadResumen = (inv: Invoice) => {
    const text = \`RESUMEN PARA PORTAL DIAN\\n\\nCliente: \${inv.customerName}\\nNIT: \${inv.customerNit}\\nFecha: \${new Date(inv.date).toLocaleDateString()}\\n\\nSubtotal: \${inv.subtotal}\\nIVA: \${inv.tax}\\nTOTAL: \${inv.total}\\n\\n---\\nKiosko Comercial - Modo Puente\`;
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = \`Resumen_DIAN_\${inv.id}.txt\`;
    link.click();
  };
`;

code = code.replace(/const downloadPuentePDF =/, summaryFunc + '\n  const downloadPuentePDF =');

const pdfButton = `<button onClick={() => downloadPuentePDF(inv)} className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                                        <Download size={12}/> Descargar PDF
                                    </button>`;
const newButtons = pdfButton + `
                                    <button onClick={() => downloadResumen(inv)} className="flex items-center gap-1 text-[10px] font-black uppercase text-orange-600 hover:text-orange-800 bg-orange-50 px-2 py-1 rounded">
                                        <FileText size={12}/> Resumen Portal
                                    </button>`;

code = code.replace(pdfButton, newButtons);

fs.writeFileSync('components/DianStatus.tsx', code);
console.log('Added resumen to DianStatus.tsx');
