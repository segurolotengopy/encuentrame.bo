/**
 * Pipeline asíncrono de verificación de aperturas.
 * La petición del vendedor NUNCA espera a la IA: la UI muestra "verificando…"
 * y este pipeline actualiza el estado cuando Gemini responde.
 */
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { db, FieldValue } from '../lib/firestore.js';
import { verifyStallPhoto } from '../services/vertex.js';

async function runVerification(openingId: string): Promise<void> {
  const ref = db.collection('openings').doc(openingId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const opening = snap.data()!;
  if (opening.status !== 'pending') return; // idempotencia: ya procesada

  const verdict = await verifyStallPhoto(opening.photoPath as string);

  if (!verdict) {
    // Falla de IA → dead-letter para revisión; no bloquea al vendedor (queda pending).
    await db.collection('openings_failed').doc(openingId).set({
      openingId,
      reason: 'ai_unavailable',
      at: FieldValue.serverTimestamp(),
    });
    return;
  }

  await ref.update({
    status: verdict.isStall ? 'verified' : 'rejected',
    aiLabels: verdict.labels.slice(0, 15),
    aiReason: verdict.reason.slice(0, 300),
    verifiedAt: FieldValue.serverTimestamp(),
  });

  if (verdict.isStall) {
    await db.collection('stalls').doc(opening.stallId as string).update({
      status: 'open',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

/** Cola Cloud Tasks: camino principal en producción (reintentos exponenciales). */
export const verifyOpeningTask = onTaskDispatched(
  {
    retryConfig: { maxAttempts: 5, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
    memory: '512MiB',
  },
  async (req) => {
    const { openingId } = req.data as { openingId: string };
    await runVerification(openingId);
  },
);

/**
 * Respaldo por trigger de Storage: si la foto llega después del POST /openings
 * (subida offline diferida), la verificación se dispara igualmente.
 * openings/{uid}/{openingId}.jpg
 */
export const onOpeningPhotoUploaded = onObjectFinalized({ memory: '512MiB' }, async (event) => {
  const path = event.data.name ?? '';
  const match = /^openings\/[^/]+\/(.+)\.(jpg|jpeg|webp|png)$/.exec(path);
  if (!match || !match[1]) return;
  await runVerification(match[1]);
});
