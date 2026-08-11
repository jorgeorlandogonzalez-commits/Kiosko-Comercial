const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  /function isValidCustomerForFE\(data\) \{[\s\S]*?\}/,
  () => `function isValidCustomerForFE(data) {
      return (data.dianStatus == 'DRAFT' || data.dianStatus == 'REJECTED') || (
        data.customerNit == '222222222222' || (
          data.customerName is string && data.customerName.size() >= 2 &&
          (!('customerPhone' in data) || data.customerPhone == null || data.customerPhone == '' || data.customerPhone is string) &&
          (!('customerEmail' in data) || data.customerEmail == null || data.customerEmail == '' || (data.customerEmail is string && data.customerEmail.matches('^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$')))
        )
      );
    }`
);

fs.writeFileSync('firestore.rules', content);
