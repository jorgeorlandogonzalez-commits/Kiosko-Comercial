import React from 'react';
import { PartyPopper, Check, Rocket } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, userName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="bg-gradient-to-br from-brand-black to-gray-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="w-20 h-20 bg-brand-red rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-red/30 relative z-10">
            <PartyPopper size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter mb-2 relative z-10">
            ¡Bienvenido a Kiosko Comercial!
          </h2>
          <p className="text-brand-yellow font-bold uppercase tracking-widest text-xs relative z-10">
            Tu negocio ahora está en el siguiente nivel
          </p>
        </div>

        <div className="p-8 text-center space-y-6">
          <p className="text-gray-600 text-lg">
            Hola <span className="font-black text-gray-900">{userName}</span>, gracias por confiar en nosotros.
            Hemos configurado tu cuenta y estás listo para empezar a facturar de manera inteligente.
          </p>

          <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 text-left">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1 rounded-full text-green-600 shrink-0 mt-0.5">
                <Check size={16} strokeWidth={3} />
              </div>
              <p className="text-sm text-gray-700"><strong>Productos de ejemplo cargados</strong> para que puedas probar el sistema POS (Punto de Venta) inmediatamente.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1 rounded-full text-green-600 shrink-0 mt-0.5">
                <Check size={16} strokeWidth={3} />
              </div>
              <p className="text-sm text-gray-700"><strong>15 días de prueba gratis</strong> del plan <strong>Negocio Pro</strong> activados en tu cuenta. Explora todas las funciones sin restricciones.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-brand-red text-white font-black rounded-xl shadow-xl hover:bg-brand-darkRed hover:shadow-2xl transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2"
          >
            Empezar a usar Kiosko <Rocket size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
