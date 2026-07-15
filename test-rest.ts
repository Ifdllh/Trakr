import { adminAuthDev } from './src/lib/firebase-admin.js';
import * as dotenv from 'dotenv';
dotenv.config();

const databaseId = 'ai-studio-pencatatkeuangan-b60ed876-789d-44d7-a761-8eef645626e0';
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'zippy-solution-c7c1c';

async function run() {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/test/transactions/123`;
  const body = {
    fields: {
      type: { stringValue: 'pemasukan' },
      amount: { integerValue: "1000" },
      category: { stringValue: 'Gaji' },
      subcategory: { stringValue: 'Bulanan' },
      date: { stringValue: '2026-07-15' },
      createdAt: { stringValue: '2026-07-15' }
    }
  };
  
  console.log("Req:", JSON.stringify(body));
}
run();
