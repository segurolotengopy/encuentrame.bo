import { z } from 'zod';

export const RoleSchema = z.enum(['buyer', 'seller']);

export const UserProfileSchema = z.object({
  displayName: z.string().min(1).max(80),
  roles: z.array(RoleSchema).min(1),
  phone: z.string().max(20).optional(),
  photoUrl: z.string().url().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Role = z.infer<typeof RoleSchema>;
