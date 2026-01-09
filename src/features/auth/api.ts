// src/features/auth/api.ts
import api from '@/shared/api/axios';

// ✅ ключі (і сумісність зі старими)
export const AUTH_TOKEN_KEY = 'authToken';
export const LEGACY_TOKEN_KEY = 'token';

// ✅ додаткові “популярні” ключі, щоб /set-password точно знайшов токен
export const ACCESS_TOKEN_KEY = 'accessToken';
export const ACCESS_TOKEN_SNAKE_KEY = 'access_token';
export const JWT_KEY = 'jwt';

// 🔹 password опціональний — для owner можна робити перший логін лише по email
export type LoginPayload = {
  email: string;
  password?: string;
};

export type LoginUser = {
  id: number;
  email: string;
  role: 'admin' | 'doctor' | 'owner';
  ownerId?: number | null;
  doctorId?: number | null;
  mustChangePassword?: boolean;
};

export type LoginResponse = {
  token: string;
  mustChangePassword: boolean;
  requiresPasswordSetup?: boolean;
  user: LoginUser;
};

function cleanToken(raw: string): string {
  let t = raw.trim();

  if (t.toLowerCase().startsWith('bearer ')) t = t.slice(7).trim();

  // якщо раптом прийшло як JSON-рядок з лапками
  if (t.startsWith('"') && t.endsWith('"')) {
    try {
      t = JSON.parse(t) as string;
    } catch {
      // ignore
    }
  }

  return t;
}

const TOKEN_KEYS = [
  AUTH_TOKEN_KEY,
  LEGACY_TOKEN_KEY,
  ACCESS_TOKEN_KEY,
  ACCESS_TOKEN_SNAKE_KEY,
  JWT_KEY,
] as const;

function saveToken(token: string): void {
  const t = cleanToken(token);
  for (const k of TOKEN_KEYS) {
    localStorage.setItem(k, t);
    // на всяк випадок — ще й sessionStorage
    sessionStorage.setItem(k, t);
  }
}

function readTokenFromStorage(): string {
  for (const k of TOKEN_KEYS) {
    const v1 = sessionStorage.getItem(k);
    if (typeof v1 === 'string' && v1.trim()) return cleanToken(v1);

    const v2 = localStorage.getItem(k);
    if (typeof v2 === 'string' && v2.trim()) return cleanToken(v2);
  }
  return '';
}

function pickToken(data: any): string | null {
  const tokenRaw =
    data?.token ??
    data?.authToken ??
    data?.accessToken ??
    data?.access_token ??
    data?.jwt ??
    null;

  return typeof tokenRaw === 'string' && tokenRaw.trim() ? tokenRaw : null;
}

function normalizeLoginResponse(data: any): LoginResponse {
  const token = pickToken(data) ?? '';

  const user = (data?.user ?? null) as LoginUser | null;
  if (!user) {
    throw new Error('Login response: user is missing');
  }

  const mustChangePassword =
    Boolean(data?.mustChangePassword) ||
    Boolean(data?.requiresPasswordSetup) ||
    Boolean(user?.mustChangePassword);

  return {
    token,
    mustChangePassword,
    requiresPasswordSetup: Boolean(data?.requiresPasswordSetup),
    user,
  };
}

// 🔹 Логін
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const body =
    payload.password && payload.password.trim().length > 0
      ? payload
      : { email: payload.email };

  const { data } = await api.post('/auth/login', body);

  const normalized = normalizeLoginResponse(data);

  if (normalized.token) {
    saveToken(normalized.token);
  }

  return normalized;
}

// ================== SET PASSWORD (після першого входу) ==================

export type SetPasswordPayload = {
  newPassword: string;
  token?: string;
};

export type SetPasswordResponse = LoginResponse;

export async function setPassword(
  payload: SetPasswordPayload,
): Promise<SetPasswordResponse> {
  // ✅ беремо токен або з payload, або з storage (усі ключі)
  const token = cleanToken(payload.token ?? readTokenFromStorage());

  const { data } = await api.post(
    '/auth/set-password',
    { newPassword: payload.newPassword, token: token || undefined },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );

  const normalized = normalizeLoginResponse(data);

  if (normalized.token) {
    saveToken(normalized.token);
  }

  return normalized;
}

// ✅ АЛІАС під твій імпорт у set-password.tsx
export async function setFirstPassword(
  payload: SetPasswordPayload,
): Promise<SetPasswordResponse> {
  return setPassword(payload);
}
