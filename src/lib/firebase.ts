import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "zippy-solution-c7c1c",
  appId: "1:743855898049:web:ca50c3ef0413162c7ac340",
  apiKey: "AIzaSyD2M1YY1BXpB7V7_RPDHuTaSLvxK3jsFQI",
  authDomain: "zippy-solution-c7c1c.firebaseapp.com",
  storageBucket: "zippy-solution-c7c1c.firebasestorage.app",
  messagingSenderId: "743855898049"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set auth persistence:", err);
});

export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with specific database ID and enable robust long-polling for iframe/sandbox compatibility
const firestoreDatabaseId = "ai-studio-pencatatkeuangan-b60ed876-789d-44d7-a761-8eef645626e0";
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore per guidelines
async function testConnection() {
  try {
    // Attempting a server read to test connection validity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Gracefully handle connection issues so they don't crash or trigger global error alerts in the sandbox
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline') || message.includes('unavailable') || message.includes('Could not reach')) {
      console.warn("Firestore connection check info (client is offline or backend is transiently unavailable):", message);
    } else {
      console.warn("Firestore connection test info:", message);
    }
  }
}
testConnection();
