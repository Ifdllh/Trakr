import axios from 'axios';
async function run() {
  try {
    const res = await axios.post('http://0.0.0.0:3000/api/transactions', {
      type: 'pemasukan',
      amount: 1000,
      category: 'Gaji',
      subcategory: 'Bulanan',
      date: '2026-07-15'
    }, {
      headers: {
        'Authorization': 'Bearer ' + await require('./src/lib/firebase-admin').adminAuthDev.createCustomToken('testUser').then(t => axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=' + process.env.VITE_FIREBASE_API_KEY, {token: t, returnSecureToken: true}).then(r => r.data.idToken))
      }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
run();
