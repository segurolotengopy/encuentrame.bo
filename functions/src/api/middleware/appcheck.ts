import type { MiddlewareHandler } from 'hono';
import { getAppCheck } from 'firebase-admin/app-check';

// Opt-in explícito: hasta que App Check esté configurado en la consola Firebase,
// exigir el token dejaría la API en 401 permanente. Se activa poniendo
// APP_CHECK_ENFORCE=true en la configuración de la función.
const ENFORCE = process.env.APP_CHECK_ENFORCE === 'true';

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
