import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';

const app = initializeApp({
  projectId: "zippy-solution-c7c1c",
  appId: "1:743855898049:web:ca50c3ef0413162c7ac340",
  apiKey: "AIzaSyD2M1YY1BXpB7V7_RPDHuTaSLvxK3jsFQI",
  authDomain: "zippy-solution-c7c1c.firebaseapp.com",
});
const auth = getAuth(app);
signInAnonymously(auth).then(async user => {
  const token = await user.user.getIdToken();
  const res = await fetch("http://localhost:3000/api/reports/gold-price", {
    headers: { Authorization: "Bearer " + token }
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}).catch(e => console.error(e.message));
