import { useEffect } from 'react';
import type { User } from 'firebase/auth';
import { useSession } from '../../stores/session';
import type { Role } from '@encuentrame/shared';

/**
 * Carga diferida del SDK de Firebase (≈143 KB gzip).
 *
 * Importarlo de forma estática lo metía en el bundle inicial: todo visitante lo
 * descargaba antes de ver la portada, aunque nunca iniciara sesión. Con import()
 * el SDK viaja en su propio chunk y solo se pide cuando hace falta de verdad.
 * Este módulo sigue siendo la única puerta: la UI nunca importa services/firebase.
 */
const loadFirebase = () => import('../../services/firebase');

/** Escucha global de sesión — se monta una sola vez en App. */
export function useAuthListener() {
  const setUser = useSession((s) => s.setUser);
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void loadFirebase().then(({ firebaseAuth }) => {
      // El desmontaje puede llegar antes que el SDK: no suscribir en ese caso.
      if (cancelled) return;
      unsubscribe = firebaseAuth.onChange(setUser);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [setUser]);
}

/** Crea el perfil si no existe (primer login) con los roles elegidos. */
export async function ensureProfile(user: User, roles: Role[]): Promise<void> {
  const [{ db }, { doc, getDoc, setDoc, serverTimestamp }] = await Promise.all([
    loadFirebase(),
    import('firebase/firestore'),
  ]);
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Usuario',
      roles,
      createdAt: serverTimestamp(),
    });
  }
}

/** Mismo contrato que antes; cada método carga el SDK al invocarse. */
export const auth = {
  loginGoogle: async () => (await loadFirebase()).firebaseAuth.loginGoogle(),
  loginEmail: async (email: string, password: string) =>
    (await loadFirebase()).firebaseAuth.loginEmail(email, password),
  registerEmail: async (email: string, password: string) =>
    (await loadFirebase()).firebaseAuth.registerEmail(email, password),
  resetPassword: async (email: string) => (await loadFirebase()).firebaseAuth.resetPassword(email),
  logout: async () => (await loadFirebase()).firebaseAuth.logout(),
  currentToken: async () => (await loadFirebase()).firebaseAuth.currentToken(),
};
