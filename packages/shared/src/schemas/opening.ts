import { z } from 'zod';

export const OpeningStatusSchema = z.enum(['pending', 'verified', 'rejected']);

export const OpeningSchema = z.object({
  ownerUid: z.string().min(1),
  stallId: z.string().min(1),
  stallName: z.string().max(80).optional(),
  categoryId: z.string().max(40).optional(),
  status: OpeningStatusSchema,
  geohash: z.string().min(4).max(12),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  photoPath: z.string().min(1).max(300),
  /** Etiquetas de productos detectadas por la IA en la foto. */
  aiLabels: z.array(z.string().max(60)).optional(),
  aiReason: z.string().max(300).optional(),
});

export const CreateOpeningInputSchema = z.object({
  stallId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  photoPath: z.string().min(1).max(300),
});

export type Opening = z.infer<typeof OpeningSchema>;
export type OpeningStatus = z.infer<typeof OpeningStatusSchema>;
export type CreateOpeningInput = z.infer<typeof CreateOpeningInputSchema>;
