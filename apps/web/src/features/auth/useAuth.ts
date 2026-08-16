import { useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, db, type User } from '../../services/firebase';
import { useSession } from '../../stores/session';
import type { Role } from '@encuentrame/shared';

/** Escucha global de sesión — se monta una sola vez en App. */
export function useAuthListener() {
  const setUser = useSession((s) => s.setUser);
  useEffect(() => firebaseAuth.onChange(setUser), [setUser]);
}

/** Crea el perfil si no existe (primer login) con los roles elegidos. */
export async function ensureProfile(user: User, roles: Role[]): Promise<void> {
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

export const auth = firebaseAuth;
