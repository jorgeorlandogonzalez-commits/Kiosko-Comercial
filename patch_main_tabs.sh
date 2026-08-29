#!/bin/bash
awk '
/\{activeTab === '\''pos'\'' &&/ {
    print "              {activeTab === '\''hub-ventas'\'' && <HubVentas onNavigate={setActiveTab} />}"
    print "              {activeTab === '\''hub-inventario'\'' && <HubInventario onNavigate={setActiveTab} />}"
    print "              {activeTab === '\''hub-dian'\'' && <HubDian onNavigate={setActiveTab} />}"
    print "              {activeTab === '\''hub-numeros'\'' && <HubNumeros onNavigate={setActiveTab} />}"
    print "              {activeTab === '\''customers'\'' && <Customers customers={customers} onSaveCustomer={handleSaveCustomer} />}"
    print $0
    next
}
{
    print $0
}
' /app/applet/MainApp.tsx > /app/applet/MainApp_new.tsx
mv /app/applet/MainApp_new.tsx /app/applet/MainApp.tsx
