import React, { useState } from 'react';
import { ShoppingCart, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';

const MOCK_PRODUCTS = [
  { id: '1', nombre: 'Pan', precio: 1500, iva: 0 },
  { id: '2', nombre: 'Leche', precio: 4000, iva: 0 },
  { id: '3', nombre: 'Café', precio: 3000, iva: 19 },
  { id: '4', nombre: 'Gaseosa', precio: 2500, iva: 19 },
  { id: '5', nombre: 'Queso x 2500g', precio: 52000, iva: 0 },
  { id: '6', nombre: 'Jabón', precio: 3500, iva: 19 },
];

export const DemoPOS: React.FC = () => {
  const [cart, setCart] = useState<{ product: typeof MOCK_PRODUCTS[0]; cantidad: number }[]>([]);
  const [paymentStep, setPaymentStep] = useState(false);
  const [pago, setPago] = useState<number | ''>('');
  const [showTicket, setShowTicket] = useState(false);

  const addToCart = (product: typeof MOCK_PRODUCTS[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { product, cantidad: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing && existing.cantidad > 1) {
        return prev.map((item) =>
          item.product.id === productId ? { ...item, cantidad: item.cantidad - 1 } : item
        );
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const total = cart.reduce((acc, item) => acc + item.product.precio * item.cantidad, 0);

  const handleCobrar = () => {
    if (total === 0) return;
    setPaymentStep(true);
  };

  const processPayment = () => {
    if (Number(pago) < total) {
      alert("El pago debe ser mayor o igual al total");
      return;
    }
    setShowTicket(true);
  };

  if (showTicket) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none rotate-[-45deg] z-0">
            <span className="text-6xl font-black text-red-500 whitespace-nowrap">SIMULACIÓN</span>
          </div>
          <div className="relative z-10">
            <div className="text-center mb-6">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-brand-black">¡Venta Exitosa!</h2>
              <p className="text-gray-500 text-sm mt-2">Así se verá tu factura real ante la DIAN. Esta demo NO emite documentos legales.</p>
            </div>
            <div className="border-t border-b border-gray-200 py-4 mb-6">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{item.cantidad}x {item.product.nombre}</span>
                  <span className="font-bold text-brand-black">${(item.product.precio * item.cantidad).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-500">Total Pagado:</span>
              <span className="font-bold text-gray-800">${Number(pago).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-8">
              <span className="font-black text-gray-700 text-lg">Devuelta:</span>
              <span className="font-black text-green-600 text-2xl">${(Number(pago) - total).toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-3">
              <a href="/" className="bg-brand-red text-white py-4 rounded-xl font-bold text-center hover:bg-brand-black transition-colors w-full block">
                Comienza tu prueba gratis de 15 días
              </a>
              <button onClick={() => { setShowTicket(false); setPaymentStep(false); setCart([]); setPago(''); }} className="text-gray-500 font-bold hover:text-brand-black transition-colors py-2 w-full">
                Hacer otra venta de prueba
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-yellow-400 text-yellow-900 font-bold text-center py-3 px-4 text-sm sticky top-0 z-50 flex items-center justify-center gap-2">
        <AlertCircle size={18} />
        👋 Estás en la TIENDA DE EJEMPLO. Todo aquí es de juguete: toca, vende y prueba sin miedo. Nada de lo que hagas aquí es real.
      </div>
      <div className="p-6">
        <a href="/" className="inline-flex items-center gap-2 text-brand-red font-bold hover:underline mb-4">
          <ChevronLeft size={16} /> Volver al inicio
        </a>
        <h1 className="text-3xl font-black text-brand-black mb-8">Prueba el POS sin registrarte</h1>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 px-6 pb-6 max-w-7xl mx-auto w-full">
        {/* Productos */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
          {MOCK_PRODUCTS.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:border-brand-red hover:shadow-md transition-all flex flex-col items-center justify-center text-center aspect-square active:scale-95"
            >
              <h3 className="font-bold text-gray-800 mb-1">{p.nombre}</h3>
              <p className="text-brand-red font-black">${p.precio.toLocaleString()}</p>
              <span className="text-xs text-gray-400 mt-2">IVA {p.iva}%</span>
            </button>
          ))}
        </div>

        {/* Carrito */}
        <div className="w-full md:w-96 bg-white rounded-3xl shadow-sm border border-gray-200 p-6 flex flex-col shrink-0 self-start sticky top-20">
          <h2 className="text-xl font-black text-brand-black mb-4 flex items-center gap-2">
            <ShoppingCart /> Venta Actual
          </h2>
          
          <div className="flex-1 overflow-y-auto min-h-[200px] mb-4">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 font-medium">
                Agrega productos para vender
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">{item.product.nombre}</p>
                      <p className="text-brand-red font-black text-sm">${(item.product.precio * item.cantidad).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => removeFromCart(item.product.id)} className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold hover:bg-gray-300">-</button>
                      <span className="font-black text-brand-black w-4 text-center">{item.cantidad}</span>
                      <button onClick={() => addToCart(item.product)} className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold hover:bg-gray-300">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!paymentStep ? (
            <div className="border-t border-gray-100 pt-4 mt-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-gray-500">Total a pagar:</span>
                <span className="text-3xl font-black text-brand-black">${total.toLocaleString()}</span>
              </div>
              <button
                onClick={handleCobrar}
                disabled={total === 0}
                className="w-full bg-brand-red text-white py-4 rounded-xl font-black text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
              >
                💰 Cobrar
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-4 mt-auto animate-in fade-in">
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">¿Con cuánto paga el cliente?</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">$</span>
                  <input
                    type="number"
                    value={pago}
                    onChange={(e) => setPago(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-4 pl-8 pr-4 font-black text-xl text-brand-black focus:outline-none focus:border-brand-red"
                    placeholder="Ej. 50000"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentStep(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={processPayment}
                  className="flex-[2] bg-green-500 text-white py-4 rounded-xl font-black hover:bg-green-600 transition-colors"
                >
                  Confirmar Pago
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
