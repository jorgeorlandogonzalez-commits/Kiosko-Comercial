
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Lo sentimos, ha ocurrido un error inesperado.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && parsedError.error.includes('insufficient permissions')) {
            errorMessage = "No tienes permisos suficientes para realizar esta acción. Por favor contacta al administrador.";
            isPermissionError = true;
          }
        }
      } catch (e) {
        // No es un error de Firestore JSON
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-brand-red p-8 flex justify-center">
              <ShieldAlert size={64} className="text-white animate-pulse" />
            </div>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                {isPermissionError ? 'Acceso Denegado' : '¡Uy! Algo salió mal'}
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {errorMessage}
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-brand-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-lg"
                >
                  <RefreshCw size={20} />
                  Recargar Aplicación
                </button>
                
                <button 
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
                >
                  <Home size={20} />
                  Ir al Inicio
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-100 rounded-xl text-left overflow-auto max-h-40">
                  <p className="text-[10px] font-mono text-gray-500 whitespace-pre-wrap">
                    {this.state.error?.stack}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
