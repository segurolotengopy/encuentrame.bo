/** Estado global mínimo (Zustand): solo sesión y rol activo. El estado de
 *  servidor vive en TanStack Query + caché offline de Firestore. */
import { create } from 'zustand';
import type { User } from 'firebase/auth';

export type ActiveRole = 'buyer' | 'seller' | null;

interface SessionState {
  user: User | null;
  ready: boolean;
  activeRole: ActiveRole;
  setUser: (user: User | null) => void;
  setActiveRole: (role: ActiveRole) => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  ready: false,
  activeRole: null,
  setUser: (user) => set({ user, ready: true }),
  setActiveRole: (activeRole) => set({ activeRole }),
}));
