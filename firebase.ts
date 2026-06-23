import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Inicializar Firestore con persistencia offline moderna
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Inicializar Google Analytics de manera segura/defensiva (compatible con iframes y sandboxes)
export let analytics: any = null;
isSupported().then((supported) => {
  if (supported && firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn("Google Analytics failed to initialize:", e);
    }
  }
}).catch(() => {});

// Inicialización defensiva de Storage para evitar fallos si el servicio no está activo en el proyecto
let storageInstance;
try {
  if (firebaseConfig.storageBucket) {
    storageInstance = getStorage(app);
  } else {
    console.warn("Firebase Storage: No storageBucket defined in config.");
  }
} catch (error) {
  console.error("Firebase Storage: Service not available or could not be initialized.", error);
}

export const storage = storageInstance;
