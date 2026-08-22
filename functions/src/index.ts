/**
 * encuentrame.bo — Cloud Functions 2ª gen (Node 20, ESM)
 * - api: REST v1 (Hono) montada bajo Firebase Hosting rewrite /v1/**
 * - triggers: pipeline asíncrono de verificación de aperturas + indexador
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { app } from './api/app.js';

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10, // cortacircuito de costo del MVP
  concurrency: 80,
});

export const api = onRequest(
  {
    minInstances: 0, // subir a 1 en producción para eliminar cold start del camino crítico
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (req, res) => {
    const url = new URL(req.url, `https://${req.headers.host ?? 'localhost'}`);
    const raw = req.rawBody as Buffer | undefined;
    const rawBody = raw ? new Uint8Array(raw) : undefined;
    const request = new Request(url.toString(), {
      method: req.method,
      headers: Object.entries(req.headers).flatMap(([k, v]) =>
        v === undefined ? [] : [[k, Array.isArray(v) ? v.join(',') : v] as [string, string]],
      ),
      // `rawBody` se pasa tal cual: leer su `.buffer` devolvía el pool completo
      // de Node (con offset), no el cuerpo — la API recibía basura y respondía
      // 400 invalid_payload en todo POST.
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : rawBody,
    });
    const response = await app.fetch(request);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(Buffer.from(await response.arrayBuffer()));
  },
);

export { onOpeningPhotoUploaded, verifyOpeningTask } from './triggers/onOpeningPhoto.js';
export { onProductWrite, onOpeningWrite } from './triggers/indexer.js';
export { onUserCreated } from './triggers/onUserCreate.js';
