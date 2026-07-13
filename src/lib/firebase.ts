import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';

const devFirebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "zippy-solution-c7c1c",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:743855898049:web:ca50c3ef0413162c7ac340",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD2M1YY1BXpB7V7_RPDHuTaSLvxK3jsFQI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "zippy-solution-c7c1c.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "zippy-solution-c7c1c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "743855898049"
};

const prdFirebaseConfig = {
  projectId: import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID || "",
  appId: import.meta.env.VITE_PRD_FIREBASE_APP_ID || "",
  apiKey: import.meta.env.VITE_PRD_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_PRD_FIREBASE_AUTH_DOMAIN || "",
  storageBucket: import.meta.env.VITE_PRD_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_PRD_FIREBASE_MESSAGING_SENDER_ID || ""
};

export const devApp = getApps().find(app => app.name === 'dev') || initializeApp(devFirebaseConfig, 'dev');
export const devAuth = getAuth(devApp);
setPersistence(devAuth, browserLocalPersistence).catch(console.error);

let _prdApp;
let _prdAuth: Auth | null = null;
if (prdFirebaseConfig.projectId) {
  _prdApp = getApps().find(app => app.name === 'prd') || initializeApp(prdFirebaseConfig, 'prd');
  _prdAuth = getAuth(_prdApp);
  setPersistence(_prdAuth, browserLocalPersistence).catch(console.error);
}
export const prdApp = _prdApp;
export const prdAuth = _prdAuth;

export const googleProvider = new GoogleAuthProvider();

export function getAuthEnv(): 'dev' | 'prd' {
  // Always prefer production database when running in Vercel/Production
  if (import.meta.env.PROD && import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID) {
    if (!prdAuth) {
      console.error("CRITICAL: Running in production but VITE_PRD_FIREBASE_PROJECT_ID is not configured. Falling back to dev is disabled to prevent security issues.");
      // We still return 'prd' to force the UI to handle it as a production state, 
      // which will cause expected failures instead of silently writing to the dev database.
    }
    return 'prd';
  }

  if (typeof window !== 'undefined') {
    const env = localStorage.getItem('trakr_auth_env');
    if (env === 'prd' && prdAuth) return 'prd';
  }
  return 'dev';
}

export function setAuthEnv(env: 'dev' | 'prd') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('trakr_auth_env', env);
  }
}

export function getActiveAuth(): Auth {
  if (import.meta.env.PROD && import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID) {
    if (!prdAuth) {
       throw new Error("Production Firebase Database is not configured. Please set VITE_PRD_FIREBASE_PROJECT_ID and redeploy.");
    }
    return prdAuth;
  }
  return getAuthEnv() === 'prd' && prdAuth ? prdAuth : devAuth;
}

// Ensure auth is exported for compatibility with existing imports
export const auth = new Proxy({} as Auth, {
  get(target, prop, receiver) {
    const activeAuth = getActiveAuth();
    const value = Reflect.get(activeAuth, prop, receiver);
    return typeof value === 'function' ? value.bind(activeAuth) : value;
  }
});

// Initialize Firestore for Dev App
const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-pencatatkeuangan-b60ed876-789d-44d7-a761-8eef645626e0";
export const devDb = initializeFirestore(devApp, {
  experimentalForceLongPolling: true,
}, firestoreDatabaseId);

let _prdDb: Firestore | null = null;
if (prdApp) {
  const prdFirestoreDatabaseId = import.meta.env.VITE_PRD_FIREBASE_DATABASE_ID || "(default)";
  _prdDb = initializeFirestore(prdApp, {
    experimentalForceLongPolling: true,
  }, prdFirestoreDatabaseId);
}
export const prdDb = _prdDb;

export function getActiveDb(): Firestore {
  if (import.meta.env.PROD && import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID) {
    if (!prdDb) {
      throw new Error("Production Firebase Database is not configured. Please set VITE_PRD_FIREBASE_PROJECT_ID and redeploy.");
    }
    return prdDb;
  }
  return getAuthEnv() === 'prd' && prdDb ? prdDb : devDb;
}


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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const activeAuth = getActiveAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: activeAuth.currentUser?.uid,
      email: activeAuth.currentUser?.email,
      emailVerified: activeAuth.currentUser?.emailVerified,
      isAnonymous: activeAuth.currentUser?.isAnonymous,
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
    const activeDb = getAuthEnv() === 'prd' && prdDb ? prdDb : devDb;
    await getDocFromServer(doc(activeDb, 'test', 'connection'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline') || message.includes('unavailable') || message.includes('Could not reach')) {
      console.warn("Firestore connection check info (client is offline or backend is transiently unavailable):", message);
    } else {
      console.warn("Firestore connection test info:", message);
    }
  }
}
testConnection();
