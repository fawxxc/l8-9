import { z } from 'zod';

export const ownerSchema = z.object({
	fullName: z.string().min(3, 'Name is too short'),
	email: z.string().email('Invalid email'),
	phone: z.string().min(5, 'Phone is too short'),
	address: z.string().min(3, 'Address is too short'),
});

export type OwnerFormData = z.infer<typeof ownerSchema>;
