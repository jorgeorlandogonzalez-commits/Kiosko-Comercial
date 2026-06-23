
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

const checkStorage = () => {
  if (!storage) {
    throw new Error("El servicio de almacenamiento (Firebase Storage) no está disponible en este proyecto. Por favor, asegúrate de haberlo activado en la consola de Firebase.");
  }
};

/**
 * Sube un archivo a Firebase Storage en una ruta específica.
 * @param userId - ID del usuario (para aislamiento de datos)
 * @param folder - Carpeta destino (ej: 'certificates', 'logos', 'products')
 * @param fileName - Nombre del archivo
 * @param file - Objeto File de Blob
 */
export const uploadFile = async (userId: string, folder: string, fileName: string, file: File | Blob): Promise<string> => {
  checkStorage();
  const storageRef = ref(storage!, `users/${userId}/${folder}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

/**
 * Elimina un archivo de Firebase Storage.
 */
export const deleteFile = async (userId: string, folder: string, fileName: string): Promise<void> => {
  checkStorage();
  const storageRef = ref(storage!, `users/${userId}/${folder}/${fileName}`);
  await deleteObject(storageRef);
};

/**
 * Obtiene la URL de descarga de un archivo.
 */
export const getFileUrl = async (userId: string, folder: string, fileName: string): Promise<string> => {
  checkStorage();
  const storageRef = ref(storage!, `users/${userId}/${folder}/${fileName}`);
  return await getDownloadURL(storageRef);
};
