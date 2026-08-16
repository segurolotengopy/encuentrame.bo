import { z } from 'zod';

export const StallStatusSchema = z.enum(['open', 'closed']);

export const StallSchema = z.object({
  ownerUid: z.string().min(1),
  name: z.string().min(1).max(80),
  categoryId: z.string().min(1).max(40),
  address: z.string().max(160).optional(),
  /** Si el vendedor prefiere mostrar radio aproximado en vez de punto exacto (metros). */
  privacyRadius: z.number().int().min(0).max(500).optional(),
  status: StallStatusSchema,
});

export const CreateStallInputSchema = StallSchema.omit({ ownerUid: true, status: true });

export type Stall = z.infer<typeof StallSchema>;
export type CreateStallInput = z.infer<typeof CreateStallInputSchema>;
