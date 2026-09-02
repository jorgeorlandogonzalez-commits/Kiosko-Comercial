const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

const oldSection = `        {/* NUEVA SECCIÓN: Integración API DIAN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center gap-2">
            <ShieldAlert className="text-blue-600" size={20} />
            <h3 className="font-bold text-blue-600 uppercase text-sm">Integración API DIAN / Proveedor Tecnológico</h3>
          </div>`;

const newSection = `        {/* NUEVA SECCIÓN: Parametrización DIAN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-blue-600" size={20} />
              <h3 className="font-bold text-blue-600 uppercase text-sm">Modo de Operación DIAN</h3>
            </div>
            <div>
              <select name="certEstado" value={formData.certEstado || 'NINGUNO'} onChange={handleChange} className="text-xs bg-white border border-blue-200 rounded-lg px-2 py-1 text-blue-800 font-bold outline-none">
                <option value="NINGUNO">Sin Certificado</option>
                <option value="GRATUITO">Certificado Gratuito DIAN</option>
                <option value="COMERCIAL">Certificado .p12 Comercial</option>
              </select>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div 
              onClick={() => handleDianModeClick('PUENTE')}
              className={\`border-2 rounded-xl p-5 cursor-pointer transition-all \${(formData.dianMode || 'PUENTE') === 'PUENTE' ? 'border-brand-red bg-red-50/30 shadow-md ring-4 ring-red-50' : 'border-gray-200 hover:border-red-200 bg-white'}\`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-black text-gray-800 text-lg flex items-center gap-2">
                    <span className="text-2xl">🌉</span> MODO PUENTE
                  </h4>
                  <p className="text-sm text-gray-600 font-bold mt-1">Facturo en el portal gratuito de la DIAN</p>
                </div>
                <div className={\`w-6 h-6 rounded-full border-2 flex items-center justify-center \${(formData.dianMode || 'PUENTE') === 'PUENTE' ? 'border-brand-red bg-brand-red' : 'border-gray-300'}\`}>
                  {(formData.dianMode || 'PUENTE') === 'PUENTE' && <span className="text-white text-xs">✓</span>}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                Kiosko te deja todo listo; registras en 2 minutos. Ideal para negocios pequeños que usan el Facturador Gratuito de la DIAN.
              </p>
            </div>

            <div 
              onClick={() => {
                if (formData.certEstado === 'COMERCIAL' && isDianReady) {
                  handleDianModeClick('DIRECTO');
                }
              }}
              className={\`border-2 rounded-xl p-5 relative transition-all \${(formData.dianMode || 'PUENTE') === 'DIRECTO' ? 'border-brand-red bg-red-50/30 shadow-md ring-4 ring-red-50' : 'border-gray-200 bg-white'} \${!(formData.certEstado === 'COMERCIAL' && isDianReady) ? 'opacity-60 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-red-200'}\`}
            >
              {!(formData.certEstado === 'COMERCIAL' && isDianReady) && (
                <div className="absolute -top-3 -right-3 bg-gray-800 text-white p-2 rounded-full shadow-lg">
                  <ShieldCheck size={16} />
                </div>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-black text-gray-800 text-lg flex items-center gap-2">
                    <span className="text-2xl">🔐</span> MODO DIRECTO
                  </h4>
                  <p className="text-sm text-gray-600 font-bold mt-1">Facturo desde Kiosko con mi certificado .p12</p>
                </div>
                <div className={\`w-6 h-6 rounded-full border-2 flex items-center justify-center \${(formData.dianMode || 'PUENTE') === 'DIRECTO' ? 'border-brand-red bg-brand-red' : 'border-gray-300'}\`}>
                  {(formData.dianMode || 'PUENTE') === 'DIRECTO' && <span className="text-white text-xs">✓</span>}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                Transmisión automática; requiere certificado comercial y habilitación. Kiosko firma y transmite directamente a la DIAN.
              </p>

              {/* Controles para desbloquear el modo directo */}
              {!(formData.dianMode === 'DIRECTO') && (
                <div className="mt-4 pt-4 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isDianReady} 
                      onChange={e => setIsDianReady(e.target.checked)} 
                      disabled={formData.certEstado !== 'COMERCIAL'}
                      className="mt-1 w-4 h-4 accent-brand-red" 
                    />
                    <span className="text-[10px] text-gray-500 leading-tight">
                      Confirmo que completé el set de pruebas / estoy habilitado como software propio
                    </span>
                  </label>
                  {formData.certEstado !== 'COMERCIAL' && (
                    <p className="text-[9px] text-red-500 font-bold mt-2">
                      Debes seleccionar "Certificado .p12 Comercial" arriba para poder habilitar esta opción.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Configuraciones Adicionales si está en MODO DIRECTO */}
            {(formData.dianMode === 'DIRECTO') && (
              <div className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Ambiente DIAN</label>
                  <select name="dianAmbiente" value={formData.dianAmbiente || 'HABILITACION'} onChange={handleChange} className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red">
                    <option value="HABILITACION">Habilitación (Pruebas)</option>
                    <option value="PRODUCTIVO">Producción</option>
                  </select>
                </div>
                
                {formData.dianAmbiente === 'HABILITACION' && (
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Test Set ID (Solo para habilitación)</label>
                    <input type="text" name="dianTestSetId" value={formData.dianTestSetId || ''} onChange={handleChange} className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red font-mono" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">Software ID (DIAN)</label>
                    <input type="text" name="dianSoftwareId" value={formData.dianSoftwareId || ''} onChange={handleChange} className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red font-mono" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase mb-2">PIN del Software</label>
                    <input type="password" name="dianPin" value={formData.dianPin || ''} onChange={handleChange} className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red font-mono" placeholder="••••" />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <label className="block text-xs font-black text-gray-800 uppercase mb-2">Certificado Digital (.p12 / .pfx)</label>
                  <div className="flex items-center gap-4">
                    <input 
                       type="file" 
                       accept=".p12,.pfx" 
                       onChange={handleFileUpload} 
                       disabled={isUploading}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50" 
                     />
                    {(formData.certificateName || isUploading) && (
                      <span className="text-xs font-bold text-gray-700 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-2">
                        {isUploading ? 'Subiendo...' : '✓ ' + formData.certificateName}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">El certificado se encriptará y almacenará de forma segura en Cloud Storage.</p>
                </div>

              </div>
            )}
          </div>
        </div>`;

// Replace from oldSection up to `        {/* Sección: Personalización de Impresión */}`
const startIdx = code.indexOf(oldSection);
if (startIdx === -1) {
  console.log('Could not find old section');
  process.exit(1);
}
const endString = `        {/* Sección: Personalización de Impresión */}`;
const endIdx = code.indexOf(endString, startIdx);
if (endIdx === -1) {
  console.log('Could not find end of old section');
  process.exit(1);
}

const newCode = code.substring(0, startIdx) + newSection + '\n' + code.substring(endIdx);
fs.writeFileSync('components/Settings.tsx', newCode);
console.log('Replaced DIAN section');
