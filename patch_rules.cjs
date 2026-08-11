const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  /function isValidInvoiceTransition\(oldData, newData\) \{\s*return \(oldData\.dianStatus == 'DRAFT' && \(newData\.dianStatus == 'SENDING' \|\| newData\.dianStatus == 'REJECTED'\)\) \|\|\s*\(oldData\.dianStatus == 'SENDING' && \(newData\.dianStatus == 'APPROVED' \|\| newData\.dianStatus == 'REJECTED' \|\| newData\.dianStatus == 'DRAFT'\)\) \|\|\s*\(oldData\.dianStatus == 'REJECTED' && \(newData\.dianStatus == 'DRAFT' \|\| newData\.dianStatus == 'SENDING'\)\);\s*\}/g,
  `function isValidInvoiceTransition(oldData, newData) {
      return oldData.dianStatus == newData.dianStatus ||
             (oldData.dianStatus == 'DRAFT' && (newData.dianStatus == 'SENDING' || newData.dianStatus == 'REJECTED')) ||
             (oldData.dianStatus == 'SENDING' && (newData.dianStatus == 'APPROVED' || newData.dianStatus == 'REJECTED' || newData.dianStatus == 'DRAFT')) ||
             (oldData.dianStatus == 'REJECTED' && (newData.dianStatus == 'DRAFT' || newData.dianStatus == 'SENDING'));
    }`
);

content = content.replace(
  /allow update: if isOperator\(userId\) && \s*isValidInvoice\(incoming\(\)\) &&\s*existing\(\)\.dianStatus != 'APPROVED' &&\s*isValidInvoiceTransition\(existing\(\), incoming\(\)\) &&\s*incoming\(\)\.id == existing\(\)\.id &&\s*incoming\(\)\.total == existing\(\)\.total &&\s*incoming\(\)\.customerNit == existing\(\)\.customerNit;/g,
  `allow update: if isOperator(userId) && 
                      isValidInvoice(incoming()) &&
                      existing().dianStatus != 'APPROVED' &&
                      isValidInvoiceTransition(existing(), incoming()) &&
                      incoming().id == existing().id &&
                      (
                         (existing().dianStatus in ['DRAFT', 'REJECTED']) || 
                         (existing().dianStatus == 'SENDING' && incoming().total == existing().total && incoming().customerNit == existing().customerNit)
                      );`
);

content = content.replace(
  /allow create: if isOwner\(userId\);/g,
  `allow create: if isOwner(userId);
      allow update: if isOwner(userId);`
);

fs.writeFileSync('firestore.rules', content);
