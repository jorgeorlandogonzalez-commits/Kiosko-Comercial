const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

const targetActions = `                        <td className="px-6 py-4 whitespace-nowrap text-center">
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
                            ) : null}
                        </td>`;
const replacementActions = `                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            {inv.status === 'ANNULLED' ? (
                                <span className="text-gray-300 italic text-[10px] font-bold uppercase tracking-tighter">No Aplica</span>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                  {/* Envío Rápido en DIRECTO */}
                                  {storeSettings?.dianMode !== 'PUENTE' && (inv.dianStatus === 'DRAFT' || inv.dianStatus === 'REJECTED') && (
                                    <button 
                                      onClick={() => handleResend(inv)} 
                                      disabled={resendingId === inv.id}
                                      className="text-brand-black hover:text-brand-red disabled:opacity-50 transition-colors"
                                      title="Enviar Rápido"
                                    >
                                      {resendingId === inv.id ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => setActiveActionMenuId(inv.id)} 
                                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                                  >
                                    <MoreVertical size={18} />
                                  </button>
                                </div>
                            )}
                        </td>`;

if (code.includes(targetActions)) {
    code = code.replace(targetActions, replacementActions);
    console.log("REPLACED: Actions Column UI");
} else {
    console.log("TARGET NOT FOUND: Actions Column UI");
}

const functionBatchDirectTarget = `  const handleBatchExport = () => {`;
const functionBatchDirectReplacement = `  const handleBatchSendDirect = async () => {
    if (selectedIds.size === 0) return;
    const selected = invoices.filter(i => selectedIds.has(i.id));
    for (const inv of selected) {
        if (['DRAFT','REJECTED'].includes(inv.dianStatus || '')) {
            await handleResend(inv);
        }
    }
    setSelectedIds(new Set());
    alert("Proceso de lote finalizado.");
  };

  const handleBatchExport = () => {`;

if (code.includes(functionBatchDirectTarget)) {
    code = code.replace(functionBatchDirectTarget, functionBatchDirectReplacement);
    console.log("REPLACED: handleBatchSendDirect");
} else {
    console.log("TARGET NOT FOUND: handleBatchSendDirect");
}

const batchActionBarTarget = `      {/* Floating Action Bar */}
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
      )}`;
const batchActionBarReplacement = `      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand-black text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50">
          <div className="font-bold">
            <span className="text-brand-red text-xl">{selectedIds.size}</span> facturas seleccionadas
          </div>
          <div className="h-8 w-px bg-gray-600"></div>
          {storeSettings?.dianMode === 'PUENTE' ? (
             <button onClick={handleBatchExport} className="flex items-center gap-2 bg-brand-red hover:bg-red-700 px-4 py-2 rounded-xl font-bold transition-colors">
               <Download size={18} /> Cierre de Día (Exportar)
             </button>
          ) : (
             <button onClick={handleBatchSendDirect} className="flex items-center gap-2 bg-brand-red hover:bg-red-700 px-4 py-2 rounded-xl font-bold transition-colors">
               <Send size={18} /> Enviar Lote a la DIAN
             </button>
          )}
        </div>
      )}`;
      
if (code.includes(batchActionBarTarget)) {
    code = code.replace(batchActionBarTarget, batchActionBarReplacement);
    console.log("REPLACED: Batch Action Bar");
} else {
    console.log("TARGET NOT FOUND: Batch Action Bar");
}

const modalTarget = `      {/* Checklist Modal */}`;
const modalReplacement = `      {/* Action Menu Modal */}
      {activeActionMenuId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          {(() => {
             const inv = invoices.find(i => i.id === activeActionMenuId);
             if (!inv) return null;
             return (
              <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <div>
                    <h3 className="text-lg font-black text-brand-black">{inv.id}</h3>
                    <p className="text-xs text-gray-500 font-bold">{inv.customerName}</p>
                  </div>
                  <button onClick={() => setActiveActionMenuId(null)} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-sm font-bold text-gray-600">Total:</span>
                     <span className="text-xl font-black text-brand-black">\${inv.total.toLocaleString()}</span>
                  </div>
                  
                  {storeSettings?.dianMode === 'PUENTE' ? (
                     <>
                        <button onClick={() => { downloadPuentePDF(inv); setActiveActionMenuId(null); }} className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl font-bold text-sm text-brand-black">
                           <Download size={18} className="text-blue-500" /> Descargar PDF
                        </button>
                        <button onClick={() => { downloadResumen(inv); setActiveActionMenuId(null); }} className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl font-bold text-sm text-brand-black">
                           <FileText size={18} className="text-orange-500" /> Resumen Portal
                        </button>
                        <button onClick={() => window.print()} className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl font-bold text-sm text-brand-black">
                           <FileText size={18} className="text-gray-500" /> Imprimir
                        </button>
                        
                        <div className="border-t border-gray-100 my-2 pt-2">
                           <p className="text-xs font-bold text-gray-400 mb-2 px-3 uppercase tracking-wider">Portal DIAN</p>
                           <a href="https://gratis-vpfe.dian.gov.co" target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl font-bold text-sm text-brand-black">
                               <Upload size={18} className="text-brand-black" /> Abrir Portal DIAN
                           </a>
                           {inv.dianStatus === 'REGISTRADA_MANUAL' ? (
                               <div className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold mt-2 border border-green-100 flex flex-col gap-1">
                                   <span>Registrada</span>
                                   {inv.cufe && <span className="font-mono text-[10px] break-all">{inv.cufe}</span>}
                               </div>
                           ) : (
                               <div className="mt-2 flex flex-col gap-2 px-3">
                                   <input 
                                     type="text" 
                                     placeholder="Registrar CUFE aquí..." 
                                     value={manualCufe[inv.id] || ''} 
                                     onChange={e => setManualCufe({...manualCufe, [inv.id]: e.target.value})}
                                     className="w-full text-xs border rounded-lg px-3 py-2 outline-none focus:border-brand-red text-brand-black"
                                   />
                                   <button onClick={() => { handleManualSave(inv); setActiveActionMenuId(null); }} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2">
                                       <Save size={14} /> Guardar CUFE
                                   </button>
                               </div>
                           )}
                        </div>
                     </>
                  ) : (
                     <>
                        <button onClick={() => { downloadPuentePDF(inv); setActiveActionMenuId(null); }} className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl font-bold text-sm text-brand-black">
                           <Download size={18} className="text-blue-500" /> Descargar PDF
                        </button>
                        <button onClick={() => window.print()} className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl font-bold text-sm text-brand-black">
                           <FileText size={18} className="text-gray-500" /> Imprimir
                        </button>
                        
                        <div className="border-t border-gray-100 my-2 pt-2">
                           <p className="text-xs font-bold text-gray-400 mb-2 px-3 uppercase tracking-wider">DIAN Electrónica</p>
                           {['DRAFT', 'SENDING', 'REJECTED'].includes(inv.dianStatus || '') && (
                               <button onClick={() => { handleResend(inv); setActiveActionMenuId(null); }} className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl font-bold text-sm text-brand-black">
                                   <Send size={18} className="text-brand-red" /> Enviar a la DIAN
                               </button>
                           )}
                        </div>
                     </>
                  )}
                </div>
              </div>
             );
          })()}
        </div>
      )}

      {/* Checklist Modal */}`;

if (code.includes(modalTarget)) {
    code = code.replace(modalTarget, modalReplacement);
    console.log("REPLACED: Action modal");
} else {
    console.log("TARGET NOT FOUND: Action modal");
}

fs.writeFileSync('components/DianStatus.tsx', code);
