import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { AsyncLocalStorage } from 'node:async_hooks';

dotenv.config();

export const authContext = new AsyncLocalStorage<{ token: string }>();

function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const res: any = {};
    const fields = val.mapValue.fields || {};
    for (const k of Object.keys(fields)) {
      res[k] = fromFirestoreValue(fields[k]);
    }
    return res;
  }
  if ('nullValue' in val) return null;
  return val;
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: any = {};
    for (const k of Object.keys(val)) {
      fields[k] = toFirestoreValue(val[k]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

class MockCollection {
  constructor(public db: MockDb, public path: string) {}

  doc(id?: string) {
    const finalId = id || Math.random().toString(36).substring(2, 15);
    return new MockDocument(this.db, `${this.path}/${finalId}`, finalId);
  }

  async get() {
    return this.db.restGetCollection(this.path);
  }

  async add(data: any) {
    const id = Math.random().toString(36).substring(2, 15);
    const docRef = this.doc(id);
    await docRef.set(data);
    return { id };
  }
}

class MockDocument {
  constructor(public db: MockDb, public path: string, public id: string) {}

  collection(subPath: string) {
    return new MockCollection(this.db, `${this.path}/${subPath}`);
  }

  async get() {
    return this.db.restGetDoc(this.path, this.id);
  }

  async set(data: any, options?: { merge?: boolean }) {
    return this.db.restSetDoc(this.path, data, options);
  }

  async delete() {
    return this.db.restDeleteDoc(this.path);
  }
}

class MockBatch {
  private writes: (() => Promise<void>)[] = [];

  set(docRef: any, data: any) {
    this.writes.push(() => docRef.set(data));
  }

  async commit() {
    await Promise.all(this.writes.map(w => w()));
  }
}

class MockDb {
  constructor(private token: string, private projectId: string, private databaseId: string) {}

  collection(path: string) {
    return new MockCollection(this, path);
  }

  batch() {
    return new MockBatch();
  }

  async restGetCollection(path: string) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${path}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (!res.ok) {
      if (res.status === 404) return { size: 0, docs: [] };
      const text = await res.text();
      throw new Error(`Firestore REST GET collection failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    const docs = (data.documents || []).map((doc: any) => {
      const parts = doc.name.split('/');
      const id = parts[parts.length - 1];
      const fields: any = {};
      const docFields = doc.fields || {};
      for (const k of Object.keys(docFields)) {
        fields[k] = fromFirestoreValue(docFields[k]);
      }
      return {
        id,
        data: () => fields,
        ...fields
      };
    });
    return {
      size: docs.length,
      docs
    };
  }

  async restGetDoc(path: string, id: string) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${path}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (res.status === 404) {
      return {
        exists: false,
        id,
        data: () => null
      };
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firestore REST GET doc failed: ${res.status} ${text}`);
    }
    const doc = await res.json();
    const fields: any = {};
    const docFields = doc.fields || {};
    for (const k of Object.keys(docFields)) {
      fields[k] = fromFirestoreValue(docFields[k]);
    }
    return {
      exists: true,
      id,
      data: () => fields,
      ...fields
    };
  }

  async restSetDoc(path: string, data: any, options: any) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${path}`;
    const fields: any = {};
    for (const k of Object.keys(data)) {
      fields[k] = toFirestoreValue(data[k]);
    }
    const body: any = { fields };
    let queryParams = '';
    if (options?.merge) {
      const fieldPaths = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
      queryParams = `?${fieldPaths}`;
    }
    const res = await fetch(`${url}${queryParams}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firestore REST SET doc failed: ${res.status} ${text}`);
    }
    return await res.json();
  }

  async restDeleteDoc(path: string) {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/${this.databaseId}/documents/${path}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Firestore REST DELETE doc failed: ${res.status} ${text}`);
    }
    return true;
  }
}

let projectId: string | undefined = process.env.VITE_FIREBASE_PROJECT_ID;
let databaseId: string | undefined = process.env.VITE_FIREBASE_DATABASE_ID;

try {
  const configPath = join(process.cwd(), 'firebase-applet-config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!projectId) {
    projectId = config.projectId;
  }
  if (!databaseId) {
    databaseId = config.firestoreDatabaseId;
  }
} catch (e) {
  // Fallback if file not found
}

// Fallback default from our config if none found
if (!projectId) {
  projectId = 'zippy-solution-c7c1c';
}

function getFirebaseCredential(env: 'dev' | 'prd') {
  const envVarName = env === 'prd' ? 'FIREBASE_SERVICE_ACCOUNT_PRD' : 'FIREBASE_SERVICE_ACCOUNT_DEV';
  const fallbackEnvVarName = 'FIREBASE_SERVICE_ACCOUNT';
  const saString = process.env[envVarName] || process.env[fallbackEnvVarName];

  console.log(`[Firebase Admin - ${env}] Resolving credentials. Key source: ${process.env[envVarName] ? envVarName : (process.env[fallbackEnvVarName] ? fallbackEnvVarName : 'None')}`);

  if (saString) {
    let cleanSaString = saString.trim();
    console.log(`[Firebase Admin - ${env}] Found Service Account string of length ${cleanSaString.length}. Starts with: "${cleanSaString.substring(0, 10)}..."`);
    
    // Strip surrounding quotes if present
    if (cleanSaString.startsWith('"') && cleanSaString.endsWith('"')) {
      cleanSaString = cleanSaString.slice(1, -1);
      console.log(`[Firebase Admin - ${env}] Stripped surrounding double quotes.`);
    } else if (cleanSaString.startsWith("'") && cleanSaString.endsWith("'")) {
      cleanSaString = cleanSaString.slice(1, -1);
      console.log(`[Firebase Admin - ${env}] Stripped surrounding single quotes.`);
    }
    
    try {
      const serviceAccount = JSON.parse(cleanSaString);
      if (serviceAccount.private_key) {
        // Ensure private key has actual newlines
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      console.log(`[Firebase Admin - ${env}] Successfully parsed JSON service account for project: ${serviceAccount.project_id}`);
      return cert(serviceAccount);
    } catch (e: any) {
      console.error(`[Firebase Admin - ${env}] Failed to parse JSON string. Error: ${e.message}`);
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

  console.log(`[Firebase Admin - ${env}] Checking individual env vars. PrivateKey: ${privateKey ? 'Found' : 'Missing'}, ClientEmail: ${clientEmail ? 'Found' : 'Missing'}, ProjectId: ${projId}`);

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

    console.log(`[Firebase Admin - ${env}] Created credential using individual environment variables for project: ${projId}`);
    return cert({
      projectId: projId,
      clientEmail: clientEmail,
      privateKey: formattedKey
    });
  }

  console.warn(`[Firebase Admin - ${env}] No custom credentials found. Falling back to Application Default Credentials.`);
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

export const firestoreDev = databaseId ? getFirestore(devApp, databaseId) : getFirestore(devApp);
export const firestorePrd = prdApp ? (process.env.VITE_PRD_FIREBASE_DATABASE_ID ? getFirestore(prdApp, process.env.VITE_PRD_FIREBASE_DATABASE_ID) : getFirestore(prdApp)) : null;

export function getFirestoreDb(authEnv: 'dev' | 'prd') {
  const store = authContext.getStore();
  const token = store?.token;

  if (authEnv === 'dev' && token && !devCredential) {
    console.log(`[Firebase Admin - dev] Using authenticated user REST client fallback for database: ${databaseId}`);
    return new MockDb(token, projectId || 'zippy-solution-c7c1c', databaseId || 'ai-studio-pencatatkeuangan-b60ed876-789d-44d7-a761-8eef645626e0') as any;
  }

  if (authEnv === 'prd' && token && !prdCredential) {
    const prdDbId = process.env.VITE_PRD_FIREBASE_DATABASE_ID || '(default)';
    console.log(`[Firebase Admin - prd] Using authenticated user REST client fallback for database: ${prdDbId}`);
    return new MockDb(token, prdProjectId || 'trakr-10674', prdDbId) as any;
  }

  if (authEnv === 'prd' && firestorePrd) {
    return firestorePrd;
  }
  return firestoreDev;
}
