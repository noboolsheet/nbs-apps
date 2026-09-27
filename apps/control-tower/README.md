# Control Tower

Capa web de **control, agregación, contexto y gobierno** de la empresa (Twenty CRM, Notion, Git,
Drive, Calendar, n8n, el servidor **vibox**). No reemplaza esas herramientas ni duplica su contenido:
responde *"¿qué está pasando, qué requiere atención, qué he decidido y dónde está la info canónica?"*.

> 📚 **Por dónde empezar:** [`docs/BUILD_LOG.md`](./docs/BUILD_LOG.md) es la **fuente de verdad del progreso** (lo
> más reciente arriba) y [`docs/FINDINGS_AND_DEFERRED.md`](./docs/FINDINGS_AND_DEFERRED.md) el backlog vivo. Las
> decisiones y su porqué, en [`docs/adr/`](./docs/adr/) y
> [`docs/DECISIONS_FROZEN.md`](./docs/DECISIONS_FROZEN.md). Los 9 documentos de diseño originales
> (`docs/1_..9_*.md`) son la línea base congelada: donde difieran del código, **manda el código** (ver
> [`docs/README.md`](./docs/README.md)). Para trabajar en el repo: [`CLAUDE.md`](./CLAUDE.md). Para **usar** la app:
> `apps/web/content/user-guide.md`, legible en Ajustes › Guía.

## Qué tiene hoy

Inicio (dinero pendiente, trabajo del día, atención, bloc de notas rápidas) · Negocio (áreas, objetivos,
capacidades, servicios, **Procesos/SOP**) · CRM (clientes, contactos y oportunidades, **espejo de Twenty**) ·
Proyectos (fases, tareas y subtareas, entregables) · Conocimiento (bandeja, biblioteca, aprendizaje, decisiones,
reutilizables, documentos, «por revisar») · Portafolio · **Pagos** (cobros y gastos) · Automatización (catálogo de
lo que la app hace sola, integraciones y estado del sistema) · Ajustes (perfil, organización, retención,
**Archivados**, guía).

Integra **Twenty** (el CRM manda: CT sólo mueve la etapa de una oportunidad), **Notion** (propiedad por campo),
**GitHub** y **Google Drive/Calendar** (sólo referencias, nunca contenido). Lo que llega de fuera no se edita aquí.

## Stack

TypeScript · Node 24 · Next.js (App Router) · Drizzle · PostgreSQL 18 · Better Auth · worker Node +
jobs en Postgres · Transactional Outbox · Tailwind · Zod · Vitest · pnpm · Docker + Compose · Caddy.
Self-hosted en **vibox** (Fedora x86_64); hasta 2026-09 vivió en una Raspberry Pi (ARM64).

## Estructura

```
apps/web       Next.js (UI + API /api/v1)      packages/domain        reglas de negocio puras
apps/worker    jobs + outbox dispatcher        packages/application   casos de uso, authz
                                               packages/db            Drizzle: schema, repos, migraciones
                                               packages/integrations  adapters Twenty/Notion/Git/Drive
                                               packages/validation    esquemas Zod
                                               packages/shared        logger, errores
```

## Desarrollo

Requisitos: Node 24, pnpm (via `corepack enable`), Docker.

```sh
corepack enable
pnpm install

# Opción A — todo en Docker (web + worker + postgres)
docker compose up --build              # web en http://localhost:4270

# Opción B — sólo la base en Docker y la app en el host (lo normal para iterar UI)
docker compose up -d db                # Postgres 18 en 127.0.0.1:5432 (user/pass/db = control_tower)
pnpm db:migrate
pnpm dev                               # web en http://localhost:4270
```

Los datos del Postgres local **persisten** en el volumen `ct_pgdata_dev`; sólo se borran con
`docker compose down -v`.

### Verificación (lo que hay que pasar antes de commitear)

```sh
pnpm -r typecheck && pnpm lint && pnpm test && pnpm build
DATABASE_URL='postgres://control_tower:control_tower@localhost:5432/control_tower' pnpm test:integration
bash scripts/e2e-journeys.sh           # e2e por HTTP contra la app real (arranca su propio server)
```

`pnpm test` son los unitarios (sin base de datos). Los de **integración** y el **e2e** necesitan el Postgres
de arriba; el e2e levanta el build standalone en un puerto aparte y limpia lo que crea.

Health: `GET /api/health` (liveness) · `GET /api/health/db` (readiness).

## Despliegue (vibox)

Un fichero de secretos **por perfil** (`.env.dev`, `.env.prod`, `.env.demo`), no un `.env` único:

```sh
cp .env.example .env.prod    # POSTGRES_*, BETTER_AUTH_SECRET, claves de integración
../../../nbs-infra/postgres/deploy-postgres.sh prod   # nbs-db: el ÚNICO Postgres del servidor
./deploy-control-tower.sh prod                        # web + worker (corre las migraciones)
../../../nbs-infra/caddy/deploy.sh                    # reverse proxy (una vez)
```

La base de datos **no** la levanta este compose: vive en `nbs-db` (repo `nbs-infra`), el cluster compartido del
servidor, y el deploy aborta si no está healthy. Detalle y runbook en [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

Puertos **4270 (dev) / 4272 (prod) / 4274 (demo)**; ruta Caddy `control-tower.noboolsheet.local`. Por dónde se
entra —tailnet, red local o Caddy— y qué hace falta para cada vía: `docs/DEPLOYMENT.md`. El **Twenty** que
sincroniza es el del repo `nbs-infra` (`nbs-infra/twenty/`).
