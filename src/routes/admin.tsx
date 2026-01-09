// src/routes/admin.tsx
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  useOwners,
  useCreateOwner,
  useDeleteOwner,
} from '@/features/owners/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ownerSchema } from '@/features/owners/OwnerFormSchema';
import type { JSX, FormEvent } from 'react';
import { useState, useMemo } from 'react';
import { z } from 'zod';
import vetLogo from '@/assets/vet-logo.png';
import { useCreatePet } from '@/features/pets/api';
import {
  useAppointments,
  type AppointmentDto,
  useDeleteAppointment,
} from '@/features/appointments/api';

import {
  useMedicineRequests,
  useApproveMedicineRequest,
  usePayMedicineRequest,
  type MedicineRequestDto,
} from '@/features/medicines/api';
import { useAuth } from '@/features/auth/AuthContext';


const newClientSchema = ownerSchema.extend({
  petName: z.string().min(1, 'Вкажіть імʼя тваринки'),
  petAge: z.string().optional(),
  petWeight: z.string().optional(),

  petType: z.enum(['cat', 'dog', 'other'], {
    required_error: 'Оберіть вид тварини',
  }),
  petGender: z.string().optional(),
});

type NewClientFormData = z.infer<typeof newClientSchema>;

function AdminPage(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-slate-700">
            Ця сторінка доступна лише користувачам з роллю{' '}
            <span className="font-semibold">Admin</span>.
          </p>
        </div>
      </div>
    );
  }

  const {
    data: owners,
    isLoading,
    isError,
    error,
  } = useOwners();

  const createOwnerMutation = useCreateOwner();
  const deleteOwnerMutation = useDeleteOwner();
  const createPetMutation = useCreatePet();

  const {
    data: appointments,
    isLoading: isAppointmentsLoading,
    isError: isAppointmentsError,
    error: appointmentsError,
  } = useAppointments();

  const deleteAppointmentMutation = useDeleteAppointment();


  const {
    data: medicineRequests = [],
    isLoading: isMedicineRequestsLoading,
    isError: isMedicineRequestsError,
  } = useMedicineRequests();

  const approveRequestMutation = useApproveMedicineRequest();
  const payRequestMutation = usePayMedicineRequest();

  const [search, setSearch] = useState('');
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  const [isRequestsModalOpen, setIsRequestsModalOpen] =
    useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<MedicineRequestDto | null>(null);
  const [supplyQuantity, setSupplyQuantity] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NewClientFormData>({
    resolver: zodResolver(newClientSchema),
  });

  const onSubmit = async (data: NewClientFormData): Promise<void> => {
    const {
      fullName,
      email,
      phone,
      address,
      petName,
      petAge,
      petWeight,
      petType,
      petGender,
    } = data;

    try {

      console.log('[NEW CLIENT] creating owner...', { fullName, email, phone, address });

      const createdOwner: any = await createOwnerMutation.mutateAsync({
        fullName,
        email,
        phone,
        address,
      });

      console.log('[NEW CLIENT] createdOwner:', createdOwner);


      const ownerId = Number(
        createdOwner?.id ??
          createdOwner?.ownerId ??
          createdOwner?.owner_id ??
          createdOwner?.owner?.id,
      );

      console.log('[NEW CLIENT] ownerId parsed =', ownerId);

      if (!Number.isFinite(ownerId) || ownerId <= 0) {
        alert(
          'Власника створено, але бекенд не повернув коректний id. Неможливо створити тваринку.',
        );
        return;
      }


      const petPayload = {
        name: petName,
        age: petAge ? Number(petAge) : undefined,
        weight: petWeight ? Number(petWeight) : undefined,
        breed: petType, // breed = cat/dog/other
        gender: petGender || undefined,
        ownerId,
      };

      console.log('[NEW CLIENT] creating pet...', petPayload);

      const createdPet = await createPetMutation.mutateAsync(petPayload);

      console.log('[NEW CLIENT] createdPet:', createdPet);


      reset();
      setIsNewClientOpen(false);
    } catch (e: any) {
      // ✅ Витягуємо нормальне повідомлення
      const status = e?.response?.status;
      const message =
        e?.response?.data?.message ??
        e?.message ??
        'Невідома помилка';

      console.error('[NEW CLIENT] error object:', e);
      alert(`Не вдалося зберегти клієнта/тваринку (${status ?? '—'}): ${message}`);
    }
  };



  const handleDeleteAll = (): void => {
    if (!owners || owners.length === 0) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete ALL owners? This action cannot be undone.',
    );
    if (!confirmed) return;

    owners.forEach((owner) => {
      deleteOwnerMutation.mutate(String(owner.id));
    });
  };


  const handleCancelVisit = (id: number): void => {
    const confirmCancel = window.confirm(
      'Ви впевнені, що хочете скасувати цей запис?',
    );
    if (!confirmCancel) return;

    deleteAppointmentMutation.mutate(id, {
      onError: () => {
        alert('Не вдалося скасувати запис. Спробуйте ще раз.');
      },
    });
  };


  const handleSelectRequest = (
    req: MedicineRequestDto,
  ): void => {
    setSelectedRequest(req);
    setSupplyQuantity(
      req.deliveredQuantity != null && req.deliveredQuantity > 0
        ? String(req.deliveredQuantity)
        : String(req.quantity),
    );
  };

  const handleApproveSupply = (
    e: FormEvent<HTMLFormElement>,
  ): void => {
    e.preventDefault();
    if (!selectedRequest) return;

    const qty = Number(supplyQuantity);
    if (Number.isNaN(qty) || qty <= 0) {
      alert('Вкажіть коректну кількість поставки (> 0).');
      return;
    }

    approveRequestMutation.mutate(
      { id: selectedRequest.id, deliveredQuantity: qty },
      {
        onSuccess: (updated) => {
          setSelectedRequest(updated);
        },
        onError: () => {
          alert(
            'Не вдалося підтвердити поставку. Перевірте бекенд /medicines/requests/:id/approve.',
          );
        },
      },
    );
  };

  const handlePayRequest = (
    e: FormEvent<HTMLFormElement>,
  ): void => {
    e.preventDefault();
    if (!selectedRequest) return;

    payRequestMutation.mutate(selectedRequest.id, {
      onSuccess: (updated) => {
        setSelectedRequest(updated);
      },
      onError: () => {
        alert(
          'Не вдалося підтвердити оплату. Перевірте бекенд /medicines/requests/:id/pay.',
        );
      },
    });
  };

  const filteredOwners =
    owners?.filter((owner) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;

      const fullName = (owner.fullName ?? '').toLowerCase();
      const email = (owner.email ?? '').toLowerCase();
      const phone = (owner.phone ?? '').toLowerCase();

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    }) ?? [];

  const isSaving =
    createOwnerMutation.isPending || createPetMutation.isPending;


  const visibleAppointments: AppointmentDto[] = useMemo(
    () =>
      (appointments ?? []).filter(
        (appt) =>
          appt.status !== 'completed' &&
          appt.status !== 'done',
      ),
    [appointments],
  );


  const appointmentsByDate: Record<string, AppointmentDto[]> =
    useMemo(() => {
      const groups: Record<string, AppointmentDto[]> = {};

      for (const appt of visibleAppointments) {
        const dt = new Date(appt.data);
        if (Number.isNaN(dt.getTime())) continue;

        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        const key = `${year}-${month}-${day}`;

        if (!groups[key]) groups[key] = [];
        groups[key].push(appt);
      }

      return groups;
    }, [visibleAppointments]);


  const sortedDates = useMemo(
    () => Object.keys(appointmentsByDate).sort(),
    [appointmentsByDate],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/*  ШАПКА САЙТУ */}
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <div className="text-sm font-medium text-slate-700">
          Роль{' '}
          <span className="font-semibold text-blue-700">
            Admin
          </span>
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
            AD
          </div>
          <span>Особистий кабінет</span>
        </button>
      </header>

      {/* ОСНОВНИЙ КОНТЕНТ */}
      <main className="p-4 space-y-8">
        {/* Пошук клієнта */}
        <section className="flex justify-center">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Пошук клієнта за ПІБ, email або телефоном"
            className="w-full max-w-xl rounded-full border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </section>


        <section className="grid items-start gap-6 md:grid-cols-3">

          <div className="flex flex-col items-end gap-3">
            <button
              type="button"
              className="min-w-[180px] rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              onClick={() => {
                setIsNewClientOpen(true);
              }}
            >
              Новий клієнт
            </button>

            <button
              type="button"
              className="min-w-[180px] rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Записати на прийом
            </button>

            <button
              type="button"
              className="min-w-[180px] rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              onClick={() => {
                setIsRequestsModalOpen(true);
              }}
            >
              Запити вакцини
            </button>
          </div>


          <div className="md:col-span-2 flex flex-col gap-4">
            {isAppointmentsLoading ? (
              <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow">
                <p className="text-sm text-slate-500">
                  Завантаження розкладу...
                </p>
              </div>
            ) : isAppointmentsError ? (
              <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow">
                <p className="text-sm text-red-500">
                  Помилка завантаження розкладу:{' '}
                  {appointmentsError instanceof Error
                    ? appointmentsError.message
                    : 'Невідома помилка'}
                </p>
              </div>
            ) : sortedDates.length === 0 ? (
              <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow">
                <p className="text-sm text-slate-500">
                  Записів на прийом поки немає.
                </p>
              </div>
            ) : (
              sortedDates.map((dateKey) => {
                const dateAppointments =
                  appointmentsByDate[dateKey];
                const displayDate = new Date(
                  dateKey + 'T00:00:00',
                ).toLocaleDateString('uk-UA');

                const rows = [...dateAppointments].sort(
                  (a, b) =>
                    new Date(a.data).getTime() -
                    new Date(b.data).getTime(),
                );

                return (
                  <div
                    key={dateKey}
                    className="w-full max-w-xl rounded-2xl bg-white p-4 shadow"
                  >
                    <h2 className="mb-2 text-lg font-semibold">
                      Розклад на {displayDate}
                    </h2>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                              Час
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                              Прийом
                            </th>
                            <th className="px-3 py-2 text-right" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((appt) => {
                            const dt = new Date(appt.data);
                            const timeStr =
                              dt.toLocaleTimeString('uk-UA', {
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                            const petName =
                              appt.pet?.name ?? 'Тваринка';
                            const reason =
                              appt.reason ?? 'Прийом';
                            const doctorName =
                              appt.employee?.fullName ??
                              (appt.employee as any)
                                ?.full_name ??
                              'Лікар не вказаний';

                            return (
                              <tr
                                key={appt.id}
                                className="hover:bg-slate-50"
                              >
                                <td className="px-3 py-2 align-middle">
                                  {timeStr}
                                </td>
                                <td className="px-3 py-2 align-middle">
                                  {reason} – {petName} (лікар:{' '}
                                  {doctorName})
                                </td>
                                <td className="px-3 py-2 align-middle text-right">
                                  <button
                                    type="button"
                                    className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                                    onClick={() =>
                                      handleCancelVisit(appt.id)
                                    }
                                  >
                                    Скасувати
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>


        <section className="mb-8">
          <div className="mb-4 flex items-center justify_between gap-3">
            <h2 className="text-xl font-semibold">
              Owners management
            </h2>

            <button
              type="button"
              className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
              onClick={handleDeleteAll}
              disabled={
                isLoading ||
                deleteOwnerMutation.isPending ||
                !owners ||
                owners.length === 0
              }
            >
              Delete all
            </button>
          </div>

          {isLoading && <p>Loading owners...</p>}

          {isError && (
            <p className="text-red-500">
              Error loading owners:{' '}
              {error instanceof Error
                ? error.message
                : 'Unknown error'}
            </p>
          )}

          {!isLoading && !isError && (
            <>
              {!owners || owners.length === 0 ? (
                <p>No owners yet or API returned empty list.</p>
              ) : filteredOwners.length === 0 ? (
                <p>Клієнтів за вказаним запитом не знайдено.</p>
              ) : (
                <div className="overflow-x-auto rounded border bg-white">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border px-3 py-2 text-left">
                          ID
                        </th>
                        <th className="border px-3 py-2 text-left">
                          Full name
                        </th>
                        <th className="border px-3 py-2 text-left">
                          Email
                        </th>
                        <th className="border px-3 py-2 text-left">
                          Phone
                        </th>
                        <th className="border px-3 py-2 text-left">
                          Address
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOwners.map((owner) => (
                        <tr key={owner.id}>
                          <td className="border px-3 py-1">
                            {owner.id}
                          </td>
                          <td className="border px-3 py-1">
                            {owner.fullName}
                          </td>
                          <td className="border px-3 py-1">
                            {owner.email}
                          </td>
                          <td className="border px-3 py-1">
                            {owner.phone}
                          </td>
                          <td className="border px-3 py-1">
                            {owner.address}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        {isNewClientOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Новий клієнт
                </h2>
                <button
                  type="button"
                  className="text-xl leading-none text-slate-500 hover:text-slate-700"
                  onClick={() => {
                    setIsNewClientOpen(false);
                  }}
                >
                  ×
                </button>
              </div>

              <form
                className="space-y-6"
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  {/* ВЛАСНИК */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Власник
                    </h3>

                    <div>
                      <label
                        className="block text-sm font-medium"
                        htmlFor="fullName"
                      >
                        ПІБ власника
                      </label>
                      <input
                        id="fullName"
                        {...register('fullName')}
                        className="w-full rounded border p-2 text-sm"
                      />
                      {errors.fullName && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium"
                        htmlFor="phone"
                      >
                        Телефон
                      </label>
                      <input
                        id="phone"
                        {...register('phone')}
                        className="w-full rounded border p-2 text-sm"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium"
                        htmlFor="email"
                      >
                        Email (контактна пошта)
                      </label>
                      <input
                        id="email"
                        type="email"
                        {...register('email')}
                        className="w-full rounded border p-2 text-sm"
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium"
                        htmlFor="address"
                      >
                        Адреса
                      </label>
                      <input
                        id="address"
                        {...register('address')}
                        className="w-full rounded border p-2 text-sm"
                      />
                      {errors.address && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.address.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ТВАРИНКА */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Тваринка
                    </h3>

                    <div>
                      <label
                        className="block text-sm font-medium"
                        htmlFor="petName"
                      >
                        Ім&rsquo;я тваринки
                      </label>
                      <input
                        id="petName"
                        {...register('petName')}
                        className="w-full rounded border p-2 text-sm"
                      />
                      {errors.petName && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.petName.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className="block text-sm font-medium"
                          htmlFor="petAge"
                        >
                          Вік (років)
                        </label>
                        <input
                          id="petAge"
                          {...register('petAge')}
                          className="w-full rounded border p-2 text-sm"
                        />
                      </div>
                      <div>
                        <label
                          className="block text-sm font-medium"
                          htmlFor="petWeight"
                        >
                          Вага (кг)
                        </label>
                        <input
                          id="petWeight"
                          {...register('petWeight')}
                          className="w-full rounded border p-2 text-sm"
                        />
                      </div>
                    </div>


                    <div>
                      <label
                        className="block text-sm font-medium"
                        htmlFor="petType"
                      >
                        Вид тварини
                      </label>
                      <select
                        id="petType"
                        {...register('petType')}
                        className="w-full rounded border p-2 text-sm"
                      >
                        <option value="">
                          Оберіть вид тварини
                        </option>
                        <option value="cat">Кіт</option>
                        <option value="dog">Пес</option>
                        <option value="other">Інше</option>
                      </select>
                      {errors.petType && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.petType.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium"
                        htmlFor="petGender"
                      >
                        Стать
                      </label>
                      <select
                        id="petGender"
                        {...register('petGender')}
                        className="w-full rounded border p-2 text-sm"
                      >
                        <option value="">Оберіть стать</option>
                        <option value="male">Самець</option>
                        <option value="female">Самка</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* КНОПКИ ФОРМИ */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setIsNewClientOpen(false);
                    }}
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? 'Збереження...'
                      : 'Зберегти клієнта'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* "ЗАПИТИ ВАКЦИНИ" */}
        {isRequestsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Запити вакцин
                </h2>
                <button
                  type="button"
                  className="text-xl leading-none text-slate-500 hover:text-slate-700"
                  onClick={() => {
                    setIsRequestsModalOpen(false);
                    setSelectedRequest(null);
                    setSupplyQuantity('');
                    setPaymentNote('');
                  }}
                >
                  ×
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-[3fr,2fr]">
                {/* ЖУРНАЛ ЗАПИТІВ = журнал поставок */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Журнал запитів / поставок
                  </h3>

                  {isMedicineRequestsLoading ? (
                    <p className="text-sm text-slate-500">
                      Завантаження запитів...
                    </p>
                  ) : isMedicineRequestsError ? (
                    <p className="text-sm text-red-500">
                      Не вдалося завантажити запити.
                    </p>
                  ) : medicineRequests.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Запитів ще не було.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded border">
                      <table className="min-w-full border-collapse text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="border px-2 py-1 text-left">
                              Вакцина
                            </th>
                            <th className="border px-2 py-1 text-left">
                              К-сть
                            </th>
                            <th className="border px-2 py-1 text-left">
                              Поставка
                            </th>
                            <th className="border px-2 py-1 text-left">
                              Статус
                            </th>
                            <th className="border px-2 py-1 text-left">
                              Створено
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {medicineRequests.map((req) => (
                            <tr
                              key={req.id}
                              className={`cursor-pointer hover:bg-slate-50 ${
                                selectedRequest?.id === req.id
                                  ? 'bg-blue-50'
                                  : ''
                              }`}
                              onClick={() =>
                                handleSelectRequest(req)
                              }
                            >
                              <td className="border px-2 py-1">
                                {req.vaccineType ?? '—'}
                              </td>
                              <td className="border px-2 py-1">
                                {req.quantity}
                              </td>
                              <td className="border px-2 py-1">
                                {req.deliveredQuantity ?? '—'}
                              </td>
                              <td className="border px-2 py-1">
                                <span
                                  className={
                                    'rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
                                    (req.status === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : req.status === 'approved'
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-amber-50 text-amber-700')
                                  }
                                >
                                  {req.status === 'pending' &&
                                    'Очікує підтвердження'}
                                  {req.status === 'approved' &&
                                    'Поставка підтверджена'}
                                  {req.status === 'paid' &&
                                    'Оплачено'}
                                  {!['pending', 'approved', 'paid'].includes(
                                    req.status,
                                  ) && req.status}
                                </span>
                              </td>
                              <td className="border px-2 py-1">
                                {new Date(
                                  req.createdAt,
                                ).toLocaleString('uk-UA')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>


                <div className="space-y-4">
                  {/* ДОДАВАННЯ НОВОЇ ПОСТАВКИ */}
                  <div className="rounded-lg bg-slate-50 p-3 text-xs">
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">
                      Додавання нової поставки
                    </h3>

                    {!selectedRequest ? (
                      <p className="text-slate-500">
                        Оберіть запит у журналі ліворуч, щоб
                        підтвердити поставку.
                      </p>
                    ) : (
                      <form
                        className="space-y-2"
                        onSubmit={handleApproveSupply}
                      >
                        <p className="text-slate-700">
                          Вакцина:{' '}
                          <span className="font-semibold">
                            {selectedRequest.vaccineType}
                          </span>
                        </p>
                        <p className="text-slate-600">
                          Запитана кількість:{' '}
                          <span className="font-semibold">
                            {selectedRequest.quantity}
                          </span>
                        </p>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-700">
                            Кількість, що фактично надійшла
                          </label>
                          <input
                            type="number"
                            min={1}
                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={supplyQuantity}
                            onChange={(e) =>
                              setSupplyQuantity(e.target.value)
                            }
                          />
                        </div>

                        <button
                          type="submit"
                          className="mt-1 rounded bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          disabled={
                            approveRequestMutation.isPending ||
                            selectedRequest.status === 'paid'
                          }
                        >
                          {approveRequestMutation.isPending
                            ? 'Збереження...'
                            : 'Підтвердити поставку'}
                        </button>

                        <p className="mt-1 text-[11px] text-slate-500">
                          Після підтвердження буде оновлено залишок у
                          таблиці медикаментів та записано цю операцію
                          в журнал.
                        </p>
                      </form>
                    )}
                  </div>

                  {/* ОПЛАТА ВАКЦИНИ */}
                  <div className="rounded-lg bg-slate-50 p-3 text-xs">
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">
                      Оплата вакцини
                    </h3>

                    {!selectedRequest ? (
                      <p className="text-slate-500">
                        Оберіть запит у журналі ліворуч.
                      </p>
                    ) : selectedRequest.status !== 'approved' &&
                      selectedRequest.status !== 'paid' ? (
                      <p className="text-slate-500">
                        Для оплати спочатку підтвердіть поставку.
                      </p>
                    ) : selectedRequest.status === 'paid' ? (
                      <p className="text-emerald-700">
                        Оплату вже підтверджено для цього запиту.
                      </p>
                    ) : (
                      <form
                        className="space-y-2"
                        onSubmit={handlePayRequest}
                      >
                        <p className="text-slate-700">
                          До оплати:{' '}
                          <span className="font-semibold">
                            {selectedRequest.vaccineType}
                          </span>
                          ,{' '}
                          <span className="font-semibold">
                            {selectedRequest.deliveredQuantity ??
                              selectedRequest.quantity}{' '}
                            доз
                          </span>
                          .
                        </p>

                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-slate-700">
                            Нотатка про оплату (необов’язково)
                          </label>
                          <textarea
                            className="h-16 w-full resize-none rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Наприклад, оплачено безготівково, рахунок №123."
                            value={paymentNote}
                            onChange={(e) =>
                              setPaymentNote(e.target.value)
                            }
                          />
                        </div>

                        <button
                          type="submit"
                          className="mt-1 rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          disabled={payRequestMutation.isPending}
                        >
                          {payRequestMutation.isPending
                            ? 'Підтвердження...'
                            : 'Підтвердити оплату'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export const Route = createFileRoute('/admin')({
  component: AdminPage,
});
