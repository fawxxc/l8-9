// src/routes/doctor.tsx
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';

import vetLogo from '@/assets/vet-logo.png';
import {
  useAppointments,
  type AppointmentDto,
  useFinishAppointment,
} from '@/features/appointments/api';


function getOwnerName(appt: AppointmentDto): string {
  const anyAppt = appt as any;

  return (
    anyAppt.owner?.fullName ??
    anyAppt.owner_full_name ??
    anyAppt.pet?.owner?.fullName ??
    anyAppt.pet?.owner_full_name ??
    '—'
  );
}


function getDoctorName(appt: AppointmentDto | null): string {
  if (!appt?.employee) return '—';
  const emp: any = appt.employee;

  return emp.fullName ?? emp.full_name ?? '—';
}


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


function getPetType(appt: AppointmentDto | null): string {
  if (!appt?.pet) return '—';
  const p: any = appt.pet;
  const raw = p.breed ?? p.species ?? p.type ?? p.kind ?? null;
  return formatPetType(raw);
}

function DoctorPage(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user || user.role !== 'doctor') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-slate-700">
            Ця сторінка доступна лише користувачам з роллю&nbsp;
            <span className="font-semibold">Doctor</span>.
          </p>
        </div>
      </div>
    );
  }

  const currentDoctorId = user.doctorId ?? null;

  const {
    data: appointments,
    isLoading,
    isError,
    error,
  } = useAppointments();

  const finishAppointmentMutation = useFinishAppointment();

  const allAppointments: AppointmentDto[] = useMemo(() => {
    const list = appointments ?? [];

    if (!currentDoctorId) {
      return [];
    }

    return list.filter((appt) => {
      const emp: any = appt.employee;
      const apptDoctorId =
        emp?.id ?? emp?.doctorId ?? emp?.doctor_id ?? null;
      return apptDoctorId === currentDoctorId;
    });
  }, [appointments, currentDoctorId]);

  const activeAppointments: AppointmentDto[] = useMemo(
    () =>
      allAppointments
        .filter(
          (appt) =>
            appt.status !== 'completed' &&
            appt.status !== 'done',
        )
        .slice()
        .sort(
          (a, b) =>
            new Date(a.data).getTime() - new Date(b.data).getTime(),
        ),
    [allAppointments],
  );

  const [selectedAppointmentId, setSelectedAppointmentId] =
    useState<number | null>(null);

  const [symptoms, setSymptoms] = useState('');
  const [treatment, setTreatment] = useState('');

  useEffect(() => {
    if (selectedAppointmentId == null && activeAppointments.length > 0) {
      setSelectedAppointmentId(activeAppointments[0].id);
      return;
    }

    if (
      selectedAppointmentId != null &&
      !activeAppointments.some((a) => a.id === selectedAppointmentId)
    ) {
      setSelectedAppointmentId(
        activeAppointments.length > 0 ? activeAppointments[0].id : null,
      );
    }
  }, [activeAppointments, selectedAppointmentId]);

  const selectedAppointment: AppointmentDto | null = useMemo(
    () =>
      activeAppointments.find((a) => a.id === selectedAppointmentId) ??
      null,
    [activeAppointments, selectedAppointmentId],
  );

  const visitHistory: AppointmentDto[] = useMemo(() => {
    if (!selectedAppointment?.pet?.id) return [];
    const petId = selectedAppointment.pet.id;

    return allAppointments
      .filter(
        (appt) =>
          appt.pet?.id === petId &&
          (appt.status === 'completed' || appt.status === 'done'),
      )
      .sort(
        (a, b) =>
          new Date(b.data).getTime() - new Date(a.data).getTime(),
      );
  }, [allAppointments, selectedAppointment]);

  const handleFinishVisit = (): void => {
    if (!selectedAppointment) return;

    finishAppointmentMutation.mutate(
      {
        id: selectedAppointment.id,
        diagnosis: symptoms || undefined,
      },
      {
        onSuccess: () => {
          setSymptoms('');
          setTreatment('');
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ======= ШАПКА САЙТУ ======= */}
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        {/* ЛІВА ЧАСТИНА – РОЛЬ */}
        <div className="text-sm font-medium text-slate-700">
          Роль{' '}
          <span className="font-semibold text-blue-700">
            Doctor
          </span>
        </div>

        {/* ЦЕНТР – ЛОГОТИП + НАЗВА СИСТЕМИ */}
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

        {/* ПРАВА ЧАСТИНА – АВАТАРКА + ПІДПИС */}
        <button
          type="button"
          onClick={() => {
            logout();
            router.navigate({ to: '/login' });
          }}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white/10 text-xs font-semibold">
            DR
          </div>
          <span>Особистий кабінет</span>
        </button>
      </header>

      {/* ======= ОСНОВНИЙ КОНТЕНТ ======= */}
      <main className="p-4">
        {/* 🟩 ТРИ ЦЕНТРАЛЬНІ БЛОКИ-КНОПКИ НАВІГАЦІЇ */}
        <section className="mb-6 flex justify-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/doctor"
              className="min-w-[170px] rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
            >
              Розклад прийомів
            </Link>

            <Link
              to="/doctor_list"
              className="min-w-[170px] rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
            >
              Пацієнти лікаря
            </Link>

            <Link
              to="/doctor_medicine"
              className="min-w-[170px] rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
            >
              Медикаменти
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          {/* 🟦 ЛІВИЙ БЛОК – РОЗКЛАД ЛІКАРЯ */}
          <div className="rounded-2xl bg-blue-600 p-6 text-white shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">
              Розклад прийомів
            </h2>

            {isLoading ? (
              <p className="text-sm text-blue-100">
                Завантаження записів...
              </p>
            ) : isError ? (
              <p className="text-sm text-red-100">
                Помилка завантаження:{' '}
                {error instanceof Error
                  ? error.message
                  : 'Невідома помилка'}
              </p>
            ) : activeAppointments.length === 0 ? (
              <p className="text-sm text-blue-100">
                Для цього лікаря немає активних записів на прийом.
              </p>
            ) : (
              <div className="max-h-[420px] overflow-y-auto rounded-xl bg-blue-700/40 p-3">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-blue-100">
                        Час
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-blue-100">
                        Тварина
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-blue-100">
                        Власник
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAppointments.map((appt) => {
                      const dt = new Date(appt.data);
                      const timeStr = dt.toLocaleTimeString('uk-UA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const petName = appt.pet?.name ?? 'Тваринка';
                      const ownerName = getOwnerName(appt);

                      const isSelected =
                        appt.id === selectedAppointmentId;

                      return (
                        <tr
                          key={appt.id}
                          className={`cursor-pointer rounded-lg transition ${
                            isSelected
                              ? 'bg-blue-500/80'
                              : 'hover:bg-blue-500/60'
                          }`}
                          onClick={() =>
                            setSelectedAppointmentId(appt.id)
                          }
                        >
                          <td className="px-2 py-2 align-middle">
                            {timeStr}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {petName}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            {ownerName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-3 text-xs text-blue-100/80">
              Нові записи на прийом автоматично зʼявляються внизу цього
              списку.
            </p>
          </div>

          {/* 🤍 ПРАВИЙ БЛОК – ІНФО ПРО ПАЦІЄНТА + ІСТОРІЯ + СИМПТОМИ */}
          <div className="flex flex-col rounded-2xl bg-white p-6 shadow-lg">
            {!selectedAppointment ? (
              <div className="m-auto text-center text-sm text-slate-500">
                Наразі немає активних прийомів для цього лікаря.
              </div>
            ) : (
              <>
                {/* Інформація про пацієнта */}
                <section className="mb-4">
                  <h2 className="mb-2 text-lg font-semibold text-slate-800">
                    Інформація про пацієнта
                  </h2>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Кличка
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {selectedAppointment.pet?.name ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Улюбленець
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {getPetType(selectedAppointment)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Вік
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {selectedAppointment.pet &&
                        (selectedAppointment.pet as any)?.age != null
                          ? `${(selectedAppointment.pet as any).age} років`
                          : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        Лікар
                      </p>
                      <p className="text-sm font-medium text-slate-800">
                        {getDoctorName(selectedAppointment)}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Історія візитів */}
                <section className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    Історія візитів
                  </h3>

                  {visitHistory.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Для цього пацієнта ще немає завершених візитів.
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                      <table className="min-w-full border-collapse text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="border px-2 py-1 text-left">
                              Дата
                            </th>
                            <th className="border px-2 py-1 text-left">
                              Тип прийому
                            </th>
                            <th className="border px-2 py-1 text-left">
                              Тварина
                            </th>
                            <th className="border px-2 py-1 text-left">
                              Лікар
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visitHistory.map((appt) => {
                            const dt = new Date(appt.data);
                            const dateStr =
                              dt.toLocaleDateString('uk-UA');

                            const type =
                              appt.reason &&
                              appt.reason
                                .toLowerCase()
                                .includes('вакцин')
                                ? 'Вакцинація'
                                : appt.reason ?? 'Прийом';

                            const petName =
                              appt.pet?.name ?? '—';
                            const docName = getDoctorName(appt);

                            return (
                              <tr key={appt.id}>
                                <td className="border px-2 py-1">
                                  {dateStr}
                                </td>
                                <td className="border px-2 py-1">
                                  {type}
                                </td>
                                <td className="border px-2 py-1">
                                  {petName}
                                </td>
                                <td className="border px-2 py-1">
                                  {docName}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Симптоми */}
                <section className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    Симптоми
                  </h3>
                  <textarea
                    className="h-24 w-full resize-none rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Опишіть симптоми пацієнта..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                  {finishAppointmentMutation.isError && (
                    <p className="mt-1 text-xs text-red-500">
                      Не вдалося завершити прийом. Спробуйте ще раз.
                    </p>
                  )}
                </section>

                {/* Призначення лікування */}
                <section className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    Призначення лікування
                  </h3>
                  <textarea
                    className="h-24 w-full resize-none rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Вкажіть призначене лікування (препарати, дозування, рекомендації)..."
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                  />
                </section>

                {/* КНОПКА "ЗАКІНЧИТИ ПРИЙОМ" ВНИЗУ БЛОКУ */}
                <div className="mt-auto flex justify-center pt-2">
                  <button
                    type="button"
                    className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                    onClick={handleFinishVisit}
                    disabled={finishAppointmentMutation.isPending}
                  >
                    {finishAppointmentMutation.isPending
                      ? 'Завершення...'
                      : 'Закінчити прийом'}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/doctor')({
  component: DoctorPage,
});
