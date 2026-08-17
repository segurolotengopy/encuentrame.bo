# Agentes de encuentrame.bo

Once agentes especializados para Claude Code. Se activan de dos maneras: Claude los
invoca solo cuando la tarea coincide con su `description`, o usted los llama por
nombre (*"usa el agente seguridad para revisar este PR"*).

## Mapa de responsabilidades

| Agente | Dominio | Herramientas | Modelo |
|---|---|---|---|
| `arquitecto` | Decisiones estructurales, ADRs, trade-offs | Solo lectura | opus |
| `backend` | Cloud Functions, Firestore, triggers, transacciones | Escritura | sonnet |
| `web` | PWA React, componentes, offline, Core Web Vitals | Escritura | sonnet |
| `ia` | Vertex AI, prompts, evaluación, costo de inferencia | Escritura | opus |
| `maps` | Geohash, MapLibre, teselas, privacidad de ubicación | Escritura | sonnet |
| `api` | Contratos Zod/OpenAPI, versionado, idempotencia | Escritura | sonnet |
| `datos` | Esquema, migraciones, calidad de datos, métricas | Escritura | sonnet |
| `seguridad` | Rules, OWASP, IAM, secretos, privacidad | **Solo lectura** | opus |
| `qa` | Tests de Rules, unitarios, k6, casos borde | Escritura | sonnet |
| `infra` | WIF, CI/CD, costos, observabilidad, runbooks | Escritura | sonnet |
| `proyectos` | Estado real, riesgos, criterios de cierre | Lectura + docs | sonnet |

## Las tres decisiones de diseño

**1. `seguridad` es de solo lectura, deliberadamente.** Quien escribe el código no
firma su propia auditoría. El auditor reporta con evidencia; el agente de dominio
corrige; el auditor vuelve a verificar. Darle permisos de escritura destruiría esa
separación — es la razón por la que un auditor externo tiene valor.

**2. Los modelos están escalonados por tipo de trabajo, no por importancia.**
`opus` donde el costo de equivocarse es alto y el razonamiento es abierto
(arquitectura, seguridad, calidad de IA). `sonnet` donde el patrón está
establecido y lo que se necesita es ejecución consistente. Poner todo en el modelo
más caro no mejora el resultado: lo encarece y lo hace más lento.

**3. Los agentes conocen el negocio, no solo el stack.** Un agente que sabe React
escribe React genérico. Uno que sabe que la usuaria tiene 55 años, está bajo el sol
y paga sus megas, escribe otra cosa. Por eso cada archivo lleva el contexto humano
del proyecto y no solo reglas técnicas.

## Cadenas de trabajo recomendadas

**Funcionalidad nueva**
`arquitecto` (¿cómo encaja?) → `api` (contrato primero) → `backend` + `web`
(implementación) → `qa` (pruebas) → `seguridad` (auditoría) → `proyectos` (cierre)

**Corrección de defecto**
`qa` (reproducir con una prueba que falle) → agente de dominio (corregir) →
`qa` (confirmar en verde)

**Antes de fusionar a main**
`seguridad` + `qa` en paralelo — son independientes y no se estorban

**Problema de rendimiento o costo**
`infra` (medir dónde duele) → `datos` o `backend` (optimizar) → `qa` (escenario k6)

## Cómo obtener buenos resultados

Delegue **objetivos con criterio de aceptación**, no pasos. Compare:

> ✗ "Agrega un endpoint de búsqueda"
> ✓ "El comprador debe encontrar puestos por nombre de vendedor. Debe leer solo
>    meta-índices, responder p95 < 800 ms y tolerar acentos: 'salteña' encuentra
>    'saltena'."

El segundo prompt le da al agente lo que necesita para decidir bien solo.

**Un agente por dominio a la vez.** Dos agentes escribiendo los mismos archivos en
paralelo producen conflictos. Sí puede paralelizar dominios distintos
(`web` + `backend`) o tareas de solo lectura (`seguridad` + `qa` revisando).

**Los agentes heredan `CLAUDE.md`** de la raíz del repositorio: las reglas
transversales viven ahí y no se repiten en cada archivo. Si cambia una regla del
proyecto, cámbiela en `CLAUDE.md`, no en once lugares.

**Manténgalos vivos.** Cuando un agente se equivoque de la misma forma dos veces,
esa corrección pertenece a su archivo. Estos once documentos son la memoria
operativa del equipo: valen tanto como el código.
