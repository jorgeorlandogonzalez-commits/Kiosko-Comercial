
import React, { useState, useMemo } from 'react';
import { 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, ComposedChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Invoice, Product, Expense } from '../types';
import { RefreshCw, TrendingUp, Clock, Calculator, Wallet, TrendingDown, Info, Truck, Package, DollarSign } from 'lucide-react';

interface DashboardProps {
  invoices: Invoice[];
  products: Product[];
  totalDebt: number;
  cxpTotal?: number;
  expenses?: Expense[];
  onRefresh?: () => Promise<void>;
}

// Función auxiliar para obtener la fecha en formato YYYY-MM-DD basada en hora Colombia
const getColombiaDateString = (isoDate: string) => {
  return new Date(isoDate).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

const COLORS = ['#D62828', '#111111', '#10B981', '#F59E0B'];

export const Dashboard: React.FC<DashboardProps> = ({ invoices, products, totalDebt, cxpTotal = 0, expenses = [], onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const stats = useMemo(() => {
    // Fecha actual en Colombia
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    
    // KPIs DIARIOS
    const todaysInvoices = invoices.filter(inv => getColombiaDateString(inv.date) === todayStr && inv.status !== 'ANNULLED');
    
    const salesGrossToday = Math.round(todaysInvoices.reduce((sum, inv) => sum + inv.total, 0));
    const salesNetToday = Math.round(todaysInvoices.reduce((sum, inv) => sum + inv.subtotal, 0));
    
    const costToday = Math.round(todaysInvoices.reduce((sum, inv) => {
        const invCost = inv.items.reduce((iSum, item) => iSum + (item.cost * item.quantity), 0);
        return sum + invCost;
    }, 0));
    
    const todaysExpenses = expenses.filter(exp => getColombiaDateString(exp.date) === todayStr);
    const expensesToday = Math.round(todaysExpenses.reduce((sum, exp) => sum + exp.amount, 0));

    const profitToday = salesNetToday - costToday - expensesToday;

    // VALORIZACIÓN INVENTARIO
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);

    // RENTABILIDAD DIARIA (ÚLTIMOS 7 DÍAS)
    const profitabilityData = [];
    let total7DayProfit = 0;

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // Ajustar a string local Colombia del día iterado
        const dStr = d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
        
        const dayInvoices = invoices.filter(inv => getColombiaDateString(inv.date) === dStr && inv.status !== 'ANNULLED');
        const daySalesNet = dayInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
        const dayCost = dayInvoices.reduce((sum, inv) => {
            const invCost = inv.items.reduce((iSum, item) => iSum + (item.cost * item.quantity), 0);
            return sum + invCost;
        }, 0);
        
        const dayExpenses = expenses.filter(exp => getColombiaDateString(exp.date) === dStr).reduce((sum, exp) => sum + exp.amount, 0);

        const dailyProfit = daySalesNet - dayCost - dayExpenses;
        total7DayProfit += dailyProfit;

        // Formato visual para el gráfico (ej: Lunes 24)
        const labelDate = new Date(dStr + 'T12:00:00'); // Forzar mediodía para evitar saltos de día por UTC
        const label = labelDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', timeZone: 'America/Bogota' });

        profitabilityData.push({
            date: label,
            ventasNetas: Math.round(daySalesNet),
            costos: Math.round(dayCost),
            gastos: Math.round(dayExpenses),
            utilidad: Math.round(dailyProfit)
        });
    }

    // COMPORTAMIENTO POR HORA (DÍA ACTUAL)
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        sales: 0
    }));

    todaysInvoices.forEach(inv => {
        // Obtener hora local colombiana
        const dateObj = new Date(inv.date);
        const hourStr = dateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', timeZone: 'America/Bogota' });
        const hour = parseInt(hourStr);
        
        if (hourlyData[hour]) {
            hourlyData[hour].sales += inv.total;
        }
    });

    const pieData = [
      { name: 'Inventario (Costo)', value: totalInventoryValue },
      { name: 'Cuentas x Cobrar', value: totalDebt },
      { name: 'Ventas Hoy', value: salesGrossToday }
    ].filter(d => d.value > 0);

    return {
        salesToday: salesGrossToday,
        profitToday,
        total7DayProfit,
        profitabilityData,
        hourlyData,
        totalInventoryValue,
        pieData,
        ticketAvg: todaysInvoices.length > 0 ? Math.round(salesGrossToday / todaysInvoices.length) : 0,
        countToday: todaysInvoices.length,
        expensesToday
    };
  }, [invoices, products, totalDebt, expenses]);

  const handleRefreshClick = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-brand-black p-4 border border-gray-800 shadow-2xl rounded-2xl text-xs space-y-2">
          <p className="font-black text-white mb-2 border-b border-white/10 pb-1 uppercase tracking-widest">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-6">
              <span className="font-bold text-gray-400 uppercase">{entry.name}:</span>
              <span className="font-black" style={{ color: entry.color || entry.fill }}>
                ${Math.round(entry.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-brand-black tracking-tight flex items-center gap-3">
             <TrendingUp className="text-brand-red" size={32} /> Análisis de Rendimiento
          </h2>
          <p className="text-gray-500 font-medium">Control de márgenes, inventario y salud comercial del negocio.</p>
        </div>
        
        <button 
          onClick={handleRefreshClick}
          className="flex items-center gap-2 px-6 py-3 bg-brand-black text-white font-black rounded-xl hover:bg-brand-red transition-all shadow-lg text-xs uppercase tracking-widest"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Sincronizando...' : 'Actualizar Datos'}</span>
        </button>
      </div>
      
      {/* TARJETAS DE KPIs PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border-t-4 border-t-brand-red">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Ventas Hoy (Bruto)</p>
          <p className="text-2xl font-black text-brand-black tracking-tighter">${stats.salesToday.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase"><Info size={12}/> Hoy</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-t-4 border-t-blue-600">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Valor Inventario</p>
          <p className="text-2xl font-black text-blue-600 tracking-tighter">${Math.round(stats.totalInventoryValue).toLocaleString()}</p>
          <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1"><Package size={12}/> Al costo</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-t-4 border-t-green-500">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Cuentas por Cobrar</p>
          <p className="text-2xl font-black text-brand-black tracking-tighter">${Math.round(totalDebt).toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-brand-red uppercase"><Wallet size={12}/> En calle</div>
        </div>
        <div className="bg-brand-black p-6 rounded-3xl shadow-xl text-white">
          <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest mb-1">Cuentas por Pagar</p>
          <p className="text-2xl font-black text-orange-400 tracking-tighter">${Math.round(cxpTotal).toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase"><Truck size={12}/> Proveedores</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-t-4 border-t-purple-500">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Gastos Hoy</p>
          <p className="text-2xl font-black text-purple-600 tracking-tighter">${stats.expensesToday.toLocaleString()}</p>
          <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase">Operativos</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-t-4 border-t-yellow-500">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Utilidad Neta Hoy</p>
          <p className="text-2xl font-black text-yellow-600 tracking-tighter">${stats.profitToday.toLocaleString()}</p>
          <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase">Margen Real</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GRÁFICO COMPUESTO: VENTAS VS COSTOS VS UTILIDAD */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                    <h3 className="text-xl font-black text-brand-black uppercase tracking-tighter flex items-center gap-2">
                        <Calculator className="text-brand-red" size={24} /> Rentabilidad Semanal
                    </h3>
                    <p className="text-sm text-gray-400 font-medium">Histórico de utilidad frente a costos operativos (Últimos 7 días).</p>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-xl flex items-center gap-6 border border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-brand-red"></div>
                        <span className="text-[9px] font-black text-gray-500 uppercase">Ventas</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-brand-black"></div>
                        <span className="text-[9px] font-black text-gray-500 uppercase">Costos</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-[9px] font-black text-gray-500 uppercase">Gastos</span>
                    </div>
                </div>
            </div>
            
            <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats.profitabilityData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 'bold' }}
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} 
                    tick={{ fill: '#9ca3af', fontSize: 11 }} 
                />
                <Tooltip cursor={{fill: '#f9fafb'}} content={<CustomTooltip />} />
                
                <Bar 
                    dataKey="ventasNetas" 
                    name="Ventas Netas" 
                    fill="#D62828" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                />
                <Bar 
                    dataKey="costos" 
                    name="Costos" 
                    fill="#111111" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                />
                <Bar 
                    dataKey="gastos" 
                    name="Gastos" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                />
                <Line 
                    type="monotone" 
                    dataKey="utilidad" 
                    name="Utilidad" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                />
                </ComposedChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* GRÁFICO DISTRIBUCIÓN ACTIVOS */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col">
            <h3 className="text-xl font-black text-brand-black uppercase tracking-tighter flex items-center gap-2 mb-2">
                <DollarSign className="text-brand-red" size={24} /> Distribución Activos
            </h3>
            <p className="text-sm text-gray-400 font-medium mb-6">Donde está el dinero ahora.</p>
            
            <div className="flex-1 min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={stats.pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {stats.pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                {/* Centro del Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Total Activos</p>
                    <p className="text-lg font-black text-brand-black">
                        ${Math.round(stats.totalInventoryValue + totalDebt + stats.salesToday).toLocaleString()}
                    </p>
                </div>
            </div>
            
            <div className="mt-4 space-y-2">
                {stats.pieData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="font-bold text-gray-600">{entry.name}</span>
                        </div>
                        <span className="font-black">${Math.round(entry.value).toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-black text-brand-black uppercase tracking-tighter flex items-center gap-2">
                <TrendingUp className="text-brand-red" size={24} /> Mis Últimas Transmisiones (DIAN)
            </h3>
            <button 
              onClick={() => {
                const headers = ["ID", "Fecha", "NIT Cliente", "Nombre Cliente", "Subtotal", "IVA", "Total", "Método Pago", "Estado DIAN", "CUFE"];
                const rows = invoices.map(inv => {
                  return [
                    inv.id || '',
                    inv.date || '',
                    inv.customerNit || '',
                    inv.customerName || '',
                    inv.subtotal || 0,
                    inv.tax || 0,
                    inv.total || 0,
                    inv.paymentMethod || '',
                    inv.dianStatus || '',
                    inv.cufe || ''
                  ].map(field => `"${field}"`).join(',');
                });
                const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.setAttribute("href", URL.createObjectURL(blob));
                link.setAttribute("download", `Facturas_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:border-brand-red hover:text-brand-red transition-all cursor-pointer text-xs"
            >
              Exportar CSV
            </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Factura</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 5).map(inv => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-700 text-sm">{inv.id}</td>
                  <td className="p-4 text-xs font-medium text-gray-500">{new Date(inv.date).toLocaleString()}</td>
                  <td className="p-4">
                    {inv.dianStatus === 'APPROVED' ? <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold w-fit flex items-center gap-1">Aprobada</span> :
                     inv.dianStatus === 'REJECTED' ? <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold w-fit flex items-center gap-1">Rechazada</span> :
                     <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold w-fit flex items-center gap-1">Pendiente</span>}
                  </td>
                  <td className="p-4 font-black text-brand-black">${inv.total.toLocaleString()}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic font-medium">No hay transmisiones recientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
