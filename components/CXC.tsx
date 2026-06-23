
    import React, { useState, useEffect, useMemo } from 'react';
    import { CreditAccount, CreditDebt, CreditTransaction, StoreSettings } from '../types';
    import { dbService } from '../services/storageService';
    import { Users, Search, DollarSign, History, ArrowDownLeft, ArrowUpRight, CheckCircle2, Archive, AlertTriangle, ChevronRight, Calendar, Banknote, FileText, TrendingUp, TrendingDown, Filter, X, Printer, FileDown, ArrowLeft, UserCircle, MessageCircle, Edit2, Trash2 } from 'lucide-react';

    interface CXCProps {
    accounts: CreditAccount[];
    onAddPayment: (clientId: string, amount: number, specificDebtId?: string, paymentDate?: string, description?: string) => void;
    onAddDebt: (clientId: string, amount: number, description: string, date: string) => void;
    onDeletePayment?: (clientId: string, transactionId: string) => void;
    onEditPayment?: (clientId: string, transactionId: string, newAmount: number, newDate: string, newDescription: string) => void;
    onCleanupAccounts?: () => void;
    }

    export const CXC: React.FC<CXCProps> = ({ accounts, onAddPayment, onAddDebt, onDeletePayment, onEditPayment, onCleanupAccounts }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<CreditAccount | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
    const [paymentDescription, setPaymentDescription] = useState('');
    const [activeTab, setActiveTab] = useState<'debts' | 'history'>('debts');
    const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
    const [targetDebt, setTargetDebt] = useState<CreditDebt | null>(null);
    const [debtDateFilter, setDebtDateFilter] = useState('');
    const [globalDateFilter, setGlobalDateFilter] = useState('');
    
    const [showNewDebtModal, setShowNewDebtModal] = useState(false);
    const [newDebtAmount, setNewDebtAmount] = useState('');
    const [newDebtDescription, setNewDebtDescription] = useState('');
    const [newDebtDate, setNewDebtDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));

    const [editingPayment, setEditingPayment] = useState<CreditTransaction | null>(null);
    const [editPaymentAmount, setEditPaymentAmount] = useState('');
    const [editPaymentDate, setEditPaymentDate] = useState('');
    const [editPaymentDescription, setEditPaymentDescription] = useState('');
    
    const [paymentToDelete, setPaymentToDelete] = useState<CreditTransaction | null>(null);

    useEffect(() => {
        if (selectedAccount) {
        const updated = accounts.find(a => a.id === selectedAccount.id);
        if (updated) {
            setSelectedAccount(updated);
        } else {
            setSelectedAccount(null);
            setMobileView('list');
        }
        }
    }, [accounts]);

    const filteredAccounts = accounts.filter(acc => {
        const matchesSearch = (acc.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (acc.id || '').includes(searchTerm);
        
        let matchesDate = true;
        if (globalDateFilter) {
        if (acc.debts && acc.debts.length > 0) {
            matchesDate = acc.debts.some(d => {
            const dDate = new Date(d.date).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
            return dDate === globalDateFilter;
            });
        } else {
            matchesDate = false;
        }
        }
        
        return matchesSearch && matchesDate;
    });

    const totalDebt = accounts.reduce((sum, acc) => sum + acc.currentDebt, 0);

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount || !paymentAmount || !paymentDate) return;
        
        // Combine date with current time to maintain sorting
        const now = new Date();
        const [year, month, day] = paymentDate.split('-');
        const paymentDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
        
        onAddPayment(selectedAccount.id, Math.round(Number(paymentAmount)), targetDebt ? targetDebt.id : undefined, paymentDateTime, paymentDescription);
        setPaymentAmount('');
        setPaymentDate(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
        setPaymentDescription('');
        setTargetDebt(null);
        setActiveTab('history');
    };

    const handleAddDebtSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount || !newDebtAmount || !newDebtDescription || !newDebtDate) return;
        
        // Combine date with current time to maintain sorting
        const now = new Date();
        const [year, month, day] = newDebtDate.split('-');
        const debtDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
        
        onAddDebt(selectedAccount.id, Math.round(Number(newDebtAmount)), newDebtDescription, debtDateTime);
        
        setNewDebtAmount('');
        setNewDebtDescription('');
        setShowNewDebtModal(false);
        setActiveTab('debts');
    };

    const handleEditPaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount || !editingPayment || !onEditPayment || !editPaymentAmount || !editPaymentDate || !editPaymentDescription) return;

        const now = new Date();
        const [year, month, day] = editPaymentDate.split('-');
        const paymentDateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
        
        onEditPayment(selectedAccount.id, editingPayment.id, Math.round(Number(editPaymentAmount)), paymentDateTime, editPaymentDescription);
        setEditingPayment(null);
    };

    const handleDeletePaymentClick = (tx: CreditTransaction) => {
        if (!selectedAccount || !onDeletePayment) return;
        setPaymentToDelete(tx);
    };

    const confirmDeletePayment = () => {
        if (!selectedAccount || !onDeletePayment || !paymentToDelete) return;
        onDeletePayment(selectedAccount.id, paymentToDelete.id);
        setPaymentToDelete(null);
    };

    const handleSelectAccount = (acc: CreditAccount) => {
        setSelectedAccount(acc);
        setTargetDebt(null);
        setActiveTab('debts');
        setMobileView('detail');
    };

    const getSettings = (): StoreSettings => {
        const settings = dbService.getStoreSettings();
        return settings || { 
        name: 'Kiosko Comercial', 
        nit: 'N/A', 
        address: '', 
        phone: '',
        resolution: 'N/A',
        prefix: 'POS',
        currentNumber: 1,
        vatResponsibility: 'No Responsable de IVA'
        };
    };

    const formatCurrency = (val: number) => {
        return Math.round(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const handlePrintStatement = () => {
        if (!activeAccount) return;
        const settings = getSettings();
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Extracto de Cuenta - ${activeAccount.customerName}</title>
                <style>
                    @page { margin: 0; size: 80mm auto; }
                    body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 10px 2px; font-size: 11px; color: #000; line-height: 1.2; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .line { border-bottom: 1px dashed #000; margin: 8px 0; }
                    .flex { display: flex; justify-content: space-between; }
                    .items-table { width: 100%; margin: 8px 0; font-size: 9px; border-collapse: collapse; }
                    .items-table th { border-bottom: 1px solid #000; text-align: left; padding: 2px 0; }
                    .items-table td { padding: 3px 0; vertical-align: top; }
                    .text-right { text-align: right; }
                    .section-title { font-weight: bold; text-decoration: underline; margin-top: 10px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class="center">
                    <div class="bold" style="font-size: 14px;">${settings.name.toUpperCase()}</div>
                    <div class="bold">NIT: ${settings.nit}</div>
                    <div class="line"></div>
                    <div class="bold">ESTADO DE CUENTA DETALLADO</div>
                    <div>Fecha de Corte: ${new Date().toLocaleDateString()}</div>
                </div>
                <div class="line"></div>
                <div><b>CLIENTE:</b> ${activeAccount.customerName.toUpperCase()}</div>
                <div class="line"></div>

                <div class="section-title">DEUDAS PENDIENTES</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th width="55%">Fecha / Concepto</th>
                            <th width="45%" class="text-right">Saldo Pend.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activeAccount.debts?.filter(d => !d.isPaid).map(d => `
                            <tr>
                                <td>${new Date(d.date).toLocaleDateString()} ${new Date(d.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}<br>${d.description.substring(0, 20)}</td>
                                <td class="text-right">$${formatCurrency(d.currentBalance)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="2" class="center">Sin deudas pendientes</td></tr>'}
                    </tbody>
                </table>

                <div class="line"></div>
                <div class="section-title">HISTORIAL DE MOVIMIENTOS</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th width="40%">Fecha / Tipo</th>
                            <th width="30%" class="text-right">Monto</th>
                            <th width="30%" class="text-right">Abono</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedHistory.slice(0, 20).map(tx => `
                            <tr>
                                <td>${new Date(tx.date).toLocaleDateString()} ${new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}<br>${tx.type === 'CHARGE' ? 'CARGO' : 'ABONO'}</td>
                                <td class="text-right">${tx.type === 'CHARGE' ? '$'+formatCurrency(tx.amount) : '-'}</td>
                                <td class="text-right">${tx.type === 'PAYMENT' ? '$'+formatCurrency(tx.amount) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="line"></div>
                <div class="flex bold" style="font-size: 13px; margin-top: 5px;">
                    <span>SALDO TOTAL:</span>
                    <span>$${formatCurrency(activeAccount.currentDebt)}</span>
                </div>
                
                <div class="center" style="margin-top: 20px; font-size: 9px;">
                    ¡GRACIAS POR SU CONFIANZA!<br>
                    Software: Kiosko Comercial POS
                </div>
                <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleWhatsAppStatement = () => {
        if (!activeAccount) return;
        const settings = getSettings();
        
        let message = `📊 *ESTADO DE CUENTA - ${settings.name.toUpperCase()}* %0A`;
        message += `--------------------------------%0A`;
        message += `👤 *Cliente:* ${activeAccount.customerName}%0A`;
        message += `📅 *Fecha:* ${new Date().toLocaleDateString()}%0A`;
        message += `--------------------------------%0A%0A`;
        
        message += `📌 *DEUDAS ACTIVAS:*%0A`;
        const pendingDebts = activeAccount.debts?.filter(d => !d.isPaid) || [];
        if (pendingDebts.length > 0) {
            pendingDebts.forEach(d => {
                message += `• ${new Date(d.date).toLocaleDateString()} ${new Date(d.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} | ${d.description}: *$${formatCurrency(d.currentBalance)}*%0A`;
            });
        }
        
        message += `%0A🕒 *HISTORIAL DE MOVIMIENTOS:*%0A`;
        sortedHistory.slice(0, 10).forEach(tx => {
            const sign = tx.type === 'CHARGE' ? '🔴 Cargo' : '🟢 Abono';
            message += `${sign}: $${formatCurrency(tx.amount)} (${new Date(tx.date).toLocaleDateString()} ${new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})%0A`;
        });
        
        message += `%0A--------------------------------%0A`;
        message += `💰 *SALDO TOTAL PENDIENTE: $${formatCurrency(activeAccount.currentDebt)}*%0A`;
        message += `--------------------------------%0A`;
        message += `_¡Gracias por su confianza!_`;

        const phone = activeAccount.phone ? activeAccount.phone.replace(/[^0-9]/g, '') : '';
        const url = phone ? `https://wa.me/57${phone}?text=${message}` : `https://wa.me/?text=${message}`;
        window.open(url, '_blank');
    };

    const handlePrintReceipt = (tx: CreditTransaction) => {
        if (!activeAccount) return;
        const settings = getSettings();
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Recibo Abono</title>
                <style>
                    @page { margin: 0; size: 80mm auto; }
                    body { font-family: 'Courier New', monospace; width: 72mm; margin: 0 auto; padding: 10px 5px; font-size: 11px; color: #000; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .line { border-bottom: 1px dashed #000; margin: 10px 0; }
                    .big-amount { font-size: 18px; font-weight: bold; margin: 10px 0; border: 1px solid #000; padding: 5px; }
                </style>
            </head>
            <body>
                <div class="center">
                    <div class="bold" style="font-size: 14px;">${settings.name.toUpperCase()}</div>
                    <div class="bold">COMPROBANTE DE ABONO</div>
                </div>
                <div class="line"></div>
                <div><b>FECHA:</b> ${new Date(tx.date).toLocaleString()}</div>
                <div><b>CLIENTE:</b> ${activeAccount.customerName.toUpperCase()}</div>
                <div class="line"></div>
                <div class="center">
                    <div>VALOR RECIBIDO:</div>
                    <div class="big-amount">$${formatCurrency(tx.amount)}</div>
                </div>
                <div class="line"></div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
                    <span>SALDO RESTANTE:</span>
                    <span>$${formatCurrency(activeAccount.currentDebt)}</span>
                </div>
                <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const activeAccount = selectedAccount ? accounts.find(a => a.id === selectedAccount.id) || selectedAccount : null;
    const sortedDebts = useMemo(() => {
        if (!activeAccount?.debts) return [];
        let debts = [...activeAccount.debts];
        if (debtDateFilter) {
            debts = debts.filter(d => {
                const dDate = new Date(d.date).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
                return dDate === debtDateFilter;
            });
        }
        return debts.sort((a, b) => a.isPaid ? 1 : -1);
    }, [activeAccount, debtDateFilter]);
    const sortedHistory = useMemo(() => activeAccount?.history ? [...activeAccount.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [], [activeAccount]);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto h-full flex flex-col">
        <div className={`mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${mobileView === 'detail' ? 'hidden md:flex' : 'flex'}`}>
            <div><h2 className="text-2xl md:text-3xl font-black text-brand-black flex items-center gap-3"><Users className="text-brand-red" size={28} /> Fiados (CXC)</h2></div>
            <div className="bg-brand-black text-white px-4 py-2 rounded-xl shadow-lg border-l-4 border-brand-red"><span className="text-[10px] text-gray-400 uppercase font-bold block">Total en calle</span><span className="text-xl font-black">${formatCurrency(totalDebt)}</span></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-0">
            <div className={`md:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden max-h-[calc(100vh-12rem)] ${mobileView === 'detail' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3">
                    <div className="font-black text-[10px] uppercase text-gray-400 tracking-widest">Clientes con Fiados</div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-brand-red transition-all" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    <div className="relative flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 transition-all focus-within:border-brand-red">
                        <Calendar className="text-gray-400 mr-2" size={14} />
                        <input type="date" className="w-full bg-transparent outline-none text-xs font-bold text-gray-700" value={globalDateFilter} onChange={e => setGlobalDateFilter(e.target.value)} />
                        {globalDateFilter && <button onClick={() => setGlobalDateFilter('')} className="ml-2 text-gray-400 hover:text-brand-red"><X size={14}/></button>}
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2 no-scrollbar">
                    {filteredAccounts.map(acc => (
                        <div key={acc.id} onClick={() => handleSelectAccount(acc)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${activeAccount?.id === acc.id ? 'bg-brand-black border-brand-black text-white' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                            <div className="flex justify-between items-center">
                                <div className="font-black text-xs uppercase">{acc.customerName}</div>
                                <div className={`font-black ${activeAccount?.id === acc.id ? 'text-white' : (acc.currentDebt === 0 ? 'text-green-600' : 'text-brand-red')}`}>${formatCurrency(acc.currentDebt)}</div>
                            </div>
                            <div className="text-[9px] mt-1 opacity-60">ID: {acc.id}</div>
                        </div>
                    ))}
                    {filteredAccounts.length === 0 && <p className="text-center py-10 text-gray-300 font-bold uppercase text-[10px]">Sin cuentas pendientes</p>}
                </div>
            </div>
            <div className={`md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden max-h-[calc(100vh-12rem)] relative ${mobileView === 'list' ? 'hidden md:flex' : 'flex fixed inset-0 z-50 md:static'}`}>
                {activeAccount ? (
                    <div className="flex flex-col h-full relative bg-white">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0 shadow-sm"><div className="flex items-center gap-3"><button onClick={() => setMobileView('list')} className="md:hidden p-2 -ml-2 text-gray-600 rounded-full"><ArrowLeft size={24} /></button><div><h3 className="font-black text-xl text-brand-black leading-none">{activeAccount.customerName}</h3><div className="text-sm text-gray-500">{activeAccount.id}</div></div></div><div className="flex flex-col items-end"><div className="text-[10px] uppercase font-bold text-gray-400">Total Deuda</div><div className={`text-2xl font-black ${activeAccount.currentDebt === 0 ? 'text-green-600' : 'text-brand-red'}`}>${formatCurrency(activeAccount.currentDebt)}</div></div></div>
                        <div className="p-3 bg-white border-b border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
                            <button onClick={handlePrintStatement} className="min-w-[80px] flex-1 py-3 px-2 bg-gray-100 rounded-xl font-bold text-gray-700 flex flex-col items-center justify-center gap-1 hover:bg-gray-200 text-xs transition-transform"><Printer size={20} /><span>Extracto</span></button>
                            <button onClick={handleWhatsAppStatement} className="min-w-[80px] flex-1 py-3 px-2 bg-green-50 text-green-700 border border-green-100 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-green-100 text-xs transition-transform"><MessageCircle size={20} /><span>WhatsApp</span></button>
                            <button onClick={() => setActiveTab('debts')} className={`min-w-[80px] flex-1 py-3 px-2 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-xs transition-all ${activeTab === 'debts' ? 'bg-brand-black text-white' : 'bg-gray-100 text-gray-500'}`}><Banknote size={20} /><span>Deudas</span></button>
                            <button onClick={() => setActiveTab('history')} className={`min-w-[80px] flex-1 py-3 px-2 rounded-xl font-bold flex flex-col items-center justify-center gap-1 text-xs transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}><History size={20} /><span>Historial</span></button>
                            <button onClick={() => setShowNewDebtModal(true)} className="min-w-[80px] flex-1 py-3 px-2 bg-brand-red text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:bg-red-700 text-xs transition-transform"><TrendingUp size={20} /><span>Nuevo Fiado</span></button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-24 md:pb-4">
                            {activeTab === 'debts' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4 bg-white p-2 rounded-xl border border-gray-200">
                                        <Calendar size={18} className="text-gray-400" />
                                        <input 
                                            type="date" 
                                            value={debtDateFilter}
                                            onChange={e => setDebtDateFilter(e.target.value)}
                                            className="w-full bg-transparent outline-none text-sm font-medium text-gray-700"
                                        />
                                        {debtDateFilter && (
                                            <button onClick={() => setDebtDateFilter('')} className="p-1 text-gray-400 hover:text-brand-red">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {sortedDebts.length === 0 && debtDateFilter && (
                                        <div className="text-center text-gray-500 py-4">No se encontraron fiados en esta fecha.</div>
                                    )}
                                    {sortedDebts.map(debt => (
                                        <div key={debt.id} onClick={() => !debt.isPaid && setTargetDebt(debt)} className={`rounded-2xl p-5 border transition-all relative overflow-hidden shadow-sm ${debt.isPaid ? 'bg-gray-100 border-gray-200 opacity-60' : targetDebt?.id === debt.id ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' : 'bg-white border-gray-200'} cursor-pointer`}><div className="flex justify-between items-start mb-4"><div className="flex-1"><div className="font-bold text-gray-800 text-lg mb-1">{debt.description}</div><div className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12}/> Creado: {new Date(debt.date).toLocaleDateString()} {new Date(debt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></div>{debt.isPaid ? <span className="bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full uppercase">Pagado</span> : <span className="bg-red-100 text-brand-red text-xs font-black px-3 py-1 rounded-full uppercase">Pendiente</span>}</div><div className="flex justify-between items-end border-t border-gray-100 pt-3"><div><div className="text-xs text-gray-400 uppercase">Original</div><div className="text-gray-600 font-bold">${formatCurrency(debt.originalAmount)}</div></div><div className="text-right"><div className="text-xs text-gray-400 uppercase font-bold">Saldo</div><div className={`text-2xl font-black ${debt.isPaid ? 'text-gray-400' : 'text-gray-900'}`}>${formatCurrency(debt.currentBalance)}</div></div></div></div>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'history' && (
                                <div className="space-y-4">
                                    {sortedHistory.map((tx, idx) => (
                                        <div key={tx.id || idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'PAYMENT' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {tx.type === 'PAYMENT' ? <ArrowDownLeft size={24}/> : <TrendingUp size={24}/>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-base">{tx.type === 'PAYMENT' ? 'Abono Recibido' : 'Nuevo Fiado'}</div>
                                                    <div className="text-sm text-gray-500">{tx.description}</div>
                                                    <div className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={12}/> {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className={`font-black text-xl ${tx.type === 'PAYMENT' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.type === 'PAYMENT' ? '-' : '+'} ${formatCurrency(tx.amount)}
                                                </div>
                                                {tx.type === 'PAYMENT' && (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => {
                                                            setEditingPayment(tx);
                                                            setEditPaymentAmount(tx.amount.toString());
                                                            setEditPaymentDate(new Date(tx.date).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
                                                            setEditPaymentDescription(tx.description || '');
                                                        }} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-blue-600" title="Editar Abono">
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button onClick={() => handleDeletePaymentClick(tx)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-red-600" title="Eliminar Abono">
                                                            <Trash2 size={18} />
                                                        </button>
                                                        <button onClick={() => handlePrintReceipt(tx)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-blue-600" title="Imprimir Recibo">
                                                            <Printer size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {(activeAccount.currentDebt > 0) && (
                            <div className="bg-white border-t border-gray-200 p-4 shadow-xl z-20 sticky bottom-0">
                                <form onSubmit={handlePayment} className="flex flex-col gap-3">
                                    <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1"><DollarSign size={14}/> {targetDebt ? `Abonando a: ${targetDebt.description.substring(0, 15)}...` : 'Abono General'}</span>
                                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="bg-transparent border-none text-brand-red outline-none cursor-pointer" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                                            <input type="number" step="1" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-gray-100 border-2 border-transparent focus:bg-white focus:border-brand-red rounded-xl text-2xl font-black text-brand-black outline-none" placeholder={`Máx: $${formatCurrency(targetDebt ? targetDebt.currentBalance : activeAccount.currentDebt)}`} />
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent focus:bg-white focus:border-brand-red rounded-xl text-sm text-brand-black outline-none" placeholder="Comentario (opcional)" />
                                            <button type="submit" className="px-6 bg-brand-black text-white rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-800 transition-transform"><CheckCircle2 size={24} /></button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="hidden md:flex flex-col items-center justify-center h-full text-center text-gray-400 p-6"><UserCircle size={80} className="mb-4 opacity-10 text-brand-black"/><p className="text-xl font-bold text-gray-500">Selecciona un cliente</p></div>
                )}
                
                {showNewDebtModal && activeAccount && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="text-xl font-black text-brand-black flex items-center gap-2"><TrendingUp className="text-brand-red" /> Nuevo Fiado Manual</h3>
                                <button onClick={() => setShowNewDebtModal(false)} className="p-2 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-full transition-colors"><X size={24}/></button>
                            </div>
                            <form onSubmit={handleAddDebtSubmit} className="p-6 flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Fecha de Creación *</label>
                                    <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-brand-black focus-within:border-transparent">
                                        <Calendar className="text-gray-400 mr-2" size={20} />
                                        <input type="date" required value={newDebtDate} onChange={e => setNewDebtDate(e.target.value)} className="w-full bg-transparent outline-none text-base font-medium text-gray-700" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Descripción *</label>
                                    <input type="text" required value={newDebtDescription} onChange={e => setNewDebtDescription(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none" placeholder="Ej. Compra de mercancía" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Monto ($) *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                                        <input type="number" required min="1" step="1" value={newDebtAmount} onChange={e => setNewDebtAmount(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none font-mono text-lg" placeholder="0" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-4 bg-brand-red text-white rounded-xl font-black text-lg hover:bg-red-700 transition-colors mt-2 shadow-lg shadow-red-500/30">
                                    Crear Fiado
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {paymentToDelete && activeAccount && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="text-xl font-black text-brand-black flex items-center gap-2"><AlertTriangle className="text-brand-red" /> Eliminar Abono</h3>
                                <button onClick={() => setPaymentToDelete(null)} className="p-2 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-full transition-colors"><X size={24}/></button>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-600 mb-6 text-center">¿Está seguro de que desea eliminar el abono por <strong className="text-brand-black">${formatCurrency(paymentToDelete.amount)}</strong>? Esto revertirá el pago en las deudas correspondientes.</p>
                                <div className="flex gap-4">
                                    <button onClick={() => setPaymentToDelete(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                                    <button onClick={confirmDeletePayment} className="flex-1 py-3 bg-brand-red text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30">Eliminar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {editingPayment && activeAccount && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="text-xl font-black text-brand-black flex items-center gap-2"><Edit2 className="text-blue-600" /> Editar Abono</h3>
                                <button onClick={() => setEditingPayment(null)} className="p-2 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-full transition-colors"><X size={24}/></button>
                            </div>
                            <form onSubmit={handleEditPaymentSubmit} className="p-6 flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Fecha del Abono *</label>
                                    <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-brand-black focus-within:border-transparent">
                                        <Calendar className="text-gray-400 mr-2" size={20} />
                                        <input type="date" required value={editPaymentDate} onChange={e => setEditPaymentDate(e.target.value)} className="w-full bg-transparent outline-none text-base font-medium text-gray-700" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Descripción *</label>
                                    <input type="text" required value={editPaymentDescription} onChange={e => setEditPaymentDescription(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none" placeholder="Ej. Abono de cliente" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Monto ($) *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                                        <input type="number" required min="1" step="1" value={editPaymentAmount} onChange={e => setEditPaymentAmount(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-black outline-none font-mono text-lg" placeholder="0" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition-colors mt-2 shadow-lg shadow-blue-500/30">
                                    Guardar Cambios
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
    };
