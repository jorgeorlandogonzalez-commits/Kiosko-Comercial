const fs = require('fs');
let code = fs.readFileSync('components/DianStatus.tsx', 'utf8');

// Section 3: Add MoreVertical to imports
if (code.includes(`import { CheckCircle, XCircle, Clock, FileText, Download, Filter, RefreshCw, AlertCircle, Save, Edit3, Upload, CheckSquare, Square, X } from 'lucide-react';`)) {
    code = code.replace(
        `import { CheckCircle, XCircle, Clock, FileText, Download, Filter, RefreshCw, AlertCircle, Save, Edit3, Upload, CheckSquare, Square, X } from 'lucide-react';`,
        `import { CheckCircle, XCircle, Clock, FileText, Download, Filter, RefreshCw, AlertCircle, Save, Edit3, Upload, CheckSquare, Square, X, MoreVertical, Send } from 'lucide-react';`
    );
    console.log("REPLACED: Imports in DianStatus");
} else {
    console.log("TARGET NOT FOUND: Imports in DianStatus");
}

// Section 3: Add activeActionMenuId state
const stateTarget = `  const [serviceStatus, setServiceStatus] = useState<DianServiceStatus>('CHECKING');`;
const stateReplacement = `  const [serviceStatus, setServiceStatus] = useState<DianServiceStatus>('CHECKING');
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);`;
if (code.includes(stateTarget)) {
    code = code.replace(stateTarget, stateReplacement);
    console.log("REPLACED: State in DianStatus");
} else {
    console.log("TARGET NOT FOUND: State in DianStatus");
}

// Section 2: Re-write the filtering block
const filterTarget = `  const filteredInvoices = useMemo(() => {
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
  }, [invoices]);`;

const filterReplacement = `  const stats = useMemo(() => {
    return {
        all: invoices.length,
        approved: invoices.filter(i => ['APPROVED','REGISTRADA_MANUAL'].includes(i.dianStatus || '')).length,
        rejected: invoices.filter(i => i.dianStatus === 'REJECTED').length,
        pending: invoices.filter(i => ['SENDING','DRAFT','PENDIENTE_REGISTRO'].includes(i.dianStatus || '')).length
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (filter === 'ALL') return invoices;
    if (filter === 'APPROVED') return invoices.filter(i => ['APPROVED','REGISTRADA_MANUAL'].includes(i.dianStatus || ''));
    if (filter === 'REJECTED') return invoices.filter(i => i.dianStatus === 'REJECTED');
    if (filter === 'SENDING') return invoices.filter(i => ['SENDING','DRAFT','PENDIENTE_REGISTRO'].includes(i.dianStatus || ''));
    return invoices;
  }, [invoices, filter]);`;

if (code.includes(filterTarget)) {
    code = code.replace(filterTarget, filterReplacement);
    console.log("REPLACED: Filter logic");
} else {
    console.log("TARGET NOT FOUND: Filter logic");
}

// Section 6: Renaming filters in UI
const filterUiTarget = `      <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => setFilter('ALL')}
            className={\`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 \${filter === 'ALL' ? 'bg-brand-black text-white border-brand-black shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-brand-black'}\`}
          >
              Todos ({stats.all})
          </button>
          <button 
            onClick={() => setFilter('APPROVED')}
            className={\`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 \${filter === 'APPROVED' ? 'bg-green-600 text-white border-green-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-green-600'}\`}
          >
              Enviados ({stats.approved})
          </button>
          <button 
            onClick={() => setFilter('REJECTED')}
            className={\`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 \${filter === 'REJECTED' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-red-600'}\`}
          >
              Errores ({stats.rejected})
          </button>
          <button 
            onClick={() => setFilter('SENDING')}
            className={\`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 \${filter === 'SENDING' ? 'bg-orange-500 text-white border-orange-500 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-orange-500'}\`}
          >
              Pendientes ({stats.pending})
          </button>
      </div>`;
      
const filterUiReplacement = `      <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => setFilter('ALL')}
            className={\`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 \${filter === 'ALL' ? 'bg-brand-black text-white border-brand-black shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-brand-black'}\`}
          >
              TODOS ({stats.all})
          </button>
          <button 
            onClick={() => setFilter('APPROVED')}
            className={\`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 \${filter === 'APPROVED' ? 'bg-green-600 text-white border-green-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-green-600'}\`}
          >
              EMITIDOS ({stats.approved})
          </button>
          <button 
            onClick={() => setFilter('REJECTED')}
            className={\`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 \${filter === 'REJECTED' ? 'bg-red-600 text-white border-red-600 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-red-600'}\`}
          >
              EN ERROR ({stats.rejected})
          </button>
          <button 
            onClick={() => setFilter('SENDING')}
            className={\`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 \${filter === 'SENDING' ? 'bg-orange-500 text-white border-orange-500 shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-orange-500'}\`}
          >
              PENDIENTES ({stats.pending})
          </button>
      </div>`;

if (code.includes(filterUiTarget)) {
    code = code.replace(filterUiTarget, filterUiReplacement);
    console.log("REPLACED: Filter UI");
} else {
    console.log("TARGET NOT FOUND: Filter UI");
}


// Section 2: Checkbox logic in thead and tbody
const pendingInvoicesTarget = `  const pendingInvoices = useMemo(() => invoices.filter(i => i.dianStatus === 'PENDIENTE_REGISTRO'), [invoices]);`;
const pendingInvoicesReplacement = `  const pendingInvoices = useMemo(() => invoices.filter(i => {
    if (storeSettings?.dianMode === 'PUENTE') return ['PENDIENTE_REGISTRO','DRAFT','SENDING','REJECTED'].includes(i.dianStatus || '');
    return ['DRAFT','SENDING','REJECTED'].includes(i.dianStatus || '');
  }), [invoices, storeSettings?.dianMode]);`;
if (code.includes(pendingInvoicesTarget)) {
    code = code.replace(pendingInvoicesTarget, pendingInvoicesReplacement);
    console.log("REPLACED: pendingInvoices logic");
} else {
    console.log("TARGET NOT FOUND: pendingInvoices logic");
}

const theadCheckboxTarget = `{storeSettings?.dianMode === 'PUENTE' && (
                  <th className="px-6 py-4 text-left">
                    <button onClick={toggleSelectAll} className="text-white hover:text-gray-200">
                      {selectedIds.size === pendingInvoices.length && pendingInvoices.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </th>
                )}`;
const theadCheckboxReplacement = `                  <th className="px-6 py-4 text-left">
                    <button onClick={toggleSelectAll} className="text-white hover:text-gray-200">
                      {selectedIds.size === pendingInvoices.length && pendingInvoices.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </th>`;
if (code.includes(theadCheckboxTarget)) {
    code = code.replace(theadCheckboxTarget, theadCheckboxReplacement);
    console.log("REPLACED: thead checkbox");
} else {
    console.log("TARGET NOT FOUND: thead checkbox");
}

const tbodyCheckboxTarget = `{storeSettings?.dianMode === 'PUENTE' && (
                          <td className="px-6 py-4">
                            {inv.dianStatus === 'PENDIENTE_REGISTRO' && (
                              <button onClick={() => toggleSelect(inv.id)} className="text-gray-400 hover:text-brand-black">
                                {selectedIds.has(inv.id) ? <CheckSquare size={18} className="text-brand-black" /> : <Square size={18} />}
                              </button>
                            )}
                          </td>
                        )}`;
const tbodyCheckboxReplacement = `                          <td className="px-6 py-4">
                            {((storeSettings?.dianMode === 'PUENTE' && ['PENDIENTE_REGISTRO','DRAFT','SENDING','REJECTED'].includes(inv.dianStatus || '')) ||
                              (storeSettings?.dianMode !== 'PUENTE' && ['DRAFT','SENDING','REJECTED'].includes(inv.dianStatus || ''))) && (
                              <button onClick={() => toggleSelect(inv.id)} className="text-gray-400 hover:text-brand-black">
                                {selectedIds.has(inv.id) ? <CheckSquare size={18} className="text-brand-black" /> : <Square size={18} />}
                              </button>
                            )}
                          </td>`;
if (code.includes(tbodyCheckboxTarget)) {
    code = code.replace(tbodyCheckboxTarget, tbodyCheckboxReplacement);
    console.log("REPLACED: tbody checkbox");
} else {
    console.log("TARGET NOT FOUND: tbody checkbox");
}

fs.writeFileSync('components/DianStatus.tsx', code);
