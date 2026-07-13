import axios from 'axios';
import { getActiveAuth, getAuthEnv } from './firebase';

export const api = axios.create({
  baseURL: '/api',
});

// Request interceptor to attach Firebase ID Token
api.interceptors.request.use(async (config) => {
  const auth = getActiveAuth();
  const user = auth?.currentUser;
  
  if (user) {
    const token = await user.getIdToken();
    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Auth-Env'] = getAuthEnv();
    } else {
      config.headers = { 
        Authorization: `Bearer ${token}`,
        'X-Auth-Env': getAuthEnv()
      } as any;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
