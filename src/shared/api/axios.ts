// src/shared/api/axios.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4001',
});


export const AUTH_TOKEN_KEY = 'authToken';
export const AUTH_USER_KEY = 'authUser';


const FALLBACK_TOKEN_KEYS = [
  AUTH_TOKEN_KEY,
  'token',
  'accessToken',
  'access_token',
  'jwt',
] as const;

function normalizeToken(raw: string): string {
  let t = raw.trim();


  if (t.startsWith('"') && t.endsWith('"')) {
    try {
      t = JSON.parse(t) as string;
    } catch {

    }
  }


  if (t.toLowerCase().startsWith('bearer ')) {
    t = t.slice(7).trim();
  }

  return t;
}

function readFromStorage(key: string): string | null {
  const a = localStorage.getItem(key);
  if (a) return a;

  const b = sessionStorage.getItem(key);
  if (b) return b;

  return null;
}

export function readToken(): string | null {
  for (const key of FALLBACK_TOKEN_KEYS) {
    const v = readFromStorage(key);
    if (typeof v === 'string' && v.trim()) return v;
  }

  const rawUser = readFromStorage(AUTH_USER_KEY);
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser) as any;
      const t =
        parsed?.token ??
        parsed?.authToken ??
        parsed?.accessToken ??
        parsed?.access_token ??
        null;

      if (typeof t === 'string' && t.trim()) return t;
    } catch {

    }
  }

  return null;
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);

  localStorage.removeItem('token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('access_token');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('access_token');

  localStorage.removeItem(AUTH_USER_KEY);
}

api.interceptors.request.use(
  (config) => {
    const raw = readToken();
    if (raw) {
      const token = normalizeToken(raw);
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status as number | undefined;
    const payload = error?.response?.data ?? error;

    console.error('API Error:', payload);


    if (status === 401) {
      clearAuthSession();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }


    return Promise.reject(error);
  },
);

export default api;
