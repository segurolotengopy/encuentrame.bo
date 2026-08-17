# CLAUDE.md — Reglas del proyecto encuentrame.bo

## Contexto
Monorepo pnpm: `apps/web` (React+Vite PWA), `functions` (Cloud Functions 2ª gen + Hono),
`packages/shared` (esquemas Zod = contrato único), `infra` (reglas/índices/migraciones).
Proyecto GCP: `encuentramebo-1` (us-central1). Deploy SOLO vía GitHub Actions (WIF).

## Reglas de seguridad (obligatorias)
- PROHIBIDO crear llaves de service account (`gcloud iam service-accounts keys create`).
- PROHIBIDO modificar IAM, App Check o Security Rules sin confirmación explícita del usuario.
- PROHIBIDO desplegar a producción desde la máquina local: el camino es PR → main → CI.
- Los secretos viven en Secret Manager y en GitHub Actions Variables. Nunca en el repo.
- Todo cambio en `infra/firestore.rules` exige actualizar `tests/rules/` en el mismo PR.

## Arquitectura (no romper)
- La UI jamás importa el SDK de Firebase directamente: siempre `services/` o hooks de features.
- Lecturas de alto volumen van directo a Firestore bajo Security Rules; escrituras complejas y IA pasan por la API `/v1`.
- La búsqueda y el mapa leen SOLO meta-índices (`search_index`, `geo_tiles`) — nunca escanear `stalls`/`products`.
- `openings` es append-only (historial financiero verificable): nunca editar ni borrar.
- Esquemas de datos: modificar SIEMPRE en `packages/shared` (cliente y servidor los comparten).

## Presupuesto de rendimiento
- Bundle inicial de la web < 170 KB gzip (usuarios 2G/3G, gama baja).
- MapLibre y Firebase en chunks separados (ya configurado en vite.config.ts).

## Comandos útiles
pnpm emulators · pnpm dev · pnpm typecheck · pnpm test:rules · pnpm migrate

## Agentes especializados
El equipo trabaja con once agentes en `.claude/agents/` (ver su README para el mapa
de responsabilidades y las cadenas de trabajo). Reglas de uso:
- `seguridad` es de solo lectura por diseño: audita, no corrige. La corrección la
  aplica el agente de dominio y luego se re-verifica.
- Antes de fusionar a `main`: `seguridad` y `qa` deben haber revisado el cambio.
- Un solo agente escribiendo un mismo dominio a la vez, para evitar conflictos.
