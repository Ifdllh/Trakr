import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserSessionPersistence, Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const devFirebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || "zippy-solution-c7c1c",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || "1:743855898049:web:ca50c3ef0413162c7ac340",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey || "AIzaSyD2M1YY1BXpB7V7_RPDHuTaSLvxK3jsFQI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || "zippy-solution-c7c1c.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || "zippy-solution-c7c1c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || "743855898049"
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
setPersistence(devAuth, browserSessionPersistence).catch(() => {});

let _prdApp;
let _prdAuth: Auth | null = null;
if (prdFirebaseConfig.projectId) {
  _prdApp = getApps().find(app => app.name === 'prd') || initializeApp(prdFirebaseConfig, 'prd');
  _prdAuth = getAuth(_prdApp);
  setPersistence(_prdAuth, browserSessionPersistence).catch(() => {});
}
export const prdApp = _prdApp;
export const prdAuth = _prdAuth;

export const googleProvider = new GoogleAuthProvider();

export function getAuthEnv(): 'dev' | 'prd' {
  const isDevPreview = typeof window !== 'undefined' && (
    window.location.hostname.includes('ais-dev') || 
    window.location.hostname.includes('ais-pre') || 
    window.location.hostname.startsWith('ais-') ||
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('googleusercontent.com') ||
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1')
  );

  // Always prefer production database when running in Vercel/Production
  if (!isDevPreview && import.meta.env.PROD && import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID) {
    if (!prdAuth) {

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
  const isDevPreview = typeof window !== 'undefined' && (
    window.location.hostname.includes('ais-dev') || 
    window.location.hostname.includes('ais-pre') || 
    window.location.hostname.startsWith('ais-') ||
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('googleusercontent.com') ||
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1')
  );

  if (!isDevPreview && import.meta.env.PROD && import.meta.env.VITE_PRD_FIREBASE_PROJECT_ID) {
    if (!prdAuth) {
       throw new Error("Production Firebase Database is not configured. Please set VITE_PRD_FIREBASE_PROJECT_ID and redeploy.");
    }
    return prdAuth;
  }
  return getAuthEnv() === 'prd' && prdAuth ? prdAuth : devAuth;
}

// Ensure auth is exported for compatibility with existing imports
export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    const activeAuth = getActiveAuth();
    const value = Reflect.get(activeAuth, prop);
    return typeof value === 'function' ? value.bind(activeAuth) : value;
  }
});

// Configure client-side Firestore database with multi-tab offline persistence enabled
export const devDb = initializeFirestore(devApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalAutoDetectLongPolling: true
}, firebaseAppletConfig.firestoreDatabaseId || "(default)");

export const prdDb = prdApp ? initializeFirestore(prdApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalAutoDetectLongPolling: true
}) : null;

export function getActiveDb(): Firestore {
  return getAuthEnv() === 'prd' && prdDb ? prdDb : devDb;
}

