import { Hono } from 'hono';
import { SearchQuerySchema, searchTokens, type SearchResultItem } from '@encuentrame/shared';
import { db } from '../../lib/firestore.js';
import { rateLimit } from '../middleware/ratelimit.js';
import { cached } from '../../services/cache.js';

export const search = new Hono();

search.use('*', rateLimit('search'));

/**
 * GET /v1/search?q=&categoryId=&tiles=a,b,c
 * Lee EXCLUSIVAMENTE meta-índices precomputados (search_index, geo_tiles):
 * nunca escanea colecciones base. Complejidad O(celdas visibles + tokens).
 */
search.get('/', async (c) => {
  const parsed = SearchQuerySchema.safeParse({
    q: c.req.query('q'),
    categoryId: c.req.query('categoryId'),
    tiles: c.req.query('tiles')?.split(',').filter(Boolean),
    limit: c.req.query('limit'),
  });
  if (!parsed.success) return c.json({ error: 'invalid_query', details: parsed.error.flatten() }, 400);
  const { q, categoryId, tiles, limit } = parsed.data;

  // 1) Universo geoespacial: puestos abiertos en las celdas visibles (1 doc por celda)
  const tileIds = (tiles ?? []).slice(0, 12);
  const tileKey = `tiles:${tileIds.join('|')}`;
  const openByTile = await cached(tileKey, 30_000, async () => {
    if (tileIds.length === 0) return [] as SearchResultItem[];
    const snaps = await db.getAll(...tileIds.map((t) => db.collection('geo_tiles').doc(t)));
    return snaps.flatMap((s) => ((s.data()?.entries as SearchResultItem[] | undefined) ?? []));
  });

  let results = openByTile;

  // 2) Filtro por categoría
  if (categoryId) results = results.filter((r) => r.categoryId === categoryId);

  // 3) Filtro por texto vía índice invertido
  if (q && q.trim().length > 1) {
    const tokens = searchTokens(q).slice(0, 5);
    const matchedStallIds = new Set<string>();
    const shards = await db
      .collection('search_index')
      .where('tokens', 'array-contains-any', tokens)
      .limit(50)
      .get();
    shards.forEach((doc) => {
      for (const sid of (doc.data().stallIds as string[] | undefined) ?? []) matchedStallIds.add(sid);
    });
    results = results.filter((r) => matchedStallIds.has(r.stallId));
  }

  return c.json({ items: results.slice(0, limit), total: results.length });
});
