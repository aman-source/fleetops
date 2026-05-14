import axios from 'axios';
import { storage } from './storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = storage.getString('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = storage.getString('refreshToken');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          storage.set('accessToken', data.data.tokens.accessToken);
          storage.set('refreshToken', data.data.tokens.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.data.tokens.accessToken}`;
          return api(error.config);
        } catch {
          storage.delete('accessToken');
          storage.delete('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  },
);

export function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data;
}
