import { Hono } from 'hono';
import { CreateOpeningInputSchema, encodeGeohash, OPENING_GEOHASH_PRECISION } from '@encuentrame/shared';
import { db, FieldValue } from '../../lib/firestore.js';
import type { AuthedEnv } from '../middleware/auth.js';
import { enqueueVerification } from '../../services/tasks.js';

export const openings = new Hono<AuthedEnv>();

/**
 * POST /v1/openings — registra la apertura del día.
 * Idempotente: el id es determinista (stallId_fechaLocal), de modo que los
 * reintentos offline del cliente jamás duplican el evento (integridad bajo estrés).
 */
openings.post('/', async (c) => {
  const uid = c.get('uid');
  const parsed = CreateOpeningInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid_payload', details: parsed.error.flatten() }, 400);
  const { stallId, lat, lng, photoPath } = parsed.data;

  const stallSnap = await db.collection('stalls').doc(stallId).get();
  if (!stallSnap.exists) return c.json({ error: 'stall_not_found' }, 404);
  const stall = stallSnap.data()!;
  if (stall.ownerUid !== uid) return c.json({ error: 'forbidden' }, 403);

  // Fecha local Bolivia (UTC-4) para "una apertura por día por puesto"
  const localDay = new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10);
  const openingId = `${stallId}_${localDay}`;
  const ref = db.collection('openings').doc(openingId);

  const created = await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) return false;
    tx.set(ref, {
      ownerUid: uid,
      stallId,
      stallName: stall.name,
      categoryId: stall.categoryId,
      status: 'pending',
      geohash: encodeGeohash(lat, lng, OPENING_GEOHASH_PRECISION),
      lat,
      lng,
      photoPath,
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (created) await enqueueVerification(openingId);
  return c.json({ openingId, status: created ? 'pending' : 'already_exists' }, created ? 201 : 200);
});

/** POST /v1/openings/:id/close — cierra el puesto (marca fin de jornada). */
openings.post('/:id/close', async (c) => {
  const uid = c.get('uid');
  const id = c.req.param('id');
  const ref = db.collection('openings').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return c.json({ error: 'not_found' }, 404);
  if (snap.data()!.ownerUid !== uid) return c.json({ error: 'forbidden' }, 403);

  // El cierre se materializa en el puesto y en el meta-índice geoespacial;
  // el evento de apertura permanece inmutable (historial financiero).
  await db.collection('stalls').doc(snap.data()!.stallId).update({ status: 'closed', updatedAt: FieldValue.serverTimestamp() });
  await db.collection('openings_closures').doc(id).set({ closedBy: uid, closedAt: FieldValue.serverTimestamp() });
  return c.json({ ok: true });
});
