import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, 'backend@kiosko.com', 'KioskoSaaS123!');
    console.log('Created backend user:', cred.user.uid);
  } catch (e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
run();
