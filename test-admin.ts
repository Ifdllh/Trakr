import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';
const app = initializeApp({ projectId: firebaseConfig.projectId }, 'dev');
console.log("App initialized");
const db = getFirestore(app);
console.log("Firestore initialized");
