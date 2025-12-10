import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import apiClient from '@/lib/axios';
import type { Owner, CreateOwnerDto, UpdateOwnerDto } from '@/features/owners/types';

// ===== GET-запити =====

const getOwners = async (): Promise<Array<Owner>> => {
  const response = await apiClient.get<Array<Owner>>('/owners');
  return response.data;
};

const getOwnerById = async (id: string): Promise<Owner> => {
  const response = await apiClient.get<Owner>(`/owners/${id}`);
  return response.data;
};

// ===== Хуки =====

// список власників
export const useOwners = (): UseQueryResult<Array<Owner>, Error> =>
  useQuery<Array<Owner>>({
    queryKey: ['owners'],
    queryFn: getOwners,
  });

// один власник за id
export const useOwner = (id: string): UseQueryResult<Owner, Error> =>
  useQuery<Owner>({
    queryKey: ['owners', id],
    queryFn: (): Promise<Owner> => getOwnerById(id),
    enabled: !!id,
  });

// створення
export const useCreateOwner = (): UseMutationResult<
  Owner,
  Error,
  CreateOwnerDto,
  unknown
> => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<Owner, Error, CreateOwnerDto>({
    mutationFn: async (newOwner: CreateOwnerDto): Promise<Owner> => {
      const response = await apiClient.post<Owner>('/owners', newOwner);
      return response.data;
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['owners'] });
      void navigate({ to: '/owners' } as never);
    },
  });
};

// оновлення
export const useUpdateOwner = (): UseMutationResult<
  Owner,
  Error,
  { id: string; data: UpdateOwnerDto },
  unknown
> => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<Owner, Error, { id: string; data: UpdateOwnerDto }>({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOwnerDto }): Promise<Owner> => {
      const response = await apiClient.put<Owner>(`/owners/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedOwner: Owner): void => {
      void queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.setQueryData(['owners', String(updatedOwner.id)], updatedOwner);
      void navigate({ to: '/owners' } as never);
    },
  });
};

// видалення
export const useDeleteOwner = (): UseMutationResult<void, Error, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/owners/${id}`);
    },
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['owners'] });
    },
  });
};
