const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

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

fs.writeFileSync('components/DianStatus.tsx', code);
