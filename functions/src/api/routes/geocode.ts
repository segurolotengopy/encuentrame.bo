import { Hono } from 'hono';
import { z } from 'zod';
import { rateLimit } from '../middleware/ratelimit.js';
import { geocodeAddress } from '../../services/geocode.js';

export const geocode = new Hono();

geocode.use('*', rateLimit('geocode'));

const QuerySchema = z.object({ address: z.string().min(4).max(160) });

/**
 * GET /v1/geocode?address=...
 * Proxy con caché a Google Geocoding API. La llave vive en Secret Manager
 * (GEOCODING_API_KEY) y JAMÁS llega al cliente. Estrategia híbrida de mapas:
 * el mapa usa tiles OSM gratis; geocoding puntual y de bajo volumen va aquí.
 */
geocode.get('/', async (c) => {
  const parsed = QuerySchema.safeParse({ address: c.req.query('address') });
  if (!parsed.success) return c.json({ error: 'invalid_query' }, 400);
  const result = await geocodeAddress(parsed.data.address);
  if (!result) return c.json({ error: 'not_found' }, 404);
  return c.json(result);
});
