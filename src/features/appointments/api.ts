// src/features/appointments/api.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// DTO, як його реально використовуєш у фронті
export type AppointmentDto = {
  id: number;
  data: string; // дата/час прийому (серіалізований Date)
  reason: string | null;
  status: string | null;
  diagnosis: string | null;

  pet?: {
    id: number;
    name: string;
    // щоб не сварився TS, якщо бекенд повертає це
    breed?: string | null;
    species?: string | null;
    type?: string | null;
    kind?: string | null;
    owner?: {
      id: number;
      fullName?: string | null;
    } | null;
  };

  employee?: {
    id: number;
    fullName?: string | null;
    full_name?: string | null;
  };

  // на випадок, якщо бекенд лениво кладе окремо owner
  owner?: {
    id: number;
    fullName?: string | null;
  } | null;
};

// payload для створення запису
export type CreateAppointmentPayload = {
  petId: number;
  doctorId: number;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  visitType?: string;
};

// payload для завершення запису
export type FinishAppointmentPayload = {
  id: number;
  diagnosis?: string; // симптоми / діагноз, можна не передавати
};

// ----- HTTP-функції -----

export async function getAppointments(): Promise<AppointmentDto[]> {
  const res = await api.get<AppointmentDto[]>('/appointments');
  return res.data;
}

export async function createAppointment(
  payload: CreateAppointmentPayload,
): Promise<AppointmentDto> {
  const res = await api.post<AppointmentDto>('/appointments', payload);
  return res.data;
}

export async function deleteAppointment(id: number): Promise<void> {
  await api.delete(`/appointments/${id}`);
}

export async function finishAppointment(
  payload: FinishAppointmentPayload,
): Promise<AppointmentDto> {
  const res = await api.patch<AppointmentDto>(`/appointments/${payload.id}`, {
    status: 'completed', // або 'done' — але ми вже на фронті фільтруємо обидва
    diagnosis: payload.diagnosis ?? null,
  });

  return res.data;
}

// ----- React Query хуки -----

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: getAppointments,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useFinishAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: finishAppointment,
    onSuccess: () => {
      // оновлюємо всі місця, де використовується розклад/історія
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
