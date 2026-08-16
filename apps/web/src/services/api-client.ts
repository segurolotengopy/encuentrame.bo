/**
 * Cliente REST v1 (capa de servicios, separada de la UI).
 * Contratos importados de @encuentrame/shared: cliente y servidor comparten
 * los mismos esquemas Zod — imposible desincronizarlos.
 */
import type { CreateOpeningInput, ProductProposal, SearchResultItem } from '@encuentrame/shared';
import { firebaseAuth } from './firebase.js';

const BASE = '/v1';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await firebaseAuth.currentToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (res.status === 429) throw new Error('Demasiadas solicitudes. Intenta en unos minutos.');
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  createOpening: (input: CreateOpeningInput) =>
    request<{ openingId: string; status: string }>('/openings', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  closeOpening: (openingId: string) =>
    request<{ ok: boolean }>(`/openings/${openingId}/close`, { method: 'POST' }),

  voiceInventory: (stallId: string, audioPath: string) =>
    request<ProductProposal>('/inventory/voice', {
      method: 'POST',
      body: JSON.stringify({ stallId, audioPath }),
    }),

  search: (params: { q?: string; categoryId?: string; tiles?: string[] }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.categoryId) qs.set('categoryId', params.categoryId);
    if (params.tiles?.length) qs.set('tiles', params.tiles.join(','));
    return request<{ items: SearchResultItem[]; total: number }>(`/search?${qs}`);
  },

  geocode: (address: string) =>
    request<{ lat: number; lng: number; formatted: string }>(
      `/geocode?address=${encodeURIComponent(address)}`,
    ),
};
