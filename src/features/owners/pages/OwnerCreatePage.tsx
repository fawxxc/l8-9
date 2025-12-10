import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateOwner } from '@/features/owners/api.ts';
import { ownerSchema, type OwnerFormData } from '@/features/owners/OwnerFormSchema.ts';
import type { JSX } from "react";

export function OwnerCreatePage(): JSX.Element {
  const createOwnerMutation = useCreateOwner();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
  });

  const onSubmit = (data: OwnerFormData): void => {
    createOwnerMutation.mutate(data);
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Create Owner</h1>
      <form
        className="space-y-4"
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
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:bg-gray-400"
          disabled={createOwnerMutation.isPending}
          type="submit"
        >
          {createOwnerMutation.isPending ? 'Saving...' : 'Create'}
        </button>
      </form>
    </div>
  );
}
