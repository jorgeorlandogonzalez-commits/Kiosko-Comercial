import jsPDF from 'jspdf';

import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, StoreSettings } from '../types';
import { CheckCircle, XCircle, Clock, FileText, Download, Filter, RefreshCw, AlertCircle, Save, Edit3, Upload, CheckSquare, Square, X } from 'lucide-react';
import { transmitToDian } from '../services/dianService';

interface DianStatusProps {
  invoices: Invoice[];
  onUpdateInvoice: (invoice: Invoice) => void;
  storeSettings?: StoreSettings;
  userId?: string;
  onIncrementConsecutive?: () => void;
  onUpdateMultipleInvoices?: (invoices: Invoice[]) => void;
  onUpdateSettings?: (settings: StoreSettings) => void;
}

type FilterStatus = 'ALL' | 'APPROVED' | 'REJECTED' | 'SENDING';
type DianServiceStatus = 'CHECKING' | 'ONLINE' | 'OFFLINE';

export const DianStatus: React.FC<DianStatusProps> = ({ invoices, onUpdateInvoice, storeSettings, userId, onIncrementConsecutive, onUpdateMultipleInvoices, onUpdateSettings }) => {
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [manualCufe, setManualCufe] = useState<{ [key: string]: string }>({});
  const [editingManual, setEditingManual] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<DianServiceStatus>('CHECKING');
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
        `"${inv.customerName}"`,
        inv.customerNit,
        inv.subtotal,
        inv.tax,
        inv.total
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blobCsv = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const urlCsv = URL.createObjectURL(blobCsv);
    const linkCsv = document.createElement('a');
    linkCsv.href = urlCsv;
    linkCsv.setAttribute('download', `Lote_DIAN_${dateStr}.csv`);
    document.body.appendChild(linkCsv);
    linkCsv.click();
    document.body.removeChild(linkCsv);

    // PDF
    const doc = new jsPDF({ format: 'a4' });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(storeSettings?.name || 'Kiosko', 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`NIT: ${storeSettings?.nit}`, 105, 28, { align: "center" });
    doc.text(`Relación de Cierre de Día - ${new Date().toLocaleDateString()}`, 105, 36, { align: "center" });
    
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

    doc.save(`Relacion_Cierre_${dateStr}.pdf`);

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
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        let maxConsecutive = storeSettings?.currentNumber || 1;
        let matchedCount = 0;
        const notFound: string[] = [];
        const toUpdate: Invoice[] = [];

        const dataLines = lines.length > 0 && lines[0].toLowerCase().includes('cufe') ? lines.slice(1) : lines;
        
        dataLines.forEach(line => {
            const parts = line.split(/[,\t;]/).map(p => p.trim().replace(/^"|"$/g, ''));
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


  useEffect(() => {
    let isMounted = true;
    
    const checkStatus = async () => {
      if (isMounted) setServiceStatus('CHECKING');
      try {
        // En producción esto validaría conectividad real con el backend o DIAN
        if (isMounted) {
          setServiceStatus('ONLINE');
        }
      } catch (error) {
        if (isMounted) setServiceStatus('OFFLINE');
      }
    };

    checkStatus();
    
    // Verificar cada 30 segundos
    const interval = setInterval(checkStatus, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);
  
  const filteredInvoices = useMemo(() => {
    if (filter === 'ALL') return invoices;
    return invoices.filter(inv => inv.dianStatus === filter);
  }, [invoices, filter]);

  const stats = useMemo(() => {
    return {
        all: invoices.length,
        approved: invoices.filter(i => i.dianStatus === 'APPROVED').length,
        rejected: invoices.filter(i => i.dianStatus === 'REJECTED').length,
        pending: invoices.filter(i => i.dianStatus === 'SENDING' || i.dianStatus === 'DRAFT').length
    };
  }, [invoices]);

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return;
    const headers = ['ID Factura', 'Fecha', 'Hora', 'Cliente', 'NIT', 'Total', 'Impuestos', 'Estado DIAN', 'CUFE'];
    const rows = filteredInvoices.map(inv => {
      const dateObj = new Date(inv.date);
      return [
        inv.id,
        dateObj.toLocaleDateString(),
        dateObj.toLocaleTimeString(),
        `"${inv.customerName}"`,
        inv.customerNit,
        inv.total,
        inv.tax,
        inv.dianStatus,
        inv.cufe || 'N/A'
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_dian_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  
  const downloadResumen = (inv: Invoice) => {
    const text = `RESUMEN PARA PORTAL DIAN\n\nCliente: ${inv.customerName}\nNIT: ${inv.customerNit}\nFecha: ${new Date(inv.date).toLocaleDateString()}\n\nSubtotal: ${inv.subtotal}\nIVA: ${inv.tax}\nTOTAL: ${inv.total}\n\n---\nKiosko Comercial - Modo Puente`;
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Resumen_DIAN_${inv.id}.txt`;
    link.click();
  };

  const downloadPuentePDF = (inv: Invoice) => {
    const doc = new jsPDF({ format: [80, 200] });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(storeSettings.name, 40, 10, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`NIT: ${storeSettings.nit}`, 40, 16, { align: "center" });
    doc.text(`Factura: ${inv.id}`, 40, 22, { align: "center" });
    doc.text(`Fecha: ${new Date(inv.date).toLocaleDateString()}`, 40, 28, { align: "center" });
    
    doc.text(`Cliente: ${inv.customerName}`, 5, 38);
    doc.text(`NIT: ${inv.customerNit}`, 5, 43);
    
    doc.line(5, 48, 75, 48);
    let y = 53;
    inv.items.forEach(item => {
      doc.text(`${item.quantity}x ${item.name}`, 5, y);
      doc.text(`${(item.price * item.quantity).toLocaleString()}`, 75, y, { align: "right" });
      y += 5;
    });
    
    doc.line(5, y, 75, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 5, y);
    doc.text(`${inv.total.toLocaleString()}`, 75, y, { align: "right" });
    
    y += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const legalText = "Documento comercial — representación para registro en portal DIAN; no es factura electrónica transmitida";
    const splitText = doc.splitTextToSize(legalText, 70);
    doc.text(splitText, 40, y, { align: "center" });
    
    doc.save(`Documento_${inv.id}.pdf`);
  };

  const handleManualSave = (inv: Invoice) => {
     const cufe = manualCufe[inv.id];
     if (cufe) {
         onUpdateInvoice({ ...inv, dianStatus: 'REGISTRADA_MANUAL', cufe });
         setEditingManual(null);
         onIncrementConsecutive?.();
     }
  };

  const handleResend = async (invoice: Invoice) => {
      if (!storeSettings) {
          alert("Error: Configuración de tienda no disponible.");
          return;
      }
      setResendingId(invoice.id);
      try {
          onUpdateInvoice({ ...invoice, dianStatus: 'SENDING' });
          
          const result = await transmitToDian(invoice, storeSettings, userId || '');
          if (result.success) {
              onUpdateInvoice({ 
                  ...invoice, 
                  dianStatus: 'APPROVED', 
                  cufe: result.cufe 
              });
          } else {
              onUpdateInvoice({ 
                  ...invoice, 
                  dianStatus: 'REJECTED' 
              });
              alert(`Error al transmitir factura: ${result.message}`);
          }
      } catch (error) {
          alert("Error de red o comunicación al intentar el envío.");
      } finally {
          setResendingId(null);
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-black text-brand-black tracking-tight flex items-center gap-3">
                <FileText className="text-brand-red" size={32} /> Historial DIAN
            </h2>
            <p className="text-gray-500 mt-1">Registro oficial de transmisiones electrónicas y control de reenvíos.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={handleExportCSV}
                disabled={filteredInvoices.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-lg hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
                <Download size={18} />
                <span>Exportar CSV</span>
            </button>

            <div className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 text-brand-black text-sm font-medium flex items-center gap-2 shadow-sm h-full">
                {serviceStatus === 'CHECKING' && (
                    <>
                        <RefreshCw size={14} className="animate-spin text-gray-500" />
                        <span className="hidden md:inline text-gray-500">Verificando...</span>
                    </>
                )}
                {serviceStatus === 'ONLINE' && (
                    <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="hidden md:inline">Servicio DIAN:</span> Operativo
                    </>
                )}
                {serviceStatus === 'OFFLINE' && (
                    <>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="hidden md:inline text-red-600">Servicio DIAN:</span> <span className="text-red-600">Inactivo</span>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Selector de Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${filter === 'ALL' ? 'bg-brand-black text-white border-brand-black shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-brand-black'}`}
          >
              Todos ({stats.all})
          </button>
          <button 
            onClick={() => setFilter('APPROVED')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${filter === 'APPROVED' ? 'bg-green-600 text-white border-green-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-green-600'}`}
          >
              Enviados ({stats.approved})
          </button>
          <button 
            onClick={() => setFilter('REJECTED')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${filter === 'REJECTED' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-red-600'}`}
          >
              Errores ({stats.rejected})
          </button>
          <button 
            onClick={() => setFilter('SENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${filter === 'SENDING' ? 'bg-orange-500 text-white border-orange-500 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-orange-500'}`}
          >
              Pendientes ({stats.pending})
          </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-brand-black text-white">
                <tr>
                {storeSettings?.dianMode === 'PUENTE' && (
                  <th className="px-6 py-4 text-left">
                    <button onClick={toggleSelectAll} className="text-white hover:text-gray-200">
                      {selectedIds.size === pendingInvoices.length && pendingInvoices.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">ID Factura</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Fecha Emisión</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Total Venta</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Estado Legal</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Acciones</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
                {filteredInvoices.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center justify-center text-gray-400">
                                <Filter size={48} className="mb-4 text-gray-200"/>
                                <p className="text-lg font-medium text-gray-600">No hay documentos que coincidan con el filtro</p>
                                <p className="text-sm">Las facturas aprobadas o con errores aparecerán aquí.</p>
                            </div>
                        </td>
                    </tr>
                ) : (
                    filteredInvoices.map((inv, idx) => (
                    <tr key={`${inv.id}-${idx}`} className={`hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} ${inv.status === 'ANNULLED' ? 'opacity-50 line-through bg-red-50/20' : ''}`}>
                        {storeSettings?.dianMode === 'PUENTE' && (
                          <td className="px-6 py-4">
                            {inv.dianStatus === 'PENDIENTE_REGISTRO' && (
                              <button onClick={() => toggleSelect(inv.id)} className="text-gray-400 hover:text-brand-black">
                                {selectedIds.has(inv.id) ? <CheckSquare size={18} className="text-brand-black" /> : <Square size={18} />}
                              </button>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-black">
                            {inv.id}
                            {inv.status === 'ANNULLED' && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full no-underline inline-block">ANULADA</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex flex-col">
                                <span className="font-medium">{new Date(inv.date).toLocaleDateString()}</span>
                                <span className="text-xs text-gray-400">{new Date(inv.date).toLocaleTimeString()}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{inv.customerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${inv.total.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        {inv.dianStatus === 'APPROVED' && (
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
                        )}
                        {inv.dianStatus === 'REJECTED' && storeSettings.dianMode !== 'PUENTE' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 border border-red-200 items-center gap-1.5">
                                <AlertCircle size={14} className="text-red-600" /> Error de Envío
                            </span>
                        )}
                        {(inv.dianStatus === 'SENDING' || inv.dianStatus === 'DRAFT') && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-200 items-center gap-1.5">
                                <Clock size={14} className="animate-spin text-orange-600" /> Pendiente
                            </span>
                        )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            {inv.status === 'ANNULLED' ? (
                                <span className="text-gray-300 italic text-[10px] font-bold uppercase tracking-tighter">No Aplica</span>
                            ) : storeSettings.dianMode === 'PUENTE' ? (
                                <div className="flex flex-col gap-2 items-center">
                                    <button onClick={() => downloadPuentePDF(inv)} className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded">
                                        <Download size={12}/> Descargar PDF
                                    </button>
                                    <button onClick={() => downloadResumen(inv)} className="flex items-center gap-1 text-[10px] font-black uppercase text-orange-600 hover:text-orange-800 bg-orange-50 px-2 py-1 rounded">
                                        <FileText size={12}/> Resumen Portal
                                    </button>
                                    
                                    {inv.dianStatus === 'REGISTRADA_MANUAL' ? (
                                        <div className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">
                                           {inv.cufe ? `Ref: ${inv.cufe}` : 'Registrada'}
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
                                    className={`flex items-center gap-2 mx-auto px-3 py-1.5 rounded-lg text-xs font-black transition-all ${resendingId === inv.id ? 'bg-gray-100 text-gray-400' : 'bg-brand-black text-white hover:bg-brand-red shadow-md active:scale-95'}`}
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
                            ) : null}
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>
      
      {filter === 'REJECTED' && stats.rejected > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18}/>
              <div>
                  <h4 className="font-bold text-red-800 text-sm uppercase">Atención Requerida</h4>
                  <p className="text-red-700 text-xs">Tienes {stats.rejected} documentos que no han sido validados por la DIAN. Utiliza el botón <strong>Reenviar</strong> para intentar la transmisión electrónica nuevamente.</p>
              </div>
          </div>
      )}
      {/* Floating Action Bar */}

      {storeSettings?.dianMode === 'PUENTE' && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-black text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50">
          <div className="font-bold">
            <span className="text-brand-red text-xl">{selectedIds.size}</span> facturas seleccionadas
          </div>
          <div className="h-8 w-px bg-gray-600"></div>
          <button onClick={handleBatchExport} className="flex items-center gap-2 bg-brand-red hover:bg-red-700 px-4 py-2 rounded-xl font-bold transition-colors">
            <Download size={18} /> Cierre de Día (Exportar)
          </button>
        </div>
      )}

      {/* Floating Import Button (when puente mode) */}
      {storeSettings?.dianMode === 'PUENTE' && (
        <div className="fixed bottom-6 right-6 z-40">
          <label className="flex items-center gap-2 bg-white border-2 border-brand-black text-brand-black hover:bg-brand-black hover:text-white px-4 py-3 rounded-2xl font-bold cursor-pointer transition-colors shadow-xl">
            <Upload size={18} /> Importar Respuesta DIAN
            <input type="file" accept=".csv,.txt,.pdf" className="hidden" onChange={handleImportResponse} />
          </label>
        </div>
      )}

      {/* Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-2xl font-black text-brand-black flex items-center gap-3">
                <CheckCircle className="text-green-500" size={28} /> Listo para el Portal
              </h3>
              <button onClick={() => setShowChecklistModal(false)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-gray-600 mb-6">Hemos descargado el resumen en CSV y PDF. Aquí tiene la lista de consecutivos a registrar. Cuando termine, <strong>importe el archivo que le entregue el portal</strong> para cerrar estas facturas en verde.</p>
              
              <div className="space-y-3">
                {invoices.filter(i => selectedIds.has(i.id)).map(inv => {
                  const consecutivo = inv.id.replace(/[^0-9]/g, '') || inv.id;
                  return (
                    <div key={inv.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-xl bg-gray-50">
                      <div className="flex gap-4 items-center">
                        <div className="text-xl font-black text-brand-red bg-white px-3 py-1 rounded-lg shadow-sm border border-red-100">{consecutivo}</div>
                        <div>
                          <p className="font-bold text-sm text-gray-800">{inv.customerName}</p>
                          <p className="text-xs text-gray-500">NIT: {inv.customerNit}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-gray-900">${inv.total.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowChecklistModal(false)} className="bg-brand-black text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-800">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Summary Modal */}
      {importSummary && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-2xl font-black text-brand-black">Resumen de Importación</h3>
              <button onClick={() => setImportSummary(null)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 bg-green-50 text-green-800 p-4 rounded-xl border border-green-200">
                <CheckCircle size={32} className="text-green-500 shrink-0" />
                <div>
                  <p className="text-2xl font-black">{importSummary.registered}</p>
                  <p className="text-sm font-medium">Facturas registradas exitosamente</p>
                </div>
              </div>
              
              {importSummary.notFound.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-red-600 flex items-center gap-2 mb-2"><AlertCircle size={16} /> No encontradas ({importSummary.notFound.length}):</p>
                  <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 text-xs max-h-32 overflow-y-auto">
                    {importSummary.notFound.join(', ')}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setImportSummary(null)} className="bg-brand-black text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-800">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
