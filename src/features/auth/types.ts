export type AuthUser = {
  id: number;
  email: string;
  role: 'admin' | 'doctor' | 'owner';
  ownerId?: number | null;
  doctorId?: number | null;
  mustChangePassword?: boolean; // 👈 важливо для редіректу на /set-password
};
