import React, { useState } from 'react';
import { Quote, StoreSettings } from '../types';
import { dbService } from '../services/storageService';
import { 
  FileSpreadsheet, Trash2, Printer, ChevronDown, ChevronUp, 
  Package, AlertCircle, Mail, Smartphone, User, X, 
  CheckCircle2, Loader2, Send, AlertTriangle
} from 'lucide-react';

interface QuotesProps {
  quotes: Quote[];
  onDeleteQuote: (id: string) => void;
  onRestoreQuote: (quote: Quote) => void;
}

const QuoteCard: React.FC<{
  quote: Quote;
  onRestore: (q: Quote) => void;
  onPrint: (q: Quote) => void;
  onEmail: (q: Quote) => void;
  onRequestDelete: (id: string) => void;
}> = ({ quote, onRestore, onPrint, onEmail, onRequestDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper para renderizar icono o imagen correctamente
  const renderProductIcon = (iconStr?: string) => {
      const icon = iconStr || '📦';
      const isImage = icon.startsWith('http') || icon.startsWith('data:image');
      
      if (isImage) {
          return <img src={icon} alt="Item" className="w-full h-full object-cover" />;
      }
      return <span className="text-2xl">{icon}</span>;
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden mb-4 hover:border-brand-red transition-all group">
        <div 
            className={`p-5 flex flex-col md:flex-row justify-between items-center gap-4 cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50 border-b border-gray-100' : 'hover:bg-gray-50/50'}`} 
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex-1 flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-brand-red text-white' : 'bg-gray-100 text-brand-black group-hover:bg-brand-red group-hover:text-white'}`}>
                    <FileSpreadsheet size={28} />
                </div>
                <div>
                    <div className="font-black text-xl text-brand-black uppercase tracking-tight leading-none">{quote.customerName}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                      <span className="bg-gray-200 px-2 py-0.5 rounded">REF: {quote.id}</span>
                      <span>•</span>
                      <span>{new Date(quote.date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right mr-2">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Total Cotizado</div>
                    <div className="text-3xl font-black text-brand-black tracking-tighter leading-none">${Math.round(quote.total).toLocaleString()}</div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRestore(quote); }} 
                      className="px-6 py-3 bg-brand-red text-white rounded-xl text-xs font-black shadow-lg hover:bg-brand-darkRed active:scale-95 transition-all uppercase tracking-widest"
                    >
                      Facturar
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEmail(quote); }} 
                      className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100" 
                      title="Enviar por Correo"
                    >
                      <Mail size={22}/>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onPrint(quote); }} 
                      className="p-3 text-gray-400 hover:text-brand-black hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200" 
                      title="Imprimir"
                    >
                      <Printer size={22}/>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRequestDelete(quote.id); }} 
                      className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100" 
                      title="Eliminar"
                    >
                      <Trash2 size={22}/>
                    </button>
                </div>
            </div>
        </div>

        {isExpanded && (
            <div className="p-8 bg-white border-t border-gray-50 animate-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="flex flex-col gap-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-brand-red"><User size={14}/><span className="text-[9px] font-black uppercase">Cliente</span></div>
                        <p className="text-sm text-gray-800 font-black uppercase">{quote.customerName}</p>
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-brand-red"><Smartphone size={14}/><span className="text-[9px] font-black uppercase">Contacto</span></div>
                        <p className="text-sm text-gray-800 font-bold">{quote.customerPhone}</p>
                    </div>
                    <div className="flex flex-col gap-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-brand-red"><Mail size={14}/><span className="text-[9px] font-black uppercase">Correo</span></div>
                        <p className="text-sm text-gray-800 font-bold truncate">{quote.customerEmail || 'Sin correo registrado'}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Artículos en Presupuesto</h4>
                    {quote.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 py-4 px-6 bg-gray-50 rounded-2xl border border-gray-100 group/item hover:border-brand-red/30 transition-colors">
                            <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm overflow-hidden group-hover/item:scale-110 transition-transform shrink-0">
                              {renderProductIcon(item.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-brand-black uppercase text-sm leading-none mb-1 truncate">{item.name}</div>
                                <div className="text-[10px] text-gray-400 font-black uppercase">
                                  ${Math.round(item.price).toLocaleString()} x {item.quantity} und
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[9px] font-black text-gray-300 uppercase">Total Item</div>
                              <div className="text-lg font-black text-brand-black tracking-tight">${Math.round(item.price * item.quantity).toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t-4 border-double border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-100">
                      <AlertTriangle size={14}/>
                      <span className="text-[10px] font-black uppercase">Cotización válida por 15 días</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-black text-gray-400 uppercase mr-4 tracking-widest">Valor Neto Total</span>
                      <span className="text-4xl font-black text-brand-red tracking-tighter">${Math.round(quote.total).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export const Quotes: React.FC<QuotesProps> = ({ quotes, onDeleteQuote, onRestoreQuote }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quoteIdToDelete, setQuoteIdToDelete] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{show: boolean, success: boolean, message: string}>({show: false, success: true, message: ''});

  const handlePrintQuote = (quote: Quote) => {
    const settings = dbService.getStoreSettings() || { name: 'Kiosko Comercial', nit: 'N/A' };
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Cotización - ${quote.customerName}</title>
          <style>
              @page { margin: 0; size: 80mm auto; }
              body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 10px 2px; font-size: 11px; color: #000; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .line { border-bottom: 1px dashed #000; margin: 8px 0; }
              .flex { display: flex; justify-content: space-between; }
              .items-table { width: 100%; margin: 8px 0; font-size: 10px; border-collapse: collapse; }
              .items-table th { border-bottom: 1px solid #000; text-align: left; }
              .text-right { text-align: right; }
          </style>
      </head>
      <body>
          <div class="center">
              <div class="bold" style="font-size: 14px;">${settings.name.toUpperCase()}</div>
              <div class="bold">NIT: ${settings.nit}</div>
              <div class="line"></div>
              <div class="bold">COTIZACIÓN DE VENTA</div>
              <div>Fecha: ${new Date(quote.date).toLocaleDateString()}</div>
          </div>
          <div class="line"></div>
          <div><b>CLIENTE:</b> ${quote.customerName.toUpperCase()}</div>
          <div><b>ID:</b> ${quote.customerNit}</div>
          <div><b>CEL:</b> ${quote.customerPhone}</div>
          <div class="line"></div>
          <table class="items-table">
              <thead>
                  <tr>
                      <th width="15%">Cant</th>
                      <th width="45%">Ítem</th>
                      <th width="20%" class="text-right">Unit</th>
                      <th width="20%" class="text-right">Total</th>
                  </tr>
              </thead>
              <tbody>
                  ${quote.items.map(item => `
                      <tr>
                          <td>${item.quantity}</td>
                          <td>${item.name.substring(0, 20)}</td>
                          <td class="text-right">$${Math.round(item.price).toLocaleString()}</td>
                          <td class="text-right">$${Math.round(item.price * item.quantity).toLocaleString()}</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>
          <div class="line"></div>
          <div class="flex" style="font-size: 13px; font-weight: bold;">
              <span>TOTAL COTIZADO:</span>
              <span>$${Math.round(quote.total).toLocaleString()}</span>
          </div>
          <div class="center" style="font-size: 8px; margin-top: 15px;">Documento informativo. No es factura de venta.</div>
          <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleEmailQuote = async (quote: Quote) => {
      if (!quote.customerEmail || !quote.customerEmail.includes('@')) {
          setEmailStatus({show: true, success: false, message: '¡Ojo socio! El cliente no tiene un correo válido registrado.'});
          setTimeout(() => setEmailStatus({show: false, success: false, message: ''}), 4000);
          return;
      }

      setIsSendingEmail(true);
      
       // Simulación de procesamiento de servidor de Don J
      await new Promise(r => setTimeout(r, 2000));
      
      const settings = dbService.getStoreSettings() || { name: 'Kiosko Comercial' };

      // Generación de cuerpo de correo para mailto (Acción Real)
      const subject = encodeURIComponent(`Cotización de Venta - ${settings.name}`);
      const itemsList = quote.items.map(i => `- ${i.quantity}x ${i.name} ($${Math.round(i.price * i.quantity).toLocaleString()})`).join('%0A');
      const body = encodeURIComponent(
        `Hola ${quote.customerName},%0A%0AAdjunto enviamos la cotización solicitada en ${settings.name}.%0A%0A` +
        `RESUMEN DE PRODUCTOS:%0A${itemsList}%0A%0A` +
        `TOTAL COTIZADO: $${Math.round(quote.total).toLocaleString()}%0A%0A` +
        `Esta cotización tiene una vigencia de 15 días.%0A%0A` +
        `¡Gracias por preferirnos!`
      );

      // Abrir cliente de correo real
      window.location.href = `mailto:${quote.customerEmail}?subject=${subject}&body=${body}`;

      setIsSendingEmail(false);
      setEmailStatus({
          show: true, 
          success: true, 
          message: `¡Listo socio! Se abrió el correo para enviárselo a ${quote.customerEmail.split('@')[0]}...`
      });
      setTimeout(() => setEmailStatus({show: false, success: true, message: ''}), 5000);
  };

  const handleDeleteRequest = (id: string) => {
      setQuoteIdToDelete(id);
      setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
      if (quoteIdToDelete) {
          onDeleteQuote(quoteIdToDelete);
      }
      setShowDeleteConfirm(false);
      setQuoteIdToDelete(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32 relative min-h-screen">
       
       {/* Loader de Envío Premium */}
       {isSendingEmail && (
           <div className="fixed inset-0 z-[600] bg-brand-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
               <div className="bg-white rounded-[4rem] p-12 flex flex-col items-center gap-8 shadow-2xl text-center max-w-sm border-b-[15px] border-blue-500">
                   <div className="relative">
                       <Loader2 className="animate-spin text-blue-500" size={100} strokeWidth={3} />
                       <Mail className="absolute inset-0 m-auto text-brand-black" size={40} />
                   </div>
                   <h3 className="text-3xl font-black text-brand-black uppercase tracking-tighter">Don J está preparando el correo...</h3>
                   <p className="text-gray-500 font-bold text-lg leading-tight">Estamos redactando el presupuesto para su cliente.</p>
               </div>
           </div>
       )}

       {/* Toast de Notificación con Diseño */}
       {emailStatus.show && (
           <div className="fixed top-24 right-6 z-[250] animate-in slide-in-from-right-10 duration-500">
               <div className={`p-6 rounded-[2rem] shadow-2xl flex items-center gap-5 border-l-[12px] ${emailStatus.success ? 'bg-green-50 border-green-600 text-green-900' : 'bg-red-50 border-brand-red text-red-900'}`}>
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${emailStatus.success ? 'bg-green-600 text-white' : 'bg-brand-red text-white'}`}>
                       {emailStatus.success ? <CheckCircle2 size={28}/> : <AlertCircle size={28}/>}
                   </div>
                   <div className="max-w-xs">
                       <p className="font-black text-[10px] uppercase tracking-[0.2em] opacity-60">Asistente Don J</p>
                       <p className="font-black text-base leading-tight">{emailStatus.message}</p>
                   </div>
                   <button onClick={() => setEmailStatus({...emailStatus, show: false})} className="ml-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
               </div>
           </div>
       )}

       <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div>
               <h2 className="text-5xl font-black text-brand-black flex items-center gap-5 tracking-tighter">
                   <FileSpreadsheet className="text-brand-red" size={56} /> Cotizaciones
               </h2>
               <p className="text-gray-500 text-xl font-medium mt-2">Gestiona tus presupuestos y convierte propuestas en ventas reales.</p>
           </div>
           <div className="bg-brand-black text-white px-8 py-4 rounded-3xl shadow-xl flex items-center gap-4">
               <FileSpreadsheet size={24} className="text-brand-red" />
               <div className="flex flex-col">
                 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Registros</span>
                 <span className="font-black text-2xl tracking-tight">{quotes.length}</span>
               </div>
           </div>
       </div>

       {quotes.length === 0 ? (
           <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-gray-100 shadow-inner flex flex-col items-center">
               <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-8 shadow-sm">
                   <FileSpreadsheet size={64} className="text-gray-200"/>
               </div>
               <p className="text-3xl font-black text-gray-300 uppercase tracking-[0.3em]">Bandeja Vacía</p>
               <p className="text-gray-400 mt-4 text-lg font-medium">Usa la opción "Cotizar" en el terminal de caja para generar una.</p>
           </div>
       ) : (
           <div className="space-y-6">
               {quotes.map((q, idx) => (
                   <QuoteCard 
                       key={`${q.id}-${idx}`} 
                       quote={q} 
                       onRestore={onRestoreQuote} 
                       onPrint={handlePrintQuote} 
                       onEmail={handleEmailQuote}
                       onRequestDelete={handleDeleteRequest} 
                   />
               ))}
           </div>
       )}

       {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN TIPO DON J */}
       {showDeleteConfirm && (
          <div className="fixed inset-0 z-[700] bg-brand-black/98 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="bg-white rounded-[4rem] w-full max-w-md overflow-hidden shadow-2xl border-t-[20px] border-brand-red p-12 text-center animate-in zoom-in-95 duration-400">
                  <div className="w-28 h-28 bg-red-50 text-brand-red rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner animate-bounce">
                      <Trash2 size={56} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-4xl font-black text-brand-black uppercase tracking-tighter mb-4 leading-none">¿ELIMINAR ESTO?</h3>
                  <p className="text-gray-500 font-bold text-xl mb-10 leading-snug px-4">
                    Estás a punto de borrar permanentemente esta cotización. Esta acción <span className="text-brand-red font-black">NO tiene marcha atrás</span>.
                  </p>
                  <div className="flex flex-col gap-4">
                      <button 
                        onClick={confirmDelete}
                        className="w-full py-6 bg-brand-red text-white font-black rounded-[2rem] text-2xl hover:bg-brand-darkRed shadow-2xl transition-all uppercase tracking-widest active:scale-95"
                      >
                          SÍ, BORRAR AHORA
                      </button>
                      <button 
                        onClick={() => { setShowDeleteConfirm(false); setQuoteIdToDelete(null); }}
                        className="w-full py-6 bg-gray-100 text-gray-600 font-black rounded-[2rem] text-xl hover:bg-gray-200 transition-colors uppercase tracking-widest"
                      >
                          NO, MANTENERLA
                      </button>
                  </div>
                  <div className="mt-8 flex justify-center items-center gap-2 text-gray-300">
                    <AlertTriangle size={14}/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Seguridad Don J Activada</span>
                  </div>
              </div>
          </div>
       )}
    </div>
  );
};