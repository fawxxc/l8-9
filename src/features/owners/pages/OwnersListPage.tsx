import { useOwners, useDeleteOwner } from '@/features/owners/api';
import type { JSX } from "react";

export function OwnersListPage(): JSX.Element {
  const { data: owners, isLoading, isError, error } = useOwners();
  const deleteOwnerMutation = useDeleteOwner();

  const handleDelete = (id: string): void => {
    if (window.confirm('Видалити цього власника?')) {
      deleteOwnerMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div>Loading owners...</div>;
  }

  if (isError) {
    return <div>Error loading owners: {error.message}</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Owners</h1>
				<a
					className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
					href="/owners/new"
				>
					Create New Owner
				</a>
			</div>

      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="border-b px-4 py-2">Full name</th>
            <th className="border-b px-4 py-2">Email</th>
            <th className="border-b px-4 py-2">Phone</th>
            <th className="border-b px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {owners?.map((owner) => (
            <tr key={owner.id}>
              <td className="border-b px-4 py-2">{owner.fullName}</td>
              <td className="border-b px-4 py-2">{owner.email}</td>
              <td className="border-b px-4 py-2">{owner.phone}</td>
							<td className="border-b px-4 py-2 text-center">
								<a
									className="mr-4 text-indigo-600 hover:text-indigo-900"
									href={`/owners/${owner.id}`}
								>
									Edit
								</a>

								<button
									className="text-red-600 hover:text-red-900 disabled:opacity-50"
									disabled={deleteOwnerMutation.isPending}
									type="button"
									onClick={(): void => { handleDelete(String(owner.id)); }}
								>
									Delete
								</button>
							</td>

						</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
