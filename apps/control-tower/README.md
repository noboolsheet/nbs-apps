# Control Tower

Capa web de **control, agregación, contexto y gobierno** de la empresa (Twenty CRM, Notion, Git,
Drive, Calendar, n8n, el servidor **vibox**). No reemplaza esas herramientas ni duplica su contenido:
responde *"¿qué está pasando, qué requiere atención, qué he decidido y dónde está la info canónica?"*.

> 📚 **Planificación y progreso:** ver [`docs/IMPLEMENTATION_ROADMAP.md`](./docs/IMPLEMENTATION_ROADMAP.md)
> y [`docs/BUILD_LOG.md`](./docs/BUILD_LOG.md). Decisiones congeladas en
> [`docs/DECISIONS_FROZEN.md`](./docs/DECISIONS_FROZEN.md). Los 9 documentos de arquitectura
> fuente están en la raíz de esta carpeta (`1_..9_*.md`) y en `old_docs/`.

## Stack

TypeScript · Node 24 · Next.js (App Router) · Drizzle · PostgreSQL 18 · Better Auth · worker Node +
jobs en Postgres · Transactional Outbox · Tailwind + shadcn/ui · Zod · Vitest · Playwright · pnpm ·
Docker + Compose · Caddy · self-hosted ARM64.

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
cp .env.example .env         # ajustar DATABASE_URL / secretos

# opción A: todo en Docker (web + worker + postgres)
docker compose up --build    # web en http://localhost:4270

# opción B: sólo la DB en Docker + app en local
docker compose up -d db
pnpm db:migrate              # (a partir de M02)
pnpm dev                     # web en http://localhost:3000

pnpm lint && pnpm typecheck && pnpm test
```

Health: `GET /api/health` (liveness) · `GET /api/health/db` (readiness).

## Despliegue (vibox / modelo-1 del monorepo)

```sh
cp .env.example .env         # POSTGRES_*, BETTER_AUTH_SECRET, claves de integración
./deploy-control-tower.sh prod
./../../infrastructure/caddy/deploy.sh   # reverse proxy (primero, solo prod)
```

Puertos **4270 (dev) / 4272 (prod)**; ruta Caddy `control-tower.noboolsheet.local`.
Twenty ya self-hosted en `infrastructure/twenty/` es el target del adapter (M12).
