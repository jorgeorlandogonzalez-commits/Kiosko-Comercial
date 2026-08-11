const fs = require('fs');
let content = fs.readFileSync('components/POS.tsx', 'utf8');

const targetStr = `            <div className="flex-1 text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase mr-2">Total Flete:</span>
              <span className="text-xs font-black text-green-600">+\${formatMoney(shippingCost)}</span>
            </div>
          </div>`;

const withUI = `            <div className="flex-1 text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase mr-2">Total Flete:</span>
              <span className="text-xs font-black text-green-600">+\${formatMoney(shippingCost)}</span>
            </div>
          </div>

          {availableWithholdings.length > 0 && (
            <div className="flex flex-col gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm mt-2">
              <div className="flex items-center gap-2">
                <Percent size={18} className="text-brand-red" />
                <span className="text-[10px] font-black uppercase text-gray-500">Aplicar Retención:</span>
                <select 
                  className="flex-1 border-b-2 border-gray-200 bg-transparent py-1 px-1 outline-none text-xs font-bold text-gray-800"
                  onChange={e => {
                    const w = availableWithholdings.find(aw => aw.id === e.target.value);
                    if (w && !appliedWithholdings.some(aw => aw.withholdingId === w.id)) {
                      setAppliedWithholdings([...appliedWithholdings, { withholdingId: w.id, name: w.name, type: w.type, percentage: w.percentage, amount: 0 }]);
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">Seleccionar retención...</option>
                  {availableWithholdings.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.percentage}%)</option>
                  ))}
                </select>
              </div>
              
              {appliedWithholdings.length > 0 && (
                <div className="flex flex-col gap-1 mt-1 border-t border-gray-100 pt-2">
                  {cartTotals.appliedWithholdings && cartTotals.appliedWithholdings.map(aw => (
                    <div key={aw.withholdingId} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 text-xs">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setAppliedWithholdings(appliedWithholdings.filter(w => w.withholdingId !== aw.withholdingId))} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                        <span className="font-bold text-gray-700">{aw.name}</span>
                      </div>
                      <span className="font-black text-brand-red">-\${formatMoney(aw.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}`;

content = content.replace(targetStr, withUI);
fs.writeFileSync('components/POS.tsx', content);
