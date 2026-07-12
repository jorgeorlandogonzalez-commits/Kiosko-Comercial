
import React, { useState } from 'react';
import { Check, Star, Shield, Zap, CreditCard, Lock, Calendar, ArrowRight, Rocket, Building2, Smartphone, Globe } from 'lucide-react';
import { PlanTier } from '../types';
import { auth } from '../firebase';

interface PricingPlansProps {
  onSelectPlan: (plan: PlanTier, isTrial: boolean) => void;
  isTrialExpired?: boolean;
}

type PaymentMethodType = 'CARD' | 'PSE' | 'BANCOLOMBIA';

export const PricingPlans: React.FC<PricingPlansProps> = ({ onSelectPlan, isTrialExpired = false }) => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [showPayment, setShowPayment] = useState<PlanTier | null>(null);
  
  // Estado Pasarela
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CARD');
  const [selectedBank, setSelectedBank] = useState('');
  
  // Estado formulario pago simulado
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async (plan: PlanTier) => {
    if (plan === 'PRO' && !isTrialExpired) {
        setIsProcessing(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                alert("Socio, por favor inicia sesión para activar la prueba gratis.");
                setIsProcessing(false);
                return;
            }
            
            const token = await user.getIdToken();
            const response = await fetch('/api/payments/create-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan: 'PRO' })
            });

            if (!response.ok) {
                throw new Error("Respuesta no exitosa del servidor.");
            }

            const data = await response.json();
            if (data.success) {
                alert(`¡Espectacular, socio! Tu Prueba Gratis de 15 Días ha sido activada con éxito. Trial válido hasta: ${new Date(data.trialEndsAt).toLocaleDateString()}`);
                onSelectPlan('PRO', true);
            } else {
                alert("Socio, no pudimos procesar la prueba. Inténtalo de nuevo.");
            }
        } catch (error) {
            console.error("Error al iniciar trial:", error);
            alert("Error de red al activar el periodo de prueba gratis.");
        } finally {
            setIsProcessing(false);
        }
    } else {
        setShowPayment(plan);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsProcessing(true);
      
      try {
          const user = auth.currentUser;
          if (!user) {
              alert("Por favor inicia sesión para procesar el pago.");
              setIsProcessing(false);
              return;
          }

          // Simular la llamada del webhook internacional/nacional de Wompi al backend para aprobar la suscripción
          const simulatedTxId = `wompi_tx_${Math.random().toString(36).substr(2, 9)}`;
          
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulación de transferencia

          const token = await user.getIdToken();
          const webhookResponse = await fetch('/api/payments/simulate', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  transactionId: simulatedTxId
              })
          });

          if (webhookResponse.ok) {
              alert(`¡Espectacular, socio! Pago aprobado exitosamente por Wompi Bancolombia (Referencia: ${simulatedTxId}). Tu licencia de Negocio Pro ya está activa. Gracias por su confianza 🤝.`);
              onSelectPlan(showPayment || 'PRO', false);
              setShowPayment(null);
          } else {
              alert("Ocurrió un inconveniente al validar con el webhook de Wompi. Por favor intenta de nuevo.");
          }
      } catch (error) {
          console.error("Error en pago Wompi:", error);
          alert("Error de conexión con la pasarela de pagos Wompi.");
      } finally {
          setIsProcessing(false);
      }
  };

  if (showPayment) {
      return (
          <div className="fixed inset-0 z-[200] bg-brand-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-gray-50 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                  {/* Header Pasarela */}
                  <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-black text-white rounded-lg flex items-center justify-center font-black text-xl italic shadow-md">W</div>
                          <div>
                              <h3 className="font-black text-sm text-gray-800 uppercase tracking-widest">Pasarela Segura</h3>
                              <p className="text-[10px] text-green-600 font-bold flex items-center gap-1"><Lock size={10}/> Conexión Encriptada 256-bit</p>
                          </div>
                      </div>
                      <button onClick={() => setShowPayment(null)} className="text-gray-400 hover:text-red-500 font-bold text-xs uppercase p-2 hover:bg-gray-100 rounded-lg transition-all">Cancelar</button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      {/* Resumen de Compra */}
                      <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                          <div>
                              <p className="text-xs font-black text-blue-900 uppercase">Suscripción Kiosko Pro</p>
                              <p className="text-[10px] text-blue-700">Facturación {billingCycle === 'MONTHLY' ? 'Mensual' : 'Anual'}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xl font-black text-brand-black">${billingCycle === 'MONTHLY' ? '39.900' : '399.000'}</p>
                              <p className="text-[9px] text-gray-500">COP</p>
                          </div>
                      </div>

                      {/* Selector de Método de Pago */}
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Seleccione Medio de Pago</p>
                      <div className="grid grid-cols-3 gap-2 mb-6">
                          <button 
                            onClick={() => setPaymentMethod('CARD')}
                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'CARD' ? 'border-brand-black bg-white shadow-md' : 'border-transparent bg-gray-200 opacity-60 hover:opacity-100'}`}
                          >
                              <CreditCard size={20} className={paymentMethod === 'CARD' ? 'text-brand-red' : 'text-gray-500'}/>
                              <span className="text-[9px] font-black uppercase">Tarjeta</span>
                          </button>
                          <button 
                            onClick={() => setPaymentMethod('PSE')}
                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'PSE' ? 'border-brand-black bg-white shadow-md' : 'border-transparent bg-gray-200 opacity-60 hover:opacity-100'}`}
                          >
                              <Globe size={20} className={paymentMethod === 'PSE' ? 'text-blue-600' : 'text-gray-500'}/>
                              <span className="text-[9px] font-black uppercase">PSE</span>
                          </button>
                          <button 
                            onClick={() => setPaymentMethod('BANCOLOMBIA')}
                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'BANCOLOMBIA' ? 'border-brand-black bg-white shadow-md' : 'border-transparent bg-gray-200 opacity-60 hover:opacity-100'}`}
                          >
                              <Smartphone size={20} className={paymentMethod === 'BANCOLOMBIA' ? 'text-yellow-500' : 'text-gray-500'}/>
                              <span className="text-[9px] font-black uppercase leading-tight text-center">Bancolombia</span>
                          </button>
                      </div>

                      <form onSubmit={handlePaymentSubmit} className="space-y-4">
                          {paymentMethod === 'CARD' && (
                              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Número de Tarjeta</label>
                                      <div className="relative">
                                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                          <input 
                                            type="text" 
                                            value={cardNumber}
                                            onChange={e => setCardNumber(e.target.value.replace(/\D/g,'').substring(0,16))}
                                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-brand-black transition-all"
                                            placeholder="0000 0000 0000 0000"
                                            required
                                          />
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Vencimiento</label>
                                          <input type="text" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-brand-black text-center" placeholder="MM/AA" maxLength={5} required />
                                      </div>
                                      <div className="space-y-1">
                                          <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">CVC <Lock size={10}/></label>
                                          <input type="password" value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g,'').substring(0,4))} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-brand-black text-center" placeholder="123" required />
                                      </div>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Titular</label>
                                      <input type="text" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-black" placeholder="NOMBRE COMO APARECE" required />
                                  </div>
                              </div>
                          )}

                          {paymentMethod === 'PSE' && (
                              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                                  <div className="bg-gray-100 p-4 rounded-xl flex items-center gap-3">
                                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1 shadow-sm"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/PSE_logo.png/640px-PSE_logo.png" alt="PSE" className="w-full h-full object-contain" onError={(e) => (e.target as HTMLImageElement).src = ''}/></div>
                                      <p className="text-[10px] text-gray-500 leading-tight">Serás redirigido a la sucursal virtual de tu banco para autorizar el débito.</p>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Selecciona tu Banco</label>
                                      <div className="relative">
                                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                          <select 
                                            value={selectedBank} 
                                            onChange={e => setSelectedBank(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-black appearance-none cursor-pointer"
                                            required
                                          >
                                              <option value="">Seleccione...</option>
                                              <option value="bancolombia">Bancolombia</option>
                                              <option value="davivienda">Davivienda</option>
                                              <option value="nequi">Nequi</option>
                                              <option value="daviplata">Daviplata</option>
                                              <option value="bogota">Banco de Bogotá</option>
                                              <option value="bbva">BBVA Colombia</option>
                                          </select>
                                      </div>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Email registrado en PSE</label>
                                      <input type="email" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-brand-black" placeholder="correo@ejemplo.com" required />
                                  </div>
                              </div>
                          )}

                          {paymentMethod === 'BANCOLOMBIA' && (
                              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4 text-center">
                                  <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200">
                                      <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                          <Smartphone size={32}/>
                                      </div>
                                      <h4 className="font-black text-yellow-800 uppercase mb-2">Botón Bancolombia</h4>
                                      <p className="text-xs text-yellow-700 font-medium">Transfiere directamente desde la App Personas sin costo adicional.</p>
                                  </div>
                              </div>
                          )}

                          <button 
                            type="submit" 
                            disabled={isProcessing}
                            className="w-full py-4 mt-6 bg-brand-black text-white font-black rounded-xl shadow-xl hover:bg-brand-red transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                          >
                              {isProcessing ? 'Procesando...' : `Pagar $${billingCycle === 'MONTHLY' ? '39.900' : '399.000'}`} 
                              {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                          </button>
                      </form>
                  </div>
                  <div className="bg-gray-100 p-4 text-center border-t border-gray-200">
                      <p className="text-[9px] text-gray-400 font-bold uppercase flex items-center justify-center gap-2">
                          <Shield size={10}/> Pagos procesados por Pasarela Certificada PCI-DSS
                      </p>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col overflow-y-auto font-sans">
      {/* Header */}
      <div className="bg-brand-black text-white pt-12 pb-24 px-6 text-center relative overflow-hidden shrink-0">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         {/* Abstract Shapes */}
         <div className="absolute top-10 left-10 w-32 h-32 bg-brand-red/20 rounded-full blur-3xl"></div>
         <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>

         <div className="relative z-10 max-w-3xl mx-auto">
             <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 mb-4">
                <Rocket size={14} className="text-yellow-400"/>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Oferta Lanzamiento</span>
             </div>
             <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter leading-tight">
                 Tecnología de punta,<br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-orange-500">precio de barrio.</span>
             </h1>
             <p className="text-sm md:text-base text-gray-400 max-w-xl mx-auto mb-6 font-medium">
                 {isTrialExpired 
                    ? 'Tu prueba ha terminado. Activa la herramienta que está transformando el comercio local.' 
                    : 'Masifica tu negocio con el sistema POS + Facturación Electrónica más económico del país.'
                 }
             </p>
             
             {/* Toggle Mensual/Anual */}
             <div className="inline-flex bg-gray-900 p-1 rounded-full border border-gray-800 backdrop-blur-sm shadow-xl">
                 <button 
                    onClick={() => setBillingCycle('MONTHLY')}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all ${billingCycle === 'MONTHLY' ? 'bg-white text-brand-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                 >
                     Mensual
                 </button>
                 <button 
                    onClick={() => setBillingCycle('YEARLY')}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${billingCycle === 'YEARLY' ? 'bg-white text-brand-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                 >
                     Anual <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded ml-1">-17%</span>
                 </button>
             </div>
         </div>
      </div>

      {/* Single Plan Card Container - COMPACT VERSION */}
      <div className="flex-1 flex items-start justify-center px-4 -mt-16 relative z-20 pb-12">
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-2xl border-4 border-brand-red relative overflow-hidden max-w-sm w-full transform hover:scale-[1.01] transition-all duration-300">
              <div className="absolute top-0 right-0 bg-brand-red text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-bl-2xl tracking-widest shadow-lg">
                  Todo Incluido
              </div>
              
              <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center p-3 bg-red-50 rounded-2xl mb-3 shadow-sm border border-red-100">
                      <Zap size={24} className="text-brand-red fill-current" />
                  </div>
                  <h3 className="text-2xl font-black text-brand-black uppercase tracking-tighter mb-1">
                      Negocio Pro
                  </h3>
                  <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">
                      El único plan que necesitas
                  </p>
              </div>

              <div className="bg-brand-black rounded-2xl p-5 mb-6 text-center text-white relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-800 to-black opacity-50"></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-center gap-1 leading-none mb-1">
                        <span className="text-xl font-bold text-gray-500 mt-1">$</span>
                        <span className="text-5xl font-black text-white tracking-tighter">
                            {billingCycle === 'MONTHLY' ? '39.900' : '399.000'}
                        </span>
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block">
                        COP / {billingCycle === 'MONTHLY' ? 'Mes' : 'Año'}
                    </span>
                    {billingCycle === 'YEARLY' && (
                        <div className="mt-2 inline-block bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase shadow-lg">
                            ¡Ahorras $79.800!
                        </div>
                    )}
                  </div>
              </div>

              <div className="space-y-3 mb-8 px-2">
                  <Feature text="Facturación DIAN Ilimitada" active />
                  <Feature text="POS con Lector de Barras" active />
                  <Feature text="Control de Inventario y Kardex" active />
                  <Feature text="Cuentas por Cobrar (Fiados)" active />
                  <Feature text="Gestión de Proveedores" active />
                  <Feature text="Usuarios Cajeros Ilimitados" active />
              </div>

              <button 
                onClick={() => handleSubscribe('PRO')} 
                className="w-full py-4 bg-brand-red text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-brand-darkRed shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 group active:scale-95"
              >
                  {isTrialExpired ? 'Activar Licencia Ahora' : 'Empezar Prueba Gratis'} 
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
              </button>
              
              {!isTrialExpired && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                      <p className="text-[9px] text-gray-400 font-bold uppercase flex items-center justify-center gap-1">
                          <Check size={10} className="text-green-500"/> Sin tarjeta de crédito para probar
                      </p>
                      {/* ACCESO DIRECTO A PAGO */}
                      <button 
                        onClick={() => setShowPayment('PRO')}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 transition-colors cursor-pointer"
                      >
                          Saltar prueba y pagar ahora
                      </button>
                  </div>
              )}
          </div>
      </div>
      
      <div className="pb-8 text-center px-6">
          <p className="text-gray-400 text-[10px] font-medium max-w-lg mx-auto">
              Precios en Pesos Colombianos (COP) incluido IVA. Garantía de satisfacción total.
          </p>
      </div>
    </div>
  );
};

const Feature = ({ text, active = false }: { text: string, active?: boolean }) => (
    <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            <Check size={10} strokeWidth={4} />
        </div>
        <span className={`text-xs font-bold ${active ? 'text-gray-700' : 'text-gray-400'}`}>{text}</span>
    </div>
);
