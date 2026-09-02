const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

const modeModal = `
      {/* MODAL CAMBIO DE MODO DIAN */}
      {showModeModal && (
          <div className="fixed inset-0 z-[600] bg-brand-black/80 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border-t-8 border-brand-red shadow-2xl animate-in zoom-in-95 flex flex-col">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2"><ShieldAlert className="text-brand-red" /> {pendingMode === 'PUENTE' ? 'Modo Puente' : 'Modo Directo'}</h3>
                          <p className="text-xs text-gray-500 font-bold tracking-widest uppercase mt-1">Cambio de Parametrización</p>
                      </div>
                  </div>
                  <div className="p-8 shrink-0">
                      <p className="text-sm text-gray-600 font-medium mb-8 leading-relaxed">
                          {pendingMode === 'PUENTE' 
                            ? 'Sumercé, al pasar al Modo Puente, Kiosko ya no transmitirá automáticamente las facturas. Usted tendrá que descargarlas y subirlas manualmente al portal gratuito de la DIAN. ¿Está seguro?' 
                            : 'Mi socio, al pasar al Modo Directo, Kiosko transmitirá automáticamente todas las facturas a la DIAN usando su certificado. Asegúrese de estar habilitado para evitar dolores de cabeza. ¿Continuamos?'}
                      </p>
                      <div className="flex gap-4">
                          <button onClick={() => setShowModeModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all">Mejor No</button>
                          <button onClick={confirmDianMode} className="flex-1 py-4 bg-brand-red text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/30">Sí, Cambiar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
`;

const anchor = `{showResetModal && (`;
const idx = code.indexOf(anchor);
if (idx === -1) {
  console.log('Error adding modal');
  process.exit(1);
}
const newCode = code.substring(0, idx) + modeModal + '\n      ' + code.substring(idx);
fs.writeFileSync('components/Settings.tsx', newCode);
console.log('Added modal');
