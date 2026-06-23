import React from 'react';
import { Shield, CheckCircle, FileText, ArrowRight, Phone } from 'lucide-react';

interface HabilitadorPageProps {
  onBackToApp?: () => void;
}

export const HabilitadorPage: React.FC<HabilitadorPageProps> = ({ onBackToApp }) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero Section */}
      <header className="bg-gray-950 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-red/20 text-brand-red px-4 py-2 rounded-full mb-6 border border-brand-red/30">
            <Shield className="w-5 h-5 text-brand-red fill-current" />
            <span className="font-bold text-xs uppercase tracking-wider">Transparencia Regulatoria</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight uppercase tracking-tighter">
            Software Habilitador:<br />
            <span className="text-brand-red">Facturación 100% Legal ante la DIAN</span>
          </h1>
          <p className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            Kiosko Comercial opera como herramienta técnica que utiliza TU certificado digital 
            para firmar y transmitir facturas. Tú mantienes el control, nosotros la tecnología.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-16">
        
        {/* How it Works */}
        <section>
          <h2 className="text-2xl font-black tracking-tight mb-8 flex items-center gap-3 text-gray-900 uppercase">
            <CheckCircle className="w-7 h-7 text-green-600" />
            ¿Cómo funciona el modelo "Software Habilitador"?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "1. Tú provees el certificado",
                desc: "Subes tu archivo .p12 personal a tu espacio seguro en Kiosko. Nosotros NUNCA usamos certificados genéricos."
              },
              {
                title: "2. Kiosko firma en tu nombre",
                desc: "Nuestro backend seguro genera el XML, calcula el CUFE (SHA-384) y firma criptográficamente con TU certificado."
              },
              {
                title: "3. Transmisión autorizada a DIAN",
                desc: "El documento se envía a la DIAN usando TU NIT habilitado. Recibes estado APPROVED/REJECTED en tiempo real."
              }
            ].map((step, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-brand-red transition-all">
                <div className="text-brand-red font-black uppercase text-sm mb-3">{step.title}</div>
                <p className="text-gray-600 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Legal Guarantee */}
        <section className="bg-red-50 border-l-4 border-brand-red p-6 rounded-r-2xl">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-brand-red">
            <FileText className="w-5 h-5 text-brand-red" />
            ¿Esto afecta la validez legal de mis facturas?
          </h3>
          <p className="text-gray-800 text-sm mb-4 leading-relaxed">
            <strong>NO.</strong> Tus facturas son 100% válidas porque se firman con TU certificado digital y se transmiten 
            con TU NIT habilitado. Kiosko actúa como intermediario técnico autorizado por ti, no como responsable fiscal.
          </p>
          <p className="text-xs text-gray-500 italic">
            Resolución 00165 de 2023, Art. 616-4 ET: "El facturador es responsable de la información reportada. 
            El software solo facilita el proceso técnico."
          </p>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 uppercase mb-6 tracking-tight">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            {[
              {
                q: "¿Kiosko Comercial es un Proveedor Tecnológico (PT) registrado?",
                a: "No durante la fase beta. Operamos como Software Habilitador con autorización explícita del usuario. Iniciaremos el trámite de registro PT en el mes 6 con los ingresos y métricas de la beta."
              },
              {
                q: "¿La DIAN puede rechazar mis facturas por usar este modelo?",
                a: "No. La DIAN valida el CUFE y la firma digital, no el software que usas. Mientras tu certificado esté vigente y tu NIT habilitado, la factura es legal."
              },
              {
                q: "¿Puedo retirar mi certificado en cualquier momento?",
                a: "Sí. Ve a Configuración → Certificado Digital → Eliminar. Tu autorización es revocable inmediatamente."
              },
              {
                q: "¿Qué pasa si mi certificado vence?",
                a: "El sistema te notificará 30 días antes. Debes renovarlo con tu certificadora y subir el nuevo .p12. Sin certificado válido, no se pueden emitir facturas legales (normativa DIAN)."
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-2 text-sm">{faq.q}</h4>
                <p className="text-gray-600 text-xs leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="bg-gray-950 text-white p-8 rounded-3xl">
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">🗺️ Nuestra Ruta a Proveedor Tecnológico</h2>
          <div className="grid md:grid-cols-3 gap-6 text-xs">
            <div className="border-l-2 border-brand-red pl-4">
              <span className="text-brand-red font-black uppercase">FASE 1: HOY</span>
              <p className="mt-2 text-gray-300 leading-relaxed">Software Habilitador + Autorización explícita + Validación de mercado</p>
            </div>
            <div className="border-l-2 border-gray-600 pl-4">
              <span className="text-gray-400 font-bold">FASE 2: MES 6</span>
              <p className="mt-2 text-gray-300 leading-relaxed">Constitución SAS + Inicio trámite PT + ISO 27001 en proceso</p>
            </div>
            <div className="border-l-2 border-gray-800 pl-4">
              <span className="text-gray-500 font-bold">FASE 3: MES 12+</span>
              <p className="mt-2 text-gray-300 leading-relaxed">Habilitación DIAN oficial + Transmisión gestionada 100% incluida</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">¿Listo para facturar con respaldo legal?</h3>
          <p className="text-gray-600 mb-6 text-sm">Únete a la beta y recibe 3 meses gratis al pagar anual.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {onBackToApp ? (
              <button 
                onClick={onBackToApp}
                className="inline-flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95"
              >
                Volver al Sistema <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <a 
                href="/" 
                className="inline-flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95"
              >
                Comenzar Prueba Gratis <ArrowRight className="w-5 h-5" />
              </a>
            )}
            <a 
              href="https://wa.me/573001234567" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-900 px-8 py-4 rounded-xl font-bold text-xs transition-colors border border-gray-200"
            >
              <Phone className="w-5 h-5 text-green-600" /> Hablar con Soporte
            </a>
          </div>
        </section>

      </main>

      {/* Footer Note */}
      <footer className="bg-gray-100 border-t border-gray-200 py-8 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Kiosko Comercial SAS • Todos los derechos reservados</p>
        <p className="mt-2">Documento informativo. No constituye asesoría legal o tributaria.</p>
      </footer>
    </div>
  );
};
