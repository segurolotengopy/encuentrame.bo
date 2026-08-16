import type { MiddlewareHandler } from 'hono';
import { auth } from '../../lib/firestore.js';

export type AuthedEnv = {
  Variables: {
    uid: string;
    claims: Record<string, unknown>;
  };
};

/** Valida el ID token de Firebase Auth (Bearer). Diseño stateless: nada de sesiones en servidor. */
export const requireAuth: MiddlewareHandler<AuthedEnv> = async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: 'unauthorized' }, 401);
  try {
    const decoded = await auth.verifyIdToken(token);
    c.set('uid', decoded.uid);
    c.set('claims', decoded as unknown as Record<string, unknown>);
    await next();
  } catch {
    return c.json({ error: 'unauthorized' }, 401);
  }
};
