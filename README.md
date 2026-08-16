# encuentrame.bo

**El mapa vivo del comercio boliviano.** Plataforma serverless (GCP/Firebase) que da
visibilidad digital en tiempo real a vendedores ambulantes: una foto abre el puesto
(verificada por IA), la voz gestiona el inventario, y los compradores encuentran
todo en un mapa inteligente.

> Documento de referencia: `docs/PLAN_MAESTRO_ARQUITECTURA.md`

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite (PWA offline-first), Tailwind, TanStack Query, Zustand, MapLibre GL |
| API | Cloud Functions 2ª gen (Node 20) + Hono, REST `/v1`, contratos Zod compartidos |
| Datos | Cloud Firestore (Native) + meta-índices precomputados (`search_index`, `geo_tiles`) |
| IA | Vertex AI Gemini: visión (verificación de aperturas) y audio→JSON (inventario por voz) |
| Mapas | MapLibre + tiles OSM (gratis) + Google Geocoding vía proxy cacheado |
| Seguridad | Firebase Auth + App Check + Security Rules (RLS) + rate limiting por usuario |
| CI/CD | GitHub Actions + Workload Identity Federation (cero llaves estáticas) |

## Desarrollo local

```bash
corepack enable && pnpm install
cp apps/web/.env.example apps/web/.env    # completar con la config de la consola Firebase
pnpm emulators                            # Auth + Firestore + Functions + Storage + Hosting
pnpm dev                                  # Vite en http://localhost:5173 (VITE_USE_EMULATORS=true en .env)
```

## Comandos

```bash
pnpm build            # build de todos los paquetes
pnpm typecheck        # TypeScript estricto en todo el monorepo
pnpm test:rules       # tests de Security Rules contra el emulador
pnpm migrate          # migraciones idempotentes (seeds de maestras)
pnpm deploy:hosting   # deploy manual (el camino normal es CI en main)
```

## Estructura

```
apps/web          PWA React (features: landing, auth, seller, buyer)
functions         API REST v1 + triggers (verificación IA, indexador)
packages/shared   Esquemas Zod = contrato único cliente/servidor
infra             Reglas, índices, migraciones, bootstrap GCP
tests/rules       Tests de aislamiento (RLS)
tests/load        k6: load, stress, spike, soak
```

## Despliegue

Todo push a `main` despliega automáticamente (reglas → functions → hosting) mediante
WIF; los PRs generan un preview channel efímero. Configuración inicial del proyecto
GCP: `infra/setup/bootstrap-gcp.sh` (lo ejecuta el Owner una sola vez en Cloud Shell).

## Convenciones

Trunk-based development · Conventional Commits · SemVer automatizado · PRs con CI verde obligatorio.
