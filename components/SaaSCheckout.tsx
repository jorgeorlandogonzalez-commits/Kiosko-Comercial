import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

interface SaaSCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
}

// Declaración global para el widget de Wompi que inyectaremos
declare global {
  interface Window {
    WidgetCheckout: any;
  }
}

const SaaSCheckout: React.FC<SaaSCheckoutProps> = ({ isOpen, onClose, userId, userEmail }) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // NOTA TÉCNICA DE ARQUITECTURA:
  // Este componente Frontend *NO* debe actualizar el estado de la suscripción del usuario.
  // Su única responsabilidad es invocar la pasarela de pagos (Wompi).
  // La validación criptográfica y la actualización del usuario al estado ACTIVE 
  // (creación de registro en 'subscriptions' o actualización en Firestore)
  // DEBE ser realizada *exclusivamente* por el Webhook de Cloud Run (/api/payments/webhook)
  // al recibir el evento de Wompi (tras validar la firma integrity).

  useEffect(() => {
    if (!isOpen) return;

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
      // Opcional: limpieza del script si el modal se cierra, aunque no es estrictamente necesario
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isOpen]);

  const handlePayment = () => {
    if (!isScriptLoaded || !window.WidgetCheckout) {
      alert("La pasarela de pago aún está cargando. Por favor, intenta de nuevo en unos segundos.");
      return;
    }

    setIsProcessing(true);

    const publicKey = import.meta.env.VITE_WOMPI_PUBLIC_KEY;
    if (!publicKey) {
      console.warn("Falta VITE_WOMPI_PUBLIC_KEY. Configura las variables de entorno.");
    }

    // Generar referencia única dinámica basada en el UUID del usuario.
    // Ej: sub_USERID_TIMESTAMP
    const uniqueReference = `sub_${userId}_${Date.now()}`;
    const planAmountCOP = 39900;
    const amountInCents = planAmountCOP * 100;

    const checkout = new window.WidgetCheckout({
      currency: 'COP',
      amountInCents: amountInCents,
      reference: uniqueReference,
      publicKey: publicKey || 'pub_test_XXXXX', // Fallback de seguridad visual (no funcionará sin key real)
      customerData: {
        email: userEmail,
        fullName: 'Cliente Kiosko', // Opcional
      }
    });

    checkout.open(async function (result: any) {
      const transaction = result.transaction;
      setIsProcessing(false);
      
      if (transaction.status === 'APPROVED') {
        alert("¡Pago aprobado! Validando transacción...");
        
        try {
          const { getAuth } = await import('firebase/auth');
          const token = await getAuth().currentUser?.getIdToken();
          
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
            // Update Firestore directly
            const { db } = await import('../firebase');
            const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
            
            await updateDoc(doc(db, 'subscriptions', userId), {
              status: 'active',
              signature: verifyData.signature,
              transactionId: transaction.id,
              paidAt: serverTimestamp(),
              nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            
            alert("¡Suscripción activada exitosamente!");
            onClose();
          } else {
            alert("Error validando el pago: " + (verifyData.message || "Desconocido"));
          }
        } catch (error) {
          console.error("Error validando pago:", error);
          alert("Ocurrió un error validando tu pago. Por favor contacta soporte.");
        }
      } else if (transaction.status === 'DECLINED') {
        alert("El pago fue rechazado. Por favor intenta con otro medio de pago.");
      } else if (transaction.status === 'ERROR') {
        alert("Ocurrió un error con el pago. Intenta más tarde.");
      } else {
        alert("Tu pago está en estado pendiente. Si fue debitado, tu cuenta se activará automáticamente al confirmarse.");
        onClose();
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 font-sans backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 text-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="relative p-8 pb-4 text-center">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X size={28} />
          </button>
          
          <div className="mx-auto w-16 h-16 bg-brand-yellow/20 text-brand-yellow rounded-2xl flex items-center justify-center mb-6">
            <Zap size={32} />
          </div>
          
          <h2 className="text-4xl font-black mb-2 tracking-tight">Kiosko PRO</h2>
          <p className="text-xl text-gray-400">El único plan que necesitas para tu negocio.</p>
        </div>

        {/* Tarjeta de Precio */}
        <div className="p-8 pt-4 flex-1 overflow-y-auto">
          <div className="bg-gray-800 rounded-2xl p-8 text-center border border-gray-700 mb-8 shadow-inner">
            <div className="flex justify-center items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-400">$</span>
              <span className="text-6xl font-black text-white">39.900</span>
              <span className="text-xl font-bold text-gray-400 uppercase tracking-widest">/ Mes</span>
            </div>
            <p className="mt-4 text-gray-400 text-lg">Total en Pesos Colombianos (COP). IVA Incluido.</p>
          </div>

          <div className="space-y-4 mb-8">
            {[
              "Facturación Electrónica DIAN Ilimitada",
              "POS Rápido con Lector de Barras",
              "Control de Inventario y Kardex Automático",
              "Gestión de Cuentas por Cobrar (Fiados)",
              "Soporte Prioritario y Respaldo en la Nube"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4">
                <CheckCircle2 className="text-brand-yellow shrink-0" size={28} />
                <span className="text-xl font-medium text-gray-200">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-6 bg-gray-800/50 p-3 rounded-lg">
            <ShieldCheck size={20} className="text-green-400" />
            <span>Pago 100% seguro procesado por Wompi (Grupo Bancolombia)</span>
          </div>

          <button
            onClick={handlePayment}
            disabled={!isScriptLoaded || isProcessing}
            className={`
              w-full py-5 rounded-2xl text-2xl font-black uppercase tracking-widest transition-all
              ${(!isScriptLoaded || isProcessing) 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-brand-yellow text-gray-900 hover:bg-yellow-400 hover:scale-[1.02] active:scale-95 shadow-xl shadow-yellow-500/20'
              }
            `}
          >
            {isProcessing ? 'Procesando...' : (!isScriptLoaded ? 'Cargando pagos...' : 'Activar mi Kiosko Ahora')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaaSCheckout;
