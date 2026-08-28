/**
 * Guarda de build: verifica que la configuración de Firebase esté completa
 * antes de compilar para producción. Evita desplegar una app que compila bien
 * pero falla al iniciar porque el SDK de Firebase recibió marcadores de posición.
 *
 * Las variables llegan del entorno del proceso: en CI desde `vars.*` del
 * repositorio, en local desde `apps/web/.env.local` (que Vite carga solo).
 * El archivo `.env.production` ya no se versiona (ver .gitignore).
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

/** Lee un archivo .env a un objeto plano. Devuelve {} si no existe. */
function leerArchivoEnv(ruta) {
  if (!existsSync(ruta)) return {};
  return Object.fromEntries(
    readFileSync(ruta, 'utf8')
      .split('\n')
      .filter((linea) => linea.trim() && !linea.trim().startsWith('#'))
      .map((linea) => {
        const i = linea.indexOf('=');
        return [linea.slice(0, i).trim(), linea.slice(i + 1).trim()];
      }),
  );
}

// El entorno del proceso tiene prioridad; los archivos locales son el respaldo
// para desarrollo. Vite aplica esta misma precedencia al compilar.
const here = dirname(fileURLToPath(import.meta.url));
const env = {
  ...leerArchivoEnv(resolve(here, '..', '.env.production')),
  ...leerArchivoEnv(resolve(here, '..', '.env.local')),
  ...process.env,
};

const faltantes = REQUIRED.filter((k) => !env[k] || env[k].startsWith('PEGAR_AQUI'));

if (faltantes.length > 0) {
  console.error(`
✖ Configuración de Firebase incompleta

  Faltan o siguen con marcador de posición:
${faltantes.map((k) => `    · ${k}`).join('\n')}

  En CI: se inyectan desde las variables del repositorio (vars.*) en el
  paso de build. Revisa Settings → Secrets and variables → Actions.

  En local: copia apps/web/.env.example a apps/web/.env.local y complétalo.
    Consola Firebase → ⚙️ Configuración del proyecto → General
    → "Tus apps" → app web → "Configuración del SDK" → Config

  (Estos valores son públicos por diseño: viajan en el bundle JS.
   La seguridad la dan las Security Rules y App Check.)
`);
  process.exit(1);
}

console.log('✔ Configuración de Firebase completa');
