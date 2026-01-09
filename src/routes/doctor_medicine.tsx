// src/routes/doctor_medicine.tsx
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import type { JSX, FormEvent } from 'react';
import { useState } from 'react';

import vetLogo from '@/assets/vet-logo.png';
import {
  useMedicines,
  useMedicineRequests,
  useCreateMedicineRequest,
  type MedicineDto,
} from '@/features/medicines/api';
import { useAuth } from '@/features/auth/AuthContext';

type CheckResult =
  | { type: 'not-found' }
  | {
      type: 'enough';
      available: number;
      requested: number;
      unit: string;
    }
  | {
      type: 'shortage';
      available: number;
      requested: number;
      shortage: number;
      unit: string;
    };

function DoctorMedicinePage(): JSX.Element {
  const router = useRouter();
  const { logout } = useAuth();


  const {
    data: medicines = [],
    isLoading: isMedicinesLoading,
    isError: isMedicinesError,
    error: medicinesError,
  } = useMedicines();

  const {
    data: medicineRequests = [],
    isLoading: isRequestsLoading,
  } = useMedicineRequests();

  const createRequestMutation = useCreateMedicineRequest();


  const [checkMedicineId, setCheckMedicineId] = useState(''); // id препарату
  const [checkQuantity, setCheckQuantity] = useState('');
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);


  const [requestMedicineId, setRequestMedicineId] = useState('');
  const [requestQuantity, setRequestQuantity] = useState('');
  const [requestReason, setRequestReason] = useState('');


  const findMedicineById = (idStr: string): MedicineDto | undefined => {
    const id = Number(idStr);
    if (!idStr || Number.isNaN(id)) return undefined;
    return medicines.find((m) => m.id === id);
  };


  const handleCheckAvailability = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setCheckResult(null);

    const med = findMedicineById(checkMedicineId);
    const qty = Number(checkQuantity);

    if (!med) {
      setCheckResult({ type: 'not-found' });
      return;
    }

    if (Number.isNaN(qty) || qty <= 0) {
      alert('Вкажіть коректну необхідну кількість (> 0).');
      return;
    }

    if (med.stock >= qty) {
      setCheckResult({
        type: 'enough',
        available: med.stock,
        requested: qty,
        unit: med.unit,
      });
    } else {
      setCheckResult({
        type: 'shortage',
        available: med.stock,
        requested: qty,
        shortage: qty - med.stock,
        unit: med.unit,
      });
    }
  };


  const prefillRequestFromCheck = (): void => {
    if (!checkResult || checkResult.type !== 'shortage') return;

    setRequestMedicineId(checkMedicineId);
    setRequestQuantity(String(checkResult.shortage));
  };


  const handleCreateRequest = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    const med = findMedicineById(requestMedicineId);
    const qty = Number(requestQuantity);
    const trimmedReason = requestReason.trim();

    if (!med) {
      alert('Оберіть препарат зі списку.');
      return;
    }

    if (Number.isNaN(qty) || qty <= 0) {
      alert('Вкажіть коректну кількість (> 0).');
      return;
    }

    if (!trimmedReason) {
      alert('Будь ласка, вкажіть причину поповнення.');
      return;
    }


    createRequestMutation.mutate(
      {
        vaccineType: med.name,
        quantity: qty,
        reason: trimmedReason,
      },
      {
        onSuccess: () => {
          setRequestMedicineId('');
          setRequestQuantity('');
          setRequestReason('');
        },
        onError: () => {
          alert('Не вдалося створити запит. Перевірте бекенд /medicines/requests.');
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ШАПКА САЙТУ  */}
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <div className="text-sm font-medium text-slate-700">
          Роль <span className="font-semibold text-blue-700">Doctor</span>
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
            DR
          </div>
          <span>Особистий кабінет</span>
        </button>
      </header>

      {/* ОСНОВНИЙ КОНТЕНТ  */}
      <main className="p-4">
        {/* ТРИ ЦЕНТРАЛЬНІ БЛОКИ-КНОПКИ НАВІГАЦІЇ */}
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

        <section className="mx-auto flex max-w-4xl flex-col gap-6">
          {/* Заголовок сторінки */}
          <div className="rounded-2xl bg-white p-5 shadow">
            <h1 className="text-xl font-semibold text-slate-800">
              Перевірка наявності медикаментів
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Лікар може швидко перевірити залишки вакцин та сформувати запит на
              поповнення для адміністратора.
            </p>

            {isMedicinesError && (
              <p className="mt-2 text-xs text-red-500">
                Помилка завантаження медикаментів:{' '}
                {medicinesError instanceof Error ? medicinesError.message : 'Невідома помилка'}
              </p>
            )}
          </div>

          {/* Блок перевірки наявності + блок запиту */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Блок перевірки наявності */}
            <div className="rounded-2xl bg-white p-5 shadow">
              <h2 className="mb-3 text-base font-semibold text-slate-800">
                Перевірка наявності мед.
              </h2>

              <form className="space-y-4" onSubmit={handleCheckAvailability}>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Тип вакцини
                  </label>
                  <select
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={checkMedicineId}
                    onChange={(e) => setCheckMedicineId(e.target.value)}
                    disabled={isMedicinesLoading || medicines.length === 0}
                  >
                    <option value="">
                      {isMedicinesLoading ? 'Завантаження...' : 'Оберіть тип вакцини'}
                    </option>
                    {medicines.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  {!isMedicinesLoading && medicines.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">
                      В БД поки немає жодної вакцини. Додайте записи в таблицю{' '}
                      <b>medicines</b>.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Необхідна кількість
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Наприклад, 10"
                    value={checkQuantity}
                    onChange={(e) => setCheckQuantity(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={isMedicinesLoading || medicines.length === 0}
                >
                  Перевірити
                </button>
              </form>

              {/* Результат перевірки */}
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                <p className="mb-1 font-medium text-slate-700">Результат:</p>

                {!checkResult && (
                  <p className="text-slate-500">
                    Заповніть форму вище, щоб побачити результат перевірки.
                  </p>
                )}

                {checkResult?.type === 'not-found' && (
                  <p className="text-red-600">
                    Обраний препарат не знайдено в базі. Перевірте, чи додано його в
                    таблицю <b>medicines</b>.
                  </p>
                )}

                {checkResult?.type === 'enough' && (
                  <p className="text-emerald-700">
                    В наявності <strong>{checkResult.available}</strong> {checkResult.unit}.
                    Необхідно <strong>{checkResult.requested}</strong>. Кількість достатня.
                  </p>
                )}

                {checkResult?.type === 'shortage' && (
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>
                      В наявності <strong>{checkResult.available}</strong> {checkResult.unit}.
                      Необхідно <strong>{checkResult.requested}</strong>.
                    </p>
                    <p className="font-medium text-red-600">
                      Нестача: <strong>{checkResult.shortage}</strong> {checkResult.unit}.
                    </p>
                    <button
                      type="button"
                      className="mt-1 rounded-full border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      onClick={prefillRequestFromCheck}
                    >
                      Сформувати запит на поповнення з цих даних
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Блок формування запиту на поповнення */}
            <div className="rounded-2xl bg-white p-5 shadow">
              <h2 className="mb-3 text-base font-semibold text-slate-800">
                Формування запиту на поповнення
              </h2>

              <form className="space-y-4" onSubmit={handleCreateRequest}>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Тип вакцини
                  </label>
                  <select
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={requestMedicineId}
                    onChange={(e) => setRequestMedicineId(e.target.value)}
                    disabled={isMedicinesLoading || medicines.length === 0}
                  >
                    <option value="">
                      {isMedicinesLoading ? 'Завантаження...' : 'Оберіть тип вакцини'}
                    </option>
                    {medicines.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Кількість для замовлення
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Наприклад, 15"
                    value={requestQuantity}
                    onChange={(e) => setRequestQuantity(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Причина</label>
                  <textarea
                    className="mt-1 h-20 w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Наприклад, закінчується вакцина, потрібна для планових щеплень."
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={createRequestMutation.isPending || medicines.length === 0}
                >
                  {createRequestMutation.isPending ? 'Надсилання...' : 'Надіслати запит'}
                </button>
              </form>

              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                Після відправки запиту його статус:{' '}
                <span className="font-semibold text-amber-700">
                  &laquo;Очікується підтвердження адміністратора&raquo;
                </span>
                .
              </div>
            </div>
          </div>

          {/* Список сформованих запитів  */}
          <div className="mx-auto max-w-4xl rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-3 text-base font-semibold text-slate-800">
              Останні запити на поповнення
            </h2>

            {isRequestsLoading ? (
              <p className="text-sm text-slate-500">Завантаження запитів...</p>
            ) : medicineRequests.length === 0 ? (
              <p className="text-sm text-slate-500">Запитів ще не було.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-transparent px-3 py-2 text-left">
                        Тип вакцини
                      </th>
                      <th className="border border-transparent px-3 py-2 text-left">
                        Кількість
                      </th>
                      <th className="border border-transparent px-3 py-2 text-left">
                        Причина
                      </th>
                      <th className="border border-transparent px-3 py-2 text-left">
                        Статус
                      </th>
                      <th className="border border-transparent px-3 py-2 text-left">
                        Створено
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicineRequests.map((req) => (
                      <tr key={req.id}>
                        <td className="border border-transparent px-3 py-2">
                          {req.vaccineType ?? req.medicine?.name ?? '—'}
                        </td>
                        <td className="border border-transparent px-3 py-2">{req.quantity}</td>
                        <td className="border border-transparent px-3 py-2">{req.reason}</td>
                        <td className="border border-transparent px-3 py-2">
                          {req.status === 'pending' ? 'Очікує підтвердження' : req.status}
                        </td>
                        <td className="border border-transparent px-3 py-2">
                          {new Date(req.createdAt).toLocaleString('uk-UA')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/doctor_medicine')({
  component: DoctorMedicinePage,
});
