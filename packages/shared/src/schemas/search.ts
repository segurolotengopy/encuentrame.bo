import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().max(120).optional(),
  categoryId: z.string().max(40).optional(),
  /** Celdas geohash visibles en el mapa (precisión GEO_TILE_PRECISION). */
  tiles: z.array(z.string().min(3).max(8)).max(12).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const SearchResultItemSchema = z.object({
  stallId: z.string(),
  stallName: z.string(),
  categoryId: z.string(),
  geohash: z.string(),
  lat: z.number(),
  lng: z.number(),
  openingId: z.string(),
  matchedOn: z.enum(['product', 'stall', 'seller', 'category']).optional(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;
