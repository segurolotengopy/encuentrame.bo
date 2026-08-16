import type { MiddlewareHandler } from 'hono';
import { db, FieldValue, Timestamp } from '../../lib/firestore.js';
import { DEFAULT_QUOTAS } from '@encuentrame/shared';
import type { AuthedEnv } from './auth.js';

type Bucket = 'openings' | 'voice' | 'search' | 'geocode';

const WINDOWS: Record<Bucket, { limit: number; windowSec: number }> = {
  openings: { limit: DEFAULT_QUOTAS.openingsPerDay, windowSec: 86400 },
  voice: { limit: DEFAULT_QUOTAS.voicePerDay, windowSec: 86400 },
  search: { limit: DEFAULT_QUOTAS.searchPerMinute, windowSec: 60 },
  geocode: { limit: DEFAULT_QUOTAS.geocodePerMinute, windowSec: 60 },
};

/**
 * Rate limiting por usuario (o IP para anónimos) con ventana fija en Firestore.
 * Sin Redis en el MVP: un documento por (sujeto, bucket, ventana) con contador
 * atómico y TTL (campo expireAt + política TTL de Firestore sobre rate_limits).
 */
export function rateLimit(bucket: Bucket): MiddlewareHandler<AuthedEnv> {
  const { limit, windowSec } = WINDOWS[bucket];
  return async (c, next) => {
    const subject =
      c.get('uid') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      'anonymous';
    const windowId = Math.floor(Date.now() / (windowSec * 1000));
    const ref = db.collection('rate_limits').doc(`${bucket}_${subject}_${windowId}`);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count = (snap.data()?.count as number | undefined) ?? 0;
      if (count >= limit) return { allowed: false, count };
      tx.set(
        ref,
        {
          count: FieldValue.increment(1),
          expireAt: Timestamp.fromMillis((windowId + 2) * windowSec * 1000),
        },
        { merge: true },
      );
      return { allowed: true, count: count + 1 };
    });
    if (!result.allowed) {
      c.header('Retry-After', String(windowSec));
      return c.json({ error: 'rate_limited', bucket, limit }, 429);
    }
    await next();
  };
}
