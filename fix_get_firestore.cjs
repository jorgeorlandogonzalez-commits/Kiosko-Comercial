const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetImport = `import admin from "firebase-admin";`;
const insertImport = `import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";`;

if (content.includes(targetImport) && !content.includes(`import { getFirestore }`)) {
  content = content.replace(targetImport, insertImport);
}

content = content.replace(/admin\.firestore\(admin\.app\(\),\s*"ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15"\)/g, 'getFirestore(admin.app(), "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15")');

fs.writeFileSync('server.ts', content);
console.log("Fixed");
