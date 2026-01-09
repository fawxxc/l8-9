// src/features/pets/api.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/shared/api/axios';

export type Pet = {
  id: number;
  name: string;
  breed?: string | null;
  age?: number | null;
  weight?: number | null;
  gender?: string | null;
  ownerId: number;
};

type PetApi = {
  id?: number;
  name?: string;
  breed?: string | null;
  age?: number | null;
  weight?: number | null;
  gender?: string | null;

  ownerId?: number;
  owner_id?: number;
  owner?: { id?: number } | null;
};

const mapPet = (raw: any): Pet => {
  const p = raw as PetApi;

  const id = Number(p.id);
  const ownerId = Number(p.ownerId ?? p.owner_id ?? p.owner?.id);

  return {
    id,
    name: String(p.name ?? ''),
    breed: p.breed ?? null,
    age: p.age ?? null,
    weight: p.weight ?? null,
    gender: p.gender ?? null,
    ownerId,
  };
};

export const getPets = async (): Promise<Pet[]> => {
  const response = await apiClient.get<any>('/pets');

  if (Array.isArray(response.data)) return response.data.map(mapPet);

  const list = response.data?.items ?? response.data?.data ?? response.data?.pets;
  if (Array.isArray(list)) return list.map(mapPet);

  return [];
};

export const usePets = () =>
  useQuery({
    queryKey: ['pets'],
    queryFn: getPets,
  });

export type CreatePetDto = {
  name: string;
  breed?: string;
  age?: number;
  weight?: number;
  gender?: string;
  ownerId: number;
};

export const createPet = async (payload: CreatePetDto): Promise<Pet> => {
  const response = await apiClient.post<any>('/pets', payload);
  return mapPet(response.data);
};

export const useCreatePet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPet,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });
};
