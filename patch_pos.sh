#!/bin/bash
awk '
/\{showCustomerModal && \(/ {
    print "      {showCustomerModal && ("
    print "        <CustomerModal"
    print "          customers={customers}"
    print "          initialCustomer={{"
    print "            nit: customerNit,"
    print "            name: customerName,"
    print "            phone: customerPhone,"
    print "            email: customerEmail,"
    print "            address: customerAddress,"
    print "            branch: customerBranch"
    print "          }}"
    print "          onClose={() => setShowCustomerModal(false)}"
    print "          onSave={(c) => {"
    print "            setCustomerNit(c.nit);"
    print "            setCustomerName(c.name);"
    print "            setCustomerPhone(c.phone || \"\");"
    print "            setCustomerEmail(c.email || \"\");"
    print "            setCustomerAddress(c.address || \"\");"
    print "            setCustomerBranch(c.branch || \"\");"
    print "            onSaveCustomer(c);"
    print "            setShowCustomerModal(false);"
    print "          }}"
    print "        />"
    print "      )}"
    skip = 1
    next
}
/\{showClosureModal && \(/ {
    skip = 0
}
{
    if (!skip) print $0
}
' /app/applet/components/POS.tsx > /app/applet/components/POS_new.tsx
mv /app/applet/components/POS_new.tsx /app/applet/components/POS.tsx
