// src/routes/doctor_list.$ownerId.tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import type { JSX } from 'react';

import vetLogo from '@/assets/vet-logo.png';
import { useOwners } from '@/features/owners/api';
import { usePets } from '@/features/pets/api';

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

function DoctorOwnerDetailsPage(): JSX.Element {
  const { ownerId } = Route.useParams();
  const ownerIdNum = Number(ownerId);

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

  const owner = (owners as any[] | undefined)?.find(
    (o) => o.id === ownerIdNum,
  );

  const ownerPets =
    (pets as any[] | undefined)?.filter(
      (p) => p.ownerId === ownerIdNum,
    ) ?? [];

  const isLoading = isOwnersLoading || isPetsLoading;
  const isError = isOwnersError || isPetsError;

  const handleAddVaccination = (petId?: number): void => {
    alert(
      petId
        ? `Додати щеплення для тваринки з id=${petId} (демо).`
        : 'Додати щеплення (демо).',
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Шапка як у лікаря */}
      <header className="flex items-center justify-between bg-white px-6 py-3 shadow">
        <div className="text-sm font-medium text-slate-700">
          Роль{' '}
          <span className="font-semibold text-blue-700">
            Doctor
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
          className="flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white/10 text-xs font-semibold">
            DR
          </div>
          <span>Особистий кабінет</span>
        </button>
      </header>

      <main className="p-4">
        <section className="mx-auto max-w-4xl space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-800">
              Детальна інформація про клієнта
            </h1>
            <Link
              to="/doctor_list"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← До списку пацієнтів
            </Link>
          </div>

          {isLoading ? (
            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">
                Завантаження інформації про клієнта...
              </p>
            </div>
          ) : isError ? (
            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-red-500">
                Не вдалося завантажити дані.
              </p>
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
          ) : !owner ? (
            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-slate-500">
                Клієнта з таким ID не знайдено.
              </p>
            </div>
          ) : (
            <>
              {/* Картка з даними клієнта */}
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-2 text-lg font-semibold text-slate-800">
                  {owner.fullName}
                </h2>
                <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <div>
                    <p className="font-medium">Контакти</p>
                    <ul className="mt-1 space-y-0.5">
                      {owner.phone && <li>Телефон: {owner.phone}</li>}
                      {owner.email && <li>Email: {owner.email}</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Адреса</p>
                    <p className="mt-1">
                      {owner.address ?? 'Не вказано'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Список тварин клієнта */}
              <div className="rounded-2xl bg-white p-5 shadow">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">
                    Тварини клієнта
                  </h3>
                  {ownerPets.length > 0 && (
                    <button
                      type="button"
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                      onClick={() => handleAddVaccination()}
                    >
                      Додати щеплення
                    </button>
                  )}
                </div>

                {ownerPets.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    У клієнта ще не зареєстровано жодної тварини.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="border px-3 py-2 text-left">
                            Ім&apos;я
                          </th>
                          <th className="border px-3 py-2 text-left">
                            Улюбленець
                          </th>
                          <th className="border px-3 py-2 text-left">
                            Вік
                          </th>
                          <th className="border px-3 py-2 text-left">
                            Вага
                          </th>
                          <th className="border px-3 py-2 text-left">
                            Стать
                          </th>
                          <th className="border px-3 py-2 text-right">
                            Дії
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerPets.map((pet) => {
                          const type = formatPetType(
                            pet.breed ??
                              pet.species ??
                              pet.type ??
                              pet.kind ??
                              null,
                          );
                          return (
                            <tr key={pet.id} className="hover:bg-slate-50">
                              <td className="border px-3 py-2">
                                {pet.name}
                              </td>
                              <td className="border px-3 py-2">
                                {type}
                              </td>
                              <td className="border px-3 py-2">
                                {pet.age != null ? `${pet.age} років` : '—'}
                              </td>
                              <td className="border px-3 py-2">
                                {pet.weight != null ? `${pet.weight} кг` : '—'}
                              </td>
                              <td className="border px-3 py-2">
                                {pet.gender === 'male'
                                  ? 'Самець'
                                  : pet.gender === 'female'
                                    ? 'Самка'
                                    : '—'}
                              </td>
                              <td className="border px-3 py-2 text-right">
                                <button
                                  type="button"
                                  className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                  onClick={() =>
                                    handleAddVaccination(pet.id)
                                  }
                                >
                                  Додати щеплення
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/doctor_list/$ownerId')({
  component: DoctorOwnerDetailsPage,
});
