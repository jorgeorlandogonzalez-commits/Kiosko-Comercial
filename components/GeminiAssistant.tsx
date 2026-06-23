import React, { useState, useRef, useEffect } from 'react';
import { askGeminiAssistant } from '../services/geminiService';
import { X, Send, Bot } from 'lucide-react';

interface GeminiAssistantProps {
  contextData: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  showFloatingButton: boolean;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ 
  contextData, 
  isOpen, 
  onOpen, 
  onClose, 
  showFloatingButton 
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: 'Hola! Soy Don J, tu contador digital. ¿En qué te ayudo hoy? (Pregunta sobre impuestos, la DIAN o tus ventas)' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const answer = await askGeminiAssistant(userMsg.text, contextData);

    const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: answer };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Button - Solo visible si showFloatingButton es true y no está abierto */}
      {showFloatingButton && !isOpen && (
        <button
          onClick={onOpen}
          className="fixed bottom-4 right-4 bg-brand-black text-white p-2.5 rounded-full shadow-2xl hover:bg-brand-red transition-all z-50 flex items-center gap-2 group border border-gray-700"
        >
          <Bot size={20} className="group-hover:rotate-12 transition-transform"/>
          <span className="font-bold text-xs pr-1 hidden md:inline">Ayuda IA</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-[100] border-2 border-brand-black animate-in slide-in-from-bottom-5">
          <div className="bg-brand-black text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Bot size={24} className="text-brand-red"/>
                <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">Don J - Asistente</h3>
                      <span className="bg-brand-red text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Beta</span>
                    </div>
                    <p className="text-xs text-gray-400">Experto Tributario & Ventas</p>
                </div>
            </div>
            <button onClick={onClose} className="hover:bg-gray-800 p-1 rounded">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] p-3 rounded-xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-brand-red text-white ml-auto rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-800 mr-auto rounded-bl-none shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-1 ml-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t bg-white rounded-b-xl flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu pregunta..."
              className="flex-1 bg-gray-800 text-white placeholder-gray-400 border border-gray-600 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand-red"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-brand-black text-white p-2 rounded-full hover:bg-brand-red disabled:bg-gray-300 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};