const admin = require('firebase-admin');

// Ensure we have access to process.env.FIREBASE_CONFIG or use application default credentials
admin.initializeApp();

const db = admin.firestore();

async function check() {
  const usersSnapshot = await db.collection('users').where('email', '==', 'info.empresasaliat@gmail.com').get();
  
  if (usersSnapshot.empty) {
    console.log("No user found.");
    return;
  }
  
  const userId = usersSnapshot.docs[0].id;
  console.log("Found user ID:", userId);
  
  const subDoc = await db.collection('subscriptions').doc(userId).get();
  if (!subDoc.exists) {
    console.log("Subscription document DOES NOT EXIST.");
  } else {
    console.log("Subscription document exists:", subDoc.data());
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
