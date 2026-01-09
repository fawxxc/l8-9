// src/routes/owners.tsx
import { createFileRoute, useRouter } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import vetLogo from '@/assets/vet-logo.png';
import { usePets } from '@/features/pets/api';
import { useDoctors } from '@/features/employees/api';
import {
  useCreateAppointment,
  useAppointments,
  type AppointmentDto,
} from '@/features/appointments/api';
import { useAuth } from '@/features/auth/AuthContext';

type AppointmentFormData = {
  petId: string;
  doctorId: string;
  date: string;
  time: string;
  visitType: string;
};

function formatPetType(raw?: string | null): string {
  if (!raw) return '—';
  switch (raw) {
    case 'cat':
      return 'Кіт';
    case 'dog':
      return 'Пес';
    case 'other':
      return 'Інше';
    default:
      return raw;
  }
}

type PaymentStatus = 'оплачено' | 'не оплачено';

function OwnersPage(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();


  if (!user || user.role !== 'owner') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-slate-700">
            Ця сторінка доступна лише користувачам з роллю&nbsp;
            <span className="font-semibold">Owner</span>.
          </p>
        </div>
      </div>
    );
  }

  const currentOwnerId = user.ownerId ?? null;

  const {
    data: pets,
    isLoading: isPetsLoading,
    isError: isPetsError,
    error: petsError,
  } = usePets();


  const {
    data: doctors,
    isLoading: isDoctorsLoading,
    isError: isDoctorsError,
    refetch: refetchDoctors,
  } = useDoctors();

  const {
    data: appointments,
    isLoading: isAppointmentsLoading,
    isError: isAppointmentsError,
    error: appointmentsError,
  } = useAppointments();

  const createAppointmentMutation = useCreateAppointment();

  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);

  // ОПЛАТА
  const paymentStorageKey =
    currentOwnerId != null ? `paymentStatuses_owner_${currentOwnerId}` : null;

  const [paymentStatuses, setPaymentStatuses] = useState<
    Record<number, PaymentStatus>
  >({});


  useEffect(() => {
    if (!paymentStorageKey) return;
    try {
      const raw = localStorage.getItem(paymentStorageKey);
      if (!raw) {
        setPaymentStatuses({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<number, PaymentStatus>;
      setPaymentStatuses(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      setPaymentStatuses({});
    }
  }, [paymentStorageKey]);


  useEffect(() => {
    if (!paymentStorageKey) return;
    try {
      localStorage.setItem(paymentStorageKey, JSON.stringify(paymentStatuses));
    } catch {

    }
  }, [paymentStatuses, paymentStorageKey]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentVisitId, setSelectedPaymentVisitId] = useState<
    number | null
  >(null);

  const getPaymentStatus = (id: number): PaymentStatus =>
    paymentStatuses[id] ?? 'не оплачено';

  const handleOpenPaymentModal = (): void => {
    if (ownerAppointments.length === 0) return;
    setSelectedPaymentVisitId(ownerAppointments[0].id);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = (): void => {
    if (selectedPaymentVisitId == null) {
      alert('Оберіть візит для оплати.');
      return;
    }
    setPaymentStatuses((prev) => ({
      ...prev,
      [selectedPaymentVisitId]: 'оплачено',
    }));
    alert('Оплату підтверджено.');
    setIsPaymentModalOpen(false);
  };

  const handleRejectPayment = (): void => {
    if (selectedPaymentVisitId == null) {
      alert('Оберіть візит для оплати.');
      return;
    }
    setPaymentStatuses((prev) => ({
      ...prev,
      [selectedPaymentVisitId]: 'не оплачено',
    }));
    alert('Оплату відхилено.');
    setIsPaymentModalOpen(false);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AppointmentFormData>();


  const ownerPets = useMemo(() => {
    if (!pets) return [];


    if (currentOwnerId == null) {
      return pets as any[];
    }


    return (pets as any[]).filter((pet: any) => {
      const petOwnerId = pet.ownerId ?? pet.owner_id ?? pet.owner?.id ?? null;
      return petOwnerId === currentOwnerId;
    });
  }, [pets, currentOwnerId]);


  const doctorOptions = useMemo(() => {
    const list = (doctors as any[]) ?? [];

    const normalized = list.map((d: any) => ({
      id: d?.id,
      fullName: d?.fullName ?? d?.full_name ?? '',
      role: d?.role ?? '',
      isActive: typeof d?.isactive === 'boolean' ? d.isactive : d?.isActive,
    }));


    return normalized
      .filter((d) => Number.isFinite(Number(d.id)))
      .filter((d) => String(d.fullName).trim().length > 0)
      .filter((d) => String(d.role).toLowerCase() === 'doctor')
      .filter((d) => (typeof d.isActive === 'boolean' ? d.isActive : true));
  }, [doctors]);


  const ownerPetIds = useMemo(() => {
    return new Set(ownerPets.map((p: any) => p.id));
  }, [ownerPets]);


  const ownerAppointments: AppointmentDto[] = useMemo(() => {
    if (!appointments || ownerPetIds.size === 0) return [];

    return [...appointments]
      .filter(
        (appt) =>
          appt.pet != null &&
          ownerPetIds.has(appt.pet!.id) &&
          (appt.status === 'completed' || appt.status === 'done'),
      )
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [appointments, ownerPetIds]);

  const onSubmit = (data: AppointmentFormData): void => {
    createAppointmentMutation.mutate(
      {
        petId: Number(data.petId),
        doctorId: Number(data.doctorId),
        date: data.date,
        time: data.time,
        visitType: data.visitType,
      },
      {
        onSuccess: () => {
          reset();
          setIsAppointmentOpen(false);
          alert('Запис успішно створено!');
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ШАПКА САЙТУ  */}
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <div className="text-sm font-medium text-slate-700">
          Роль:{' '}
          <span className="font-semibold text-blue-700">Owner</span>
        </div>

        <div className="flex items-center gap-3 text-center">
          <img
            src={vetLogo}
            alt="Логотип ветклініки"
            className="h-10 w-10 rounded-full object-cover"
          />
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
            OK
          </div>
          <span>Особистий кабінет</span>
        </button>
      </header>

      {/*  ОСНОВНИЙ КОНТЕНТ  */}
      <main className="space-y-8 p-4">
        {/*  БЛОК "МОЇ УЛЮБЛЕНЦІ" */}
        <section className="flex justify-center">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-center text-xl font-semibold">
              Мої улюбленці
            </h2>

            {isPetsLoading ? (
              <p className="text-center text-sm text-slate-500">
                Завантаження улюбленців...
              </p>
            ) : isPetsError ? (
              <p className="text-center text-sm text-red-500">
                Помилка завантаження улюбленців:{' '}
                {petsError instanceof Error ? petsError.message : 'Невідома помилка'}
              </p>
            ) : ownerPets.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                У вас ще немає зареєстрованих тварин.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-200 px-3 py-2 text-left">
                        Ім&apos;я тваринки
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left">
                        Улюбленець
                      </th>
                      <th className="border border-slate-200 px-3 py-2 text-left">
                        Вік
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerPets.map((pet: any) => (
                      <tr key={pet.id} className="bg-slate-50 hover:bg-slate-100">
                        <td className="border border-slate-200 px-3 py-2 font-medium">
                          {pet.name}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-700">
                          {formatPetType(
                            pet.breed ?? pet.species ?? pet.type ?? pet.kind ?? null,
                          )}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-500">
                          {pet.age != null ? `${pet.age} років` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* КНОПКИ */}
        <section className="flex justify-center">
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={isPetsLoading || isDoctorsLoading || ownerPets.length === 0}
              onClick={() => {

                void refetchDoctors();
                setIsAppointmentOpen(true);
              }}
            >
              Записатися на прийом
            </button>

            {/*  КНОПКА ОПЛАТИ */}
            <button
              type="button"
              className="rounded bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              disabled={isAppointmentsLoading || ownerAppointments.length === 0}
              onClick={handleOpenPaymentModal}
            >
              Оплатити прийом
            </button>
          </div>
        </section>

        {/*  "ІСТОРІЯ ВІЗИТІВ"  */}
        <section className="flex justify-center">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-center text-xl font-semibold">ІСТОРІЯ ВІЗИТІВ</h2>

            {isAppointmentsLoading ? (
              <p className="text-center text-sm text-slate-500">
                Завантаження історії візитів...
              </p>
            ) : isAppointmentsError ? (
              <p className="text-center text-sm text-red-500">
                Помилка завантаження історії:{' '}
                {appointmentsError instanceof Error
                  ? appointmentsError.message
                  : 'Невідома помилка'}
              </p>
            ) : ownerAppointments.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                Ще не було візитів до лікаря
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border px-3 py-2 text-left">Дата</th>
                      <th className="border px-3 py-2 text-left">Тип візиту</th>
                      <th className="border px-3 py-2 text-left">Тварина</th>
                      <th className="border px-3 py-2 text-left">Лікар</th>
                      <th className="border px-3 py-2 text-left">Статус оплати</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerAppointments.map((appt) => {
                      const dt = new Date(appt.data);
                      const dateStr = !Number.isNaN(dt.getTime())
                        ? dt.toLocaleDateString('uk-UA')
                        : '';

                      const petName = appt.pet?.name ?? 'Тваринка';
                      const petType = formatPetType(
                        (appt.pet as any)?.breed ??
                          (appt.pet as any)?.species ??
                          (appt.pet as any)?.type ??
                          (appt.pet as any)?.kind ??
                          null,
                      );

                      const visitType = appt.reason ?? 'Прийом';
                      const doctorName =
                        appt.employee?.fullName ??
                        (appt.employee as any)?.full_name ??
                        'Лікар не вказаний';

                      const paymentStatus = getPaymentStatus(appt.id);

                      return (
                        <tr key={appt.id}>
                          <td className="border px-3 py-2">{dateStr}</td>
                          <td className="border px-3 py-2">{visitType}</td>
                          <td className="border px-3 py-2">
                            {petType !== '—' ? `${petName} (${petType})` : petName}
                          </td>
                          <td className="border px-3 py-2">{doctorName}</td>
                          <td className="border px-3 py-2">
                            {paymentStatus === 'оплачено' ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                оплачено
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                                не оплачено
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/*  ЗАПИСАТИСЯ НА ПРИЙОМ*/}
      {isAppointmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Записатися на прийом</h2>
              <button
                type="button"
                className="text-xl leading-none text-slate-500 hover:text-slate-700"
                onClick={() => setIsAppointmentOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {/* Тваринка */}
              <div>
                <label className="block text-sm font-medium" htmlFor="petId">
                  Тваринка
                </label>
                <select
                  id="petId"
                  {...register('petId', { required: 'Оберіть тваринку' })}
                  className="mt-1 w-full rounded border p-2 text-sm"
                  disabled={ownerPets.length === 0}
                >
                  <option value="">Оберіть тваринку</option>
                  {ownerPets.map((pet: any) => {
                    const petType = formatPetType(
                      pet.breed ?? pet.species ?? pet.type ?? pet.kind ?? null,
                    );
                    return (
                      <option key={pet.id} value={pet.id}>
                        {pet.name}
                        {petType !== '—' ? ` (${petType})` : ''}
                      </option>
                    );
                  })}
                </select>
                {errors.petId && (
                  <p className="mt-1 text-xs text-red-500">{errors.petId.message}</p>
                )}
              </div>

              {/* Лікар */}
              <div>
                <label className="block text-sm font-medium" htmlFor="doctorId">
                  Лікар
                </label>
                <select
                  id="doctorId"
                  {...register('doctorId', { required: 'Оберіть лікаря' })}
                  className="mt-1 w-full rounded border p-2 text-sm"
                  disabled={isDoctorsLoading || doctorOptions.length === 0}
                >
                  <option value="">
                    {isDoctorsLoading
                      ? 'Завантаження...'
                      : doctorOptions.length === 0
                        ? 'Немає активних лікарів'
                        : 'Оберіть лікаря'}
                  </option>

                  {doctorOptions.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.fullName}
                    </option>
                  ))}
                </select>

                {errors.doctorId && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.doctorId.message}
                  </p>
                )}
                {isDoctorsError && (
                  <p className="mt-1 text-xs text-red-500">
                    Не вдалося завантажити список лікарів.
                  </p>
                )}
              </div>

              {/* Тип візиту */}
              <div>
                <label className="block text-sm font-medium" htmlFor="visitType">
                  Тип візиту
                </label>
                <select
                  id="visitType"
                  {...register('visitType', { required: 'Оберіть тип візиту' })}
                  className="mt-1 w-full rounded border p-2 text-sm"
                >
                  <option value="">Оберіть тип візиту</option>
                  <option value="Вакцинація">Вакцинація</option>
                  <option value="Плановий огляд">Плановий огляд</option>
                  <option value="Запис на прийом">Запис на прийом</option>
                </select>
                {errors.visitType && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.visitType.message}
                  </p>
                )}
              </div>

              {/* Дата + час */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium" htmlFor="date">
                    Дата
                  </label>
                  <input
                    id="date"
                    type="date"
                    {...register('date', { required: 'Оберіть дату' })}
                    className="mt-1 w-full rounded border p-2 text-sm"
                  />
                  {errors.date && (
                    <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium" htmlFor="time">
                    Час
                  </label>
                  <input
                    id="time"
                    type="time"
                    {...register('time', { required: 'Оберіть час' })}
                    className="mt-1 w-full rounded border p-2 text-sm"
                  />
                  {errors.time && (
                    <p className="mt-1 text-xs text-red-500">{errors.time.message}</p>
                  )}
                </div>
              </div>

              {createAppointmentMutation.isError && (
                <p className="text-xs text-red-500">
                  Не вдалося створити запис. Перевірте дані або спробуйте пізніше.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsAppointmentOpen(false)}
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={createAppointmentMutation.isPending}
                >
                  {createAppointmentMutation.isPending ? 'Збереження...' : 'Записатися'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНЕ ВІКНО "ОПЛАТИТИ ПРИЙОМ" */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Оплата останніх візитів</h2>
              <button
                type="button"
                className="text-xl leading-none text-slate-500 hover:text-slate-700"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                ×
              </button>
            </div>

            {ownerAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">Немає візитів для оплати.</p>
            ) : (
              <>
                <div className="mb-3 text-xs text-slate-500">
                  Оберіть візит зі списку та натисніть
                  <span className="font-semibold"> «Оплатити»</span> або{' '}
                  <span className="font-semibold">«Відхилити»</span>.
                </div>

                <div className="mb-4 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border px-3 py-2 text-left"></th>
                        <th className="border px-3 py-2 text-left">Дата</th>
                        <th className="border px-3 py-2 text-left">Тип візиту</th>
                        <th className="border px-3 py-2 text-left">Тварина</th>
                        <th className="border px-3 py-2 text-left">Лікар</th>
                        <th className="border px-3 py-2 text-left">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownerAppointments.map((appt) => {
                        const dt = new Date(appt.data);
                        const dateStr = !Number.isNaN(dt.getTime())
                          ? dt.toLocaleDateString('uk-UA')
                          : '';

                        const petName = appt.pet?.name ?? 'Тваринка';
                        const petType = formatPetType(
                          (appt.pet as any)?.breed ??
                            (appt.pet as any)?.species ??
                            (appt.pet as any)?.type ??
                            (appt.pet as any)?.kind ??
                            null,
                        );

                        const visitType = appt.reason ?? 'Прийом';
                        const doctorName =
                          appt.employee?.fullName ??
                          (appt.employee as any)?.full_name ??
                          'Лікар не вказаний';

                        const paymentStatus = getPaymentStatus(appt.id);

                        return (
                          <tr
                            key={appt.id}
                            className={
                              selectedPaymentVisitId === appt.id ? 'bg-blue-50' : 'bg-white'
                            }
                          >
                            <td className="border px-3 py-2 text-center">
                              <input
                                type="radio"
                                name="selectedVisit"
                                checked={selectedPaymentVisitId === appt.id}
                                onChange={() => setSelectedPaymentVisitId(appt.id)}
                              />
                            </td>
                            <td className="border px-3 py-2">{dateStr}</td>
                            <td className="border px-3 py-2">{visitType}</td>
                            <td className="border px-3 py-2">
                              {petType !== '—' ? `${petName} (${petType})` : petName}
                            </td>
                            <td className="border px-3 py-2">{doctorName}</td>
                            <td className="border px-3 py-2">
                              {paymentStatus === 'оплачено' ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                  оплачено
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                                  не оплачено
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => setIsPaymentModalOpen(false)}
                  >
                    Закрити
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                    onClick={handleRejectPayment}
                  >
                    Відхилити
                  </button>
                  <button
                    type="button"
                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    onClick={handleConfirmPayment}
                  >
                    Оплатити
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/owners')({
  component: OwnersPage,
});
