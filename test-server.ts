import axios from 'axios';
import { adminAuthDev } from './src/lib/firebase-admin.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const token = await adminAuthDev.createCustomToken('testUser');
    const authRes = await axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + process.env.VITE_FIREBASE_API_KEY, {token, returnSecureToken: true});
    const idToken = authRes.data.idToken;
    const res = await axios.post('http://0.0.0.0:3000/api/transactions', {
      type: 'pemasukan',
      amount: 1000,
      category: 'Gaji',
      subcategory: 'Bulanan',
      date: '2026-07-15'
    }, {
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
