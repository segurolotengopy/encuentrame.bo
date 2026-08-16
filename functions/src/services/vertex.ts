/**
 * Integración con Vertex AI (Gemini) vía REST — sin SDK pesado.
 * Autenticación: credenciales por defecto del entorno de ejecución (la service
 * account de la función), token obtenido del metadata server. Cero llaves.
 */
import { storage } from '../lib/firestore.js';
import type { ProductProposal, LedgerEntry } from '@encuentrame/shared';

const PROJECT = process.env.GCLOUD_PROJECT ?? 'encuentramebo-1';
const LOCATION = 'us-central1';
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const ENDPOINT = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

async function accessToken(): Promise<string> {
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } },
  );
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function fileAsBase64(path: string): Promise<{ data: string; mimeType: string }> {
  const file = storage.bucket().file(path);
  const [meta] = await file.getMetadata();
  const [buf] = await file.download();
  return { data: buf.toString('base64'), mimeType: (meta.contentType as string) ?? 'application/octet-stream' };
}

type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };

async function generateJson<T>(parts: GeminiPart[], schemaHint: string): Promise<T | null> {
  const token = await accessToken();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      systemInstruction: {
        parts: [{ text: `Responde ÚNICAMENTE JSON válido con esta forma exacta: ${schemaHint}` }],
      },
    }),
  });
  if (!res.ok) {
    console.error('vertex_error', res.status, await res.text().catch(() => ''));
    return null;
  }
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Foto de apertura → ¿es un puesto real? + etiquetas de productos visibles. */
export async function verifyStallPhoto(
  photoPath: string,
): Promise<{ isStall: boolean; labels: string[]; reason: string } | null> {
  const img = await fileAsBase64(photoPath);
  return generateJson(
    [
      { inlineData: { mimeType: img.mimeType, data: img.data } },
      {
        text:
          'Analiza la imagen tomada por un vendedor ambulante en Bolivia para verificar la apertura diaria de su puesto. ' +
          'Determina si la imagen muestra un puesto de venta callejero real (mesa, toldo, mercadería exhibida, feria). ' +
          'Lista los productos visibles en español (máx. 15). Si es una foto reciclada de pantalla, borrosa o sin puesto, isStall=false.',
      },
    ],
    '{"isStall": boolean, "labels": string[], "reason": string}',
  );
}

/** Audio del vendedor → propuesta estructurada de inventario. */
export async function transcribeAndExtractProducts(audioPath: string): Promise<ProductProposal | null> {
  const audio = await fileAsBase64(audioPath);
  return generateJson(
    [
      { inlineData: { mimeType: audio.mimeType, data: audio.data } },
      {
        text:
          'El audio es de un vendedor ambulante boliviano dictando su inventario en español coloquial. ' +
          'Extrae los productos con precio en bolivianos (Bs) si lo menciona, unidad y cantidad si las menciona. ' +
          'Incluye confidence 0-1 por producto y la transcripción completa en rawTranscript.',
      },
    ],
    '{"products": [{"name": string, "price"?: number, "unit"?: string, "stock"?: number, "confidence": number}], "rawTranscript": string}',
  );
}

/** Audio → asiento contable simple (venta o gasto). */
export async function extractLedgerEntry(audioPath: string): Promise<LedgerEntry | null> {
  const audio = await fileAsBase64(audioPath);
  return generateJson(
    [
      { inlineData: { mimeType: audio.mimeType, data: audio.data } },
      {
        text:
          'El audio es de un vendedor registrando una venta o un gasto en español. ' +
          'type: "sale" si vendió, "expense" si gastó/compró insumos. amountBob: monto en bolivianos. concept: descripción breve.',
      },
    ],
    '{"type": "sale"|"expense", "amountBob": number, "concept": string}',
  );
}
