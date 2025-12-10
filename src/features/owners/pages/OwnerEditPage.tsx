import { useEffect, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useParams } from '@tanstack/react-router';
import { ownerSchema, type OwnerFormData } from '@/features/owners/OwnerFormSchema.ts';
import { useOwner, useUpdateOwner } from '@/features/owners/api.ts';

export function OwnerEditPage(): JSX.Element {
	const { ownerId } = useParams({ from: '/owners/$ownerId' as never });
	const { data: owner, isLoading, isError } = useOwner(ownerId);
	const updateOwnerMutation = useUpdateOwner();

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<OwnerFormData>({
		resolver: zodResolver(ownerSchema),
	});

	useEffect(() => {
		if (owner) {
			reset({
				fullName: owner.fullName,
				email: owner.email,
				phone: owner.phone,
				address: owner.address,
			});
		}
	}, [owner, reset]);

	const onSubmit = (data: OwnerFormData): void => {
		updateOwnerMutation.mutate({ id: ownerId, data });
	};

	if (isLoading) {
		return <div>Loading owner...</div>;
	}

	if (isError || !owner) {
		return <div>Owner not found or failed to load.</div>;
	}

	return (
		<div className="p-4">
			<h1 className="mb-4 text-2xl font-bold">Edit Owner: {owner.fullName}</h1>
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
					disabled={updateOwnerMutation.isPending}
					type="submit"
				>
					{updateOwnerMutation.isPending ? 'Saving...' : 'Save changes'}
				</button>
			</form>
		</div>
	);
}

export const Route = createFileRoute('/owners/$ownerId' as never)({
	component: OwnerEditPage,
});
