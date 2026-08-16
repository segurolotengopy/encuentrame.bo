/**
 * Encolado de verificación asíncrona.
 * En producción usa Cloud Tasks (reintentos exponenciales, dead-letter);
 * la función de tarea está en triggers/onOpeningPhoto.ts (verifyOpeningTask).
 */
import { getFunctions } from 'firebase-admin/functions';

export async function enqueueVerification(openingId: string): Promise<void> {
  try {
    const queue = getFunctions().taskQueue('verifyOpeningTask');
    await queue.enqueue({ openingId }, { dispatchDeadlineSeconds: 300 });
  } catch (err) {
    // En emulador (sin Cloud Tasks) degradamos a log; el trigger de Storage
    // también dispara la verificación, por lo que no se pierde el evento.
    console.warn('enqueue_verification_fallback', openingId, (err as Error).message);
  }
}
