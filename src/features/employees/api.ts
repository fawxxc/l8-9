import { useQuery } from '@tanstack/react-query';
import { api } from '@/axios';

export type Doctor = {
  id: number;
  fullName: string;
  position?: string | null;
};

export const getDoctors = async () => {
  const res = await api.get('/employees/doctors');
  return res.data as Doctor[];
};

export const useDoctors = () =>
  useQuery({
    queryKey: ['doctors'],
    queryFn: getDoctors,
  });
