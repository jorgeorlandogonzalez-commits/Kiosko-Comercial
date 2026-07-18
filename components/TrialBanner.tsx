import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface TrialBannerProps {
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  trialEndDate: string | null;
  onSubscribeClick: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ status, trialEndDate, onSubscribeClick }) => {
  if (status !== 'TRIAL' && status !== 'EXPIRED') {
    return null; // Ocultamos si ya pagó o fue cancelado
  }

  let daysRemaining = 0;
  if (trialEndDate) {
    const end = new Date(trialEndDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } else {
    // Fallback: asumimos 14 días si no hay fecha exacta (solo para UI)
    daysRemaining = 14; 
  }

  const isExpired = daysRemaining <= 0 || status === 'EXPIRED';

  return (
    <button
      onClick={onSubscribeClick}
      className={`
        flex items-center gap-2 px-4 py-1.5 rounded-full shadow-sm text-sm font-bold transition-all
        hover:scale-105 active:scale-95
        ${isExpired 
          ? 'bg-brand-red text-white hover:bg-red-700 shadow-red-500/20' 
          : 'bg-orange-100 text-orange-700 hover:bg-orange-200 shadow-orange-500/10'
        }
      `}
      title={isExpired ? "Tu prueba ha finalizado. Renueva ahora." : "Estás en periodo de prueba gratuita"}
    >
      {isExpired ? (
        <>
          <AlertCircle size={16} strokeWidth={2.5} />
          <span>Prueba finalizada</span>
        </>
      ) : (
        <>
          <Clock size={16} strokeWidth={2.5} />
          <span>Prueba gratuita: {daysRemaining} días restantes</span>
        </>
      )}
    </button>
  );
};

export default TrialBanner;
