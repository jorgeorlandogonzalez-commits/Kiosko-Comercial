const fs = require('fs');
let code = fs.readFileSync('components/Settings.tsx', 'utf8');

const diagnosticModal = `
      {/* MODAL ASISTENTE DIAGNÓSTICO DIAN */}
      {showDiagnosticModal && (
          <div className="fixed inset-0 z-[600] bg-brand-black/90 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2"><Store className="text-brand-red" /> Don J te ayuda a configurar</h3>
                          <p className="text-xs text-gray-500 font-bold mt-1">Pregunta {diagnosticStep} de 2</p>
                      </div>
                  </div>
                  <div className="p-8">
                      {diagnosticStep === 1 && (
                          <>
                              <p className="text-sm text-gray-600 font-medium mb-6 leading-relaxed">
                                  ¡Qué bueno verle por acá, mi socio! Para que la DIAN no nos moleste, cuénteme: <strong>¿Usted cómo hace hoy sus facturas electrónicas?</strong>
                              </p>
                              <div className="space-y-3">
                                  <button onClick={() => { setDiagnosticAnswers({ ...diagnosticAnswers, type: 'GRATUITO' }); setDiagnosticStep(2); }} className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-brand-red hover:bg-red-50 transition-all">
                                      <p className="font-black text-brand-black text-sm uppercase">Uso el portal gratuito de la DIAN</p>
                                      <p className="text-[10px] text-gray-500 mt-1">Me meto a la página de la DIAN a hacerlas a mano.</p>
                                  </button>
                                  <button onClick={() => { setDiagnosticAnswers({ ...diagnosticAnswers, type: 'COMERCIAL' }); setDiagnosticStep(2); }} className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-brand-red hover:bg-red-50 transition-all">
                                      <p className="font-black text-brand-black text-sm uppercase">Compré un certificado digital (.p12)</p>
                                      <p className="text-[10px] text-gray-500 mt-1">Lo tengo guardado en mi computador y listo para usar.</p>
                                  </button>
                              </div>
                          </>
                      )}
                      
                      {diagnosticStep === 2 && diagnosticAnswers.type === 'GRATUITO' && (
                          <>
                              <p className="text-sm text-gray-600 font-medium mb-6 leading-relaxed">
                                  ¡Listo, don/doña! Lo mejor para usted ahorita es el <strong>Modo Puente</strong>. Kiosko le deja todo listico para que usted solo suba la info al portal de la DIAN en dos minuticos, sin enredarse la vida.
                              </p>
                              <button onClick={() => applyDiagnosticResult('PUENTE', 'GRATUITO')} className="w-full py-4 bg-brand-red text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/30">
                                  ¡Hágale, Configurar Modo Puente!
                              </button>
                          </>
                      )}

                      {diagnosticStep === 2 && diagnosticAnswers.type === 'COMERCIAL' && (
                          <>
                              <p className="text-sm text-gray-600 font-medium mb-6 leading-relaxed">
                                  Uf, puro nivel mi socio. Una preguntica más: <strong>¿Usted ya hizo el proceso de habilitación (el set de pruebas de la DIAN)?</strong>
                              </p>
                              <div className="space-y-3">
                                  <button onClick={() => applyDiagnosticResult('DIRECTO', 'COMERCIAL')} className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-brand-red hover:bg-red-50 transition-all">
                                      <p className="font-black text-brand-black text-sm uppercase">Sí, ya estoy habilitado al 100%</p>
                                      <p className="text-[10px] text-gray-500 mt-1">Ya pasé las pruebas y estoy en producción.</p>
                                  </button>
                                  <button onClick={() => applyDiagnosticResult('PUENTE', 'COMERCIAL')} className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-brand-red hover:bg-red-50 transition-all">
                                      <p className="font-black text-brand-black text-sm uppercase">No, todavía me falta</p>
                                      <p className="text-[10px] text-gray-500 mt-1">Tengo el archivo pero no he hecho las pruebas.</p>
                                  </button>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-4 text-center italic">* Si aún le falta, le sugerimos el Modo Puente por ahora. ¡Nosotros le avisamos cuando Kiosko automatice la habilitación!</p>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
`;

const stateVars = `
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(!settings.dianMode);
  const [diagnosticStep, setDiagnosticStep] = useState(1);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<{type: 'GRATUITO' | 'COMERCIAL' | null}>({type: null});

  const applyDiagnosticResult = (mode: 'PUENTE'|'DIRECTO', cert: 'GRATUITO'|'COMERCIAL') => {
      setFormData(prev => ({ ...prev, dianMode: mode, certEstado: cert }));
      setShowDiagnosticModal(false);
  };
`;

code = code.replace(/const \[pendingMode, setPendingMode\] = useState<'PUENTE'\|'DIRECTO'\|null>\(null\);/, `const [pendingMode, setPendingMode] = useState<'PUENTE'|'DIRECTO'|null>(null);` + stateVars);
code = code.replace('{/* MODAL CAMBIO DE MODO DIAN */}', diagnosticModal + '\n      {/* MODAL CAMBIO DE MODO DIAN */}');

fs.writeFileSync('components/Settings.tsx', code);
console.log('Added diagnostic modal');
