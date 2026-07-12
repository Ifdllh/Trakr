import axios from 'axios';
import { auth } from './firebase';

export const api = axios.create({
  baseURL: '/api',
});

// Request interceptor to attach Firebase ID Token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      config.headers = { Authorization: `Bearer ${token}` } as any;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
