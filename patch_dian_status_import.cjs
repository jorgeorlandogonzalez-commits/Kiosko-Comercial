const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

const target1 = `import { CheckCircle, XCircle, Clock, FileText, Download, Filter, RefreshCw, AlertCircle, Save, Edit3 } from 'lucide-react';`;
const replacement1 = `import { CheckCircle, XCircle, Clock, FileText, Download, Filter, RefreshCw, AlertCircle, Save, Edit3, Upload, CheckSquare, Square, X } from 'lucide-react';`;
code = code.replace(target1, replacement1);

const target2 = `  const [serviceStatus, setServiceStatus] = useState<DianServiceStatus>('CHECKING');`;
const replacement2 = `  const [serviceStatus, setServiceStatus] = useState<DianServiceStatus>('CHECKING');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [importSummary, setImportSummary] = useState<{ registered: number, notFound: string[] } | null>(null);

  const pendingInvoices = useMemo(() => invoices.filter(i => i.dianStatus === 'PENDIENTE_REGISTRO'), [invoices]);

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingInvoices.length && pendingInvoices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingInvoices.map(i => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchExport = () => {
    if (selectedIds.size === 0) return;
    const selected = invoices.filter(i => selectedIds.has(i.id)).sort((a,b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const dateStr = new Date().toISOString().split('T')[0];

    // CSV
    const headers = ['Consecutivo', 'ID_Factura', 'Fecha', 'Cliente', 'NIT', 'Subtotal', 'IVA', 'Total'];
    const rows = selected.map(inv => {
      const dateObj = new Date(inv.date);
      const consecutivo = inv.id.replace(/[^0-9]/g, '');
      return [
        consecutivo || inv.id,
        inv.id,
        dateObj.toLocaleDateString(),
        \`"\${inv.customerName}"\`,
        inv.customerNit,
        inv.subtotal,
        inv.tax,
        inv.total
      ].join(',');
    });
    const csvContent = '\\uFEFF' + [headers.join(','), ...rows].join('\\n');
    const blobCsv = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const urlCsv = URL.createObjectURL(blobCsv);
    const linkCsv = document.createElement('a');
    linkCsv.href = urlCsv;
    linkCsv.setAttribute('download', \`Lote_DIAN_\${dateStr}.csv\`);
    document.body.appendChild(linkCsv);
    linkCsv.click();
    document.body.removeChild(linkCsv);

    // PDF
    const doc = new jsPDF({ format: 'a4' });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(storeSettings?.name || 'Kiosko', 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(\`NIT: \${storeSettings?.nit}\`, 105, 28, { align: "center" });
    doc.text(\`Relación de Cierre de Día - \${new Date().toLocaleDateString()}\`, 105, 36, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    let y = 50;
    doc.text("Consecutivo", 15, y);
    doc.text("Cliente", 50, y);
    doc.text("NIT", 100, y);
    doc.text("Total", 160, y);
    doc.line(15, y+2, 195, y+2);
    
    y += 8;
    let sumTotal = 0;
    selected.forEach(inv => {
       const consecutivo = inv.id.replace(/[^0-9]/g, '');
       doc.text(consecutivo || inv.id, 15, y);
       doc.text(inv.customerName.substring(0,20), 50, y);
       doc.text(inv.customerNit, 100, y);
       doc.text(inv.total.toLocaleString(), 160, y);
       sumTotal += inv.total;
       y += 6;
       if (y > 270) {
           doc.addPage();
           y = 20;
       }
    });

    doc.line(15, y, 195, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DEL LOTE:", 100, y);
    doc.text(sumTotal.toLocaleString(), 160, y);

    y += 20;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const legalText = "Relación de documentos comerciales para registro ante la DIAN (modalidad facturador gratuito)";
    doc.text(legalText, 105, y, { align: "center" });

    doc.save(\`Relacion_Cierre_\${dateStr}.pdf\`);

    setShowChecklistModal(true);
  };

  const handleImportResponse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf')) {
        alert("El PDF no trae datos legibles; use el .csv o .txt que exporta el portal");
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\\n').map(l => l.trim()).filter(l => l);
        
        let maxConsecutive = storeSettings?.currentNumber || 1;
        let matchedCount = 0;
        const notFound: string[] = [];
        const toUpdate: Invoice[] = [];

        const dataLines = lines.length > 0 && lines[0].toLowerCase().includes('cufe') ? lines.slice(1) : lines;
        
        dataLines.forEach(line => {
            const parts = line.split(/[,\\t;]/).map(p => p.trim().replace(/^"|"$/g, ''));
            if (parts.length >= 2) {
                const refId = parts[0];
                const cufe = parts.length > 1 ? parts[parts.length-1] : parts[1];

                const inv = pendingInvoices.find(i => i.id === refId || i.id.includes(refId));
                if (inv) {
                   toUpdate.push({ ...inv, dianStatus: 'REGISTRADA_MANUAL', cufe });
                   matchedCount++;
                   const num = parseInt(inv.id.replace(/[^0-9]/g, ''));
                   if (!isNaN(num) && num >= maxConsecutive) {
                       maxConsecutive = num + 1;
                   }
                } else {
                   notFound.push(refId);
                }
            }
        });

        if (toUpdate.length > 0) {
            if (onUpdateMultipleInvoices) {
                onUpdateMultipleInvoices(toUpdate);
            } else {
                toUpdate.forEach(inv => onUpdateInvoice(inv));
            }
            if (storeSettings && onUpdateSettings) {
                onUpdateSettings({ ...storeSettings, currentNumber: maxConsecutive });
            } else if (onIncrementConsecutive) {
                // fallback multiple calls if needed but better just let state handle it or user 
                // wait, if we updated maxConsecutive, onUpdateSettings is preferred.
            }
        }

        setImportSummary({ registered: matchedCount, notFound });
        setSelectedIds(new Set());
        e.target.value = '';
    };
    reader.readAsText(file);
  };
`;
code = code.replace(target2, replacement2);

fs.writeFileSync('components/DianStatus.tsx', code);
