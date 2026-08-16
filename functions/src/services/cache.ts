/**
 * Caché L3: LRU en memoria de la instancia de la función.
 * Política de invalidación: TTL explícito por entrada. Para datos con mutación
 * event-driven (geo_tiles) el TTL es corto (30 s) porque la fuente ya es un
 * meta-índice actualizado por triggers — nunca hay lecturas sucias mayores al TTL.
 */
const MAX_ENTRIES = 500;
const store = new Map<string, { value: unknown; expiresAt: number }>();

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await loader();
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function invalidate(prefix: string): void {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
