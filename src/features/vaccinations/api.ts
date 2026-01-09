// src/features/vaccinations/api.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type VaccinationDto = {
  id: number;
  type: string;
  description?: string | null;      // може містити дату, якщо так вирішила
  vaccinationDate?: string | null;  // або окреме поле в БД
  animalId?: number;
};

export type VaccinationInput = {
  type: string;
  date?: string;        // 'YYYY-MM-DD'
  description?: string; // опціонально
};

export type CreateVaccinationsPayload = {
  petId: number;
  vaccines: VaccinationInput[];
};

// GET /vaccinations/animal/:petId
export async function getVaccinationsByPet(
  petId: number,
): Promise<VaccinationDto[]> {
  const res = await api.get<VaccinationDto[]>(`/vaccinations/animal/${petId}`);
  return res.data;
}

export function useVaccinations(petId: number | null) {
  return useQuery({
    queryKey: ['vaccinations', petId],
    enabled: petId != null,
    queryFn: () =>
      petId == null ? Promise.resolve([]) : getVaccinationsByPet(petId),
  });
}

// 👇 Щоб не було помилки "не експортує usePetVaccinations"
export function usePetVaccinations(petId: number | null) {
  return useVaccinations(petId);
}

// POST /vaccinations
export async function createVaccinations(
  payload: CreateVaccinationsPayload,
): Promise<VaccinationDto[]> {
  const res = await api.post<VaccinationDto[]>('/vaccinations', payload);
  return res.data;
}

export function useSaveVaccinations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVaccinations,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['vaccinations', variables.petId],
      });
    },
  });
}
