/**
 * Al crear el perfil de usuario con rol seller → asigna el custom claim
 * `seller: true` (autorización por rol usada por Security Rules y la API).
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { auth } from '../lib/firestore.js';

export const onUserCreated = onDocumentCreated('users/{uid}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const roles = (data.roles as string[] | undefined) ?? [];
  if (roles.includes('seller')) {
    await auth.setCustomUserClaims(event.params.uid, { seller: true });
  }
});
