import axios from 'axios';
import {API_BASE_URL} from '../config/api';
import {storage} from '../utils/storage';
import {emitSessionExpired} from './sessionEvents';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {'Content-Type': 'application/json'},
});

api.interceptors.request.use(async config => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async error => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || '');
    // Wrong password / guest auth routes return 401 — do NOT wipe session logic for those.
    const isAuthAttempt =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/google') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    if (status === 401 && !isAuthAttempt) {
      try {
        const token = await storage.getToken();
        if (token) {
          await storage.clear();
          emitSessionExpired();
        }
      } catch {
        // ignore
      }
    }
    return Promise.reject(error);
  },
);

export default api;
