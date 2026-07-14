import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

let projectId: string | undefined = process.env.VITE_FIREBASE_PROJECT_ID;

if (!projectId) {
  try {
    const configPath = join(process.cwd(), 'firebase-applet-config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    projectId = config.projectId;
  } catch (e) {
    // Fallback if file not found
  }
}

// Fallback default from our config if none found
if (!projectId) {
  projectId = 'zippy-solution-c7c1c';
}

function getFirebaseCredential(env: 'dev' | 'prd') {
  // Check for JSON string
  const envVarName = env === 'prd' ? 'FIREBASE_SERVICE_ACCOUNT_PRD' : 'FIREBASE_SERVICE_ACCOUNT_DEV';
  const fallbackEnvVarName = 'FIREBASE_SERVICE_ACCOUNT';
  const saString = process.env[envVarName] || process.env[fallbackEnvVarName];

  if (saString) {
    let cleanSaString = saString.trim();
    // Strip surrounding quotes if present
    if (cleanSaString.startsWith('"') && cleanSaString.endsWith('"')) {
      cleanSaString = cleanSaString.slice(1, -1);
    }
    if (cleanSaString.startsWith("'") && cleanSaString.endsWith("'")) {
      cleanSaString = cleanSaString.slice(1, -1);
    }
    
    try {
      const serviceAccount = JSON.parse(cleanSaString);
      if (serviceAccount.private_key) {
        // Ensure private key has actual newlines
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      return cert(serviceAccount);
    } catch (e: any) {
      console.error(`Failed to parse ${envVarName} JSON. Falling back:`, e.message);
    }
  }

  // Check for individual env variables
  let privateKey = env === 'prd'
    ? (process.env.FIREBASE_PRIVATE_KEY_PRD || process.env.FIREBASE_PRIVATE_KEY)
    : (process.env.FIREBASE_PRIVATE_KEY_DEV || process.env.FIREBASE_PRIVATE_KEY);
  let clientEmail = env === 'prd'
    ? (process.env.FIREBASE_CLIENT_EMAIL_PRD || process.env.FIREBASE_CLIENT_EMAIL)
    : (process.env.FIREBASE_CLIENT_EMAIL_DEV || process.env.FIREBASE_CLIENT_EMAIL);
  const projId = env === 'prd'
    ? (process.env.VITE_PRD_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || projectId)
    : (process.env.VITE_FIREBASE_PROJECT_ID || projectId);

  if (privateKey && clientEmail && projId) {
    // Clean private key
    privateKey = privateKey.trim();
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
      privateKey = privateKey.slice(1, -1);
    }
    
    let formattedKey = privateKey.replace(/\\n/g, '\n');
    
    // Ensure PEM header/footer are correct
    if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}`;
    }
    if (!formattedKey.includes('-----END PRIVATE KEY-----')) {
      formattedKey = `${formattedKey}\n-----END PRIVATE KEY-----`;
    }

    // Clean client email
    clientEmail = clientEmail.trim();
    if (clientEmail.startsWith('"') && clientEmail.endsWith('"')) {
      clientEmail = clientEmail.slice(1, -1);
    }
    if (clientEmail.startsWith("'") && clientEmail.endsWith("'")) {
      clientEmail = clientEmail.slice(1, -1);
    }

    return cert({
      projectId: projId,
      clientEmail: clientEmail,
      privateKey: formattedKey
    });
  }

  // Fallback to Application Default Credentials (ADC) in AI Studio
  return undefined;
}

let devApp;
let prdApp;

const devCredential = getFirebaseCredential('dev');
if (!getApps().find(app => app.name === 'dev')) {
  const devOpts: any = {
    projectId: projectId,
  };
  if (devCredential) {
    devOpts.credential = devCredential;
  }
  devApp = initializeApp(devOpts, 'dev');
} else {
  devApp = getApps().find(app => app.name === 'dev');
}

const prdProjectId = process.env.VITE_PRD_FIREBASE_PROJECT_ID;
const prdCredential = getFirebaseCredential('prd');
if (prdProjectId && !getApps().find(app => app.name === 'prd')) {
  const prdOpts: any = {
    projectId: prdProjectId,
  };
  if (prdCredential) {
    prdOpts.credential = prdCredential;
  }
  prdApp = initializeApp(prdOpts, 'prd');
} else {
  prdApp = getApps().find(app => app.name === 'prd');
}

export const adminAuthDev = getAuth(devApp);
export const adminAuthPrd = prdApp ? getAuth(prdApp) : null;

export const firestoreDev = getFirestore(devApp);
export const firestorePrd = prdApp ? getFirestore(prdApp) : null;

export function getFirestoreDb(authEnv: 'dev' | 'prd') {
  if (authEnv === 'prd' && firestorePrd) {
    return firestorePrd;
  }
  return firestoreDev;
}
