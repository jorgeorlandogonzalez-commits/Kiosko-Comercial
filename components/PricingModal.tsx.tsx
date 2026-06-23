import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [publicKey, setPublicKey] = useState('');
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

    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      
      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: 'monthly' })
      });

      const data = await response.json();
      
      if (data.success) {
        setPublicKey(data.publicKey);
        setTrialEndsAt(new Date(data.trialEndsAt));
        setShowConfirmation(true);
      } else {
        alert(`Error: ${data.message || 'No se pudo crear la suscripción'}`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTrial = () => {
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
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">⚠️ Importante: Cobro Automático</h3>
                  <p className="text-gray-700 mb-2">
                    Al finalizar los 15 días, se te cobrará automáticamente <strong>$39.900 COP/mes</strong>.
                  </p>
                  <p className="text-sm text-gray-600">
                    Puedes cancelar en cualquier momento desde Configuración → Suscripción, sin penalizaciones.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">
                <strong>Fecha de inicio del cobro:</strong>{' '}
                {trialEndsAt?.toLocaleDateString('es-CO', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmation(false)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmTrial}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Aceptar y Comenzar
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Al hacer clic en "Aceptar", autorizas el cobro automático según nuestros{' '}
            <a href="/terminos" className="text-red-600 underline" target="_blank" rel="noopener noreferrer">
              Términos y Condiciones
            </a>.
          </p>
        </div>
      </div>
    );
  }

  // Modal principal de planes
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Elige tu Plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-red-500 rounded-xl p-6 bg-red-50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Plan Mensual</h3>
                <p className="text-gray-600 text-sm">Facturación electrónica completa</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-600">$39.900</div>
                <div className="text-sm text-gray-600">COP/mes</div>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              {[
                'Facturas ilimitadas',
                'Soporte WhatsApp <2h',
                'Modo offline',
                'Reportes en tiempo real',
                'Asistente IA Don J'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Comenzar Prueba Gratis (15 días)'}
            </button>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-gray-700">
                <strong>⚠️ Importante:</strong> Después de los 15 días gratuitos, se te cobrará automáticamente $39.900/mes. 
                Puedes cancelar en cualquier momento.
              </p>
            </div>

            <p className="text-xs text-gray-500 text-center mt-3">
              Sin compromiso. Cancela cuando quieras.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};