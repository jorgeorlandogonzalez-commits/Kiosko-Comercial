
import React, { useState, useEffect } from 'react';
import { Operator } from '../types';
import { Check, X, ShieldCheck, User, ArrowRight, Lock, Globe, Eye, EyeOff, Instagram, Facebook, Youtube, KeyRound, Mail, ArrowLeft, Send } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from 'firebase/auth';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

import { auth } from '../firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (operator: Operator) => void;
  canClose?: boolean;
}

type AuthView = 'LOGIN' | 'RECOVERY';
type RecoveryStep = 'INPUT' | 'SUCCESS';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, canClose = true }) => {
  // ESTADOS DE NAVEGACIÓN
  const [currentView, setCurrentView] = useState<AuthView>('LOGIN');
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('INPUT');

  // ESTADOS DE FORMULARIO LOGIN
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // ESTADOS DE FORMULARIO RECUPERACIÓN
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError('');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Mapear usuario de Google a Operator
            const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      if (additionalInfo?.isNewUser) {
          try {
              const batch = writeBatch(db);
              
              // 1. Initial Products
              const INITIAL_PRODUCTS = [
                { id: '1', name: 'Arroz Libra', cost: 1800, price: 2500, taxRate: 0, category: 'Abarrotes', stock: 50, icon: '🍚', ean: '7701001' },
                { id: '2', name: 'Gaseosa 1.5L', cost: 3200, price: 4500, taxRate: 19, category: 'Bebidas', stock: 24, icon: '🥤', ean: '7701002' },
              ];
              INITIAL_PRODUCTS.forEach(p => {
                  batch.set(doc(db, `users/${user.uid}/products/${p.id}`), p);
              });

              // 2. Initial Customers
              const INITIAL_CUSTOMERS = [
                { nit: '222222222222', name: 'Consumidor Final', address: 'Local', phone: '' },
              ];
              batch.set(doc(db, `users/${user.uid}/data/customers`), { items: INITIAL_CUSTOMERS });

              // 3. Initial Suppliers
              const INITIAL_SUPPLIERS = [
                  { nit: '800111222', name: 'Distribuidora Central', contactName: 'Carlos Vendedor' },
              ];
              batch.set(doc(db, `users/${user.uid}/data/suppliers`), { items: INITIAL_SUPPLIERS });

              // 4. Initial Categories
              const INITIAL_CATEGORIES = ['General', 'Abarrotes', 'Bebidas', 'Licores', 'Fruver', 'Lácteos', 'Aseo'];
              batch.set(doc(db, `users/${user.uid}/data/categories`), { items: INITIAL_CATEGORIES });
              
              await batch.commit();
          } catch(err) {
              console.error("Error setting up new user data", err);
          }
      }
      
      const operator: Operator = {
        id: user.uid,
        name: user.displayName || 'Usuario',
        role: 'ADMIN', // Por defecto, el primer usuario que se loguea es ADMIN
        email: user.email || ''
      };
      
      onLogin(operator);
    } catch (err: any) {
      console.error("Error en login con Google:", err);
      setError('Error al iniciar sesión con Google. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!recoveryEmail.includes('@')) {
          setError('Ingresa un correo válido');
          return;
      }
      
      setIsSendingRecovery(true);
      setError('');
      
      // Simulación de llamada a API
      setTimeout(() => {
          setIsSendingRecovery(false);
          setRecoveryStep('SUCCESS');
      }, 1500);
  };

  const resetForm = () => {
      setError('');
      setCurrentView('LOGIN');
      setRecoveryStep('INPUT');
      setRecoveryEmail('');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex min-h-screen font-sans">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DINÁMICO */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 relative bg-white animate-in slide-in-from-left-5 duration-500">
            
            {canClose && (
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-all text-gray-500">
                    <X size={20} />
                </button>
            )}

            <div className="w-full max-w-md space-y-8">
                
                {/* 1. VISTA DE LOGIN / REGISTRO */}
                {currentView === 'LOGIN' && (
                    <>
                        <div className="text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="inline-flex items-center gap-2 mb-6">
                                <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg transform -rotate-3">K</div>
                                <span className="text-2xl font-black text-brand-black tracking-tight uppercase">Kiosko Comercial</span>
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                                Bienvenido a la Nube
                            </h2>
                            <p className="text-gray-500 font-medium">
                                Inicia sesión con tu cuenta de Google para sincronizar tu negocio.
                            </p>
                        </div>

                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {error && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold animate-pulse">
                                    <X size={16} /> {error}
                                </div>
                            )}

                            <button 
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full py-4 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 font-black rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-3 transform active:scale-95 disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                {isLoading ? 'Conectando...' : 'Continuar con Google'}
                            </button>

                        </div>

                        <div className="pt-6 border-t border-gray-100 text-center space-y-6">
                            <div className="flex justify-center gap-6 text-gray-400">
                                <button className="hover:text-pink-600 hover:scale-110 transition-all"><Instagram size={24}/></button>
                                <button className="hover:text-blue-600 hover:scale-110 transition-all"><Facebook size={24}/></button>
                                <button className="hover:text-red-600 hover:scale-110 transition-all"><Youtube size={24}/></button>
                            </div>
                        </div>
                    </>
                )}

                {/* 2. VISTA DE RECUPERACIÓN DE CONTRASEÑA */}
                {currentView === 'RECOVERY' && (
                    <div className="animate-in fade-in slide-in-from-right-10 duration-500">
                        {recoveryStep === 'INPUT' ? (
                            <>
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <KeyRound size={32} />
                                    </div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Recuperar Acceso</h2>
                                    <p className="text-gray-500 font-medium text-sm px-4">
                                        Ingresa tu correo electrónico y te enviaremos un enlace seguro para restablecer tu contraseña.
                                    </p>
                                </div>

                                <form onSubmit={handleRecoverySubmit} className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 uppercase ml-2">Correo Registrado</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input 
                                                type="email" 
                                                value={recoveryEmail}
                                                onChange={e => setRecoveryEmail(e.target.value)}
                                                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-bold placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                placeholder="ejemplo@negocio.com"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold animate-pulse">
                                            <X size={16} /> {error}
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isSendingRecovery}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSendingRecovery ? 'Enviando...' : 'Enviar Enlace'} <Send size={18}/>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={resetForm}
                                        className="w-full py-4 bg-white border border-gray-200 text-gray-500 font-black rounded-2xl hover:bg-gray-50 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft size={16}/> Volver al Login
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center animate-in zoom-in-95 duration-500">
                                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <Check size={40} strokeWidth={3} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">¡Correo Enviado!</h2>
                                <p className="text-gray-500 font-medium text-sm mb-8 px-4">
                                    Hemos enviado las instrucciones a <span className="font-bold text-gray-800">{recoveryEmail}</span>. Revisa tu bandeja de entrada o spam.
                                </p>
                                <button 
                                    onClick={resetForm}
                                    className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs"
                                >
                                    Entendido, Volver
                                </button>
                            </div>
                        )}
                    </div>
                )}



            </div>
        </div>

        {/* COLUMNA DERECHA: HERO IMAGE */}
        <div className="hidden lg:flex w-1/2 bg-brand-black relative overflow-hidden">
            {/* Fondo con imagen de retail profesional */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')` }}
            ></div>
            
            {/* Gradiente de marca */}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-red/90 via-brand-black/80 to-brand-black/40"></div>

            {/* Contenido Visual */}
            <div className="relative z-10 flex flex-col justify-end p-20 h-full text-white">
                <div className="mb-8">
                    <div className="w-16 h-1 bg-white mb-6 rounded-full"></div>
                    <h1 className="text-5xl font-black mb-6 leading-tight">
                        Con Kiosko,<br/>
                        <span className="text-brand-red bg-white px-2 leading-snug">tu negocio crece</span><br/>
                        con inteligencia.
                    </h1>
                    <p className="text-lg font-medium text-gray-300 max-w-md leading-relaxed">
                        La plataforma todo en uno para facturación, inventarios y gestión de clientes. Diseñada para el comercio moderno de Colombia.
                    </p>
                </div>
                
                {/* Indicadores de Status */}
                <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                        <ShieldCheck className="text-green-400" size={24} />
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">Estado Nube</p>
                            <p className="text-sm font-bold">Sincronizado</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                        <Lock className="text-brand-red" size={24} />
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">Seguridad</p>
                            <p className="text-sm font-bold">Firebase Auth</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
  );
};
