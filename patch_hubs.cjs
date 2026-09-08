const fs = require('fs');
let code = fs.readFileSync('components/Hubs.tsx', 'utf8');

const target = `export const HubDian: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => (
  <HubLayout title="DIAN" subtitle="Historial y configuración de facturación electrónica" icon={<FileText size={40} />}>
    <HubButton icon={<FileText size={32} />} title="Historial de Facturas" subtitle="Tus envíos a la DIAN con reenvío en un clic" onClick={() => onNavigate('invoices')} />
    <HubButton icon={<BadgeCheck size={32} />} title="Software Habilitador" subtitle="Certificado y resolución de tu negocio" onClick={() => onNavigate('habilitador')} />
  </HubLayout>
);`;
const replacement = `export const HubDian: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => (
  <HubLayout title="DIAN" subtitle="Historial y configuración de facturación electrónica" icon={<FileText size={40} />}>
    <HubButton icon={<FileText size={32} />} title="HISTORIAL DE FACTURAS" subtitle="Facturas de venta, notas que las afectan y errores de transmisión" onClick={() => onNavigate('invoices')} />
  </HubLayout>
);`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/Hubs.tsx', code);
    console.log("REPLACED: HubDian");
} else {
    console.log("TARGET NOT FOUND: HubDian");
}
