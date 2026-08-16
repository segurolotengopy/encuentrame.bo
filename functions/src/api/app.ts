import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requireAuth, type AuthedEnv } from './middleware/auth.js';
import { verifyAppCheck } from './middleware/appcheck.js';
import { rateLimit } from './middleware/ratelimit.js';
import { openings } from './routes/openings.js';
import { search } from './routes/search.js';
import { geocode } from './routes/geocode.js';
import { inventory } from './routes/inventory.js';

export const app = new Hono<AuthedEnv>().basePath('/v1');

app.use('*', cors({ origin: (o) => o, allowHeaders: ['Authorization', 'Content-Type', 'X-Firebase-AppCheck'] }));
app.use('*', verifyAppCheck);

app.get('/health', (c) => c.json({ ok: true, service: 'encuentrame.bo', version: 'v1' }));

// Lectura pública con límite por IP
app.route('/search', search);
app.route('/geocode', geocode);

// Escrituras: requieren identidad + cuota por usuario
app.use('/openings/*', requireAuth, rateLimit('openings'));
app.use('/openings', requireAuth, rateLimit('openings'));
app.route('/openings', openings);

app.use('/inventory/*', requireAuth, rateLimit('voice'));
app.route('/inventory', inventory);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error('api_error', { path: c.req.path, message: err.message });
  return c.json({ error: 'internal', message: 'Error interno' }, 500);
});
