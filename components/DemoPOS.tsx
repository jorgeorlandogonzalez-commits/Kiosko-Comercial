import React, { useState } from 'react';
import { ShoppingCart, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';

const MOCK_PRODUCTS = [
  { id: '1', nombre: 'Pan', precio: 1500, iva: 0 },
  { id: '2', nombre: 'Leche', precio: 4000, iva: 0 },
  { id: '3', nombre: 'Café', precio: 3000, iva: 5 },
  { id: '4', nombre: 'Gaseosa', precio: 2500, iva: 19 },
  { id: '5', nombre: 'Queso x 2500g', precio: 52000, iva: 0 },
  { id: '6', nombre: 'Jabón', precio: 3500, iva: 19 },
];

export const DemoPOS: React.FC = () => {
  const [cart, setCart] = useState<{ product: typeof MOCK_PRODUCTS[0]; cantidad: number }[]>([]);
  const [paymentStep, setPaymentStep] = useState(false);
  const [pago, setPago] = useState<number | ''>('');
  const [showTicket, setShowTicket] = useState(false);
  const [errorPago, setErrorPago] = useState('');

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

  const calculateTotals = () => {
    let subtotal = 0;
    const taxes: Record<number, number> = {};

    cart.forEach(item => {
      const itemBase = item.product.precio * item.cantidad;
      subtotal += itemBase;
      const ivaValue = item.product.precio * (item.product.iva / 100) * item.cantidad;
      if (item.product.iva >= 0) {
        taxes[item.product.iva] = (taxes[item.product.iva] || 0) + ivaValue;
      }
    });

    const total = subtotal + Object.values(taxes).reduce((a, b) => a + b, 0);

    return { subtotal, taxes, total: Math.round(total) };
  };

  const { subtotal, taxes, total } = calculateTotals();

  const handleCobrar = () => {
    if (total === 0) return;
    setPaymentStep(true);
    setErrorPago('');
  };

  const processPayment = () => {
    if (Number(pago) < total) {
      setErrorPago("Sumercé, el pago debe ser mayor o igual al total.");
      return;
    }
    setErrorPago('');
    setShowTicket(true);
  };

  const TotalsBox = ({ className = "" }: { className?: string }) => (
    <div className={`border-t border-gray-100 pt-4 mt-auto ${className}`}>
      <div className="flex justify-between items-center mb-1 text-sm text-gray-500 font-medium">
        <span>Subtotal (Base Imponible)</span>
        <span>${subtotal.toLocaleString()}</span>
      </div>
      {Object.entries(taxes).map(([rate, amount]) => (
        <div key={rate} className="flex justify-between items-center mb-1 text-sm text-gray-500 font-medium">
          <span>IVA {rate}%</span>
          <span>${Math.round(amount).toLocaleString()}</span>
        </div>
      ))}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
        <span className="font-bold text-gray-700">Total a Pagar</span>
        <span className="text-3xl font-black text-brand-black">${total.toLocaleString()}</span>
      </div>
    </div>
  );

  const getFinalPrice = (product: typeof MOCK_PRODUCTS[0], cantidad: number) => {
    return Math.round((product.precio * (1 + product.iva / 100)) * cantidad);
  };

  const currentDate = new Date().toLocaleDateString('es-CO', { 
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  if (showTicket) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 font-mono">
        <div className="bg-white p-8 w-full max-w-sm relative overflow-hidden shadow-lg border-t-8 border-brand-black" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23f3f4f6\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }}>
          
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none rotate-[-45deg] z-0">
            <span className="text-6xl font-black text-red-500 whitespace-nowrap tracking-widest">SIMULACIÓN</span>
          </div>
          
          <div className="relative z-10">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-brand-black mb-1">KIOSKO DEMO</h2>
              <p className="text-gray-500 text-sm font-bold">Factura de juguete</p>
              <p className="text-gray-400 text-xs mt-2">{currentDate}</p>
            </div>
            
            <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{item.cantidad}x {item.product.nombre} (IVA {item.product.iva}%)</span>
                  <span className="font-bold text-brand-black">${getFinalPrice(item.product, item.cantidad).toLocaleString()}</span>
                </div>
              ))}
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1 text-sm text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              {Object.entries(taxes).map(([rate, amount]) => (
                <div key={rate} className="flex justify-between items-center mb-1 text-sm text-gray-500">
                  <span>IVA {rate}%</span>
                  <span>${Math.round(amount).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-gray-300">
                <span className="font-black text-gray-800 text-lg">TOTAL</span>
                <span className="font-black text-brand-black text-xl">${total.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="border-t border-gray-800 py-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-700">Pagado:</span>
                <span className="font-bold text-gray-800">${Number(pago).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black text-gray-700 text-lg">Devuelta:</span>
                <span className="font-black text-green-600 text-2xl">${(Number(pago) - total).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="text-center mt-8">
              <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
              <p className="font-bold text-brand-black text-sm">¡Gracias por su compra!</p>
              <p className="text-xs text-gray-500 mt-1">Así se verá tu factura real ante la DIAN.</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 mt-8 w-full max-w-sm font-sans">
          <a href="/" className="bg-brand-red text-white py-4 rounded-xl font-bold text-center hover:bg-brand-black transition-colors w-full block">
            Comienza tu prueba gratis de 15 días
          </a>
          <button onClick={() => { setShowTicket(false); setPaymentStep(false); setCart([]); setPago(''); }} className="text-gray-500 font-bold hover:text-brand-black transition-colors py-2 w-full text-center">
            ← Hacer otra venta de prueba
          </button>
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
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:border-brand-red hover:shadow-md transition-all flex flex-col items-center justify-center text-center aspect-square active:scale-95 relative"
            >
              <div className="absolute top-2 right-2 bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full">
                IVA {p.iva}%
              </div>
              <h3 className="font-bold text-gray-800 mb-1 mt-2">{p.nombre}</h3>
              <p className="text-brand-red font-black text-lg">${p.precio.toLocaleString()}</p>
              <span className="text-xs text-gray-400 mt-1">Base</span>
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
                      <p className="text-gray-500 text-xs">Base: ${(item.product.precio * item.cantidad).toLocaleString()}</p>
                      <p className="text-brand-red font-black text-sm">Final: ${getFinalPrice(item.product, item.cantidad).toLocaleString()}</p>
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
            <>
              <TotalsBox />
              <button
                onClick={handleCobrar}
                disabled={total === 0}
                className="w-full bg-brand-red text-white py-4 rounded-xl font-black text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
              >
                💰 Cobrar
              </button>
            </>
          ) : (
            <div className="animate-in fade-in flex flex-col h-full">
              <TotalsBox className="mb-4" />
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">¿Con cuánto paga el cliente?</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl">$</span>
                  <input
                    type="number"
                    value={pago}
                    onChange={(e) => setPago(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full bg-gray-50 border-2 rounded-xl py-4 pl-8 pr-4 font-black text-xl text-brand-black focus:outline-none ${errorPago ? 'border-red-500' : 'border-gray-200 focus:border-brand-red'}`}
                    placeholder="Ej. 50000"
                    autoFocus
                  />
                </div>
                {errorPago && (
                  <p className="text-red-500 text-sm font-bold mt-2 animate-in slide-in-from-top-1">{errorPago}</p>
                )}
              </div>
              <div className="flex gap-2 mt-auto">
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
