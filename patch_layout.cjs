const fs = require('fs');
const content = fs.readFileSync('MainApp.tsx', 'utf8');

const target = `  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 transition-all">
      {/* SaaS Pricing Overlay */}
      {showPricing && (
          <PricingPlans onSelectPlan={handleSelectPlan} isTrialExpired={isSubscriptionExpired} isInTrial={trialDaysLeft !== null && trialDaysLeft > 0} onCancel={() => setShowPricing(false)} />
      )}

      <div className="w-full h-full min-h-screen bg-gray-50 flex flex-col transition-all duration-300 ease-in-out relative">
          
        {/* Banner de Periodo de Prueba o Suscripción SaaS */}
        {trialDaysLeft !== null && trialDaysLeft <= 15 && trialDaysLeft > 0 && (
            <div className={\`text-white px-4 py-2 text-center text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 relative z-50 shadow-md \${storeSettings.subscription?.status === 'ACTIVE' ? 'bg-orange-600' : 'bg-brand-black'}\`}>
                <Clock size={14} className={storeSettings.subscription?.status === 'ACTIVE' ? "text-white animate-pulse" : "text-brand-red animate-pulse"}/>
                <span>
                    {storeSettings.subscription?.status === 'ACTIVE' 
                        ? \`¡Atención! Tu suscripción vence en \${trialDaysLeft} día(s)\` 
                        : \`\${trialDaysLeft} Días Restantes de tu Prueba Gratuita\`}
                </span>
                <button onClick={() => setShowPricing(true)} className={\`ml-4 px-3 py-1 rounded text-[10px] transition-all \${storeSettings.subscription?.status === 'ACTIVE' ? 'bg-white text-orange-600 hover:bg-gray-100' : 'bg-brand-red text-white hover:bg-white hover:text-brand-red'}\`}>
                    Renovar Ahora
                </button>
            </div>
        )}

        <main className="flex-1 overflow-hidden relative">`;

const replacement = `  return (
    <div className="flex h-screen bg-brand-black font-sans overflow-hidden"> 
      {/* SaaS Pricing Overlay */}
      {showPricing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-black/90 backdrop-blur-sm p-4">
              <PricingPlans onSelectPlan={handleSelectPlan} isTrialExpired={isSubscriptionExpired} isInTrial={trialDaysLeft !== null && trialDaysLeft > 0} onCancel={() => setShowPricing(false)} />
          </div>
      )}

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogoutClick={() => signOut(auth)} storeSettings={storeSettings} isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-gray-50">
        
        {/* Topbar móvil y accesos rápidos */}
        <div className="h-14 md:h-16 bg-brand-black border-b border-white/10 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsOpenMobile(true)} className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg">
              <Menu size={24} />
            </button>
            <span className="font-black text-white text-lg md:hidden truncate">
              {storeSettings?.name || "Kiosko"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsGeminiOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-lg">
              <Sparkles size={16} /> <span className="hidden sm:inline">Don J</span>
            </button>
            {currentUser && (
              <button onClick={() => signOut(auth)} className="md:hidden flex items-center justify-center w-10 h-10 bg-brand-red rounded-full text-white shadow-lg">
                {currentUser.name.charAt(0)}
              </button>
            )}
          </div>
        </div>

        {/* Banner de Periodo de Prueba o Suscripción SaaS */}
        {trialDaysLeft !== null && trialDaysLeft <= 15 && trialDaysLeft > 0 && (
            <div className={\`text-white px-4 py-2 text-center text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 relative z-50 shadow-md \${storeSettings.subscription?.status === 'ACTIVE' ? 'bg-orange-600' : 'bg-brand-black'}\`}>
                <Clock size={14} className={storeSettings.subscription?.status === 'ACTIVE' ? "text-white animate-pulse" : "text-brand-red animate-pulse"}/>
                <span>
                    {storeSettings.subscription?.status === 'ACTIVE' 
                        ? \`¡Atención! Tu suscripción vence en \${trialDaysLeft} día(s)\` 
                        : \`\${trialDaysLeft} Días Restantes de tu Prueba Gratuita\`}
                </span>
                <button onClick={() => setShowPricing(true)} className={\`ml-4 px-3 py-1 rounded text-[10px] transition-all \${storeSettings.subscription?.status === 'ACTIVE' ? 'bg-white text-orange-600 hover:bg-gray-100' : 'bg-brand-red text-white hover:bg-white hover:text-brand-red'}\`}>
                    Renovar Ahora
                </button>
            </div>
        )}

        <main className="flex-1 overflow-hidden relative">`;

if (content.includes(target)) {
  fs.writeFileSync('MainApp.tsx', content.replace(target, replacement), 'utf8');
  console.log("Success");
} else {
  console.log("Target not found. Doing fuzzy search.");
  // Try finding just the return line
  const startIdx = content.indexOf('  return (\n    <div className="flex items-center justify-center min-h-screen bg-gray-900 transition-all">');
  const endIdx = content.indexOf('<main className="flex-1 overflow-hidden relative">');
  if (startIdx !== -1 && endIdx !== -1) {
    const toReplace = content.substring(startIdx, endIdx + '<main className="flex-1 overflow-hidden relative">'.length);
    fs.writeFileSync('MainApp.tsx', content.replace(toReplace, replacement), 'utf8');
    console.log("Fuzzy match success");
  } else {
    console.log("Fuzzy match failed");
  }
}
