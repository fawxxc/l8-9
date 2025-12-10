import { createFileRoute } from '@tanstack/react-router';
import { useOwners } from '@/features/owners/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ownerSchema, type OwnerFormData } from '@/features/owners/OwnerFormSchema';
import type { JSX } from "react";

function OwnersPage(): JSX.Element {
  const {
    data: owners,
    isLoading,
    isError,
    error,
  } = useOwners();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
  });

  const onSubmit = (data: OwnerFormData): void => {
    console.log('Demo form submit:', data);
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Owners demo</h1>


      <section className="mb-8">
        {isLoading && <p>Loading owners...</p>}

        {isError && (
          <p className="text-red-500">
            Error loading owners:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        )}

        {!isLoading && !isError && (
          <div>
            <h2 className="mb-2 text-xl font-semibold">Owners list</h2>
            {owners && owners.length > 0 ? (
              <ul className="list-disc pl-5">
                {owners.map((owner) => (
                  <li key={owner.id}>
                    {owner.fullName} — {owner.email} — {owner.phone}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No owners yet or API returned empty list.</p>
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">
          Create owner (demo form with Zod)
        </h2>

        <form
          className="space-y-4 max-w-md"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <label className="block font-medium" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              {...register('fullName')}
              className="w-full rounded border p-2"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              {...register('email')}
              className="w-full rounded border p-2"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              {...register('phone')}
              className="w-full rounded border p-2"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium" htmlFor="address">
              Address
            </label>
            <input
              id="address"
              {...register('address')}
              className="w-full rounded border p-2"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-500">
                {errors.address.message}
              </p>
            )}
          </div>

          <button
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            type="submit"
          >
            Create (demo)
          </button>
        </form>
      </section>
    </div>
  );
}

export const Route = createFileRoute('/owners')({
  component: OwnersPage,
});
