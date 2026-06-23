import React, { useState, useEffect } from 'react';

export function GlobalErrorOverlay() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      // Sometimes event.error has the real error object
      let msg = event.message || 'Unknown Error';
      if (msg === 'Script error.') {
         return; // Ignore cross-origin script error noise
      }
      const details = event.error?.stack ? `\n\n${event.error.stack}` : '';
      setError(`[Error] ${msg} at ${event.filename ? event.filename.split('/').pop() : 'unknown'}:${event.lineno}${details}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      let reason = 'Unknown Rejection';
      if (event.reason instanceof Error) {
        reason = `${event.reason.message}\n${event.reason.stack || ''}`;
      } else if (typeof event.reason === 'string') {
        reason = event.reason;
      } else if (event.reason && typeof event.reason === 'object') {
        try {
          reason = JSON.stringify(event.reason);
        } catch (e) {
          // ignore
        }
      }

      // Ignorar errores de red benignos de Vite en modo dev
      if (reason.includes('WebSocket closed') || reason.includes('vite/client')) {
        return;
      }

      setError(`[Unhandled Promise] ${reason}`);
    };

    const originalConsoleError = console.error;
    console.error = (...args) => {
      const msg = args.map(a => (typeof a === 'object' ? (a instanceof Error ? a.stack || a.message : JSON.stringify(a)) : String(a))).join(' ');
      if (msg.includes('Warning:') || msg.includes('WebSocket closed') || msg.includes('vite')) {
         originalConsoleError(...args);
         return;
      }
      setError(`[Console Error] ${msg}`);
      originalConsoleError(...args);
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, []);

  if (!error) return null;

  return (
    <div 
      className="fixed top-2 left-2 p-3 bg-red-100 border border-red-500 rounded-md shadow-2xl z-[9999] max-w-sm cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
      onClick={() => setError(null)}
      title="Click para cerrar"
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-red-800 font-bold text-xs uppercase tracking-wider">Error detectado</h3>
        <button 
          onClick={(e) => { e.stopPropagation(); setError(null); }}
          className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm leading-none"
        >
          &times;
        </button>
      </div>
      <p className="text-red-700 text-xs font-mono break-words">{error}</p>
    </div>
  );
}
