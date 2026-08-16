/**
 * INDEXADOR (meta-indexing): mantiene los índices de lectura precomputados.
 * Los procesos de actualización del índice están desacoplados de las lecturas:
 * la búsqueda y el mapa solo leen search_index y geo_tiles.
 *
 * - geo_tiles/{geohash5}: entradas compactas de puestos abiertos por celda.
 * - search_index/{token_shard}: índice invertido token → stallIds.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { db, FieldValue } from '../lib/firestore.js';
import { searchTokens, GEO_TILE_PRECISION } from '@encuentrame/shared';

/** Apertura verificada/cerrada → actualizar la tesela geoespacial. */
export const onOpeningWrite = onDocumentWritten('openings/{openingId}', async (event) => {
  const after = event.data?.after?.data();
  if (!after) return;
  const openingId = event.params.openingId;
  const tileId = (after.geohash as string).slice(0, GEO_TILE_PRECISION);
  const tileRef = db.collection('geo_tiles').doc(tileId);

  const entry = {
    stallId: after.stallId,
    stallName: after.stallName ?? '',
    categoryId: after.categoryId ?? '',
    geohash: after.geohash,
    lat: after.lat,
    lng: after.lng,
    openingId,
  };

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tileRef);
    const entries = ((snap.data()?.entries as (typeof entry)[] | undefined) ?? []).filter(
      (e) => e.openingId !== openingId,
    );
    if (after.status === 'verified') entries.push(entry);
    tx.set(tileRef, { entries, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
});

/** Producto escrito → actualizar índice invertido de búsqueda. */
export const onProductWrite = onDocumentWritten('stalls/{stallId}/products/{productId}', async (event) => {
  const stallId = event.params.stallId;
  const after = event.data?.after?.data();
  const before = event.data?.before?.data();
  const name = (after?.name ?? before?.name) as string | undefined;
  if (!name) return;

  const tokens = searchTokens(name);
  const writer = db.batch();
  for (const token of tokens.slice(0, 20)) {
    const shardRef = db.collection('search_index').doc(token);
    if (after) {
      writer.set(
        shardRef,
        { tokens: [token], stallIds: FieldValue.arrayUnion(stallId), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }
    // Nota: la remoción fina (producto borrado pero otros productos del mismo
    // puesto comparten token) se resuelve en la migración de compactación
    // nocturna (infra/migrations) para no leer N productos en cada write.
  }
  await writer.commit();
});
