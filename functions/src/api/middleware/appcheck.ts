import type { MiddlewareHandler } from 'hono';
import { getAppCheck } from 'firebase-admin/app-check';

const ENFORCE = process.env.APP_CHECK_ENFORCE !== 'false'; // desactivable en emulador

/**
 * App Check: primer anillo Zero-Trust — solo la PWA legítima (atestada por
 * reCAPTCHA Enterprise) puede consumir la API. En emulador se omite.
 */
export const verifyAppCheck: MiddlewareHandler = async (c, next) => {
  if (!ENFORCE || process.env.FUNCTIONS_EMULATOR === 'true') return next();
  const token = c.req.header('X-Firebase-AppCheck');
  if (!token) return c.json({ error: 'app_check_required' }, 401);
  try {
    await getAppCheck().verifyToken(token);
    return next();
  } catch {
    return c.json({ error: 'app_check_invalid' }, 401);
  }
};
