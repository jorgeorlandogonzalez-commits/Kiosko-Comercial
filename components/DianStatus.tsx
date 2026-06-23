
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, StoreSettings } from '../types';
import { CheckCircle, XCircle, Clock, FileText, Download, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { transmitToDian } from '../services/dianService';

interface DianStatusProps {
  invoices: Invoice[];
  onUpdateInvoice: (invoice: Invoice) => void;
  storeSettings?: StoreSettings;
  userId?: string;
}

type FilterStatus = 'ALL' | 'APPROVED' | 'REJECTED' | 'SENDING';
type DianServiceStatus = 'CHECKING' | 'ONLINE' | 'OFFLINE';

export const DianStatus: React.FC<DianStatusProps> = ({ invoices, onUpdateInvoice, storeSettings, userId }) => {
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<DianServiceStatus>('CHECKING');

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
                                <CheckCircle size={14} className="text-green-600" /> Enviada
                            </span>
                        )}
                        {inv.dianStatus === 'REJECTED' && (
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
    </div>
  );
};
