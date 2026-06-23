import { collection, doc, setDoc, onSnapshot, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Mostramos un mensaje amigable al usuario en la consola pero lanzamos el error técnico para AIS
  throw new Error(JSON.stringify(errInfo));
}

// Helper para obtener una clave de localStorage aislada por usuario
const getScopedKey = (userId: string, key: string) => {
  if (!userId) return key;
  if (key.includes(userId)) return key;
  return `kiosko_${userId}_${key.replace('kiosko_', '')}`;
};

// Helper para sincronizar una colección de Firestore con localStorage
export const syncCollection = <T extends { id: string }>(
  userId: string,
  collectionName: string,
  localStorageKey: string,
  onUpdate: () => void
) => {
  if (!userId || !auth.currentUser) return () => {};

  const colPath = `users/${userId}/${collectionName}`;
  const colRef = collection(db, colPath);
  
  const unsubscribe = onSnapshot(colRef, (snapshot) => {
    const data: T[] = [];
    snapshot.forEach((doc) => {
      data.push(doc.data() as T);
    });
    
    // Guardar en localStorage de forma aislada
    const activeKey = getScopedKey(userId, localStorageKey);
    localStorage.setItem(activeKey, JSON.stringify(data));
    
    // Notificar a la app para que recargue
    onUpdate();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, colPath);
  });

  return unsubscribe;
};

// Helper para guardar un documento en Firestore (colección)
export const saveToFirestore = async <T extends { id: string }>(
  userId: string,
  collectionName: string,
  item: T
) => {
  if (!userId || !auth.currentUser) return;
  const docPath = `users/${userId}/${collectionName}/${item.id}`;
  try {
    const docRef = doc(db, `users/${userId}/${collectionName}`, item.id);
    await setDoc(docRef, item, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
};

// Helper para guardar un arreglo completo (útil para configuraciones o arrays pequeños)
export const saveArrayToFirestore = async <T>(
  userId: string,
  documentName: string,
  data: T[]
) => {
  if (!userId || !auth.currentUser) return;
  const docPath = `users/${userId}/data/${documentName}`;
  try {
    const docRef = doc(db, `users/${userId}/data`, documentName);
    await setDoc(docRef, { items: data }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
};

// Helper para sincronizar un documento que contiene un array
export const syncArrayDocument = <T>(
  userId: string,
  documentName: string,
  localStorageKey: string,
  onUpdate: () => void
) => {
  if (!userId || !auth.currentUser) return () => {};

  const docPath = `users/${userId}/data/${documentName}`;
  const docRef = doc(db, docPath);
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data().items as T[];
      const activeKey = getScopedKey(userId, localStorageKey);
      localStorage.setItem(activeKey, JSON.stringify(data || []));
      onUpdate();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, docPath);
  });

  return unsubscribe;
};
