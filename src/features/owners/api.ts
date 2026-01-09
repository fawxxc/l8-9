// src/features/owners/api.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';

import apiClient from '@/shared/api/axios';
import type {
  Owner,
  CreateOwnerDto,
  UpdateOwnerDto,
} from '@/features/owners/types';

type OwnerApi = {
  id?: number;
  ownerId?: number;
  owner_id?: number;

  email?: string;
  phone?: string;
  address?: string | null;

  fullName?: string;
  full_name?: string;
};

// ✅ дістаємо owner, якщо бекенд обгортає відповідь
const unwrapOwnerApi = (payload: any): OwnerApi => {
  if (payload && typeof payload === 'object') {
    if (payload.owner && typeof payload.owner === 'object')
      return payload.owner as OwnerApi;
    if (payload.data && typeof payload.data === 'object')
      return payload.data as OwnerApi;
    if (payload.result && typeof payload.result === 'object')
      return payload.result as OwnerApi;
  }
  return payload as OwnerApi;
};

// ✅ дістаємо масив owners, якщо бекенд обгортає відповідь
const unwrapOwnersList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === 'object') {
    const list =
      payload.items ??
      payload.owners ??
      payload.data ??
      payload.result;

    if (Array.isArray(list)) return list;
  }

  return [];
};

const mapOwner = (raw: any): Owner => {
  const o = unwrapOwnerApi(raw);

  const id = o.id ?? o.ownerId ?? o.owner_id;

  if (id == null) {
    console.error('Owner response without id:', raw);
    throw new Error('Backend did not return owner id');
  }

  return {
    id,
    fullName: o.fullName ?? o.full_name ?? '',
    email: o.email ?? '',
    phone: o.phone ?? '',
    address: o.address ?? '',
  };
};

// ===== GET =====

const getOwners = async (): Promise<Owner[]> => {
  const response = await apiClient.get<any>('/owners');
  const list = unwrapOwnersList(response.data);
  return list.map(mapOwner);
};

const getOwnerById = async (id: string): Promise<Owner> => {
  const response = await apiClient.get<any>(`/owners/${id}`);
  return mapOwner(response.data);
};

// список власників
export const useOwners = (): UseQueryResult<Owner[], Error> =>
  useQuery<Owner[], Error>({
    queryKey: ['owners'],
    queryFn: getOwners,
  });

// один власник за id ✅ (бо його імпортує OwnerEditPage)
export const useOwner = (id: string): UseQueryResult<Owner, Error> =>
  useQuery<Owner, Error>({
    queryKey: ['owners', id],
    queryFn: () => getOwnerById(id),
    enabled: !!id,
  });

// ===== CREATE =====

export const createOwner = async (
  newOwner: CreateOwnerDto,
): Promise<Owner> => {
  const response = await apiClient.post<any>('/owners', newOwner);
  return mapOwner(response.data);
};

export const useCreateOwner = (): UseMutationResult<
  Owner,
  Error,
  CreateOwnerDto,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation<Owner, Error, CreateOwnerDto>({
    mutationFn: createOwner,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['owners'] });
    },
  });
};

// ===== UPDATE =====

export const updateOwner = async (
  id: string,
  data: UpdateOwnerDto,
): Promise<Owner> => {
  const response = await apiClient.put<any>(`/owners/${id}`, data);
  return mapOwner(response.data);
};

export const useUpdateOwner = (): UseMutationResult<
  Owner,
  Error,
  { id: string; data: UpdateOwnerDto },
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation<Owner, Error, { id: string; data: UpdateOwnerDto }>({
    mutationFn: ({ id, data }) => updateOwner(id, data),
    onSuccess: (updatedOwner) => {
      void queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.setQueryData(
        ['owners', String(updatedOwner.id)],
        updatedOwner,
      );
    },
  });
};

// ===== DELETE =====

export const deleteOwner = async (id: string): Promise<void> => {
  await apiClient.delete(`/owners/${id}`);
};

export const useDeleteOwner = (): UseMutationResult<
  void,
  Error,
  string,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteOwner,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['owners'] });
    },
  });
};
