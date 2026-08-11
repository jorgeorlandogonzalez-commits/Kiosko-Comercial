const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

// 1. Allow deleting DRAFT and REJECTED invoices
content = content.replace(
  /allow delete: if false;/g,
  `allow delete: if isOperator(userId) && existing().dianStatus != 'APPROVED';`
);

// 2. Relax isValidCustomerForFE for DRAFT invoices, and fix size > 3 to size >= 2
content = content.replace(
  /function isValidCustomerForFE\(data\) \{\s*return data.customerNit == '222222222222' \|\| \(\s*data.customerName is string && data.customerName.size\(\) > 3 &&/g,
  `function isValidCustomerForFE(data) {
      return (data.dianStatus == 'DRAFT' || data.dianStatus == 'REJECTED') || (data.customerNit == '222222222222' || (
        data.customerName is string && data.customerName.size() >= 2 &&`
);
// wait, we need to match the closing parenthesis of isValidCustomerForFE if we added an open parenthesis.
