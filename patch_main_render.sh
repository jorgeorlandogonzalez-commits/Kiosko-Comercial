#!/bin/bash
awk '
/    <div className="flex flex-col h-screen bg-brand-black font-sans overflow-hidden">/ {
    print "    <div className=\"flex h-screen bg-brand-black font-sans overflow-hidden\">"
    print "      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogoutClick={() => setShowLogoutConfirm(true)} storeSettings={storeSettings} isOpenMobile={isOpenMobile} setIsOpenMobile={setIsOpenMobile} />"
    print "      <div className=\"flex-1 flex flex-col min-w-0 overflow-hidden relative\">"
    print "        <div className=\"h-14 md:h-16 bg-brand-black border-b border-white/10 flex items-center justify-between px-4 shrink-0\">"
    print "          <div className=\"flex items-center gap-3\">"
    print "            <button onClick={() => setIsOpenMobile(true)} className=\"md:hidden text-white p-2 hover:bg-white/10 rounded-lg\">"
    print "              <Menu size={24} />"
    print "            </button>"
    print "            <span className=\"font-black text-white text-lg md:hidden truncate\">"
    print "              {storeSettings?.name || \"Kiosko\"}"
    print "            </span>"
    print "          </div>"
    print "          <div className=\"flex items-center gap-2\">"
    print "            <button onClick={() => setIsGeminiOpen(true)} className=\"flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-lg\">"
    print "              <Sparkles size={16} /> <span className=\"hidden sm:inline\">Don J</span>"
    print "            </button>"
    print "            {currentUser && ("
    print "              <button onClick={() => setShowLogoutConfirm(true)} className=\"md:hidden flex items-center justify-center w-10 h-10 bg-brand-red rounded-full text-white shadow-lg\">"
    print "                {currentUser.name.charAt(0)}"
    print "              </button>"
    print "            )}"
    print "          </div>"
    print "        </div>"
    skip = 1
    next
}
/<Navbar / {
    skip = 1
    next
}
/storeSettings={storeSettings}/ {
    if (skip) {
        skip = 0
        next
    }
}
/\/>/ {
    if (skip) {
        skip = 0
        next
    }
}
/<main className="flex-1 overflow-hidden relative">/ {
    if (skip) {
        skip = 0
    }
    print "        <main className=\"flex-1 overflow-hidden relative\">"
    next
}
{
    if (!skip) print $0
}
' /app/applet/MainApp.tsx > /app/applet/MainApp_new.tsx
mv /app/applet/MainApp_new.tsx /app/applet/MainApp.tsx
