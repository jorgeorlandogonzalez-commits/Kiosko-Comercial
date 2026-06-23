import React from 'react';
import { Shield, ArrowRight, Gavel, FileText, Scale } from 'lucide-react';

interface TerminosPageProps {
  onBackToApp?: () => void;
}

export const TerminosPage: React.FC<TerminosPageProps> = ({ onBackToApp }) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Hero Section */}
      <header className="bg-gray-950 text-white py-12 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-red/20 text-brand-red px-4 py-2 rounded-full mb-4 border border-brand-red/30">
            <Gavel className="w-5 h-5 text-brand-red" />
            <span className="font-bold text-xs uppercase tracking-wider">Marco Contractual legal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-4 leading-tight uppercase tracking-tighter">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-gray-300 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed font-bold tracking-widest uppercase">
            Beta de Lanzamiento • Kiosko Comercial SAS
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white p-6 md:p-10 rounded-3xl shadow-xl border border-gray-200 space-y-8 text-sm leading-relaxed text-gray-700">
          
          <div className="p-4 bg-brand-red/5 border-l-4 border-brand-red rounded-r-xl">
            <div className="flex items-center gap-2 font-bold text-brand-red mb-2 uppercase text-xs tracking-wider">
              <Shield className="w-4 h-4" /> Resumen para sumercé
            </div>
            <p className="text-gray-700 text-xs text-balance">
              Este acuerdo dice que usted es responsable de la veracidad y legalidad de las ventas que realiza en su local. Kiosko Comercial le facilita el sistema para facturar de manera fácil y rápida usando su propio certificado digital sin intermediarios, funcionando de forma transparente ante la DIAN como un <strong>Software Habilitador</strong>.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-black text-gray-900 uppercase flex items-center gap-2 border-b pb-2"><Scale className="w-5 h-5 text-brand-red" /> 1. Aceptación de Términos</h2>
            <p>
              Al acceder, registrarse o utilizar la plataforma Kiosko Comercial ("el Servicio"), el usuario ("el Comerciante") acepta quedar vinculado a estos Términos y Condiciones. Si no está de acuerdo con alguna parte, no debe utilizar el Servicio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-gray-900 uppercase flex items-center gap-2 border-b pb-2"><FileText className="w-5 h-5 text-brand-red" /> 2. Naturaleza del Servicio (Software Habilitador)</h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
              <li><strong>2.1:</strong> Kiosko Comercial es un <strong>software de punto de venta y habilitador de facturación electrónica</strong>. No actúa como Proveedor Tecnológico (PT) registrado ante la DIAN durante la fase beta.</li>
              <li><strong>2.2:</strong> El Servicio opera como herramienta técnica que facilita la creación, firma y transmisión de documentos electrónicos, utilizando exclusivamente la infraestructura y credenciales proporcionadas por el Comerciante.</li>
              <li><strong>2.3:</strong> Kiosko Comercial no almacena, modifica ni interpreta información tributaria. El Comerciante es el único responsable de la veracidad de los datos ingresados.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-gray-900 uppercase flex items-center gap-2 border-b pb-2">📂 3. Autorización de Uso de Certificado Digital (.p12)</h2>
            <p>
              Al habilitar la facturación electrónica, el Comerciante autoriza expresamente a Kiosko Comercial a utilizar su certificado digital (.p12) cargado en la plataforma, exclusivamente para firmar criptográficamente facturas, notas crédito y documentos derivados, y transmitirlos a la DIAN. Esta autorización es <strong>revocable, específica y temporal</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-gray-900 uppercase flex items-center gap-2 border-b pb-2">💼 4. Responsabilidades del Comerciante</h2>
            <p>
              El Comerciante debe estar habilitado legalmente ante la DIAN para facturar electrónicamente, mantener su certificado .p12 vigente, y custodiar la contraseña de este de manera confidencial. Asimismo, garantiza que todos los precios, impuestos e información de adquirentes ingresados al sistema POS sean reales y exactos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-gray-900 uppercase flex items-center gap-2 border-b pb-2">🛡️ 5. Protección de Datos Sólida</h2>
            <p>
              Tratamos tu información y la de tus clientes según la Ley 1581 de 2012 de Habeas Data en Colombia. Los datos se utilizan estrictamente para el correcto funcionamiento del software pos, soporte y mejoras del mismo, y nunca son vendidos o compartidos con terceros sin tu consentimiento explícito.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-gray-900 uppercase flex items-center gap-2 border-b pb-2">⚡ 6. Condiciones de la Beta y Suscripción</h2>
            <p>
              La prueba es totalmente libre de compromisos por 15 días. Posteriormente, el costo de suscripción mensual es de <strong>$39.900 COP</strong> por comercio, sin cláusulas de permanencia. Puedes cancelar el plan o descargar copias de seguridad de tus datos en cualquier momento desde tu panel de ajustes.
            </p>
          </section>

          <div className="pt-6 border-t flex justify-center">
            {onBackToApp && (
              <button 
                onClick={onBackToApp}
                className="inline-flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95"
              >
                Entendido, Continuar <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>

        </div>
      </main>

      {/* Footer Note */}
      <footer className="bg-gray-100 border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Kiosko Comercial SAS • Colombia</p>
      </footer>
    </div>
  );
};
