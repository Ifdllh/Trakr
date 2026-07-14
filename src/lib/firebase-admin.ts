import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import * as dotenv from 'dotenv';

dotenv.config();

let devApp;
let prdApp;

if (!getApps().find(app => app.name === 'dev')) {
  devApp = initializeApp({
    projectId: firebaseConfig.projectId,
  }, 'dev');
} else {
  devApp = getApps().find(app => app.name === 'dev');
}

if (process.env.VITE_PRD_FIREBASE_PROJECT_ID && !getApps().find(app => app.name === 'prd')) {
  prdApp = initializeApp({
    projectId: process.env.VITE_PRD_FIREBASE_PROJECT_ID,
  }, 'prd');
} else {
  prdApp = getApps().find(app => app.name === 'prd');
}

export const adminAuthDev = getAuth(devApp);
export const adminAuthPrd = prdApp ? getAuth(prdApp) : null;
