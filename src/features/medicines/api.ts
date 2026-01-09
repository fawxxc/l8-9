// src/features/medicines/api.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type MedicineDto = {
  id: number;
  name: string;
  stock: number;
  unit: string;
};

export type MedicineRequestDto = {
  id: number;
  vaccineType: string;
  quantity: number;
  reason: string;
  status: string;
  createdAt: string;
  deliveredQuantity?: number | null;
  isPaid?: boolean | null;
};

export async function getMedicines(): Promise<MedicineDto[]> {
  const res = await api.get<MedicineDto[]>('/medicines');
  return res.data;
}

export function useMedicines() {
  return useQuery({
    queryKey: ['medicines'],
    queryFn: getMedicines,
  });
}

export async function getMedicineRequests(): Promise<MedicineRequestDto[]> {
  const res = await api.get<MedicineRequestDto[]>('/medicines/requests');
  return res.data;
}

export function useMedicineRequests() {
  return useQuery({
    queryKey: ['medicineRequests'],
    queryFn: getMedicineRequests,
  });
}

// створення запиту з doctor_medicine
export async function createMedicineRequest(payload: {
  vaccineType: string;
  quantity: number;
  reason: string;
}): Promise<MedicineRequestDto> {
  const res = await api.post<MedicineRequestDto>(
    '/medicines/requests',
    payload,
  );
  return res.data;
}

export function useCreateMedicineRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMedicineRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['medicineRequests'],
      });
    },
  });
}

// ✅ ПІДТВЕРДЖЕННЯ ПОСТАВКИ
export async function approveMedicineRequest(
  id: number,
  payload: { deliveredQuantity: number },
): Promise<MedicineRequestDto> {
  const res = await api.post<MedicineRequestDto>(
    `/medicines/requests/${id}/approve`,
    payload,
  );
  return res.data;
}

export function useApproveMedicineRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      deliveredQuantity,
    }: {
      id: number;
      deliveredQuantity: number;
    }) => approveMedicineRequest(id, { deliveredQuantity }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['medicineRequests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['medicines'],
      });
    },
  });
}

// ✅ ОПЛАТА ЗАПИТУ
export async function payMedicineRequest(
  id: number,
): Promise<MedicineRequestDto> {
  const res = await api.post<MedicineRequestDto>(
    `/medicines/requests/${id}/pay`,
  );
  return res.data;
}

export function usePayMedicineRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => payMedicineRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['medicineRequests'],
      });
    },
  });
}
