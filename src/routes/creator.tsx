// src/routes/creator.tsx
import { createFileRoute, useRouter } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import vetLogo from '@/assets/vet-logo.png';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/shared/api/axios';

type OwnerDto = {
  id: number;
  fullName?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string | null;
};

type DoctorDto = {
  id: number;
  fullName?: string;
  full_name?: string;
  phone?: string;
  address?: string | null;
  education?: string | null;
  role?: string;
  isactive?: boolean;
  isActive?: boolean;
};

function getName(x: any): string {
  return x?.fullName ?? x?.full_name ?? '—';
}

const emailLikeSchema = z
  .string()
  .trim()
  .min(3, 'Вкажіть email')
  .refine(
    (v) => /^[^\s@]+@[^\s@]+(\.[^\s@]+)?$/.test(v),
    'Некоректна пошта (дозволено також @local)',
  );

const newClientSchema = z.object({
  fullName: z.string().trim().min(2, 'Вкажіть ПІБ власника'),
  phone: z.string().trim().min(5, 'Вкажіть телефон'),
  email: emailLikeSchema,
  address: z.string().trim().optional(),

  petName: z.string().trim().min(1, "Вкажіть імʼя тваринки"),
  petAge: z.string().trim().optional(),
  petWeight: z.string().trim().optional(),
  petType: z.enum(['cat', 'dog', 'other'], { required_error: 'Оберіть вид тварини' }),
  petGender: z.string().trim().optional(),
});

type NewClientFormData = z.infer<typeof newClientSchema>;

const newDoctorSchema = z.object({
  fullName: z.string().trim().min(2, 'Вкажіть ПІБ лікаря'),
  phone: z.string().trim().min(5, 'Вкажіть телефон'),
  email: emailLikeSchema,
  password: z.string().min(4, 'Пароль має бути мінімум 4 символи'),
  address: z.string().trim().optional(),
  education: z.string().trim().optional(),
  mustChangePassword: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

type NewDoctorFormData = z.infer<typeof newDoctorSchema>;

function CreatorPage(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();


  if (!user || user.role !== 'creator') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-slate-700">
            Ця сторінка доступна лише користувачам з роллю&nbsp;
            <span className="font-semibold">Creator</span>.
          </p>
        </div>
      </div>
    );
  }


  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isNewDoctorOpen, setIsNewDoctorOpen] = useState(false);


  const {
    data: owners = [],
    isLoading: isOwnersLoading,
    isError: isOwnersError,
    error: ownersError,
  } = useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const res = await api.get<OwnerDto[]>('/owners');
      return res.data ?? [];
    },
  });

  const {
    data: doctors = [],
    isLoading: isDoctorsLoading,
    isError: isDoctorsError,
    error: doctorsError,
  } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get<DoctorDto[]>('/employees', {
        params: { role: 'doctor' },
      });
      return res.data ?? [];
    },
  });

  const ownerOptions = useMemo(
    () => owners.slice().sort((a, b) => getName(a).localeCompare(getName(b))),
    [owners],
  );
  const doctorOptions = useMemo(
    () => doctors.slice().sort((a, b) => getName(a).localeCompare(getName(b))),
    [doctors],
  );


  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');


  const deleteOwnerMutation = useMutation({
    mutationFn: async () => {
      const id = Number(selectedOwnerId);
      if (!selectedOwnerId || Number.isNaN(id)) throw new Error('bad owner id');
      await api.delete(`/owners/${id}`);
    },
    onSuccess: async () => {
      setSelectedOwnerId('');
      await qc.invalidateQueries({ queryKey: ['owners'] });
      alert('Owner видалено.');
    },
    onError: () =>
      alert('Не вдалося видалити owner. Можливо є зв’язки (pets/appointments) або заборона на бекенді.'),
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: async () => {
      const id = Number(selectedDoctorId);
      if (!selectedDoctorId || Number.isNaN(id)) throw new Error('bad doctor id');
      await api.delete(`/employees/${id}`);
    },
    onSuccess: async () => {
      setSelectedDoctorId('');
      await qc.invalidateQueries({ queryKey: ['doctors'] });
      alert('Doctor видалено.');
    },
    onError: () => alert('Не вдалося видалити doctor. Перевір бекенд DELETE /employees/:id.'),
  });


  const clearSupplyJournalMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/vaccinations/requests');
    },
    onSuccess: () => alert('Історію журналу запитів/поставок очищено.'),
    onError: () => alert('Не вдалося очистити журнал. Перевір бекенд /vaccinations/requests (DELETE).'),
  });

  const clearMedicineRequestsMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/medicines/requests');
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['medicineRequests'] });
      alert('Історію запитів на поповнення очищено.');
    },
    onError: () => alert('Не вдалося очистити запити. Перевір бекенд /medicines/requests (DELETE).'),
  });

  // ФОРМА: НОВИЙ КЛІЄНТ
  const {
    register: registerClient,
    handleSubmit: handleSubmitClient,
    formState: { errors: clientErrors },
    reset: resetClient,
  } = useForm<NewClientFormData>({
    resolver: zodResolver(newClientSchema),
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: NewClientFormData) => {
      const ownerPayload = {
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        address: data.address?.trim() || undefined,
      };

      const ownerRes = await api.post('/owners', ownerPayload);
      const createdOwner: any = ownerRes.data;

      const ownerId = Number(
        createdOwner?.id ??
          createdOwner?.ownerId ??
          createdOwner?.owner_id ??
          createdOwner?.owner?.id,
      );

      if (!Number.isFinite(ownerId) || ownerId <= 0) {
        throw new Error('Бекенд не повернув коректний owner id');
      }

      const petPayload = {
        name: data.petName.trim(),
        age: data.petAge ? Number(data.petAge) : undefined,
        weight: data.petWeight ? Number(data.petWeight) : undefined,
        breed: data.petType, // cat/dog/other
        gender: data.petGender || undefined,
        ownerId,
      };

      await api.post('/pets', petPayload);

      return { ownerId };
    },
    onSuccess: async () => {
      resetClient();
      setIsNewClientOpen(false);
      await qc.invalidateQueries({ queryKey: ['owners'] });
      alert('Клієнта та тваринку додано.');
    },
    onError: (e: any) => {
      const status = e?.response?.status;
      const message = e?.response?.data?.message ?? e?.message ?? 'Невідома помилка';
      alert(`Не вдалося зберегти клієнта/тваринку (${status ?? '—'}): ${message}`);
    },
  });

  // ФОРМА: НОВИЙ DOCTOR
  const {
    register: registerDoctor,
    handleSubmit: handleSubmitDoctor,
    formState: { errors: doctorErrors },
    reset: resetDoctor,
  } = useForm<NewDoctorFormData>({
    resolver: zodResolver(newDoctorSchema),
    defaultValues: { mustChangePassword: false, isActive: true },
  });

  const createDoctorMutation = useMutation({
    mutationFn: async (data: NewDoctorFormData) => {
      const payload = {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        address: data.address?.trim() || null,
        education: data.education?.trim() || null,
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: 'doctor',
        isActive: Boolean(data.isActive),
        mustChangePassword: Boolean(data.mustChangePassword),
      };

      await api.post('/employees', payload);
    },
    onSuccess: async () => {
      resetDoctor();
      setIsNewDoctorOpen(false);
      await qc.invalidateQueries({ queryKey: ['doctors'] });
      alert('Doctor додано.');
    },
    onError: (e: any) => {
      const status = e?.response?.status;
      const message = e?.response?.data?.message ?? e?.message ?? 'Невідома помилка';
      alert(`Не вдалося додати doctor (${status ?? '—'}): ${message}`);
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">

      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <div className="text-sm font-medium text-slate-700">
          Роль <span className="font-semibold text-blue-700">Creator</span>
        </div>

        <div className="flex items-center gap-3 text-center">
          <img src={vetLogo} alt="Логотип ветклініки" className="h-10 w-10 rounded-full object-cover" />
          <span className="text-lg font-semibold text-slate-800">
            ІНФОРМАЦІЙНА СИСТЕМА&nbsp;&quot;ВЕТКЛІНІКА&quot;
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            router.navigate({ to: '/login' });
          }}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white/10 text-xs font-semibold">
            CR
          </div>
          <span>Особистий кабінет</span>
        </button>
      </header>

      <main className="p-4">
        <section className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-slate-800">Creator панель</h1>
          <p className="mt-1 text-sm text-slate-500">Додавання/видалення owner та doctor, а також очищення історії запитів.</p>

          {(isOwnersError || isDoctorsError) && (
            <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <div className="font-semibold">Не вдалося завантажити дані.</div>
              {isOwnersError && (
                <div className="mt-1 text-xs">
                  Помилка owners: {ownersError instanceof Error ? ownersError.message : 'Невідома помилка'}
                </div>
              )}
              {isDoctorsError && (
                <div className="mt-1 text-xs">
                  Помилка doctors: {doctorsError instanceof Error ? doctorsError.message : 'Невідома помилка'}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <h2 className="text-sm font-semibold text-red-800">Видалення</h2>


              <div className="mt-4 space-y-2">
                <label className="block text-xs font-medium text-red-900">Owner для видалення</label>
                <select
                  className="w-full rounded border border-red-200 bg-white p-2 text-sm"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  disabled={isOwnersLoading || ownerOptions.length === 0}
                >
                  <option value="">{isOwnersLoading ? 'Завантаження...' : 'Оберіть owner'}</option>
                  {ownerOptions.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      #{o.id} — {getName(o)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="w-full rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={!selectedOwnerId || deleteOwnerMutation.isPending}
                  onClick={() => {
                    if (!confirm('Точно видалити owner?')) return;
                    deleteOwnerMutation.mutate();
                  }}
                >
                  {deleteOwnerMutation.isPending ? 'Видалення...' : 'Видалити owner'}
                </button>
              </div>

              {/* delete doctor */}
              <div className="mt-6 space-y-2">
                <label className="block text-xs font-medium text-red-900">Doctor для видалення</label>
                <select
                  className="w-full rounded border border-red-200 bg-white p-2 text-sm"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  disabled={isDoctorsLoading || doctorOptions.length === 0}
                >
                  <option value="">{isDoctorsLoading ? 'Завантаження...' : 'Оберіть doctor'}</option>
                  {doctorOptions.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      #{d.id} — {getName(d)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="w-full rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={!selectedDoctorId || deleteDoctorMutation.isPending}
                  onClick={() => {
                    if (!confirm('Точно видалити doctor?')) return;
                    deleteDoctorMutation.mutate();
                  }}
                >
                  {deleteDoctorMutation.isPending ? 'Видалення...' : 'Видалити doctor'}
                </button>
              </div>


              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  className="w-full rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                  disabled={clearSupplyJournalMutation.isPending}
                  onClick={() => {
                    if (!confirm('Очистити історію "Журнал запитів/поставок"?')) return;
                    clearSupplyJournalMutation.mutate();
                  }}
                >
                  {clearSupplyJournalMutation.isPending ? 'Очищення...' : 'Видалити історію Журнал запитів / поставок'}
                </button>

                <button
                  type="button"
                  className="w-full rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                  disabled={clearMedicineRequestsMutation.isPending}
                  onClick={() => {
                    if (!confirm('Очистити історію "Останні запити на поповнення"?')) return;
                    clearMedicineRequestsMutation.mutate();
                  }}
                >
                  {clearMedicineRequestsMutation.isPending
                    ? 'Очищення...'
                    : 'Видалити історію Останні запити на поповнення'}
                </button>
              </div>
            </div>


            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-sm font-semibold text-emerald-800">Додавання</h2>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  onClick={() => setIsNewClientOpen(true)}
                >
                  Новий клієнт
                </button>

                <button
                  type="button"
                  className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  onClick={() => setIsNewDoctorOpen(true)}
                >
                  Новий лікар
                </button>

                <p className="text-xs text-emerald-900/70">
                  Додавання виконується через модальні вікна, як на сторінці admin.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/*  НОВИЙ КЛІЄНТ  */}
      {isNewClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Новий клієнт</h2>
              <button
                type="button"
                className="text-xl leading-none text-slate-500 hover:text-slate-700"
                onClick={() => setIsNewClientOpen(false)}
              >
                ×
              </button>
            </div>

            <form
              className="space-y-6"
              onSubmit={handleSubmitClient((data) => createClientMutation.mutate(data))}
            >
              <div className="grid gap-6 md:grid-cols-2">
                {/* ВЛАСНИК */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Власник</h3>

                  <div>
                    <label className="block text-sm font-medium" htmlFor="c_fullName">
                      ПІБ власника
                    </label>
                    <input
                      id="c_fullName"
                      {...registerClient('fullName')}
                      className="w-full rounded border p-2 text-sm"
                    />
                    {clientErrors.fullName && (
                      <p className="mt-1 text-xs text-red-500">{clientErrors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium" htmlFor="c_phone">
                      Телефон
                    </label>
                    <input
                      id="c_phone"
                      {...registerClient('phone')}
                      className="w-full rounded border p-2 text-sm"
                    />
                    {clientErrors.phone && (
                      <p className="mt-1 text-xs text-red-500">{clientErrors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium" htmlFor="c_email">
                      Email (можна @local)
                    </label>
                    <input
                      id="c_email"
                      type="text"
                      {...registerClient('email')}
                      className="w-full rounded border p-2 text-sm"
                    />
                    {clientErrors.email && (
                      <p className="mt-1 text-xs text-red-500">{clientErrors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium" htmlFor="c_address">
                      Адреса
                    </label>
                    <input
                      id="c_address"
                      {...registerClient('address')}
                      className="w-full rounded border p-2 text-sm"
                    />
                    {clientErrors.address && (
                      <p className="mt-1 text-xs text-red-500">{clientErrors.address.message}</p>
                    )}
                  </div>
                </div>

                {/* ТВАРИНКА */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700">Тваринка</h3>

                  <div>
                    <label className="block text-sm font-medium" htmlFor="c_petName">
                      Ім&rsquo;я тваринки
                    </label>
                    <input
                      id="c_petName"
                      {...registerClient('petName')}
                      className="w-full rounded border p-2 text-sm"
                    />
                    {clientErrors.petName && (
                      <p className="mt-1 text-xs text-red-500">{clientErrors.petName.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium" htmlFor="c_petAge">
                        Вік (років)
                      </label>
                      <input id="c_petAge" {...registerClient('petAge')} className="w-full rounded border p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium" htmlFor="c_petWeight">
                        Вага (кг)
                      </label>
                      <input
                        id="c_petWeight"
                        {...registerClient('petWeight')}
                        className="w-full rounded border p-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium" htmlFor="c_petType">
                      Вид тварини
                    </label>
                    <select
                      id="c_petType"
                      {...registerClient('petType')}
                      className="w-full rounded border p-2 text-sm"
                    >
                      <option value="">Оберіть вид тварини</option>
                      <option value="cat">Кіт</option>
                      <option value="dog">Пес</option>
                      <option value="other">Інше</option>
                    </select>
                    {clientErrors.petType && (
                      <p className="mt-1 text-xs text-red-500">{clientErrors.petType.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium" htmlFor="c_petGender">
                      Стать
                    </label>
                    <select
                      id="c_petGender"
                      {...registerClient('petGender')}
                      className="w-full rounded border p-2 text-sm"
                    >
                      <option value="">Оберіть стать</option>
                      <option value="male">Самець</option>
                      <option value="female">Самка</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsNewClientOpen(false)}
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending ? 'Збереження...' : 'Зберегти клієнта'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* НОВИЙ DOCTOR */}
      {isNewDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Новий лікар</h2>
              <button
                type="button"
                className="text-xl leading-none text-slate-500 hover:text-slate-700"
                onClick={() => setIsNewDoctorOpen(false)}
              >
                ×
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={handleSubmitDoctor((data) => createDoctorMutation.mutate(data))}
            >
              <div>
                <label className="block text-sm font-medium" htmlFor="d_fullName">
                  ПІБ
                </label>
                <input
                  id="d_fullName"
                  {...registerDoctor('fullName')}
                  className="w-full rounded border p-2 text-sm"
                />
                {doctorErrors.fullName && (
                  <p className="mt-1 text-xs text-red-500">{doctorErrors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium" htmlFor="d_phone">
                  Телефон
                </label>
                <input id="d_phone" {...registerDoctor('phone')} className="w-full rounded border p-2 text-sm" />
                {doctorErrors.phone && (
                  <p className="mt-1 text-xs text-red-500">{doctorErrors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium" htmlFor="d_email">
                  Email (можна @local)
                </label>
                <input
                  id="d_email"
                  type="text"
                  {...registerDoctor('email')}
                  className="w-full rounded border p-2 text-sm"
                />
                {doctorErrors.email && (
                  <p className="mt-1 text-xs text-red-500">{doctorErrors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium" htmlFor="d_password">
                  Пароль
                </label>
                <input
                  id="d_password"
                  type="password"
                  {...registerDoctor('password')}
                  className="w-full rounded border p-2 text-sm"
                />
                {doctorErrors.password && (
                  <p className="mt-1 text-xs text-red-500">{doctorErrors.password.message}</p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium" htmlFor="d_address">
                    Адреса (необовʼязково)
                  </label>
                  <input id="d_address" {...registerDoctor('address')} className="w-full rounded border p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium" htmlFor="d_education">
                    Освіта (необовʼязково)
                  </label>
                  <input
                    id="d_education"
                    {...registerDoctor('education')}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" {...registerDoctor('mustChangePassword')} />
                  Must change password
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" defaultChecked {...registerDoctor('isActive')} />
                  Активний
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsNewDoctorOpen(false)}
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={createDoctorMutation.isPending}
                >
                  {createDoctorMutation.isPending ? 'Додавання...' : 'Додати лікаря'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/creator')({
  component: CreatorPage,
});
