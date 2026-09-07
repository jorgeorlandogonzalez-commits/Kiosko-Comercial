const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

const theadTarget = `<th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">ID Factura</th>`;
const theadReplacement = `{storeSettings?.dianMode === 'PUENTE' && (
                  <th className="px-6 py-4 text-left">
                    <button onClick={toggleSelectAll} className="text-white hover:text-gray-200">
                      {selectedIds.size === pendingInvoices.length && pendingInvoices.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">ID Factura</th>`;
code = code.replace(theadTarget, theadReplacement);

const trTarget = `<td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-black">`;
const trReplacement = `{storeSettings?.dianMode === 'PUENTE' && (
                          <td className="px-6 py-4">
                            {inv.dianStatus === 'PENDIENTE_REGISTRO' && (
                              <button onClick={() => toggleSelect(inv.id)} className="text-gray-400 hover:text-brand-black">
                                {selectedIds.has(inv.id) ? <CheckSquare size={18} className="text-brand-black" /> : <Square size={18} />}
                              </button>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-black">`;
code = code.replace(trTarget, trReplacement);


const footerTarget = `    </div>
  );
};`;
const footerReplacement = `    </div>
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
                        <p className="font-black text-lg text-gray-900">\${inv.total.toLocaleString()}</p>
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
  );
};`;
code = code.replace(footerTarget, footerReplacement);

fs.writeFileSync('components/DianStatus.tsx', code);
