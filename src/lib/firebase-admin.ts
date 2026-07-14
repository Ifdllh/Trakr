import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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

let devApp;
let prdApp;

if (!getApps().find(app => app.name === 'dev')) {
  devApp = initializeApp({
    projectId: projectId,
  }, 'dev');
} else {
  devApp = getApps().find(app => app.name === 'dev');
}

const prdProjectId = process.env.VITE_PRD_FIREBASE_PROJECT_ID;
if (prdProjectId && !getApps().find(app => app.name === 'prd')) {
  prdApp = initializeApp({
    projectId: prdProjectId,
  }, 'prd');
} else {
  prdApp = getApps().find(app => app.name === 'prd');
}

export const adminAuthDev = getAuth(devApp);
export const adminAuthPrd = prdApp ? getAuth(prdApp) : null;
