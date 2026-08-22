/**
 * Mantiene sincronizado el custom claim `seller` con el rol del perfil
 * (autorización usada por Security Rules y por la API).
 *
 * Reacciona a *cualquier* escritura del perfil, no solo a la creación: quien se
 * registró como comprador y luego elige "Vender" actualiza su documento, y sin
 * ese caso el claim no llegaba nunca y toda escritura de vendedor quedaba
 * bloqueada por `isSeller()`.
 *
 * El nombre exportado se conserva (`onUserCreated`) para no recrear la función
 * ya desplegada en `encuentramebo-1`.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { auth } from '../lib/firestore.js';

const rolesOf = (snap: DocumentSnapshot | undefined): string[] =>
  (snap?.data()?.roles as string[] | undefined) ?? [];

export const onUserCreated = onDocumentWritten('users/{uid}', async (event) => {
  const wasSeller = rolesOf(event.data?.before).includes('seller');
  const isSeller = rolesOf(event.data?.after).includes('seller');
  if (wasSeller === isSeller) return; // el rol no cambió: nada que hacer

  const uid = event.params.uid;
  const { customClaims } = await auth.getUser(uid);
  const claims: Record<string, unknown> = { ...customClaims };
  if (isSeller) claims.seller = true;
  else delete claims.seller;
  await auth.setCustomUserClaims(uid, claims);
});
