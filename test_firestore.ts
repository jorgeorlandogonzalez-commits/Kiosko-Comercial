import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const app = admin.initializeApp({ projectId: "test" });
const db = getFirestore(app, "my-db");
