import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);

  // Verificar autenticación al abrir el modal
  useEffect(() => {
    if (isOpen && !auth.currentUser) {
      alert('Debes iniciar sesión para suscribirte');
      onClose();
    }
  }, [isOpen, onClose]);

  const handleSubscribe = async () => {
    // Validar autenticación
    if (!auth.currentUser) {
      alert('Error: Debes iniciar sesión para continuar');
      return;
    }
    
    // Aquí integrarías el widget de Wompi cuando tengas las API keys
    // Por ahora, solo cerramos el modal
    alert(`✅ ¡Bienvenido! Tu prueba gratuita está activa hasta el ${trialEndsAt?.toLocaleDateString('es-CO')}`);
    setShowConfirmation(false);
    onClose();
  };

  if (!isOpen) return null;

  // Modal de confirmación con transparencia legal
  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Confirma tu Suscripción</h2>
            <button onClick={() => setShowConfirmation(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h3 className="font-bold text-lg text-gray-900 mb-2">🎁 Prueba Gratuita de 15 Días</h3>
              <p className="text-gray-700">
                Tendrás acceso completo a todas las funciones durante 15 días sin costo.
              </p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  <span className="font-bold block mb-1">Transparencia Total:</span>
                  Autorizas que tras los 15 días de prueba, se te cobrará $39.900 COP / mes. 
                  Puedes cancelar en cualquier momento desde tu panel.
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSubscribe}
            className="w-full bg-brand-red text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-darkRed transition-colors flex items-center justify-center gap-2"
          >
            Aceptar y Comenzar Prueba
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full flex flex-col md:flex-row shadow-2xl relative my-8">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Lado Izquierdo: Beneficios (Premium & Visual) */}
        <div className="md:w-1/2 bg-gray-50 p-10 md:p-14 rounded-l-3xl border-r border-gray-100 flex flex-col justify-center">
          <div className="inline-block bg-brand-red/10 text-brand-red font-bold px-4 py-1.5 rounded-full mb-6 w-max">
            Oferta Especial
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
            Todo el Poder para tu Negocio por <span className="text-brand-red">Menos de $1.400 al Día</span>
          </h2>
          
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1.5 rounded-full mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-gray-700 text-lg">Facturación Electrónica DIAN Ilimitada</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1.5 rounded-full mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-gray-700 text-lg">Vende desde Cualquier Celular (Cajeros Ilimitados)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1.5 rounded-full mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-gray-700 text-lg">Sincronización en la Nube y Modo Sin Internet</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1.5 rounded-full mt-0.5">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-gray-700 text-lg">Soporte Técnico Especializado</p>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Precio y Call to Action */}
        <div className="md:w-1/2 p-10 md:p-14 flex flex-col justify-center items-center text-center">
          <p className="text-gray-500 font-medium tracking-wide uppercase mb-2">Plan Pro Mensual</p>
          <div className="flex items-end justify-center gap-1 mb-8">
            <span className="text-gray-400 text-2xl font-medium mb-2">$</span>
            <span className="text-6xl font-black text-gray-900 tracking-tighter">39.900</span>
            <span className="text-gray-500 font-medium mb-2">/mes</span>
          </div>

          <div className="bg-brand-red/5 border border-brand-red/10 rounded-2xl p-6 w-full mb-8">
            <h3 className="text-brand-red font-bold text-xl mb-2">🎁 15 Días de Prueba Gratis</h3>
            <p className="text-gray-600 text-sm">
              Úsalo gratis. Si no te convence, cancela con un clic.
            </p>
          </div>

          <button 
            onClick={() => {
              const ends = new Date();
              ends.setDate(ends.getDate() + 15);
              setTrialEndsAt(ends);
              setShowConfirmation(true);
            }}
            className="w-full bg-brand-red text-white py-5 rounded-2xl font-bold text-xl shadow-lg shadow-red-500/30 hover:bg-brand-darkRed hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            Empezar Prueba Gratis
          </button>
          <p className="text-gray-400 text-xs mt-4">
            Al continuar aceptas nuestros términos y condiciones.
          </p>
        </div>
      </div>
    </div>
  );
};
