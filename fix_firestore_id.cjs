const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr1 = `const subSnap = await admin.firestore().collection("subscriptions").doc(uid).get();`;
const replacementStr1 = `const subSnap = await admin.firestore(admin.app(), "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15").collection("subscriptions").doc(uid).get();`;

const targetStr2 = `const profileSnap = await admin.firestore().collection("users").doc(uid).get();`;
const replacementStr2 = `const profileSnap = await admin.firestore(admin.app(), "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15").collection("users").doc(uid).get();`;

if (content.includes(targetStr1)) {
  content = content.replace(targetStr1, replacementStr1);
  content = content.replace(targetStr2, replacementStr2);
  fs.writeFileSync('server.ts', content);
  console.log("Replaced successfully.");
} else {
  console.log("Could not find target strings.");
}
