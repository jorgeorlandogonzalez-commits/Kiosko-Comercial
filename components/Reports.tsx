
import React, { useState, useMemo } from 'react';
import { Invoice, Order, StoreSettings, CartItem, PaymentMethod, Product, Expense } from '../types';
import { 
  BarChartHorizontal, FileDown, FileSpreadsheet, Printer, 
  Calendar, TrendingUp, TrendingDown, ShoppingBag, Truck,
  CheckCircle2, AlertCircle, Filter, Download, Info, X, FileText, Search, FilePieChart,
  CreditCard, User, Box, Wallet, List, DollarSign, Package, Briefcase, FileType, Undo2, Trash2, AlertTriangle
} from 'lucide-react';

interface ReportsProps {
  invoices: Invoice[];
  orders: Order[];
  products: Product[];
  storeSettings: StoreSettings;
  expenses?: Expense[];
  onNavigate?: (tab: string) => void;
  onEditPurchase?: (batchId: string) => void;
  onEditSale?: (invoiceId: string) => void;
  onDeletePurchase?: (batchId: string) => void;
  onDeleteSale?: (invoiceId: string) => void;
}

type ReportType = 'VENTAS' | 'COMPRAS' | 'INVENTARIO';
type SalesBreakdown = 'DETAIL' | 'PAYMENT' | 'CUSTOMER' | 'PRODUCT' | 'SELLER';

// Helper para fechas consistentes en zona horaria Colombia
const getColombiaDateString = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

// Estilo específico para inputs de fecha en reportes
const dateReportInputClass = "bg-transparent text-xs font-bold outline-none cursor-pointer w-28 " +
  "[&::-webkit-calendar-picker-indicator]:opacity-100 " +
  "[&::-webkit-calendar-picker-indicator]:hover:bg-gray-200 " +
  "[&::-webkit-calendar-picker-indicator]:p-1 " +
  "[&::-webkit-calendar-picker-indicator]:rounded " +
  "[&::-webkit-calendar-picker-indicator]:cursor-pointer";

export const Reports: React.FC<ReportsProps> = ({ invoices, orders, products, storeSettings, expenses = [], onNavigate, onEditPurchase, onEditSale, onDeletePurchase, onDeleteSale }) => {
  const [activeReport, setActiveReport] = useState<ReportType>('VENTAS');
  const [salesBreakdown, setSalesBreakdown] = useState<SalesBreakdown>('DETAIL');
  
  // Fix: Default to today instead of 30 days ago to match current operation day
  const [startDate, setStartDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{type: 'INVOICE' | 'ORDER', data: any} | null>(null);

  const handleEditDocument = (doc: any, type: 'INVOICE' | 'ORDER') => {
      if (type === 'ORDER') {
          const batchId = doc.id; // doc is now a GroupedPurchase where id is the batchId
          if (onEditPurchase && onNavigate) {
              onEditPurchase(batchId);
              onNavigate('orders');
          } else {
              alert(`La edición de documentos de compra (${batchId}) se implementará en una futura actualización.`);
          }
      } else if (type === 'INVOICE') {
          if (onEditSale && onNavigate) {
              onEditSale(doc.id);
              onNavigate('pos');
          } else {
              alert(`La edición de facturas de venta (${doc.id}) se implementará en una futura actualización.`);
          }
      }
  };

  const handleCreateReturn = (doc: any, type: 'INVOICE' | 'ORDER') => {
      const returnId = type === 'INVOICE' ? `DEV-V-${doc.id}` : `DEV-C-${doc.id}`;
      // Returns should have the current date, not the original document date
      const returnDoc = { 
          ...doc, 
          id: returnId, 
          isReturn: true, 
          originalId: doc.id,
          date: new Date().toISOString() 
      };
      setSelectedDoc({ type, data: returnDoc });
      setShowPrintOptions(true);
  };

  // 1. Filtrado Base por Fecha (String Compare) y Búsqueda
  const filteredData = useMemo(() => {
    if (activeReport === 'VENTAS') {
      return invoices.filter(inv => {
        const invDateStr = getColombiaDateString(inv.date);
        const matchesDate = invDateStr >= startDate && invDateStr <= endDate;
        const matchesSearch = inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (inv.sellerName && inv.sellerName.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesDate && matchesSearch;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (activeReport === 'COMPRAS') {
      const filteredOrders = orders.filter(ord => {
        const ordDateStr = getColombiaDateString(ord.date);
        const matchesDate = ordDateStr >= startDate && ordDateStr <= endDate;
        const matchesSearch = ord.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             ord.supplier.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDate && matchesSearch;
      });

      const grouped = new Map<string, any>();
      filteredOrders.forEach(ord => {
        const batchId = ord.batchId || `legacy-${ord.id}`;
        if (!grouped.has(batchId)) {
          grouped.set(batchId, {
            id: batchId,
            date: ord.date,
            supplier: ord.supplier,
            supplierNit: ord.supplierNit,
            supplierPhone: ord.supplierPhone,
            supplierEmail: ord.supplierEmail,
            status: ord.status,
            total: 0,
            subtotal: 0,
            items: []
          });
        }
        const group = grouped.get(batchId);
        const lineTotal = ord.cost * ord.quantity * (1 + ord.taxRate/100);
        const lineSubtotal = ord.cost * ord.quantity;
        group.total += lineTotal;
        group.subtotal += lineSubtotal;
        group.items.push(ord);
      });

      return Array.from(grouped.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
        // INVENTARIO: No filtra por fecha, es foto actual
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.ean && p.ean.includes(searchTerm))
        ).sort((a,b) => b.stock * b.cost - a.stock * a.cost); // Ordenar por valor total
    }
  }, [invoices, orders, products, activeReport, startDate, endDate, searchTerm]);

  // 2. Cálculo de Totales Resumidos (Tarjetas Superiores)
  const summaryCards = useMemo(() => {
      let totalGross = 0;
      let totalNet = 0; // Sin impuestos / Valor Costo
      let totalCost = 0;
      let count = 0;
      let totalExpenses = 0;

      if (activeReport === 'VENTAS') {
          filteredData.forEach(item => {
              const inv = item as Invoice;
              if (inv.status !== 'ANNULLED') {
                  totalGross += inv.total;
                  totalNet += inv.subtotal; // Base imponible
                  // Calcular costo de la factura
                  inv.items.forEach(i => {
                      totalCost += (i.cost * i.quantity);
                  });
                  count++;
              }
          });
          
          // Calcular gastos del periodo
          expenses.forEach(exp => {
            const expDateStr = getColombiaDateString(exp.date);
            if (expDateStr >= startDate && expDateStr <= endDate) {
              totalExpenses += exp.amount;
            }
          });
      } else if (activeReport === 'COMPRAS') {
          filteredData.forEach(item => {
              const group = item as any;
              if (group.status !== 'ANULADO') {
                  totalGross += group.total;
                  totalNet += group.subtotal; // Base compra
                  count++;
              }
          });
      } else {
          // INVENTARIO
          filteredData.forEach(item => {
              const prod = item as Product;
              totalGross += (prod.price * prod.stock); // Valor Comercial
              totalNet += (prod.cost * prod.stock); // Valor Costo
              count += prod.stock; // Suma de Unidades
          });
      }

      const profit = totalNet - totalCost - totalExpenses;
      const margin = totalNet > 0 ? (profit / totalNet) * 100 : 0;

      return { totalGross, totalNet, totalCost, totalExpenses, profit, margin, count };
  }, [filteredData, activeReport, expenses, startDate, endDate]);

  // 3. Lógica de Agrupación para Ventas
  const groupedSales = useMemo(() => {
    if (activeReport !== 'VENTAS') return null;

    const byPayment: Record<string, { total: number; count: number }> = {};
    const byCustomer: Record<string, { name: string; total: number; count: number }> = {};
    const byProduct: Record<string, { name: string; total: number; quantity: number }> = {};
    const bySeller: Record<string, { name: string; count: number; subtotal: number; tax: number; consumptionTax: number; total: number }> = {};

    filteredData.forEach(item => {
      const inv = item as Invoice;
      if (inv.status === 'ANNULLED') return;
      
      // Por Forma de Pago
      const method = inv.paymentMethod || 'Otros';
      if (!byPayment[method]) byPayment[method] = { total: 0, count: 0 };
      byPayment[method].total += inv.total;
      byPayment[method].count += 1;

      // Por Cliente
      const nit = inv.customerNit;
      if (!byCustomer[nit]) byCustomer[nit] = { name: inv.customerName, total: 0, count: 0 };
      byCustomer[nit].total += inv.total;
      byCustomer[nit].count += 1;

      // Por Vendedor (NUEVO)
      const seller = inv.sellerName || 'Tienda / Sin Asignar';
      if (!bySeller[seller]) bySeller[seller] = { name: seller, count: 0, subtotal: 0, tax: 0, consumptionTax: 0, total: 0 };
      bySeller[seller].count += 1;
      bySeller[seller].subtotal += inv.subtotal;
      bySeller[seller].tax += inv.tax;
      bySeller[seller].consumptionTax += (inv.consumptionTaxTotal || 0);
      bySeller[seller].total += inv.total;

      // Por Producto
      inv.items.forEach(cartItem => {
        const pid = cartItem.id;
        if (!byProduct[pid]) byProduct[pid] = { name: cartItem.name, total: 0, quantity: 0 };
        byProduct[pid].total += cartItem.price * cartItem.quantity;
        byProduct[pid].quantity += cartItem.quantity;
      });
    });

    return {
      payment: Object.entries(byPayment).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.total - a.total),
      customer: Object.entries(byCustomer).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.total - a.total),
      product: Object.entries(byProduct).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.total - a.total),
      seller: Object.entries(bySeller).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.total - a.total),
    };
  }, [filteredData, activeReport]);

  const handleExportExcel = () => {
    if (filteredData.length === 0) return;
    
    let content = '';
    if (activeReport === 'VENTAS') {
        if (salesBreakdown === 'DETAIL') {
            content = 'ID FACTURA,FECHA,VENDEDOR,CLIENTE,NIT,METODO PAGO,SUBTOTAL,IVA,TOTAL,ESTADO\n';
            filteredData.forEach(inv => {
                const i = inv as Invoice;
                content += `${i.id},${getColombiaDateString(i.date)},"${i.sellerName || 'Tienda'}", "${i.customerName}",${i.customerNit},${i.paymentMethod},${Math.round(i.subtotal)},${Math.round(i.tax)},${Math.round(i.total)},${i.status || 'ACTIVA'}\n`;
            });
        } else if (salesBreakdown === 'PAYMENT' && groupedSales) {
            content = 'FORMA DE PAGO,CANTIDAD TRANS.,TOTAL RECAUDADO\n';
            groupedSales.payment.forEach(p => content += `${p.id},${p.count},${Math.round(p.total)}\n`);
        } else if (salesBreakdown === 'CUSTOMER' && groupedSales) {
            content = 'CLIENTE,NIT,CANTIDAD COMPRAS,TOTAL COMPRADO\n';
            groupedSales.customer.forEach(c => content += `"${c.name}",${c.id},${c.count},${Math.round(c.total)}\n`);
        } else if (salesBreakdown === 'PRODUCT' && groupedSales) {
            content = 'PRODUCTO,ID,UNIDADES VENDIDAS,TOTAL VENTA\n';
            groupedSales.product.forEach(p => content += `"${p.name}",${p.id},${p.quantity},${Math.round(p.total)}\n`);
        } else if (salesBreakdown === 'SELLER' && groupedSales) {
            content = 'VENDEDOR,CANTIDAD VENTAS,BASE IMPONIBLE,IVA,IMP CONSUMO,TOTAL RECAUDADO\n';
            groupedSales.seller.forEach(s => content += `"${s.name}",${s.count},${Math.round(s.subtotal)},${Math.round(s.tax)},${Math.round(s.consumptionTax)},${Math.round(s.total)}\n`);
        }
    } else if (activeReport === 'COMPRAS') {
      content = 'ID DOCUMENTO,FECHA,PROVEEDOR,PRODUCTO,CANTIDAD,COSTO UN,IVA %,TOTAL,ESTADO\n';
      filteredData.forEach(group => {
        const g = group as any;
        g.items.forEach((o: Order) => {
          const total = (o.cost * o.quantity * (1 + o.taxRate/100));
          content += `${g.id},${getColombiaDateString(o.date)},"${o.supplier}","${o.productName}",${o.quantity},${o.cost},${o.taxRate},${Math.round(total)},${o.status || 'ACTIVO'}\n`;
        });
      });
    } else {
        // INVENTARIO
        content = 'EAN,PRODUCTO,CATEGORIA,STOCK,COSTO UN,PRECIO VENTA,VALOR COSTO TOTAL,VALOR COMERCIAL TOTAL\n';
        filteredData.forEach(item => {
            const p = item as Product;
            content += `${p.ean || ''},"${p.name}","${p.category}",${p.stock},${p.cost},${p.price},${Math.round(p.cost * p.stock)},${Math.round(p.price * p.stock)}\n`;
        });
    }

    const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_${activeReport.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintIndividual = (format: 'THERMAL' | 'LETTER' | 'HALF_LETTER') => {
      if (!selectedDoc) return;
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const isInvoice = selectedDoc.type === 'INVOICE';
      const doc = selectedDoc.data;
      const isReturn = !!doc.isReturn;
      const settings = storeSettings;
      const docDateStr = new Date(doc.date).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
      const customFooter = storeSettings.customFooter ? storeSettings.customFooter.replace(/\n/g, '<br>') : '';
      
      const formatMoney = (amount: number) => Math.round(amount).toLocaleString('es-CO');

      // Cálculo Agrupado para Impuestos
      const fiscalSummary: Record<string, { base: number, iva: number, ic: number }> = {};
      
      if (isInvoice) {
          const rawItemsSubtotal = doc.items.reduce((acc: number, item: any) => {
             const baseUnit = (item.price - (item.consumptionTax || 0)) / (1 + (item.taxRate/100));
             return acc + (baseUnit * item.quantity);
          }, 0);
          const discountRatio = doc.discount ? doc.discount / (rawItemsSubtotal || 1) : 0;

          doc.items.forEach((item: any) => {
              const icUnit = Number(item.consumptionTax || 0);
              const baseUnit = (item.price - icUnit) / (1 + (item.taxRate/100));
              const itemBaseTotal = baseUnit * item.quantity;
              const effectiveBase = itemBaseTotal - (itemBaseTotal * discountRatio);
              const ivaTotal = effectiveBase * (item.taxRate/100);
              const icTotal = icUnit * item.quantity;

              const ivaKey = `IVA ${item.taxRate}%`;
              if (!fiscalSummary[ivaKey]) fiscalSummary[ivaKey] = { base: 0, iva: 0, ic: 0 };
              fiscalSummary[ivaKey].base += effectiveBase;
              fiscalSummary[ivaKey].iva += ivaTotal;

              if (icTotal > 0) {
                  const icKey = 'IC';
                  if (!fiscalSummary[icKey]) fiscalSummary[icKey] = { base: 0, iva: 0, ic: 0 };
                  fiscalSummary[icKey].ic += icTotal;
              }
          });
      } else {
          // Order (Purchase) - Grouped or Single
          if (doc.items && Array.isArray(doc.items)) {
              doc.items.forEach((item: Order) => {
                  const baseTotal = item.cost * item.quantity;
                  const taxTotal = baseTotal * (item.taxRate/100);
                  const ivaKey = `IVA ${item.taxRate}%`;
                  if (!fiscalSummary[ivaKey]) fiscalSummary[ivaKey] = { base: 0, iva: 0, ic: 0 };
                  fiscalSummary[ivaKey].base += baseTotal;
                  fiscalSummary[ivaKey].iva += taxTotal;
              });
          } else {
              const baseTotal = doc.cost * doc.quantity;
              const taxTotal = baseTotal * (doc.taxRate/100);
              const ivaKey = `IVA ${doc.taxRate}%`;
              fiscalSummary[ivaKey] = { base: baseTotal, iva: taxTotal, ic: 0 };
          }
      }

      let cssStyles = '';
      let pageContent = '';

      const docTitle = isReturn 
          ? (isInvoice ? 'NOTA DE DEVOLUCIÓN (VENTA)' : 'NOTA DE DEVOLUCIÓN (COMPRA)')
          : (isInvoice ? (doc.cufe ? 'FACTURA ELECTRÓNICA' : 'TIQUETE POS') : 'ORDEN DE COMPRA');

      const docTotal = isInvoice ? doc.total : (doc.total !== undefined ? doc.total : (doc.cost * doc.quantity * (1 + doc.taxRate/100)));
      const docSubtotal = isInvoice ? doc.subtotal : (doc.subtotal !== undefined ? doc.subtotal : (doc.cost * doc.quantity));
      const docTax = isInvoice ? doc.tax : (doc.total !== undefined ? (doc.total - doc.subtotal) : (doc.cost * doc.quantity * (doc.taxRate/100)));

      if (format === 'THERMAL') {
          cssStyles = `
            @page { margin: 0; size: 80mm auto; }
            body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 10px 2px; font-size: 11px; color: #000; }
            .center { text-align: center; } .bold { font-weight: bold; } 
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .flex { display: flex; justify-content: space-between; } 
            .table-items { width: 100%; border-collapse: collapse; font-size: 9px; margin-top:5px; }
            .table-items th { text-align: left; border-bottom: 1px solid #000; }
            .table-items td { text-align: right; padding: 2px 0; }
            .table-items td:first-child { text-align: left; }
            .fiscal-table { width: 100%; font-size: 8px; border-collapse: collapse; margin-top: 5px; }
            .custom-footer { margin-top: 10px; font-size: 9px; text-align: center; font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; }
          `;
          pageContent = `
            <div class="center">
                <div class="bold" style="font-size: 14px;">${settings.name.toUpperCase()}</div>
                <div>NIT: ${settings.nit}</div>
                <div>${settings.address}</div>
                <div>TEL: ${settings.phone}</div>
                <div>${settings.vatResponsibility}</div>
                ${settings.isRetainer ? '<div class="bold">SOMOS AGENTES RETENEDORES DE IVA</div>' : ''}
                <div class="line"></div>
                <div class="bold">${docTitle}</div>
                <div class="bold">No: ${doc.id}</div>
                ${isReturn ? `<div>Ref: ${doc.originalId}</div>` : ''}
                <div class="line"></div>
            </div>
            <div>FECHA: ${docDateStr}</div>
            <div class="line"></div>
            <div class="bold">${isInvoice ? 'CLIENTE' : 'PROVEEDOR'}:</div>
            <div>${(isInvoice ? doc.customerName : doc.supplier).toUpperCase()}</div>
            <div>NIT/CC: ${isInvoice ? doc.customerNit : doc.supplierNit}</div>
            ${isInvoice && doc.customerPhone ? `<div>TEL: ${doc.customerPhone}</div>` : ''}
            ${!isInvoice && doc.supplierPhone ? `<div>TEL: ${doc.supplierPhone}</div>` : ''}
            ${isInvoice && doc.customerAddress ? `<div>DIR: ${doc.customerAddress}</div>` : ''}
            ${isInvoice && doc.customerEmail ? `<div>EMAIL: ${doc.customerEmail}</div>` : ''}
            ${!isInvoice && doc.supplierEmail ? `<div>EMAIL: ${doc.supplierEmail}</div>` : ''}
            <div class="line"></div>
            <table class="table-items">
                <thead><tr><th>DESC</th><th>CANT</th><th>TOTAL</th></tr></thead>
                <tbody>
                    ${isInvoice ? doc.items.map((i: any) => `
                        <tr>
                            <td>
                                ${i.name.substring(0, 20)}<br>
                                <span style="font-size:8px; color:#444;">${i.ean || 'S/N'} | $${formatMoney(i.price)}</span>
                            </td>
                            <td class="center" style="vertical-align: top;">${i.quantity}</td>
                            <td style="vertical-align: top;">$${formatMoney(i.price * i.quantity)}</td>
                        </tr>
                    `).join('') : (doc.items ? doc.items.map((i: any) => `
                        <tr>
                            <td>
                                ${i.productName.substring(0, 20)}<br>
                                <span style="font-size:8px; color:#444;">${i.ean || 'S/N'} | $${formatMoney(i.cost * (1 + i.taxRate/100))}</span>
                            </td>
                            <td class="center" style="vertical-align: top;">${i.quantity}</td>
                            <td style="vertical-align: top;">$${formatMoney(i.cost * i.quantity * (1 + i.taxRate/100))}</td>
                        </tr>
                    `).join('') : `
                        <tr>
                            <td>
                                ${doc.productName.substring(0, 20)}<br>
                                <span style="font-size:8px; color:#444;">$${formatMoney(docTotal / doc.quantity)}</span>
                            </td>
                            <td class="center" style="vertical-align: top;">${doc.quantity}</td>
                            <td style="vertical-align: top;">$${formatMoney(docTotal)}</td>
                        </tr>
                    `)}
                </tbody>
            </table>
            <div class="line"></div>
            <div class="flex"><span>SUBTOTAL:</span> <span>$${formatMoney(docSubtotal)}</span></div>
            ${isInvoice && doc.discount ? `<div class="flex"><span>DESCUENTO:</span> <span>-$${formatMoney(doc.discount)}</span></div>` : ''}
            ${isInvoice && doc.shippingCost ? `<div class="flex"><span>FLETE:</span> <span>$${formatMoney(doc.shippingCost)}</span></div>` : ''}
            <div class="flex"><span>IVA:</span> <span>$${formatMoney(docTax)}</span></div>
            ${isInvoice && doc.consumptionTaxTotal ? `<div class="flex"><span>INC:</span> <span>$${formatMoney(doc.consumptionTaxTotal)}</span></div>` : ''}
            <div class="flex bold" style="font-size:13px; margin-top:5px;"><span>TOTAL:</span> <span>$${formatMoney(docTotal)}</span></div>
            <div class="line"></div>
            
            ${isInvoice && doc.paymentDetails && doc.paymentDetails.length > 0 ? `
                <div class="center bold" style="margin-top:5px;">FORMAS DE PAGO:</div>
                ${doc.paymentDetails.map((pd: any) => `<div class="flex"><span>${pd.method}:</span> <span>$${formatMoney(pd.amount)}</span></div>`).join('')}
                <div class="line"></div>
            ` : ''}

            <div class="center bold" style="margin-top:5px; font-size:9px;">DISCRIMINACIÓN TRIBUTARIA</div>
            <table class="fiscal-table">
                <thead><tr><th>IMP</th><th>BASE</th><th>VALOR</th></tr></thead>
                <tbody>
                    ${Object.entries(fiscalSummary).map(([key, val]) => `
                        <tr>
                            <td style="text-align:left;">${key}</td>
                            <td>$${formatMoney(val.base)}</td>
                            <td>$${formatMoney(val.iva || val.ic)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="line"></div>

            ${customFooter ? `<div class="custom-footer">${customFooter}</div>` : ''}
            <div class="center" style="font-size:9px; margin-top:10px;">RESOLUCIÓN DIAN No. ${settings.resolution}</div>
            <div class="center" style="margin-top:10px; font-size:8px;">Software: ${settings.softwareName || 'Kiosko Comercial'}</div>
          `;
      } else {
          const pageSize = format === 'LETTER' ? 'Letter' : '140mm 216mm';
          cssStyles = `
            @page { size: ${pageSize}; margin: 15mm; }
            body { font-family: 'Arial', sans-serif; color: #111; line-height: 1.3; font-size: 11px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .company-info h1 { font-size: 18px; margin: 0; font-weight: 900; text-transform: uppercase; }
            .invoice-info { text-align: right; }
            .invoice-info h2 { font-size: 16px; margin: 0; color: #D62828; }
            .box-section { background: #f8f9fa; border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .table-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table-items th { background: #111; color: #fff; padding: 8px; text-align: left; font-size: 10px; uppercase; }
            .table-items td { border-bottom: 1px solid #eee; padding: 8px; }
            .totals-container { display: flex; justify-content: flex-end; }
            .fiscal-table { width: 100%; font-size: 9px; margin-top: 10px; border: 1px solid #eee; }
            .fiscal-table th { background: #eee; color: #000; padding: 4px; }
            .fiscal-table td { padding: 4px; text-align: right; border-bottom: 1px solid #eee; }
            .footer { margin-top: 40px; text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
            .custom-footer { margin-top: 20px; padding: 10px; border: 1px dashed #ccc; background: #fffbe6; font-size: 10px; text-align: center; border-radius: 5px; }
          `;
          pageContent = `
            <div class="header">
                <div class="company-info">
                    <h1>${settings.name.toUpperCase()}</h1>
                    <p>
                        NIT: ${settings.nit}<br>
                        ${settings.address}<br>
                        Tel: ${settings.phone}<br>
                        ${settings.vatResponsibility}
                    </p>
                </div>
                <div class="invoice-info">
                    <h2>${docTitle}</h2>
                    <h3 style="margin:5px 0; font-size: 14px;">No. ${doc.id}</h3>
                    ${isReturn ? `<p>Ref. Documento: ${doc.originalId}</p>` : ''}
                    <p>
                        Fecha de Emisión: ${docDateStr}<br>
                        ${isInvoice ? `Vendedor: ${doc.sellerName || 'General'}` : ''}
                    </p>
                </div>
            </div>

            <div class="box-section">
                <div style="width: 48%;">
                    <strong style="text-transform:uppercase; font-size:10px; color:#666;">${isInvoice ? 'Adquirente / Cliente' : 'Proveedor'}</strong><br>
                    <span style="font-weight:bold; font-size:12px;">${(isInvoice ? doc.customerName : doc.supplier).toUpperCase()}</span><br>
                    NIT/CC: ${isInvoice ? doc.customerNit : doc.supplierNit}<br>
                    ${isInvoice && doc.customerPhone ? `Tel: ${doc.customerPhone}<br>` : ''}
                    ${!isInvoice && doc.supplierPhone ? `Tel: ${doc.supplierPhone}<br>` : ''}
                    ${isInvoice && doc.customerAddress ? `Dir: ${doc.customerAddress}<br>` : ''}
                    ${isInvoice && doc.customerEmail ? `Email: ${doc.customerEmail}` : ''}
                    ${!isInvoice && doc.supplierEmail ? `Email: ${doc.supplierEmail}` : ''}
                </div>
                <div style="width: 48%;">
                    <strong style="text-transform:uppercase; font-size:10px; color:#666;">Resolución de Facturación</strong><br>
                    Res. No. ${settings.resolution} de ${settings.resolutionDate || '---'}<br>
                    Prefijo: ${settings.prefix} | Rango: ${settings.rangeStart} al ${settings.rangeEnd}<br>
                </div>
            </div>

            <table class="table-items">
                <thead>
                    <tr>
                        <th style="width: 10%;">CANT</th>
                        <th style="width: 40%;">DESCRIPCIÓN</th>
                        <th style="width: 15%; text-align:right;">PRECIO UN.</th>
                        <th style="width: 15%; text-align:right;">IMPUESTO</th>
                        <th style="width: 20%; text-align:right;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${isInvoice ? doc.items.map((i: any) => `
                        <tr>
                            <td>${i.quantity}</td>
                            <td>${i.name}<br><span style="font-size:9px; color:#666;">EAN: ${i.ean || 'N/A'}</span></td>
                            <td style="text-align:right">$${formatMoney(i.price)}</td>
                            <td style="text-align:right">${i.taxRate}%</td>
                            <td style="text-align:right">$${formatMoney(i.price * i.quantity)}</td>
                        </tr>
                    `).join('') : (doc.items ? doc.items.map((i: any) => `
                        <tr>
                            <td>${i.quantity}</td>
                            <td>${i.productName}<br><span style="font-size:9px; color:#666;">EAN: ${i.ean || 'N/A'}</span></td>
                            <td style="text-align:right">$${formatMoney(i.cost)}</td>
                            <td style="text-align:right">${i.taxRate}%</td>
                            <td style="text-align:right">$${formatMoney(i.cost * i.quantity * (1 + i.taxRate/100))}</td>
                        </tr>
                    `).join('') : `
                        <tr>
                            <td>${doc.quantity}</td>
                            <td>${doc.productName}</td>
                            <td style="text-align:right">$${formatMoney(doc.cost * (1 + doc.taxRate/100))}</td>
                            <td style="text-align:right">${doc.taxRate}%</td>
                            <td style="text-align:right">$${formatMoney(docTotal)}</td>
                        </tr>
                    `)}
                </tbody>
            </table>

            <div class="totals-container">
                <div class="totals-box">
                    <div class="total-row"><span>Subtotal:</span> <span>$${formatMoney(docSubtotal)}</span></div>
                    ${isInvoice && doc.discount ? `<div class="total-row"><span>Descuento:</span> <span>-$${formatMoney(doc.discount)}</span></div>` : ''}
                    ${isInvoice && doc.shippingCost ? `<div class="total-row"><span>Flete:</span> <span>$${formatMoney(doc.shippingCost)}</span></div>` : ''}
                    <div class="total-row"><span>Impuestos:</span> <span>$${formatMoney(docTax)}</span></div>
                    <div class="grand-total total-row"><span>TOTAL:</span> <span>$${formatMoney(docTotal)}</span></div>
                </div>
            </div>

            <div style="margin-top: 20px;">
                <strong style="font-size:10px;">DISCRIMINACIÓN TRIBUTARIA</strong>
                <table class="fiscal-table">
                    <thead><tr><th>IMPUESTO</th><th>BASE GRAVABLE</th><th>VALOR IMPUESTO</th></tr></thead>
                    <tbody>
                        ${Object.entries(fiscalSummary).map(([key, val]) => `
                            <tr>
                                <td style="text-align:left;">${key}</td>
                                <td>$${formatMoney(val.base)}</td>
                                <td>$${formatMoney(val.iva || val.ic)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            ${customFooter ? `<div class="custom-footer">${customFooter}</div>` : ''}
            <div class="footer">Documento generado por Kiosko Comercial POS</div>
          `;
      }

      printWindow.document.write(`<!DOCTYPE html><html><head><style>${cssStyles}</style></head><body>${pageContent}<script>window.onload = function() { window.print(); window.close(); }</script></body></html>`);
      printWindow.document.close();
      setShowPrintOptions(false);
  };

  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);

  const confirmDeleteSale = () => {
      if (saleToDelete && onDeleteSale) {
          onDeleteSale(saleToDelete);
          setSaleToDelete(null);
      }
  };

  const confirmDeletePurchase = () => {
      if (purchaseToDelete && onDeletePurchase) {
          onDeletePurchase(purchaseToDelete);
          setPurchaseToDelete(null);
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32">
      {/* MODAL ANULAR VENTA */}
      {saleToDelete && (
          <div className="fixed inset-0 z-[600] bg-brand-black/95 flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden border-t-[12px] border-brand-red shadow-2xl animate-in zoom-in-95 flex flex-col">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2"><AlertTriangle className="text-brand-red" /> Anular Venta</h3>
                          <p className="text-[10px] text-brand-red font-black uppercase">Ref: {saleToDelete}</p>
                      </div>
                      <button onClick={() => setSaleToDelete(null)} className="p-2 hover:bg-gray-200 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  <div className="p-8">
                      <p className="text-gray-600 mb-6 text-center">¿Está seguro de anular esta venta? Esta acción revertirá el inventario y las cuentas por cobrar.</p>
                      <div className="flex gap-4">
                          <button onClick={() => setSaleToDelete(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all">Cancelar</button>
                          <button onClick={confirmDeleteSale} className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/30">Anular</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL ANULAR COMPRA */}
      {purchaseToDelete && (
          <div className="fixed inset-0 z-[600] bg-brand-black/95 flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden border-t-[12px] border-brand-red shadow-2xl animate-in zoom-in-95 flex flex-col">
                  <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                      <div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2"><AlertTriangle className="text-brand-red" /> Anular Compra</h3>
                          <p className="text-[10px] text-brand-red font-black uppercase">Ref: {purchaseToDelete}</p>
                      </div>
                      <button onClick={() => setPurchaseToDelete(null)} className="p-2 hover:bg-gray-200 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  <div className="p-8">
                      <p className="text-gray-600 mb-6 text-center">¿Está seguro de anular esta compra? Esta acción revertirá el inventario y las cuentas por pagar.</p>
                      <div className="flex gap-4">
                          <button onClick={() => setPurchaseToDelete(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-200 transition-all">Cancelar</button>
                          <button onClick={confirmDeletePurchase} className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-500/30">Anular</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black flex items-center gap-3"><FilePieChart className="text-brand-red" size={32} /> Reportes Dinámicos</h2>
          <p className="text-gray-500 font-medium">Información en tiempo real de todas las áreas.</p>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-200 rounded-2xl text-xs font-black uppercase hover:border-green-600 transition-all shadow-sm"><FileSpreadsheet size={18} className="text-green-600"/> Exportar Excel</button>
        </div>
      </div>

      {/* FILTROS Y SELECTOR */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-wrap items-center gap-6 mb-8">
              <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                  <button onClick={() => { setActiveReport('VENTAS'); setSalesBreakdown('DETAIL'); }} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeReport === 'VENTAS' ? 'bg-brand-red text-white shadow-lg' : 'text-gray-500'}`}><ShoppingBag size={14}/> Ventas</button>
                  <button onClick={() => setActiveReport('COMPRAS')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeReport === 'COMPRAS' ? 'bg-brand-red text-white shadow-lg' : 'text-gray-500'}`}><Truck size={14}/> Compras</button>
                  <button onClick={() => setActiveReport('INVENTARIO')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeReport === 'INVENTARIO' ? 'bg-brand-red text-white shadow-lg' : 'text-gray-500'}`}><Package size={14}/> Valorización</button>
              </div>
              
              {activeReport !== 'INVENTARIO' && (
                  <div className="flex flex-1 items-center gap-4">
                      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border-2 border-gray-200 hover:border-brand-red transition-colors shadow-sm">
                          <Calendar size={18} className="text-brand-red"/>
                          <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className={dateReportInputClass}
                          />
                          <span className="text-gray-400 font-black text-[10px] uppercase">a</span>
                          <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className={dateReportInputClass}
                          />
                      </div>
                  </div>
              )}
              <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold outline-none focus:border-brand-red transition-all"
                  />
              </div>
          </div>

          {/* KPI CARDS DINÁMICAS */}
          <div className={`grid grid-cols-1 ${activeReport === 'VENTAS' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 mb-8`}>
              <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      {activeReport === 'VENTAS' ? 'Total Venta Bruta' : activeReport === 'COMPRAS' ? 'Total Compras' : 'Valor Comercial Total'}
                  </p>
                  <p className="text-2xl font-black text-brand-black">${Math.round(summaryCards.totalGross).toLocaleString()}</p>
              </div>
              {activeReport !== 'COMPRAS' && (
                  <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-between">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          {activeReport === 'INVENTARIO' ? 'Valor Costo Total' : 'Costo Mercancía'}
                      </p>
                      <p className="text-2xl font-black text-brand-black">${Math.round(summaryCards.totalNet).toLocaleString()}</p>
                  </div>
              )}
              {activeReport === 'VENTAS' && (
                  <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-between">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gastos Operativos</p>
                      <p className="text-2xl font-black text-purple-600">${Math.round(summaryCards.totalExpenses).toLocaleString()}</p>
                  </div>
              )}
              {activeReport === 'VENTAS' && (
                  <div className="bg-brand-black p-5 rounded-3xl border border-gray-800 flex flex-col justify-between text-white shadow-lg">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Utilidad Neta</p>
                      <p className="text-2xl font-black text-green-400">${Math.round(summaryCards.profit).toLocaleString()}</p>
                  </div>
              )}
              <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      {activeReport === 'INVENTARIO' ? 'Total Unidades' : 'Transacciones'}
                  </p>
                  <div className="flex justify-between items-end">
                      <p className="text-2xl font-black text-brand-black">{summaryCards.count}</p>
                      {activeReport === 'VENTAS' && (
                          <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded-lg">Margen: {summaryCards.margin.toFixed(1)}%</span>
                      )}
                  </div>
              </div>
          </div>

          {/* SUB-TABS PARA DESGLOSE DE VENTAS */}
          {activeReport === 'VENTAS' && (
              <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-100 pb-4">
                  <button onClick={() => setSalesBreakdown('DETAIL')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border-2 transition-all ${salesBreakdown === 'DETAIL' ? 'bg-brand-black text-white border-brand-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}><List size={14}/> Detalle Documentos</button>
                  <button onClick={() => setSalesBreakdown('SELLER')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border-2 transition-all ${salesBreakdown === 'SELLER' ? 'bg-brand-black text-white border-brand-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}><Briefcase size={14}/> Por Vendedor</button>
                  <button onClick={() => setSalesBreakdown('PAYMENT')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border-2 transition-all ${salesBreakdown === 'PAYMENT' ? 'bg-brand-black text-white border-brand-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}><Wallet size={14}/> Por Forma de Pago</button>
                  <button onClick={() => setSalesBreakdown('CUSTOMER')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border-2 transition-all ${salesBreakdown === 'CUSTOMER' ? 'bg-brand-black text-white border-brand-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}><User size={14}/> Por Cliente</button>
                  <button onClick={() => setSalesBreakdown('PRODUCT')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border-2 transition-all ${salesBreakdown === 'PRODUCT' ? 'bg-brand-black text-white border-brand-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}><Box size={14}/> Por Producto</button>
              </div>
          )}
      </div>

      {/* VISTA DE TABLA DINÁMICA */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-brand-black text-white text-[10px] font-black uppercase tracking-widest">
                    {activeReport === 'VENTAS' ? (
                        salesBreakdown === 'DETAIL' ? (
                            <tr>
                                <th className="px-6 py-5">FECHA</th>
                                <th className="px-6 py-5">DOCUMENTO ID</th>
                                <th className="px-6 py-5">VENDEDOR</th>
                                <th className="px-6 py-5">CLIENTE</th>
                                <th className="px-6 py-5">FORMA PAGO</th>
                                <th className="px-6 py-5 text-right">TOTAL</th>
                                <th className="px-6 py-5 text-center">ACCIONES</th>
                            </tr>
                        ) : salesBreakdown === 'PAYMENT' ? (
                            <tr>
                                <th className="px-6 py-5">FORMA DE PAGO</th>
                                <th className="px-6 py-5 text-center">NRO. TRANSACCIONES</th>
                                <th className="px-6 py-5 text-right">VALOR TOTAL</th>
                                <th className="px-6 py-5 text-center">PORCENTAJE</th>
                            </tr>
                        ) : salesBreakdown === 'CUSTOMER' ? (
                            <tr>
                                <th className="px-6 py-5">CLIENTE</th>
                                <th className="px-6 py-5">NIT / CC</th>
                                <th className="px-6 py-5 text-center">CANT. FACTURAS</th>
                                <th className="px-6 py-5 text-right">VALOR RECAUDADO</th>
                            </tr>
                        ) : salesBreakdown === 'SELLER' ? (
                            <tr>
                                <th className="px-6 py-5">VENDEDOR</th>
                                <th className="px-6 py-5 text-center">TRANSACCIONES</th>
                                <th className="px-6 py-5 text-right">BASE VENTA (SIN IMP)</th>
                                <th className="px-6 py-5 text-right">IVA</th>
                                <th className="px-6 py-5 text-right">IMPOCONSUMO</th>
                                <th className="px-6 py-5 text-right">TOTAL RECAUDADO</th>
                            </tr>
                        ) : (
                            <tr>
                                <th className="px-6 py-5">DESCRIPCIÓN PRODUCTO</th>
                                <th className="px-6 py-5 text-center">UNDS. VENDIDAS</th>
                                <th className="px-6 py-5 text-right">SUBTOTAL VENTA</th>
                            </tr>
                        )
                    ) : activeReport === 'COMPRAS' ? (
                        <tr>
                            <th className="px-6 py-5">FECHA</th>
                            <th className="px-6 py-5">DOCUMENTO ID</th>
                            <th className="px-6 py-5">PROVEEDOR</th>
                            <th className="px-6 py-5 text-right">TOTAL</th>
                            <th className="px-6 py-5 text-center">ACCIONES</th>
                        </tr>
                    ) : (
                        // INVENTARIO HEADER
                        <tr>
                            <th className="px-6 py-5">EAN</th>
                            <th className="px-6 py-5">PRODUCTO</th>
                            <th className="px-6 py-5 text-center">STOCK</th>
                            <th className="px-6 py-5 text-right">COSTO UN.</th>
                            <th className="px-6 py-5 text-right">TOTAL COSTO</th>
                            <th className="px-6 py-5 text-right">TOTAL VENTA</th>
                        </tr>
                    )}
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {filteredData.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-20 text-center">
                                <AlertCircle size={48} className="mx-auto text-gray-200 mb-4"/>
                                <p className="text-lg font-black text-gray-300 uppercase">Sin resultados</p>
                            </td>
                        </tr>
                    ) : (
                        activeReport === 'VENTAS' ? (
                            salesBreakdown === 'DETAIL' ? (
                                filteredData.map((doc, index) => {
                                    const inv = doc as Invoice;
                                    return (
                                        <tr key={`${inv.id}-${index}`} className={`hover:bg-gray-50/50 transition-colors ${inv.status === 'ANNULLED' ? 'opacity-50 line-through bg-red-50/20' : ''}`}>
                                            <td className="px-6 py-4 font-medium text-gray-500">{new Date(inv.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</td>
                                            <td className="px-6 py-4 font-black text-brand-black">
                                                {inv.id}
                                                {inv.status === 'ANNULLED' && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full no-underline inline-block">ANULADA</span>}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-blue-600 uppercase text-xs">{inv.sellerName || 'Tienda'}</td>
                                            <td className="px-6 py-4 font-bold text-gray-600 truncate max-w-[150px] uppercase text-xs">{inv.customerName}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-gray-100 px-2 py-1 rounded text-[9px] font-black uppercase text-gray-500">{inv.paymentMethod}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900">${Math.round(inv.total).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center flex gap-2 justify-center">
                                                <button 
                                                    onClick={() => { setSelectedDoc({type: 'INVOICE', data: inv}); setShowPrintOptions(true); }} 
                                                    className="p-3 bg-gray-100 hover:bg-brand-red hover:text-white rounded-xl transition-all shadow-sm"
                                                    title="Imprimir"
                                                >
                                                    <Printer size={18}/>
                                                </button>
                                                {inv.status !== 'ANNULLED' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleEditDocument(inv, 'INVOICE')} 
                                                            className="p-3 bg-gray-100 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                            title="Editar Documento"
                                                        >
                                                            <Briefcase size={18}/>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleCreateReturn(inv, 'INVOICE')} 
                                                            className="p-3 bg-gray-100 hover:bg-orange-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                            title="Devolución"
                                                        >
                                                            <Undo2 size={18}/>
                                                        </button>
                                                        {onDeleteSale && (
                                                            <button 
                                                                onClick={() => setSaleToDelete(inv.id)} 
                                                                className="p-3 bg-gray-100 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                                title="Anular"
                                                            >
                                                                <Trash2 size={18}/>
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : salesBreakdown === 'PAYMENT' ? (
                                groupedSales?.payment.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-black text-brand-black uppercase text-xs">{p.id}</td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-500">{p.count}</td>
                                        <td className="px-6 py-4 text-right font-black text-brand-red">${Math.round(p.total).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden max-w-[100px] mx-auto">
                                                <div className="bg-brand-red h-full" style={{ width: `${(p.total/summaryCards.totalGross)*100}%` }}></div>
                                            </div>
                                            <span className="text-[9px] font-black text-gray-400 mt-1 block">{((p.total/summaryCards.totalGross)*100).toFixed(1)}%</span>
                                        </td>
                                    </tr>
                                ))
                            ) : salesBreakdown === 'CUSTOMER' ? (
                                groupedSales?.customer.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-black text-brand-black uppercase text-xs">{c.name}</td>
                                        <td className="px-6 py-4 font-mono text-gray-400 text-xs">{c.id}</td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-500">{c.count}</td>
                                        <td className="px-6 py-4 text-right font-black text-brand-red">${Math.round(c.total).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : salesBreakdown === 'SELLER' ? (
                                groupedSales?.seller.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-black text-brand-black uppercase text-xs">{s.name}</td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-500">{s.count}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-700">${Math.round(s.subtotal).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-500">${Math.round(s.tax).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-bold text-orange-500">${Math.round(s.consumptionTax).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-black text-brand-red">${Math.round(s.total).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                groupedSales?.product.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-brand-black uppercase text-xs">{p.name}</div>
                                            <div className="text-[9px] text-gray-400 font-mono">{p.id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-500">{p.quantity}</td>
                                        <td className="px-6 py-4 text-right font-black text-brand-red">${Math.round(p.total).toLocaleString()}</td>
                                    </tr>
                                ))
                            )
                        ) : activeReport === 'COMPRAS' ? (
                            filteredData.map(doc => {
                                const group = doc as any;
                                return (
                                    <tr key={group.id} className={`hover:bg-gray-50/50 transition-colors ${group.status === 'ANULADO' ? 'opacity-50 line-through bg-red-50/20' : ''}`}>
                                        <td className="px-6 py-4 font-medium text-gray-500">{new Date(group.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</td>
                                        <td className="px-6 py-4 font-black text-brand-black">
                                            {group.id}
                                            {group.status === 'ANULADO' && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full no-underline inline-block">ANULADA</span>}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-600 uppercase text-xs">{group.supplier}</td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900">${Math.round(group.total).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center flex gap-2 justify-center">
                                            <button 
                                                onClick={() => { setSelectedDoc({type: 'ORDER', data: group}); setShowPrintOptions(true); }} 
                                                className="p-3 bg-gray-100 hover:bg-brand-red hover:text-white rounded-xl transition-all shadow-sm"
                                                title="Imprimir"
                                            >
                                                <Printer size={18}/>
                                            </button>
                                            {group.status !== 'ANULADO' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleEditDocument(group, 'ORDER')} 
                                                        className="p-3 bg-gray-100 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                        title="Editar Documento"
                                                    >
                                                        <Briefcase size={18}/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCreateReturn(group, 'ORDER')} 
                                                        className="p-3 bg-gray-100 hover:bg-orange-500 hover:text-white rounded-xl transition-all shadow-sm"
                                                        title="Devolución"
                                                    >
                                                        <Undo2 size={18}/>
                                                    </button>
                                                    {onDeletePurchase && (
                                                        <button 
                                                            onClick={() => setPurchaseToDelete(group.id)} 
                                                            className="p-3 bg-gray-100 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                            title="Anular"
                                                        >
                                                            <Trash2 size={18}/>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            // INVENTARIO ROW
                            filteredData.map(item => {
                                const p = item as Product;
                                return (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-400">{p.ean || '---'}</td>
                                        <td className="px-6 py-4 font-black text-brand-black uppercase text-xs">{p.name}</td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-600">{p.stock}</td>
                                        <td className="px-6 py-4 text-right font-mono text-xs">${Math.round(p.cost).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-bold text-blue-600">${Math.round(p.cost * p.stock).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">${Math.round(p.price * p.stock).toLocaleString()}</td>
                                    </tr>
                                )
                            })
                        )
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {/* MODAL OPCIONES DE IMPRESIÓN */}
      {showPrintOptions && (
          <div className="fixed inset-0 z-[500] bg-brand-black/95 backdrop-blur-xl flex items-center justify-center p-6">
              <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl border-t-[12px] border-brand-red p-10 text-center animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-gray-100 text-brand-red rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Printer size={40} /></div>
                  <h3 className="text-2xl font-black text-brand-black uppercase mb-1">
                      {selectedDoc?.data.isReturn ? 'IMPRIMIR DEVOLUCIÓN' : 'REIMPRESIÓN'}
                  </h3>
                  <p className="text-gray-500 font-bold mb-8 uppercase text-[10px] tracking-widest">
                      Doc: <span className="text-brand-red">{selectedDoc?.data.id}</span>
                  </p>
                  
                  <div className="space-y-4">
                      <button 
                        onClick={() => handlePrintIndividual('THERMAL')} 
                        className="w-full py-5 bg-brand-black text-white font-black rounded-2xl hover:bg-gray-800 shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-xs"
                      >
                        <Printer size={20} /> Formato Tirilla (80mm)
                      </button>
                      
                      <button 
                        onClick={() => handlePrintIndividual('LETTER')} 
                        className="w-full py-5 bg-white border-4 border-gray-100 text-brand-black font-black rounded-2xl hover:border-brand-black shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-xs"
                      >
                        <FileText size={20} /> Formato Hoja Carta
                      </button>

                      <button 
                        onClick={() => handlePrintIndividual('HALF_LETTER')} 
                        className="w-full py-5 bg-white border-4 border-gray-100 text-brand-black font-black rounded-2xl hover:border-brand-black shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-xs"
                      >
                        <FileType size={20} /> Formato Media Carta
                      </button>
                      
                      <button onClick={() => setShowPrintOptions(false)} className="mt-4 text-gray-400 font-black text-[10px] uppercase hover:text-brand-red">Cerrar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
