import React, { useState, useEffect } from 'react';
import { Check, Shield, Zap, ArrowRight, Rocket } from 'lucide-react';
import { PlanTier } from '../types';
import { auth } from '../firebase';

interface PricingPlansProps {
  onSelectPlan: (plan: PlanTier, isTrial: boolean) => void;
  isTrialExpired?: boolean;
  isInTrial?: boolean;
}

declare global {
  interface Window {
    WidgetCheckout: any;
  }
}

export const PricingPlans: React.FC<PricingPlansProps> = ({ onSelectPlan, isTrialExpired = false, isInTrial = false }) => {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Inyectar script de Wompi
    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
      console.error("Error cargando el script de Wompi.");
      setIsScriptLoaded(false);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const openWompiCheckout = async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("Por favor inicia sesión para procesar el pago.");
        return;
    }
    
    if (!isScriptLoaded || !(window as any).WidgetCheckout) {
        alert("La pasarela de pago Wompi aún está cargando. Por favor, intenta de nuevo en unos segundos.");
        return;
    }

    setIsProcessing(true);
    const publicKey = (import.meta as any).env.VITE_WOMPI_PUBLIC_KEY;
    if (!publicKey) {
      console.warn("Falta VITE_WOMPI_PUBLIC_KEY. Usando fallback visual (no funcionará sin key real).");
    }

    const uniqueReference = `sub_${user.uid}_${Date.now()}`;
    const planAmountCOP = billingCycle === 'MONTHLY' ? 39900 : 399000;
    const amountInCents = planAmountCOP * 100;

    const checkout = new (window as any).WidgetCheckout({
      currency: 'COP',
      amountInCents: amountInCents,
      reference: uniqueReference,
      publicKey: publicKey || 'pub_test_XXXXX',
      customerData: {
        email: user.email,
        fullName: user.displayName || 'Cliente Kiosko',
      }
    });

    checkout.open(async function (result: any) {
      const transaction = result.transaction;
      setIsProcessing(false);
      
      if (transaction.status === 'APPROVED') {
        alert("¡Pago aprobado! Validando transacción con el servidor...");
        
        try {
          const token = await user.getIdToken();
          
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ transactionId: transaction.id })
          });
          
          const verifyData = await verifyRes.json();
          
          if (verifyData.success) {
            const { db } = await import('../firebase');
            const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
            
            await updateDoc(doc(db, 'subscriptions', user.uid), {
              status: 'active',
              signature: verifyData.signature,
              transactionId: transaction.id,
              paidAt: serverTimestamp(),
              nextBillingAt: new Date(Date.now() + (billingCycle === 'MONTHLY' ? 30 : 365) * 24 * 60 * 60 * 1000)
            });
            
            alert(`¡Espectacular, socio! Pago aprobado exitosamente por Wompi Bancolombia (Referencia: ${transaction.id}). Tu licencia de Negocio Pro ya está activa. Gracias por su confianza 🤝.`);
            onSelectPlan('PRO', false);
          } else {
            alert("Error validando el pago: " + (verifyData.message || "Desconocido"));
          }
        } catch (error) {
          console.error("Error validando pago:", error);
          alert("Ocurrió un error validando tu pago con el servidor. Por favor contacta soporte.");
        }
      } else if (transaction.status === 'DECLINED') {
        alert("El pago fue rechazado por tu banco. Por favor intenta con otro medio de pago.");
      } else if (transaction.status === 'ERROR') {
        alert("Ocurrió un error con la pasarela de pagos. Intenta más tarde.");
      } else {
        alert(`Tu pago está en estado: ${transaction.status}. Si el dinero fue debitado, tu cuenta se activará automáticamente al confirmarse.`);
        onSelectPlan('PRO', false);
      }
    });
  };

  const handleSubscribe = async () => {
    if (!isTrialExpired && !isInTrial) {
        setIsProcessing(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                alert("Socio, por favor inicia sesión para activar la prueba gratis.");
                setIsProcessing(false);
                return;
            }
            
            const { db } = await import("../firebase");
            const { doc, setDoc, getDoc, serverTimestamp } = await import("firebase/firestore");
            
            const subRef = doc(db, "subscriptions", user.uid);
            const subDoc = await getDoc(subRef);
            
            let trialEndObj = new Date();
            let trialDays = 15;
            
            const emailLower = user.email?.toLowerCase();
            if (emailLower === "info.msdmed@gmail.com" || emailLower === "jorge.orlando.gonzalez@gmail.com" || emailLower === "info.empresasaliat@gmail.com") {
                trialDays = 365 * 10;
            }
            trialEndObj.setDate(trialEndObj.getDate() + trialDays);
            
            if (!subDoc.exists()) {
                await setDoc(subRef, {
                    userId: user.uid,
                    userEmail: user.email,
                    status: "trial",
                    plan: "monthly",
                    amount: 39900,
                    currency: "COP",
                    createdAt: serverTimestamp(),
                    trialEndsAt: trialEndObj
                });
            }
            
            let formattedDate = trialEndObj.toLocaleDateString();
            alert(`¡Espectacular, socio! Tu Prueba Gratis de ${trialDays} Días ha sido activada con éxito. Trial válido hasta: ${formattedDate}`);
            onSelectPlan("PRO", true);
            
        } catch (error) {
            console.error("Error al iniciar trial:", error);
            alert("Error de red al activar el periodo de prueba gratis. Es posible que el servidor esté despertando, intenta de nuevo en unos segundos.");
        } finally {
            setIsProcessing(false);
        }
    } else {
        openWompiCheckout();
    }
  };

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
                 onClick={handleSubscribe}
                 disabled={isProcessing}
                 className={`w-full py-4 font-black rounded-xl uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-2 group ${isProcessing ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-brand-red text-white hover:bg-brand-darkRed hover:shadow-2xl active:scale-95'}`}
              >
                  {isProcessing ? 'Procesando...' : (isTrialExpired ? 'Activar Licencia Ahora' : (isInTrial ? 'Pasar a PRO Ahora' : 'Empezar Prueba Gratis'))} 
                  {!isProcessing && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>}
              </button>
              
              {!isTrialExpired && !isInTrial && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                      <p className="text-[9px] text-gray-400 font-bold uppercase flex items-center justify-center gap-1">
                          <Check size={10} className="text-green-500"/> Sin tarjeta de crédito para probar
                      </p>
                      
                      {/* ACCESO DIRECTO A PAGO */}
                      <button 
                         onClick={openWompiCheckout}
                         disabled={isProcessing}
                         className="text-[10px] font-black text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2 transition-colors cursor-pointer"
                      >
                          Saltar prueba y pagar ahora
                      </button>
                  </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[8px] text-gray-400 font-bold uppercase flex items-center justify-center gap-2">
                      <Shield size={10}/> Pagos seguros por Wompi (Bancolombia)
                  </p>
              </div>
          </div>
      </div>
      
      <div className="pb-8 text-center px-6">
          <p className="text-gray-400 text-[10px] font-medium max-w-lg mx-auto">
              Precios en Pesos Colombianos (COP) incluido IVA.
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
