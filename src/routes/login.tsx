// src/routes/login.tsx
import { createFileRoute, useRouter } from '@tanstack/react-router';
import type { JSX, FormEvent } from 'react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { login, type LoginResponse } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthContext';

function cleanToken(raw: string): string {
  let t = raw.trim();
  if (t.toLowerCase().startsWith('bearer ')) t = t.slice(7).trim();

  if (t.startsWith('"') && t.endsWith('"')) {
    try {
      t = JSON.parse(t) as string;
    } catch {

    }
  }
  return t;
}

type AppRole = 'admin' | 'doctor' | 'owner' | 'creator';

function normalizeRole(roleRaw: unknown): AppRole | null {
  const r = String(roleRaw ?? '').toLowerCase();
  if (r === 'admin' || r === 'doctor' || r === 'owner' || r === 'creator') return r;
  return null;
}

function getHomeByRole(roleRaw: unknown): string {
  const role = normalizeRole(roleRaw);

  switch (role) {
    case 'admin':
      return '/admin';
    case 'doctor':
      return '/doctor';
    case 'owner':
      return '/owners';
    case 'creator':
      return '/creator';
    default:
      return '/';
  }
}

function LoginPage(): JSX.Element {
  const router = useRouter();
  const { login: saveUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data: LoginResponse) => {
      const user = data?.user;
      if (!user) {
        router.navigate({ to: '/' });
        return;
      }

      saveUser(user);

      const requiresSetup =
        Boolean(data?.requiresPasswordSetup) ||
        Boolean(data?.mustChangePassword) ||
        Boolean((user as any)?.mustChangePassword);

      if (requiresSetup) {

        const t = data?.token ? cleanToken(data.token) : '';
        if (t) {
          sessionStorage.setItem('pwdSetupToken', t);
          localStorage.setItem('authToken', t);
          localStorage.setItem('token', t);
        }

        router.navigate({
          to: '/set-password',
          state: { token: t },
        });
        return;
      }


      router.navigate({ to: getHomeByRole((user as any)?.role) });
    },
  });

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="mb-4 text-lg font-semibold text-slate-800">Вхід</h1>

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="mb-4 block text-sm font-medium text-slate-700">
          Пароль
          <input
            type="password"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {loginMutation.isError && (
          <p className="mb-2 text-xs text-red-500">Невірний email або пароль.</p>
        )}

        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Вхід...' : 'Увійти'}
        </button>
      </form>
    </div>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
});
