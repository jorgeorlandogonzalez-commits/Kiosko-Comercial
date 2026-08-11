const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  /match \/invoices_queue\/\{queueId\} \{\s*allow read, write: if isOperator\(userId\) && isValidId\(queueId\);\s*\}/,
  `match /invoices_queue/{queueId} {
        allow read: if isOperator(userId);
        allow write: if isOperator(userId) && isValidId(queueId);
      }`
);

content = content.replace(
  /match \/data\/\{documentId\} \{\s*allow read, write: if isOperator\(userId\) && isValidId\(documentId\);\s*\}/,
  `match /data/{documentId} {
        allow read: if isOperator(userId);
        allow write: if isOperator(userId) && isValidId(documentId);
      }`
);

fs.writeFileSync('firestore.rules', content);
