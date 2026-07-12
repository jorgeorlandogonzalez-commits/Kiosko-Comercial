import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "ai-studio-745f93d7-7ad5-4ca5-ac57-45443e5e4b15" // Use the actual DB from metadata
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function main() {
  try {
    const user = await auth.getUserByEmail('info.empresasaliat@gmail.com');
    console.log("Auth User ID:", user.uid);
    
    // Check their subscription
    const sub = await db.collection('subscriptions').doc(user.uid).get();
    console.log("Subscription:", sub.data());
    
    // Check if they have an operator doc
    const operator = await db.collection('users').doc(user.uid).collection('operators').doc(user.uid).get();
    console.log("Operator Data:", operator.data());
    
  } catch(e) {
    console.error(e);
  }
}
main();
