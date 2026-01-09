// src/features/auth/AuthContext.tsx
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from './types';

type AuthState = {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const AUTH_USER_KEY = 'authUser';
const TOKEN_KEY = 'token';

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const login = (next: AuthUser): void => {
    setUser(next);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
    // ✅ токен зберігаємо окремо в LoginPage (localStorage.setItem('token', ...))
  };

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(TOKEN_KEY); // ✅ важливо: саме 'token'
    // (опційно) якщо колись десь було по-іншому — прибираємо теж
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authToken');
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      'useAuth має використовуватися всередині <AuthProvider />',
    );
  }
  return ctx;
}
