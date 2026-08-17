/**
 * Guarda de build: verifica que apps/web/.env.production tenga valores reales
 * antes de compilar para producción. Evita desplegar una app que compila bien
 * pero falla al iniciar porque el SDK de Firebase recibió marcadores de posición.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '..', '.env.production');

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

if (!existsSync(envPath)) {
  console.error('\n✖ Falta apps/web/.env.production\n');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const missing = REQUIRED.filter((k) => !env[k] || env[k].startsWith('PEGAR_AQUI'));

if (missing.length > 0) {
  console.error(`
✖ Configuración de Firebase incompleta en apps/web/.env.production

  Faltan o siguen con marcador de posición:
${missing.map((k) => `    · ${k}`).join('\n')}

  Cómo obtener los valores:
    Consola Firebase → ⚙️ Configuración del proyecto → General
    → "Tus apps" → app web → "Configuración del SDK" → Config

  (Estos valores son públicos por diseño: viajan en el bundle JS.
   La seguridad la dan las Security Rules y App Check.)
`);
  process.exit(1);
}

console.log('✔ Configuración de Firebase completa');
