const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

// Badges
const badgeTarget = `                        {inv.dianStatus === 'PENDIENTE_REGISTRO' && (
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
                        )}`;
const badgeReplacement = `                        {(inv.dianStatus === 'PENDIENTE_REGISTRO' || (storeSettings?.dianMode === 'PUENTE' && inv.dianStatus === 'DRAFT')) && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 items-center gap-1.5">
                                <Clock size={14} className="text-amber-600" /> Lista para Registrar
                            </span>
                        )}
                        {inv.dianStatus === 'REJECTED' && storeSettings?.dianMode !== 'PUENTE' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 border border-red-200 items-center gap-1.5">
                                <AlertCircle size={14} className="text-red-600" /> Error de Envío
                            </span>
                        )}
                        {inv.dianStatus === 'SENDING' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-200 items-center gap-1.5">
                                <Clock size={14} className="animate-spin text-orange-600" /> Enviando...
                            </span>
                        )}
                        {inv.dianStatus === 'DRAFT' && storeSettings?.dianMode !== 'PUENTE' && (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-100 text-gray-800 border border-gray-200 items-center gap-1.5">
                                <Clock size={14} className="text-gray-600" /> Pendiente
                            </span>
                        )}`;

if (code.includes(badgeTarget)) {
    code = code.replace(badgeTarget, badgeReplacement);
    console.log("REPLACED: Badges");
} else {
    console.log("TARGET NOT FOUND: Badges");
}

const idColTarget = `                            {inv.id}
                            {inv.status === 'ANNULLED' && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full no-underline inline-block">ANULADA</span>}`;
const idColReplacement = `                            {inv.id}
                            {inv.status === 'ANNULLED' && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full no-underline inline-block">ANULADA</span>}
                            {inv.isReturn && (
                                <div className="mt-1">
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Nota Débito/Crédito</span>
                                    {inv.originalId && <div className="text-[9px] text-gray-500 font-normal mt-0.5">Ref: {inv.originalId}</div>}
                                </div>
                            )}`;

if (code.includes(idColTarget)) {
    code = code.replace(idColTarget, idColReplacement);
    console.log("REPLACED: ID Column with isReturn");
} else {
    console.log("TARGET NOT FOUND: ID Column with isReturn");
}

fs.writeFileSync('components/DianStatus.tsx', code);
