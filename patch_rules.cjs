const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

content = content.replace(
  /\(oldData\.dianStatus == 'DRAFT' && \(newData\.dianStatus == 'SENDING' \|\| newData\.dianStatus == 'REJECTED'\)\)/g,
  `(oldData.dianStatus == 'DRAFT' && (newData.dianStatus == 'SENDING' || newData.dianStatus == 'REJECTED' || newData.dianStatus == 'APPROVED'))`
);

fs.writeFileSync('firestore.rules', content);
