// src/routes/doctor_list.tsx
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import type { JSX, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import vetLogo from '@/assets/vet-logo.png';
import {
  useAppointments,
  type AppointmentDto,
} from '@/features/appointments/api';
import { useOwners } from '@/features/owners/api';
import { usePets } from '@/features/pets/api';
import { useDoctors } from '@/features/employees/api';
import {
  useSaveVaccinations,
  usePetVaccinations,
} from '@/features/vaccinations/api';
import { useAuth } from '@/features/auth/AuthContext';

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

type OwnerWithPets = {
  owner: any;
  pets: any[];
};

type VaccinationRow = {
  id: number;
  vaccineType: string;
  date: string;
};

function DoctorPatientsPage(): JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user || (user.role !== 'doctor' && user.role !== 'admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-slate-700">
            Ця сторінка доступна лише користувачам з роллю{' '}
            <span className="font-semibold">Doctor</span> або{' '}
            <span className="font-semibold">Admin</span>.
          </p>
        </div>
      </div>
    );
  }

  const {
    data: appointments,
    isLoading: isAppointmentsLoading,
    isError: isAppointmentsError,
    error: appointmentsError,
  } = useAppointments();

  const {
    data: owners,
    isLoading: isOwnersLoading,
    isError: isOwnersError,
    error: ownersError,
  } = useOwners();

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
  } = useDoctors();

  const saveVaccinationsMutation = useSaveVaccinations();

  const [selectedDoctorId, setSelectedDoctorId] =
    useState<number | null>(null);

  const [selectedOwnerDetail, setSelectedOwnerDetail] =
    useState<OwnerWithPets | null>(null);

  const [selectedPetId, setSelectedPetId] =
    useState<number | null>(null);

  const [vaccinationRows, setVaccinationRows] = useState<VaccinationRow[]>([
    { id: 1, vaccineType: '', date: '' },
  ]);


  const doctorOptions = useMemo(() => {
    if (!doctors) return [];
    if (user.role === 'doctor' && user.doctorId != null) {
      return doctors.filter((doc: any) => doc.id === user.doctorId);
    }
    return doctors;
  }, [doctors, user]);


  useEffect(() => {
    if (!doctors || doctors.length === 0) return;

    if (user.role === 'doctor' && user.doctorId != null) {
      setSelectedDoctorId(user.doctorId);
      return;
    }

    if (selectedDoctorId == null && doctors.length > 0) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId, user]);

  const petsById = useMemo(() => {
    const map = new Map<number, any>();
    if (Array.isArray(pets)) {
      pets.forEach((petItem: any) => {
        if (petItem && typeof petItem.id === 'number') {
          map.set(petItem.id, petItem);
        }
      });
    }
    return map;
  }, [pets]);

  const ownersById = useMemo(() => {
    const map = new Map<number, any>();
    if (Array.isArray(owners)) {
      owners.forEach((ownerItem: any) => {
        if (ownerItem && typeof ownerItem.id === 'number') {
          map.set(ownerItem.id, ownerItem);
        }
      });
    }
    return map;
  }, [owners]);

  const doctorPatients: { owner: any; pets: any[] }[] = useMemo(() => {
    if (!appointments || !selectedDoctorId) return [];

    const groups = new Map<number, { owner: any; pets: any[] }>();

    (appointments as AppointmentDto[]).forEach((appt) => {
      const emp: any = appt.employee;
      const apptDoctorId =
        emp?.id ?? emp?.doctorId ?? emp?.doctor_id ?? null;

      if (apptDoctorId !== selectedDoctorId) return;

      const petFromAppt = appt.pet;
      if (!petFromAppt?.id) return;

      const pet = petsById.get(petFromAppt.id);
      if (!pet) return;

      const ownerId: number | undefined =
        pet.ownerId ??
        pet.owner_id ??
        pet.owner?.id ??
        undefined;
      if (ownerId == null) return;

      const owner = ownersById.get(ownerId);
      if (!owner) return;

      let group = groups.get(ownerId);
      if (!group) {
        group = { owner, pets: [] };
        groups.set(ownerId, group);
      }

      const alreadyInList = group.pets.some(
        (petItem) => petItem.id === pet.id,
      );
      if (!alreadyInList) {
        group.pets.push(pet);
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      String(a.owner.fullName ?? '').localeCompare(
        String(b.owner.fullName ?? ''),
        'uk',
      ),
    );
  }, [appointments, selectedDoctorId, petsById, ownersById]);

  const currentDoctor =
    doctors?.find((doc: any) => doc.id === selectedDoctorId) ?? null;

  const isLoadingAll =
    isAppointmentsLoading ||
    isOwnersLoading ||
    isPetsLoading ||
    isDoctorsLoading;

  const isErrorAny =
    isAppointmentsError ||
    isOwnersError ||
    isPetsError ||
    isDoctorsError;

  const currentPetId =
    selectedOwnerDetail && selectedPetId ? selectedPetId : null;

  const {
    data: petVaccinations = [],
    isLoading: isVaccinationsLoading,
    isError: isVaccinationsError,
  } = usePetVaccinations(currentPetId);

  //  Логіка  щеплень
  const openVaccinationModal = (
    owner: any,
    ownerPets: any[],
  ): void => {
    setSelectedOwnerDetail({ owner, pets: ownerPets });
    const firstPetId =
      ownerPets && ownerPets.length > 0 ? ownerPets[0].id : null;
    setSelectedPetId(firstPetId);
    setVaccinationRows([{ id: 1, vaccineType: '', date: '' }]);
  };

  const closeVaccinationModal = (): void => {
    setSelectedOwnerDetail(null);
    setSelectedPetId(null);
    setVaccinationRows([
      { id: 1, vaccineType: '', date: '' },
    ]);
  };

  const handleAddVaccinationRow = (): void => {
    setVaccinationRows((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        vaccineType: '',
        date: '',
      },
    ]);
  };

  const handleRemoveVaccinationRow = (id: number): void => {
    setVaccinationRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((row) => row.id !== id),
    );
  };

  const handleVaccinationRowChange = (
    id: number,
    field: 'vaccineType' | 'date',
    value: string,
  ): void => {
    setVaccinationRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    );
  };

  const handleSubmitVaccinations = (
    e: FormEvent<HTMLFormElement>,
  ): void => {
    e.preventDefault();

    if (!selectedOwnerDetail) {
      alert('Немає вибраного клієнта.');
      return;
    }

    if (!selectedPetId) {
      alert('Оберіть тварину для щеплень.');
      return;
    }

    const vaccines = vaccinationRows
      .filter((row) => row.vaccineType && row.date)
      .map((row) => ({
        type: row.vaccineType,
        date: row.date,
      }));

    if (vaccines.length === 0) {
      alert('Заповніть хоча б одне щеплення (тип і дату).');
      return;
    }


    saveVaccinationsMutation.mutate(
      { petId: selectedPetId, vaccines },
      {
        onSuccess: () => {
          setVaccinationRows([
            { id: 1, vaccineType: '', date: '' },
          ]);
        },
        onError: () => {
          alert(
            'Не вдалося зберегти щеплення. Перевірте бекенд /vaccinations.',
          );
        },
      },
    );
  };

  const roleLabel = user.role === 'admin' ? 'Admin' : 'Doctor';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ======= ШАПКА САЙТУ (як у сторінки лікаря) ======= */}
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <div className="text-sm font-medium text-slate-700">
          Роль{' '}
          <span className="font-semibold text-blue-700">
            {roleLabel}
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
            DR
          </div>
          <span>Особистий кабінет</span>
        </button>
      </header>

      {/* ОСНОВНИЙ КОНТЕНТ  */}
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

        <section className="mx-auto max-w-5xl space-y-4">
          {/* Вибір лікаря */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                Пацієнти лікаря
              </h1>
              <p className="text-sm text-slate-500">
                Список клієнтів, які мають візити до обраного лікаря.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">
                Лікар:
              </span>
              <select
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm"
                value={selectedDoctorId ?? ''}
                onChange={(e) =>
                  setSelectedDoctorId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                disabled={
                  isDoctorsLoading ||
                  !doctorOptions ||
                  doctorOptions.length === 0 ||
                  user.role === 'doctor'
                }
              >
                <option value="">Оберіть лікаря</option>
                {doctorOptions.map((doc: any) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.fullName}
                    {doc.position ? ` — ${doc.position}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingAll ? (
            <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">
                Завантаження даних про пацієнтів...
              </p>
            </div>
          ) : isErrorAny ? (
            <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-red-500">
                Не вдалося завантажити дані.
              </p>
              {appointmentsError instanceof Error && (
                <p className="text-xs text-red-400">
                  Помилка розкладу: {appointmentsError.message}
                </p>
              )}
              {ownersError instanceof Error && (
                <p className="text-xs text-red-400">
                  Помилка власників: {ownersError.message}
                </p>
              )}
              {petsError instanceof Error && (
                <p className="text-xs text-red-400">
                  Помилка тварин: {petsError.message}
                </p>
              )}
            </div>
          ) : !selectedDoctorId || !currentDoctor ? (
            <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">
                Спочатку оберіть лікаря зі списку.
              </p>
            </div>
          ) : doctorPatients.length === 0 ? (
            <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">
                Наразі немає пацієнтів, закріплених за цим лікарем.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {doctorPatients.map(({ owner, pets: ownerPets }) => (
                <div
                  key={owner.id}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">
                      {owner.fullName}
                    </h3>
                    <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                      {owner.phone && <p>Телефон: {owner.phone}</p>}
                      {owner.email && <p>Email: {owner.email}</p>}
                      {owner.address && <p>Адреса: {owner.address}</p>}
                    </div>

                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700">
                        Тварини:
                      </p>
                      {ownerPets.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Тваринки не зареєстровані.
                        </p>
                      ) : (
                        <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                          {ownerPets.map((petItem: any) => {
                            const type = formatPetType(
                              petItem.breed ??
                                petItem.species ??
                                petItem.type ??
                                petItem.kind ??
                                null,
                            );
                            return (
                              <li key={petItem.id}>
                                {petItem.name}
                                {type !== '—' ? ` (${type})` : ''}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      Пацієнт лікаря
                    </span>

                    <button
                      type="button"
                      className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      onClick={() =>
                        openVaccinationModal(owner, ownerPets)
                      }
                    >
                      Деталі
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/*  ЩЕПЛЕННЯ */}
      {selectedOwnerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Оновити щеплення
              </h2>
              <button
                type="button"
                className="text-xl leading-none text-slate-500 hover:text-slate-700"
                onClick={closeVaccinationModal}
              >
                ×
              </button>
            </div>


            <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">
                Клієнт: {selectedOwnerDetail.owner.fullName}
              </p>
              <div className="mt-1 space-y-0.5 text-slate-600">
                {selectedOwnerDetail.owner.phone && (
                  <p>Телефон: {selectedOwnerDetail.owner.phone}</p>
                )}
                {selectedOwnerDetail.owner.email && (
                  <p>Email: {selectedOwnerDetail.owner.email}</p>
                )}
                {selectedOwnerDetail.owner.address && (
                  <p>Адреса: {selectedOwnerDetail.owner.address}</p>
                )}
              </div>

              <div className="mt-2">
                <p className="font-medium text-slate-700">
                  Тварини:
                </p>
                {selectedOwnerDetail.pets.length === 0 ? (
                  <p className="text-slate-500">
                    Тваринки не зареєстровані.
                  </p>
                ) : (
                  <ul className="mt-1 list-disc pl-5 text-slate-700">
                    {selectedOwnerDetail.pets.map((pet: any) => {
                      const type = formatPetType(
                        pet.breed ??
                          pet.species ??
                          pet.type ??
                          pet.kind ??
                          null,
                      );
                      return (
                        <li key={pet.id}>
                          {pet.name}
                          {type !== '—' ? ` (${type})` : ''}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Форма щеплень */}
            <form
              className="space-y-4"
              onSubmit={handleSubmitVaccinations}
            >
              {/* Обрати тварину для щеплення */}
              <div>
                <label className="block text-sm font-medium">
                  Тварина
                </label>
                <select
                  className="mt-1 w-full rounded border p-2 text-sm"
                  value={selectedPetId ?? ''}
                  onChange={(e) =>
                    setSelectedPetId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">Оберіть тварину</option>
                  {selectedOwnerDetail.pets.map((pet: any) => {
                    const type = formatPetType(
                      pet.breed ??
                        pet.species ??
                        pet.type ??
                        pet.kind ??
                        null,
                    );
                    return (
                      <option key={pet.id} value={pet.id}>
                        {pet.name}
                        {type !== '—' ? ` (${type})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Рядки для введення нових щеплень */}
              <div className="space-y-3">
                {vaccinationRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1.4fr,1fr,auto] items-end gap-3"
                  >
                    <div>
                      <label className="block text-sm font-medium">
                        Тип вакцини
                      </label>
                      <select
                        className="mt-1 w-full rounded border p-2 text-sm"
                        value={row.vaccineType}
                        onChange={(e) =>
                          handleVaccinationRowChange(
                            row.id,
                            'vaccineType',
                            e.target.value,
                          )
                        }
                      >
                        <option value="">
                          Оберіть тип вакцини
                        </option>
                        <option value="Проти сказу">
                          Проти сказу
                        </option>
                        <option value="Комплексна">
                          Комплексна
                        </option>
                        <option value="Проти чумки">
                          Проти чумки
                        </option>
                        <option value="Інша">
                          Інша
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium">
                        Дата зроблення
                      </label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded border p-2 text-sm"
                        value={row.date}
                        onChange={(e) =>
                          handleVaccinationRowChange(
                            row.id,
                            'date',
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div className="flex gap-2">
                      {index === vaccinationRows.length - 1 && (
                        <button
                          type="button"
                          className="mt-6 rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          onClick={handleAddVaccinationRow}
                        >
                          +
                        </button>
                      )}
                      {vaccinationRows.length > 1 && (
                        <button
                          type="button"
                          className="mt-6 rounded-full border border-red-300 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
                          onClick={() =>
                            handleRemoveVaccinationRow(row.id)
                          }
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Таблиця історії щеплень */}
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                <p className="mb-2 font-medium text-slate-700">
                  Історія щеплень для обраної тварини
                </p>

                {currentPetId == null ? (
                  <p className="text-xs text-slate-500">
                    Спочатку оберіть тварину вище.
                  </p>
                ) : isVaccinationsLoading ? (
                  <p className="text-xs text-slate-500">
                    Завантаження щеплень...
                  </p>
                ) : isVaccinationsError ? (
                  <p className="text-xs text-red-500">
                    Не вдалося завантажити щеплення.
                  </p>
                ) : petVaccinations.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Для цієї тварини ще не зареєстровано щеплень.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="border-b border-slate-200 px-2 py-1 text-left font-semibold">
                            Назва щеплення
                          </th>
                          <th className="border-b border-slate-200 px-2 py-1 text-left font-semibold">
                            Дата
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {petVaccinations.map((v: any) => {
                          const rawDate =
                            v.vaccinationDate ?? v.description ?? null;

                          let dateStr = '—';
                          if (rawDate) {
                            const d = new Date(rawDate);
                            dateStr = Number.isNaN(d.getTime())
                              ? String(rawDate)
                              : d.toLocaleDateString('uk-UA');
                          }

                          return (
                            <tr key={v.id}>
                              <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                                {v.type}
                              </td>
                              <td className="border-b border-slate-100 px-2 py-1 text-slate-600">
                                {dateStr}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Кнопки */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={closeVaccinationModal}
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={saveVaccinationsMutation.isPending}
                >
                  {saveVaccinationsMutation.isPending
                    ? 'Збереження...'
                    : 'Оновити щеплення'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/doctor_list')({
  component: DoctorPatientsPage,
});
