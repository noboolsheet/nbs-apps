# Control Tower — Decisiones congeladas (referencia rápida)

Resumen operativo de las decisiones que NO se re-litigan durante la construcción. Fuente: docs 2–9
+ errata (doc 8 §29). Ante conflicto, aplicar la **precedencia** de abajo. Si algo contradice esto
y no está cubierto por la errata → **PARAR y señalar** (doc 8 §30).

## Precedencia (congelada)
1. Decisiones de arquitectura explícitas
2. Implementation Errata (doc 8 §29, ERRATA-001..016)
3. Domain Model (doc 2)
4. Physical Data Model (doc 5) — autoritativo para columnas/enums/índices/FKs
5. Information Architecture (doc 6)
6. Wireframes (doc 7)
7. Spec exploratorio (doc 1)

## Producto / dominio
- **Naming:** `Client` (nunca `Customer`). Domain `Client` / DB `clients` / API `/clients` / UI `Clients`. (ERRATA-001)
- **Decision lifecycle:** `DRAFT → REVIEW → APPROVED → SUPERSEDED → ARCHIVED`. Sin `PROPOSED`/`ACCEPTED`/`REJECTED`. (ERRATA-002)
- **Portfolio ENTRA en MVP** (`portfolio_items` + pantallas List/Detail). (ERRATA-003, ver ADR-001)
  - **Actualización (owner, 2026-09-01, B-5):** además pasa a ser **ítem propio de la barra lateral** (antes colgaba de
    Conocimiento). Es la **única desviación** de la navegación congelada del doc 6 (que fijaba 7 ítems) y queda
    registrada aquí, en `FINDINGS_AND_DEFERRED.md` (B-5) y en el comentario de `components/sidebar.tsx`.
- **At Risk = health derivado** del Project (`Project.health = AT_RISK`). NO entidad `Risk`. (ERRATA-006)
- **Upcoming Milestones** en Home usa `projects.target_date`. NO entidad `Milestone`. (ERRATA-005)
- **Knowledge:** Inbox precede a la biblioteca; contenido canónico en Notion/Git; CT guarda metadata+referencia. (ERRATA-010/014)
- **AuditLog ≠ ChangeEvent:** "quién hizo qué" vs "qué cambió de estado". Tablas distintas, nunca fusionar. (ERRATA-013)
- **Búsqueda MVP:** PostgreSQL FTS/B-tree. Sin vector/RAG/embeddings/AI. (ERRATA-011)
- **Multi-tenant:** `organization_id` desde día 1, pero sin admin SaaS/billing. (ERRATA-012)
- **Sin código por nicho** (`if agency/salon/course...`); núcleo genérico + configurabilidad futura. (ERRATA-016)
- **Documents:** metadata + referencia externa + "Open external". CT no es editor documental. (ERRATA-014)

## Enums resueltos por precedencia (Physical Data Model gana)
- `knowledge_items.status`: `INBOX, DRAFT, REVIEW, APPROVED, ARCHIVED`
- `knowledge_inbox.status`: `NEW, PROCESSING, PROCESSED, DISCARDED`
- `assets.status`: `DRAFT, ACTIVE, DEPRECATED, ARCHIVED`
- `tasks.status`: `TODO, IN_PROGRESS, BLOCKED, DONE, CANCELLED`
- `deliverables.status`: `PLANNED, IN_PROGRESS, REVIEW, APPROVED, DELIVERED, ARCHIVED`
- `decisions.status`: `DRAFT, REVIEW, APPROVED, SUPERSEDED, ARCHIVED`
- `capabilities.status`: `PLANNED, DEVELOPING, AVAILABLE, RETIRED` · `maturity`: `BEGINNER, INTERMEDIATE, ADVANCED, EXPERT`
- `services.status`: `IDEA, DESIGNING, READY, ACTIVE, PAUSED, RETIRED`
- `integrations.status`: `CONFIGURED, ACTIVE, ERROR, DISABLED`
- `automations.status`: `DRAFT, ACTIVE, PAUSED, ERROR, ARCHIVED`
- `jobs.status`: `PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED`
- `outbox_events.status`: `PENDING, PROCESSING, PROCESSED, FAILED`
- `opportunities.stage`: **13 estados (ADR-002 + addendum 2026-09-02)** — alineados 1:1 con Twenty; la UI agrupa en 4 columnas.
  Es el **único campo escribible desde CT** (ADR-008): la oportunidad se crea y se edita en Twenty
- `portfolio_items.status`: **NOT_ELIGIBLE, CANDIDATE, IN_PREPARATION, PUBLISHED, ARCHIVED (ADR-001)**

## Simplificaciones MVP (permitidas por el dominio)
- **Project ↔ Service:** `projects.service_id` (FK única) en MVP; el dominio §22 permite simplificar el N:M.
- **project_phases** sin `organization_id` propio (scoped vía `project_id`).

## Stack (doc 4)
TypeScript · Node 24 LTS · Next.js App Router · Drizzle · PostgreSQL 18 · Better Auth · worker+jobs Postgres ·
Transactional Outbox (no Event Sourcing) · Vitest · Playwright · pnpm · GitHub Actions · Docker Compose · Caddy · ARM64.
Prohibido sin ADR: Redis, Kafka/RabbitMQ, Kubernetes, vector DB, Python en core, microservicios.

## Arquitectura (doc 3)
Modular Monolith. Flujo `UI → API → Application → Domain → Persistence`. `domain` no importa framework/ORM/SDKs.
Integraciones = adapters: `External DTO → Mapping → Domain command → Domain entity`. Nunca filtrar esquema de proveedor al dominio.
IDs internos UUID; identidad externa vía `external_identities (provider, external_type, external_id)` UNIQUE (idempotencia).

## Registro de ADRs
- [ADR-001](./adr/ADR-001-portfolio-items-schema.md) — esquema de `portfolio_items`
- [ADR-002](./adr/ADR-002-opportunity-stages.md) — enum de `opportunities.stage`
- [ADR-003](./adr/ADR-003-auth-and-org-boundary.md) — Better Auth (`user`=`users`) + boundary de organización en la capa de aplicación
- [ADR-004](./adr/ADR-004-resources.md) — dominio de `resources` (recursos por cliente/proyecto, E-5)
- [ADR-005](./adr/ADR-005-project-type.md) — `projects.type` (INTERNAL/CLIENT/LAB) y el invariante «CLIENT exige cliente» (A-1)
- [ADR-006](./adr/ADR-006-decision-supersede-link.md) — enlace de reemplazo entre decisiones (`supersedes_decision_id`) (A-2)
- [ADR-007](./adr/ADR-007-project-assets.md) — enlace proyecto ↔ reutilizable: tabla puente `project_assets` (A-3)
- [ADR-008](./adr/ADR-008-opportunity-state-machine.md) — CT es **sólo la máquina de estados** de las oportunidades (se crean y se editan en Twenty)
