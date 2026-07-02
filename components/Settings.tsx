
import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { ShieldAlert, Save, Store, MapPin, Phone, FileCheck, AlertCircle, Cpu, ShieldCheck, Palette, Trash2, AlertTriangle, Fingerprint, Download, Database, Printer, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadFile } from '../services/cloudStorageService';

interface SettingsProps {
  settings: StoreSettings;
  onSave: (newSettings: StoreSettings) => void;
  userId?: string;
  onNavigateActiveTab?: (tab: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onSave, userId, onNavigateActiveTab }) => {
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: val
    }));
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      currentNumber: formData.currentNumber ? Number(formData.currentNumber) : 1,
      rangeStart: formData.rangeStart ? Number(formData.rangeStart) : undefined,
      rangeEnd: formData.rangeEnd ? Number(formData.rangeEnd) : undefined,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const [showResetModal, setShowResetModal] = useState(false);

  const handleFactoryReset = () => {
      setShowResetModal(true);
  };

  const confirmFactoryReset = async () => {
      if (userId) {
          try {
              const { dbService } = await import('../services/storageService');
              await dbService.clearAllData(userId);
          } catch (error) {
              console.error("Error clearing firestore data", error);
          }
      } else {
          localStorage.clear();
      }
      window.location.reload();
  };

  const handleExportBackup = () => {
      const dataToExport: Record<string, any> = {};
      // Listado de claves que usa el sistema
      const keys = [
          'kiosko_products', 'kiosko_customers', 'kiosko_suppliers', 
          'kiosko_invoices', 'kiosko_quotes', 'kiosko_orders', 
          'kiosko_credit_accounts', 'kiosko_supplier_accounts', 
          'kiosko_kardex', 'kiosko_categories', 'kiosko_settings'
      ];

      keys.forEach(key => {
          const activeKey = userId ? `kiosko_${userId}_${key.replace('kiosko_', '')}` : key;
          const item = localStorage.getItem(activeKey);
          if (item) {
              try {
                  dataToExport[key] = JSON.parse(item);
              } catch (e) {
                  dataToExport[key] = item;
              }
          }
      });

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Kiosko_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !userId) return;

      if (!file.name.endsWith('.p12') && !file.name.endsWith('.pfx')) {
          alert('El archivo debe terminar en .p12 o .pfx. Verifica que sea tu certificado digital.');
          return;
      }
      if (file.size > 5 * 1024 * 1024) {
          alert('El certificado es muy grande. Debe pesar menos de 5MB.');
          return;
      }

      try {
          setIsUploading(true);
          const fileName = `cert_${Date.now()}_${file.name}`;
          const downloadUrl = await uploadFile(userId, 'certificates', fileName, file);
          
          setFormData(prev => ({
              ...prev,
              certificateName: file.name,
              certificateBase64: downloadUrl 
          }));
      } catch (error) {
          console.error("Error subiendo certificado:", error);
          alert("Error al subir el certificado. Intenta de nuevo.");
      } finally {
          setIsUploading(false);
      }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !userId) return;

      try {
          setIsUploadingLogo(true);
          const fileName = `logo_${Date.now()}_${file.name}`;
          const downloadUrl = await uploadFile(userId, 'logos', fileName, file);
          
          setFormData(prev => ({
              ...prev,
              logoUrl: downloadUrl
          }));
      } catch (error) {
          console.error("Error subiendo logo:", error);
          alert("Error al subir el logo. Intenta de nuevo.");
      } finally {
          setIsUploadingLogo(false);
      }
  };

  const inputClass = "w-full p-3 border border-gray-600 rounded-xl bg-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-red outline-none transition-all text-white font-medium";

  return (
    <div className="max-w-4xl mx-auto p-6 pb-32">
      {/* MODAL RESET DE FÁBRICA */}
      {showResetModal && (
          <div className="fixed inset-0 z-[600] bg-brand-black/95 flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden border-t-[12px] border-brand-red shadow-2xl animate-in zoom-in-95 flex flex-col">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2"><AlertTriangle className="text-brand-red" /> Borrar Todo</h3>
                      </div>
                      <button onClick={() => setShowResetModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  <div className="p-8">
                      <p className="text-gray-600 mb-6 text-center">
                          <strong>ADVERTENCIA CRÍTICA:</strong><br/><br/>
                          ¿Estás seguro de que quieres BORRAR TODOS LOS DATOS?<br/><br/>
                          Se eliminarán:<br/>
                          - Todas las facturas.<br/>
                          - Todos los clientes y fiados.<br/>
                          - Todos los productos.<br/>
                          - Todo el historial.<br/><br/>
                          Esta acción dejará la aplicación como nueva y no se puede deshacer.
                      </p>
                      <div className="flex gap-4">
                          <button onClick={() => setShowResetModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all">Cancelar</button>
                          <button onClick={confirmFactoryReset} className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/30">Borrar Todo</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-brand-black tracking-tight flex items-center gap-3">
          <Fingerprint className="text-brand-red" /> Parametrización DIAN
        </h2>
        <p className="text-gray-500 mt-1">
          Configure los datos legales obligatorios según Resolución 001092 de 2022.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Sección: Identidad del Emisor */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="text-brand-black" size={20} />
              <h3 className="font-bold text-brand-black uppercase text-sm">Información del Emisor</h3>
            </div>
            <div className="flex items-center gap-4">
               {formData.logoUrl && (
                  <img src={formData.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-lg border bg-white" referrerPolicy="no-referrer" />
               )}
               <button 
                  type="button" 
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="text-[10px] font-black uppercase tracking-widest text-brand-red bg-red-50 px-3 py-1 rounded-full hover:bg-red-100 transition-all flex items-center gap-2"
               >
                  {isUploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                  {formData.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
               </button>
               <input 
                  type="file" 
                  ref={logoInputRef} 
                  onChange={handleLogoUpload} 
                  accept="image/*" 
                  className="hidden" 
               />
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Nombre Comercial</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} placeholder="Ej: Mi Kiosko" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Razón Social Legal *</label>
              <input type="text" name="businessName" value={formData.businessName || ''} onChange={handleChange} className={`${inputClass} border-l-4 border-l-brand-red`} required placeholder="Persona Natural o Jurídica" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">NIT con DV *</label>
              <input type="text" name="nit" value={formData.nit} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="Ej: 900.123.456-1" required />
            </div>
            <div className="flex flex-col gap-2">
               <label className="block text-xs font-black text-gray-500 uppercase mb-2">Responsabilidad Fiscal</label>
               <select name="vatResponsibility" value={formData.vatResponsibility} onChange={handleChange} className={inputClass}>
                   <option value="No responsable de IVA">No responsable de IVA</option>
                   <option value="Responsable de IVA">Responsable de IVA</option>
                   <option value="Gran Contribuyente">Gran Contribuyente</option>
                   <option value="Autorretenedor">Autorretenedor</option>
               </select>
               <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" name="isRetainer" checked={formData.isRetainer} onChange={handleChange} className="w-4 h-4 accent-brand-red" />
                  <span className="text-xs font-bold text-gray-600">Agente Retenedor de IVA</span>
               </div>
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Dirección Fiscal</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClass} />
            </div>
             <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Teléfono</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Sección: Resolución DIAN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2">
            <FileCheck className="text-brand-red" size={20} />
            <h3 className="font-bold text-brand-red uppercase text-sm">Autorización de Numeración</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Número de Resolución</label>
              <input type="text" name="resolution" value={formData.resolution} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="Ej: 18760000001" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Fecha Resolución</label>
               <input type="date" name="resolutionDate" value={formData.resolutionDate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Prefijo</label>
              <input type="text" name="prefix" value={formData.prefix} onChange={handleChange} className={`${inputClass} uppercase`} />
            </div>
            <div>
              <label className="block text-xs font-black text-blue-400 uppercase mb-2">Siguiente Consecutivo <span className="text-[9px] text-gray-400 font-normal bg-gray-700 px-1 py-0.5 rounded ml-1">Nº actual</span></label>
              <input type="number" name="currentNumber" value={formData.currentNumber || 1} onChange={handleChange} className={`${inputClass} border-blue-500/30 focus:border-blue-400`} min={1} />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Rango Desde</label>
              <input type="number" name="rangeStart" value={formData.rangeStart} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Rango Hasta</label>
              <input type="number" name="rangeEnd" value={formData.rangeEnd} onChange={handleChange} className={inputClass} />
            </div>
            <div className="md:col-span-3 bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 leading-relaxed shadow-sm">
              <span className="font-bold uppercase text-[10px] text-blue-900 block mb-1">💡 Continuidad de Consecutivos (Otras Plataformas)</span>
              Si vienes de facturar en Alegra, Siigo u otro sistema y necesitas continuar con la numeración autorizada ante la DIAN, escribe en <span className="font-bold text-blue-900 bg-blue-100/80 px-1 py-0.5 rounded">Siguiente Consecutivo</span> el número de factura con el que deseas arrancar. Por ejemplo, si tu última factura emitida fue la <strong className="font-black text-blue-950">5000</strong>, escribe <strong className="font-black text-blue-950">5001</strong> aquí para no perder la continuidad fiscal.
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Vigencia (Ej: 12 meses)</label>
              <input type="text" name="resolutionValidity" value={formData.resolutionValidity} onChange={handleChange} className={inputClass} placeholder="Indique la vigencia según el documento de la DIAN" />
            </div>
          </div>
        </div>

        {/* NUEVA SECCIÓN: Integración API DIAN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center gap-2">
            <ShieldAlert className="text-blue-600" size={20} />
            <h3 className="font-bold text-blue-600 uppercase text-sm">Integración API DIAN / Proveedor Tecnológico</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-500 uppercase mb-2">Proveedor de Facturación Electrónica</label>
              <select name="techProvider" value={formData.techProvider || 'KIOSKO_COMERCIAL'} onChange={handleChange} className={inputClass}>
                <option value="KIOSKO_COMERCIAL">Kiosko Comercial (Recomendado)</option>
                <option value="DIAN_DIRECTO">Software Propio (DIAN Directo)</option>
                <option value="FACTURADOR_PRO">Facturador Pro</option>
                <option value="ALEGRA">Alegra</option>
                <option value="SIIGO">Siigo</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Seleccione el proveedor tecnológico con el que transmitirá las facturas.</p>
            </div>
            {formData.techProvider === 'KIOSKO_COMERCIAL' && (
              <div className="md:col-span-2 bg-green-50 p-4 rounded-xl border border-green-100">
                <h4 className="font-bold text-green-800 text-sm mb-2">¡Excelente elección!</h4>
                <p className="text-xs text-green-700 mb-4">
                  Al usar Kiosko Comercial como tu Proveedor Tecnológico, nosotros nos encargamos de la firma digital y la transmisión a la DIAN. Solo necesitas subir tu Certificado Digital.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-green-800 uppercase mb-2">Certificado Digital (.p12 / .pfx)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="file" 
                        accept=".p12,.pfx" 
                        onChange={handleFileUpload} 
                        disabled={isUploading}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200 disabled:opacity-50" 
                      />
                      {(formData.certificateName || isUploading) && (
                        <span className="text-xs font-bold text-green-700 bg-green-200 px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-2">
                          {isUploading ? <Loader2 size={12} className="animate-spin" /> : '✓'}
                          {isUploading ? 'Subiendo...' : formData.certificateName}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-green-600 mt-1">El certificado se encriptará y almacenará de forma segura.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-green-800 uppercase mb-2">Contraseña del Certificado</label>
                    <input type="password" name="dianPin" value={formData.dianPin || ''} onChange={handleChange} className={`${inputClass} border-green-200 focus:ring-green-500`} placeholder="••••••••" />
                  </div>
                </div>
              </div>
            )}
            {formData.techProvider !== 'KIOSKO_COMERCIAL' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">API Key / Token de Acceso</label>
                <input type="password" name="dianApiKey" value={formData.dianApiKey || ''} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="••••••••••••••••••••••••" />
              </div>
            )}
            {formData.techProvider === 'DIAN_DIRECTO' && (
              <>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Software ID (DIAN)</label>
                  <input type="text" name="dianSoftwareId" value={formData.dianSoftwareId || ''} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">PIN del Software</label>
                  <input type="password" name="dianPin" value={formData.dianPin || ''} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="••••" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-500 uppercase mb-2">Test Set ID (Solo para habilitación)</label>
                  <input type="text" name="dianTestSetId" value={formData.dianTestSetId || ''} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sección: Personalización de Impresión */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center gap-2">
            <Printer className="text-blue-600" size={20} />
            <h3 className="font-bold text-blue-600 uppercase text-sm">Personalización de Impresión</h3>
          </div>
          <div className="p-6">
             <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Notas al Pie de Página (Opcional)</label>
                <textarea 
                  name="customFooter" 
                  value={formData.customFooter || ''} 
                  onChange={handleChange} 
                  className={`${inputClass} h-24 resize-none`} 
                  placeholder="Ej: Autorización de facturación por computador... / Favor consignar a Bancolombia... / Gracias por su compra."
                />
                <p className="text-[10px] text-gray-400 mt-2">Este texto aparecerá en la parte inferior de todas sus facturas y documentos.</p>
             </div>
          </div>
        </div>

        {/* Sección: Información Técnica Software */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-2">
            <Cpu size={20} className="text-brand-red" />
            <h3 className="font-bold uppercase text-sm">Datos del Software (Obligatorio DIAN)</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Nombre del Software</label>
                <input type="text" name="softwareName" value={formData.softwareName || 'Kiosko Comercial POS'} onChange={handleChange} className={inputClass} />
             </div>
             <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Fabricante / Proveedor Tecnológico</label>
                <input type="text" name="softwareManufacturer" value={formData.softwareManufacturer || 'Kiosko Dev Studio S.A.S.'} onChange={handleChange} className={inputClass} />
             </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
           <div className="text-[10px] text-gray-400 italic font-bold max-w-xs leading-tight">
             Al guardar estos datos, se actualizará automáticamente la representación gráfica de sus facturas electrónicas.
           </div>
           <button type="submit" className="px-12 py-4 bg-brand-black text-white font-black rounded-xl shadow-lg hover:bg-brand-red transition-all flex items-center gap-2 uppercase tracking-widest text-sm">
            {isSaved ? 'DATOS ACTUALIZADOS' : 'GUARDAR PARÁMETROS'}
          </button>
        </div>
      </form>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                  <Database className="text-blue-600" size={24} />
                  <h3 className="font-black text-blue-800 uppercase">Migración de Datos</h3>
              </div>
              <p className="text-xs text-blue-700 mb-4 font-medium">Descarga toda tu información (Productos, Clientes, Facturas) para instalarla en tu PC Local.</p>
              <button type="button" onClick={handleExportBackup} className="w-full px-6 py-3 bg-white border-2 border-blue-200 text-blue-600 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all text-xs flex items-center justify-center gap-2 uppercase">
                  <Download size={16}/> Exportar Copia de Seguridad JSON
              </button>
          </div>

          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-red-600" size={24} />
                  <h3 className="font-black text-red-700 uppercase">Zona de Peligro</h3>
              </div>
              <p className="text-xs text-red-700 mb-4 font-medium">Esta acción eliminará permanentemente todos los registros del navegador actual.</p>
              <button type="button" onClick={handleFactoryReset} className="w-full px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all text-xs uppercase">
                  BORRAR TODO Y REINICIAR FÁBRICA
              </button>
          </div>

          {onNavigateActiveTab && (
              <div className="p-6 bg-gray-900 text-white rounded-2xl col-span-1 md:col-span-2 border border-gray-800">
                  <div className="flex items-center gap-3 mb-4">
                      <ShieldCheck className="text-brand-red fill-current" size={24} />
                      <h3 className="font-black uppercase tracking-wider text-sm">Transparencia y Respaldo Legal</h3>
                  </div>
                  <p className="text-xs text-gray-300 mb-6 leading-relaxed">
                      Kiosko Comercial opera legalmente conforme al modelo de <strong>Software Habilitador</strong> ante la DIAN, dándole total control al comerciante con su firma digital. Puedes consultar los detalles regulatorios y de protección de datos en cualquier momento:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                      <button 
                          type="button" 
                          onClick={() => onNavigateActiveTab('habilitador')} 
                          className="flex-1 py-3 bg-brand-red text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all cursor-pointer shadow-md"
                      >
                          Ver Marco Software Habilitador
                      </button>
                      <button 
                          type="button" 
                          onClick={() => onNavigateActiveTab('terminos')} 
                          className="flex-1 py-3 bg-gray-800 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-700 border border-gray-700 transition-all cursor-pointer"
                      >
                          Ver Términos y Condiciones
                      </button>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
