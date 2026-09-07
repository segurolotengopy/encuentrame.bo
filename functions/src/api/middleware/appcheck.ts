import type { MiddlewareHandler } from 'hono';
import { getAppCheck } from 'firebase-admin/app-check';
import { defineString } from 'firebase-functions/params';

/**
 * Opt-in explícito. Antes esto leía `process.env.APP_CHECK_ENFORCE`, una
 * variable que **no se definía en ninguna parte**: no existe `functions/.env`
 * ni el workflow la pasaba al deploy de funciones. Era una compuerta sin
 * interruptor, permanentemente en `false`.
 *
 * Declarado como parámetro, el valor se resuelve al desplegar (desde el entorno
 * de CI, que es donde `deploy.yml` lo inyecta) y queda registrado en la
 * configuración de la función. El nombre vive en el código y se versiona.
 */
const appCheckEnforce = defineString('APP_CHECK_ENFORCE', {
  default: 'false',
  description:
    'Exigir el token de App Check en la API. Solo poner en "true" cuando esté ' +
    'confirmado que el cliente envía la cabecera X-Firebase-AppCheck; si no, ' +
    'la API queda en 401 permanente.',
});

/**
 * Rutas exentas de atestación, deliberadamente.
 *
 * `/v1/health` es una sonda de vida: no devuelve datos del negocio y tiene que
 * poder consultarla quien **no puede atestar** — el smoke test del pipeline y
 * cualquier monitor externo de disponibilidad. Al encender el enforcement el
 * 2026-09-07, ese `curl` plano empezó a recibir `401` y dejó todos los
 * despliegues en rojo pese a desplegarse bien.
 *
 * La alternativa era que el smoke test afirmara el `401`, pero eso lo degrada:
 * pasaría aunque todo lo de abajo estuviera roto. Un control que demuestra
 * menos de lo que aparenta es peor que no tenerlo.
 *
 * La lista se mantiene **mínima y explícita**: cada entrada es superficie sin
 * autenticar. Añadir una exige justificar qué expone.
 */
const SIN_ATESTACION = new Set(['/v1/health']);

/**
 * App Check: primer anillo Zero-Trust — solo la PWA legítima (atestada por
 * reCAPTCHA Enterprise) puede consumir la API. En emulador se omite.
 */
export const verifyAppCheck: MiddlewareHandler = async (c, next) => {
  if (SIN_ATESTACION.has(c.req.path)) return next();
  // `.value()` se lee DENTRO del handler, en tiempo de ejecución. A nivel de
  // módulo, el análisis que hace el CLI al desplegar aún no tiene el valor
  // resuelto y devolvería el predeterminado.
  if (appCheckEnforce.value() !== 'true' || process.env.FUNCTIONS_EMULATOR === 'true') return next();
  const token = c.req.header('X-Firebase-AppCheck');
  if (!token) return c.json({ error: 'app_check_required' }, 401);
  try {
    await getAppCheck().verifyToken(token);
    return next();
  } catch {
    return c.json({ error: 'app_check_invalid' }, 401);
  }
};
