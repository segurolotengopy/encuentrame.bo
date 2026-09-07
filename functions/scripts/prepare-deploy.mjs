/**
 * Prepara functions/deploy/: lo único que se sube a Cloud Build.
 *
 * Cloud Build instala con npm, que no entiende el protocolo `workspace:` de pnpm.
 * Como esbuild empaqueta todo salvo los dos externals, el paquete desplegado solo
 * necesita declarar esos dos: cualquier otra dependencia aquí obliga a npm a
 * resolverla de nuevo, y con `@encuentrame/shared` eso falla (EUNSUPPORTEDPROTOCOL).
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, symlinkSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const functionsDir = resolve(here, '..');
const outDir = resolve(functionsDir, 'deploy');

const src = JSON.parse(readFileSync(resolve(functionsDir, 'package.json'), 'utf8'));

// Los externals de esbuild son exactamente las dependencias de ejecución.
const EXTERNALS = ['firebase-admin', 'firebase-functions'];
const dependencies = Object.fromEntries(
  EXTERNALS.map((name) => {
    const version = src.dependencies?.[name];
    if (!version) throw new Error(`Falta el external ${name} en functions/package.json`);
    return [name, version];
  }),
);

mkdirSync(outDir, { recursive: true });
writeFileSync(
  resolve(outDir, 'package.json'),
  JSON.stringify(
    { name: src.name, version: src.version, private: true, type: 'module', main: 'index.js', engines: src.engines, dependencies },
    null,
    2,
  ) + '\n',
);
copyFileSync(resolve(functionsDir, 'lib/index.js'), resolve(outDir, 'index.js'));

// firebase-tools carga el código para descubrir las funciones exportadas, así que
// necesita resolver el SDK aquí. Se reutiliza lo que pnpm ya instaló; node_modules
// queda fuera del paquete que se sube (Cloud Build reinstala desde el package.json).
const link = resolve(outDir, 'node_modules');
if (!existsSync(link)) symlinkSync(resolve(functionsDir, 'node_modules'), link, 'dir');

// Parámetros de `defineString`.
//
// firebase-tools NO los lee de `process.env`: los resuelve desde ficheros dotenv
// del directorio que `firebase.json` declara como `source` — o sea este, no
// `functions/`. Pasarlos por entorno falla con «In non-interactive mode but have
// no value for …» aunque la variable esté definida.
//
// El valor sigue viviendo en un solo sitio (`vars.*` en CI); acá solo se
// materializa en el fichero que la herramienta consume. No se versiona:
// `.gitignore` cubre `.env.*`.
const projectId =
  process.env.GCP_PROJECT_ID ??
  process.env.GCLOUD_PROJECT ??
  (() => {
    try {
      return JSON.parse(readFileSync(resolve(functionsDir, '../.firebaserc'), 'utf8')).projects
        ?.default;
    } catch {
      return undefined;
    }
  })();

if (projectId) {
  writeFileSync(
    resolve(outDir, `.env.${projectId}`),
    `APP_CHECK_ENFORCE=${process.env.APP_CHECK_ENFORCE || 'false'}\n`,
  );
}

console.log(
  `deploy/ listo — dependencias: ${EXTERNALS.join(', ')}` +
    (projectId ? ` | params en .env.${projectId}` : ' | SIN params: proyecto no resuelto'),
);
