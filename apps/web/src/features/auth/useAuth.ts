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
  // Sin bloquear el registro: va calentando el token mientras el usuario navega.
  if (roles.includes('seller')) void waitForSellerClaim(user);
}

/**
 * Espera a que el custom claim `seller` aparezca en el ID token.
 *
 * El claim lo escribe el trigger de Functions DESPUÉS de que el perfil llega a
 * Firestore, así que el token que el navegador tiene en mano se emitió sin él y
 * las Security Rules (`isSeller()`) rechazan la primera escritura del vendedor.
 * Solo un refresco forzado del token lo trae; si no, el usuario queda bloqueado
 * hasta que el token caduque solo (hasta una hora).
 */
export async function waitForSellerClaim(user: User, attempts = 6): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const { claims } = await user.getIdTokenResult(true);
    if (claims.seller === true) return true;
    await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
  }
  return false;
}

/**
 * Deja al usuario listo para vender: añade el rol `seller` al perfil si le falta
 * (quien se registró solo como comprador y luego elige "Vender") y espera el claim.
 */
export async function ensureSellerClaim(user: User): Promise<boolean> {
  const [{ db }, { doc, getDoc, updateDoc, arrayUnion, serverTimestamp }] = await Promise.all([
    loadFirebase(),
    import('firebase/firestore'),
  ]);
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const roles = (snap.data()?.roles as Role[] | undefined) ?? [];
  if (snap.exists() && !roles.includes('seller')) {
    await updateDoc(ref, { roles: arrayUnion('seller'), updatedAt: serverTimestamp() });
  }
  return waitForSellerClaim(user);
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
