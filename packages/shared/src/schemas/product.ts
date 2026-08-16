import { z } from 'zod';

export const ProductSourceSchema = z.enum(['voice', 'photo', 'manual']);

export const ProductSchema = z.object({
  name: z.string().min(1).max(80),
  masterId: z.string().max(60).optional(),
  price: z.number().min(0).optional(),
  unit: z.string().max(20).optional(),
  stock: z.number().int().min(0).optional(),
  source: ProductSourceSchema.default('manual'),
  photoUrl: z.string().url().optional(),
});

/** Propuesta de productos que la IA devuelve para confirmación preventiva del vendedor. */
export const ProductProposalSchema = z.object({
  products: z.array(
    ProductSchema.pick({ name: true, price: true, unit: true, stock: true }).extend({
      confidence: z.number().min(0).max(1),
    }),
  ),
  rawTranscript: z.string().max(2000),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductProposal = z.infer<typeof ProductProposalSchema>;
