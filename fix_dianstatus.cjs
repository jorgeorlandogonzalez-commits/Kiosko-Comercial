const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

const importLines = `import { FileText, CheckCircle, AlertCircle, Clock, Filter, RefreshCw, Download, Edit3, Save } from 'lucide-react';`;
code = code.replace(/import { FileText.* } from 'lucide-react';/, importLines);
if (!code.includes('import jsPDF from')) {
    code = `import jsPDF from 'jspdf';\n` + code;
}

// Stats needs PENDIENTE_REGISTRO and REGISTRADA_MANUAL
const statsRegex = /const stats = \{\s*total: invoices.length,\s*approved: invoices.filter\(i => i.dianStatus === 'APPROVED'\).length,\s*rejected: invoices.filter\(i => i.dianStatus === 'REJECTED'\).length,\s*pending: invoices.filter\(i => i.dianStatus === 'SENDING' \|\| i.dianStatus === 'DRAFT'\).length\s*\};/;
const newStats = `  const stats = {
        total: invoices.length,
        approved: invoices.filter(i => i.dianStatus === 'APPROVED' || i.dianStatus === 'REGISTRADA_MANUAL').length,
        rejected: invoices.filter(i => i.dianStatus === 'REJECTED').length,
        pending: invoices.filter(i => i.dianStatus === 'SENDING' || i.dianStatus === 'DRAFT' || i.dianStatus === 'PENDIENTE_REGISTRO').length
    };`;
code = code.replace(statsRegex, newStats);

// Filter logic
const filterRegex = /const filteredInvoices = filter === 'ALL'\s*\? invoices\s*: invoices.filter\(inv => inv.dianStatus === filter\);/;
const newFilter = `  const filteredInvoices = filter === 'ALL' 
        ? invoices 
        : filter === 'APPROVED' ? invoices.filter(inv => inv.dianStatus === 'APPROVED' || inv.dianStatus === 'REGISTRADA_MANUAL')
        : filter === 'SENDING' ? invoices.filter(inv => inv.dianStatus === 'SENDING' || inv.dianStatus === 'DRAFT' || inv.dianStatus === 'PENDIENTE_REGISTRO')
        : invoices.filter(inv => inv.dianStatus === filter);`;
code = code.replace(filterRegex, newFilter);

// We need state for marking manual
const manualState = `  const [manualCufe, setManualCufe] = useState<{ [key: string]: string }>({});\n  const [editingManual, setEditingManual] = useState<string | null>(null);`;
code = code.replace(/const \[resendingId, setResendingId\] = useState<string \| null>\(null\);/, `const [resendingId, setResendingId] = useState<string | null>(null);\n` + manualState);

// Add the PDF generator for PUENTE
const pdfFunc = `
  const downloadPuentePDF = (inv: Invoice) => {
    const doc = new jsPDF({ format: [80, 200] });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(storeSettings.name, 40, 10, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(\`NIT: \${storeSettings.nit}\`, 40, 16, { align: "center" });
    doc.text(\`Factura: \${inv.id}\`, 40, 22, { align: "center" });
    doc.text(\`Fecha: \${new Date(inv.date).toLocaleDateString()}\`, 40, 28, { align: "center" });
    
    doc.text(\`Cliente: \${inv.customerName}\`, 5, 38);
    doc.text(\`NIT: \${inv.customerNit}\`, 5, 43);
    
    doc.line(5, 48, 75, 48);
    let y = 53;
    inv.items.forEach(item => {
      doc.text(\`\${item.quantity}x \${item.name}\`, 5, y);
      doc.text(\`$\${item.total.toLocaleString()}\`, 75, y, { align: "right" });
      y += 5;
    });
    
    doc.line(5, y, 75, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 5, y);
    doc.text(\`$\${inv.total.toLocaleString()}\`, 75, y, { align: "right" });
    
    y += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const legalText = "Documento comercial — representación para registro en portal DIAN; no es factura electrónica transmitida";
    const splitText = doc.splitTextToSize(legalText, 70);
    doc.text(splitText, 40, y, { align: "center" });
    
    doc.save(\`Documento_\${inv.id}.pdf\`);
  };

  const handleManualSave = (inv: Invoice) => {
     const cufe = manualCufe[inv.id];
     if (cufe) {
         onUpdateInvoice({ ...inv, dianStatus: 'REGISTRADA_MANUAL', cufe });
         setEditingManual(null);
     }
  };
`;
code = code.replace(/const handleResend = async \(invoice: Invoice\) => \{/, pdfFunc + `\n  const handleResend = async (invoice: Invoice) => {`);

// Badges
const approvedBadge = `{inv.dianStatus === 'APPROVED' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-900 border border-green-200 items-center gap-1.5">
                                <CheckCircle size={14} className="text-green-600" /> Enviada
                            </span>
                        )}`;
const newBadges = `{inv.dianStatus === 'APPROVED' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-900 border border-green-200 items-center gap-1.5">
                                <CheckCircle size={14} className="text-green-600" /> Transmitida
                            </span>
                        )}
                        {inv.dianStatus === 'REGISTRADA_MANUAL' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-900 border border-green-200 items-center gap-1.5">
                                <CheckCircle size={14} className="text-green-600" /> Registrada Portal
                            </span>
                        )}
                        {inv.dianStatus === 'PENDIENTE_REGISTRO' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 items-center gap-1.5">
                                <Clock size={14} className="text-amber-600" /> Lista para Registrar
                            </span>
                        )}`;
code = code.replace(approvedBadge, newBadges);

const rejectedBadge = `{inv.dianStatus === 'REJECTED' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 border border-red-200 items-center gap-1.5">
                                <AlertCircle size={14} className="text-red-600" /> Error de Envío
                            </span>
                        )}`;
const newRejectedBadge = `{inv.dianStatus === 'REJECTED' && storeSettings.dianMode !== 'PUENTE' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 border border-red-200 items-center gap-1.5">
                                <AlertCircle size={14} className="text-red-600" /> Error de Envío
                            </span>
                        )}`;
code = code.replace(rejectedBadge, newRejectedBadge);

// Buttons section
const buttonsRegex = /\{inv\.status === 'ANNULLED' \? \([\s\S]*?\) : null\}/;
const newButtons = `{inv.status === 'ANNULLED' ? (
                                <span className="text-gray-300 italic text-[10px] font-bold uppercase tracking-tighter">No Aplica</span>
                            ) : storeSettings.dianMode === 'PUENTE' ? (
                                <div className="flex flex-col gap-2 items-center">
                                    <button onClick={() => downloadPuentePDF(inv)} className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                                        <Download size={12}/> Descargar PDF
                                    </button>
                                    
                                    {inv.dianStatus === 'REGISTRADA_MANUAL' ? (
                                        <div className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
                                           {inv.cufe ? \`Ref: \${inv.cufe}\` : 'Registrada'}
                                        </div>
                                    ) : (
                                        editingManual === inv.id ? (
                                            <div className="flex flex-col gap-1 w-full max-w-[120px]">
                                                <input 
                                                  type="text" 
                                                  placeholder="Número / CUFE" 
                                                  value={manualCufe[inv.id] || ''} 
                                                  onChange={e => setManualCufe({...manualCufe, [inv.id]: e.target.value})}
                                                  className="text-[9px] border rounded px-1 py-0.5"
                                                />
                                                <div className="flex gap-1">
                                                    <button onClick={() => setEditingManual(null)} className="flex-1 bg-gray-200 text-[9px] rounded">X</button>
                                                    <button onClick={() => handleManualSave(inv)} className="flex-1 bg-green-500 text-white text-[9px] rounded flex justify-center py-0.5"><Save size={10}/></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => setEditingManual(inv.id)} className="flex items-center gap-1 text-[10px] font-black uppercase text-brand-black hover:text-brand-red bg-gray-100 px-2 py-1 rounded">
                                                <Edit3 size={12}/> Marcar Registrada
                                            </button>
                                        )
                                    )}
                                </div>
                            ) : (inv.dianStatus === 'REJECTED' || inv.dianStatus === 'SENDING' || inv.dianStatus === 'DRAFT') ? (
                                <button 
                                    onClick={() => handleResend(inv)}
                                    disabled={resendingId === inv.id}
                                    className={\`flex items-center gap-2 mx-auto px-3 py-1.5 rounded-lg text-xs font-black transition-all \${resendingId === inv.id ? 'bg-gray-100 text-gray-400' : 'bg-brand-black text-white hover:bg-brand-red shadow-md active:scale-95'}\`}
                                    title={inv.dianStatus === 'DRAFT' ? "Emitir Factura Electrónica" : "Reintentar transmisión a la DIAN"}
                                >
                                    {inv.dianStatus === 'DRAFT' ? (
                                        <FileText size={14} className={resendingId === inv.id ? 'animate-pulse' : ''} />
                                    ) : (
                                        <RefreshCw size={14} className={resendingId === inv.id ? 'animate-spin' : ''} />
                                    )}
                                    <span>{resendingId === inv.id ? 'Enviando...' : (inv.dianStatus === 'DRAFT' ? 'Emitir a DIAN' : 'Reenviar')}</span>
                                </button>
                            ) : inv.dianStatus === 'APPROVED' ? (
                                <span className="text-gray-300 italic text-[10px] font-bold uppercase tracking-tighter">Sincronizado</span>
                            ) : null}`;

code = code.replace(buttonsRegex, newButtons);

fs.writeFileSync('components/DianStatus.tsx', code);
console.log('Fixed DianStatus.tsx');
