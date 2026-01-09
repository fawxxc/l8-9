import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.enum(['owner', 'doctor', 'admin']),
});

export type LoginFormData = z.infer<typeof loginSchema>;
