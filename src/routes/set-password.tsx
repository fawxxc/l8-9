// src/routes/set-password.tsx
import { createFileRoute, useRouter } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { setFirstPassword } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthContext';

function cleanToken(raw: string): string {
  let t = String(raw ?? '').trim();

  if (t.toLowerCase().startsWith('bearer ')) t = t.slice(7).trim();

  if (t.startsWith('"') && t.endsWith('"')) {
    try {
      t = JSON.parse(t) as string;
    } catch {

    }
  }

  return t;
}

function SetPasswordPage(): JSX.Element {
  const router = useRouter();
  const { login: saveUser } = useAuth();


  const setupToken = useMemo(() => {
    const stateToken = (router.state.location.state as any)?.token;
    const token =
      stateToken ??
      sessionStorage.getItem('pwdSetupToken') ??
      localStorage.getItem('authToken') ??
      localStorage.getItem('token') ??
      sessionStorage.getItem('authToken') ??
      sessionStorage.getItem('token') ??
      '';

    const t = cleanToken(token);
    return t.length > 0 ? t : null;
  }, [router.state.location.state]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!setupToken) throw new Error('Немає токена для створення пароля. Увійдіть ще раз.');
      if (password.length < 6) throw new Error('Пароль мінімум 6 символів');
      if (password !== confirm) throw new Error('Паролі не співпадають');


      return setFirstPassword({ newPassword: password, token: setupToken });
    },
    onSuccess: (data) => {

      const t = cleanToken(data.token);
      localStorage.setItem('authToken', t);
      localStorage.setItem('token', t);
      localStorage.setItem('authUser', JSON.stringify(data.user));

      sessionStorage.removeItem('pwdSetupToken');
      saveUser(data.user);


      if (data.user.role === 'admin') router.navigate({ to: '/admin' });
      else if (data.user.role === 'doctor') router.navigate({ to: '/doctor' });
      else if (data.user.role === 'owner') router.navigate({ to: '/owners' });
      else router.navigate({ to: '/' });
    },
  });

  if (!setupToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-slate-700">
            Немає токена для створення пароля. Увійдіть ще раз.
          </p>
          <button
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => router.navigate({ to: '/login' })}
            type="button"
          >
            На сторінку входу
          </button>
        </div>
      </div>
    );
  }

  const errorMsg =
    mutation.isError && mutation.error instanceof Error ? mutation.error.message : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="mb-4 text-lg font-semibold text-slate-800">Створіть пароль</h1>

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Новий пароль
          <input
            type="password"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="mb-4 block text-sm font-medium text-slate-700">
          Повторіть пароль
          <input
            type="password"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>

        {errorMsg && <p className="mb-2 text-xs text-red-500">{errorMsg}</p>}

        <button
          type="submit"
          className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Збереження...' : 'Зберегти пароль'}
        </button>
      </form>
    </div>
  );
}

export const Route = createFileRoute('/set-password')({
  component: SetPasswordPage,
});
