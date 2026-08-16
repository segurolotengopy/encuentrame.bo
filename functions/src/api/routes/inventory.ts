import { Hono } from 'hono';
import { z } from 'zod';
import { ProductProposalSchema } from '@encuentrame/shared';
import { db, FieldValue } from '../../lib/firestore.js';
import type { AuthedEnv } from '../middleware/auth.js';
import { transcribeAndExtractProducts, extractLedgerEntry } from '../../services/vertex.js';

export const inventory = new Hono<AuthedEnv>();

const VoiceInputSchema = z.object({
  stallId: z.string().min(1),
  /** Ruta del audio ya subido a Storage: voice/{uid}/{file} */
  audioPath: z.string().min(1).max(300),
});

/**
 * POST /v1/inventory/voice — fricción cero:
 * audio → Gemini → propuesta estructurada de productos.
 * La propuesta NO se persiste como inventario: el vendedor la confirma en la UI
 * (elección preventiva) y el cliente escribe los productos bajo Security Rules.
 */
inventory.post('/voice', async (c) => {
  const uid = c.get('uid');
  const parsed = VoiceInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid_payload' }, 400);
  const { stallId, audioPath } = parsed.data;

  if (!audioPath.startsWith(`voice/${uid}/`)) return c.json({ error: 'forbidden' }, 403);
  const stall = await db.collection('stalls').doc(stallId).get();
  if (!stall.exists || stall.data()!.ownerUid !== uid) return c.json({ error: 'forbidden' }, 403);

  const proposal = await transcribeAndExtractProducts(audioPath);
  const validated = ProductProposalSchema.safeParse(proposal);
  if (!validated.success) return c.json({ error: 'ai_extraction_failed' }, 502);
  return c.json(validated.data);
});

const LedgerVoiceSchema = z.object({ audioPath: z.string().min(1).max(300) });

/** POST /v1/inventory/ledger-voice — audio → asiento contable simple (venta/gasto). */
inventory.post('/ledger-voice', async (c) => {
  const uid = c.get('uid');
  const parsed = LedgerVoiceSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid_payload' }, 400);
  if (!parsed.data.audioPath.startsWith(`voice/${uid}/`)) return c.json({ error: 'forbidden' }, 403);

  const entry = await extractLedgerEntry(parsed.data.audioPath);
  if (!entry) return c.json({ error: 'ai_extraction_failed' }, 502);

  const ref = await db.collection('ledgers').doc(uid).collection('entries').add({
    ...entry,
    source: 'voice',
    createdAt: FieldValue.serverTimestamp(),
  });
  return c.json({ entryId: ref.id, entry }, 201);
});
