# Control Tower — Implementation Roadmap

> **Documento canónico** de la construcción de Control Tower. Copia versionada del plan aprobado
> (`~/.claude/plans/quiero-construir-una-nueva-pure-balloon.md`). Vive en git para sobrevivir al
> cierre del chat. El progreso real se registra en [`BUILD_LOG.md`](./BUILD_LOG.md).
>
> Estado: **APROBADO — en ejecución** · Rama: `control-tower-mvp` · Inicio: 2026-08-10

---

## Qué es Control Tower

Una **capa web de control, agregación, contexto y gobierno** sobre las herramientas existentes
(Twenty CRM, Notion, Git, Google Drive, Calendar, n8n, la Raspberry Pi). NO reemplaza esas
herramientas ni duplica su contenido: responde *"¿qué está pasando en mi empresa, qué requiere
atención, qué he decidido y dónde está la información canónica?"*.

## Documentos fuente (9) y precedencia

```
1_SPEC (v0.1.0, exploratorio)
2_DOMAIN_MODEL_UPDATED     ── FROZEN v1.0 (entidades, ownership, invariantes, estados)
3_TECHNICAL_ARCHITECTURE   ── congelada (capas, outbox, adapters, API-first)
4_STACK_DECISION           ── FROZEN v1.0 (autoritativo para tecnología)
5_PHYSICAL_DATA_MODEL      ── FROZEN (autoritativo para esquema PostgreSQL)
6_INFORMATION_ARCHITECTURE ── navegación congelada
7_WIREFRAMES               ── 26 pantallas MVP
8_CROSS_DOCUMENT_REVIEW + ERRATA ── capa de corrección (ERRATA-001..016) que resuelve las 4 inconsistencias críticas
9_IMPLEMENTATION_PLAN_REVIEW ── aprueba el plan con 10 aclaraciones (IMP-001..010)
old_docs/9_IMPLEMENTATION_PLAN ── el plan real de 18 milestones (M01..M18)
```

**Orden de precedencia para resolver contradicciones (CONGELADO — doc 8 §30 / IMP-001):**
1. Decisiones de arquitectura explícitas → 2. **Implementation Errata** → 3. **Domain Model** →
4. **Physical Data Model** (autoritativo para columnas/enums/índices/FKs) → 5. Information Architecture →
6. Wireframes → 7. Spec exploratorio.

**Regla de oro:** ante una contradicción **no** resuelta por la errata → **PARAR y señalar**, no inventar regla de dominio.
Ver decisiones congeladas completas en [`DECISIONS_FROZEN.md`](./DECISIONS_FROZEN.md).

> 📌 **Hallazgos y funcionalidad diferida:** todo lo que se encontró y quedó reducido/diferido/simplificado
> respecto al dominio o los wireframes se registra en [`FINDINGS_AND_DEFERRED.md`](./FINDINGS_AND_DEFERRED.md)
> — para evaluar después qué implementar.

---

## Alcance MVP

**Navegación (doc 6):** Home · Business · CRM · Projects · Knowledge · Automation · Settings (+ Global Search, Quick Create).

**28 tablas MVP:**
```
organizations · users · organization_members
strategic_areas · goals · capabilities · services · service_capabilities
clients · contacts · opportunities
projects · project_phases · tasks · deliverables
decisions
knowledge_inbox · knowledge_items
documents · assets · portfolio_items
external_identities · integrations · automations · jobs · outbox_events
audit_logs · change_events
```

**Fase 2+ (NO crear en MVP):** Initiative, Milestone, Interaction, Meeting, Skill, LearningItem, Roadmap,
Environment, Application/CMDB, Marketing*, Experiment, Risk, Issue, Dependency, DailyUpdate, Tag,
Custom Objects/Fields/Views/Dashboards/Workflows, AI/RAG/vector, Client Portal, Billing, admin multi-tenant.

## Stack (congelado)

TypeScript estricto · Node.js 24 LTS · Next.js (App Router) · React · Tailwind · shadcn/ui+Radix · Zod ·
Drizzle ORM · PostgreSQL 18 · Better Auth · worker Node + jobs en Postgres · Transactional Outbox ·
Vitest · Playwright · pnpm workspaces · GitHub Actions · Docker + Compose · Caddy · self-hosted ARM64.

## Estructura del repo

```
apps/control-tower/
├── apps/web/            # Next.js (App Router): UI + Route Handlers /api/v1
├── apps/worker/         # worker Node: jobs + outbox dispatcher + schedulers
├── packages/
│   ├── domain/          # entidades, VOs, reglas, transiciones, eventos (sin imports de framework)
│   ├── application/     # casos de uso, queries, context services, políticas authz, tx boundaries
│   ├── db/              # schema Drizzle, repos, migraciones, conexión, seed
│   ├── integrations/    # adapters Twenty/Notion/Git/Drive
│   ├── validation/      # esquemas Zod compartidos
│   └── shared/          # logger, errores, tipos, utilidades
├── docs/                # ESTA documentación (roadmap, build log, ADRs, decisiones)
├── docker/ · Dockerfile · compose.yml
├── control-tower.docker-compose.dev.yml / .prod.yml · deploy-control-tower.sh
├── tests/{integration,e2e}
├── pnpm-workspace.yaml · package.json · tsconfig.base.json · .env.example
```

**Despliegue (modelo-1 del monorepo):** web + worker + `control-tower-db` (Postgres propio) en
`noboolsheet_network`; puertos **4270 (dev) / 4272 (prod)**; Caddy `control-tower.noboolsheet.local`.
Twenty ya corre en `infrastructure/twenty/` → target del adapter M12.

---

## Los 18 milestones

Cada milestone produce una app que arranca. **DoD por feature:** Domain ✓ DB ✓ Migración ✓ Zod ✓
Caso de uso ✓ API ✓ UI ✓ loading/empty/error ✓ authz org ✓ audit/change-event ✓ tests ✓ doc ✓.
**DoD migración:** aplica desde DB limpia + rollback donde aplique + seed válido.

| # | Milestone | Entrega principal |
|---|-----------|-------------------|
| M01 | Repository + tooling | workspace pnpm, Docker, deploy modelo-1, CI, `/api/health` |
| M02 | Database + migrations | 28 tablas, migraciones en orden FK, seed determinista |
| M03 | Auth + organization | Better Auth, org boundary, authz roles, aislamiento |
| M04 | Business module | StrategicArea/Goal/Capability/Service + componentes UI base |
| M05 | CRM | Client/Contact/Opportunity, Kanban (stages ADR-002; hoy 13, alineados con Twenty) |
| M06 | Projects | Project/Phase/Task/Deliverable, health derivado, loop operativo |
| M07 | Knowledge | Inbox→Item lifecycle, Decision, Document, Asset |
| M08 | Portfolio | PortfolioItem (ADR-001), List/Detail |
| M09 | Home | agregaciones derivadas, proyección con enlaces a fuente |
| M10 | Global Search | Postgres FTS sobre entidades MVP, ⌘K |
| M11 | Automation infra | worker, jobs (SKIP LOCKED), outbox dispatcher, retries |
| M12 | Twenty adapter | IntegrationAdapter, external_identities, sync idempotente |
| M13 | Notion adapter | referencias de knowledge/docs (sin duplicar contenido) |
| M14 | Git adapter | repos/commits/versiones de assets |
| M15 | Google Drive adapter | referencias a archivos/carpetas |
| M16 | Audit + System Health | audit_logs + change_events, pantalla System Health |
| M17 | Security + testing | authz, Zod boundaries, e2e journeys, hardening |
| M18 | Deployment (Pi) | ARM64, backup+restore verificado, Caddy/HTTPS, healthchecks |

El desglose detallado por milestone (archivos/módulos/migraciones/tests) está en el plan aprobado y se
reproduce en las entradas de [`BUILD_LOG.md`](./BUILD_LOG.md) a medida que se ejecuta cada uno.

### Journeys e2e mínimos
Login→Home · loop operativo Home→atención→entidad→update→Home · Create Client→Project→Task→Complete ·
Capture→Review→Approve→Link · Decision Draft→Review→Approved · Create Portfolio Item→Link Project.

---

## Tracker de estado

| # | Milestone | Estado |
|---|-----------|--------|
| Gate | C-1, C-2, deploy/puertos | ✅ cerrado (ADR-001, ADR-002, modelo-1 4270/4272) |
| M01 | Repository + tooling | ✅ completado (CI chain verde; runtime smoke OK) |
| M02 | Database + migrations | ✅ completado (28 tablas en pg18 real; seed idempotente; 5/5 integración) |
| M03 | Auth + organization | ✅ completado (Better Auth + org boundary; e2e auth real; 9/9 integración) |
| M04 | Business module | ✅ completado (vertical domain→app→API→UI; @ct/domain; 15/15 integración; e2e HTTP) |
| M05 | CRM | ✅ completado (Clients/Contacts/Opportunities; Kanban; 20/20 integración; e2e HTTP) |
| M06 | Projects | ✅ completado (Project/Phase/Task/Deliverable; health+progress derivados; 27/27; e2e loop) |
| M07 | Knowledge | ✅ completado (Inbox/Item/Decision/Document/Asset; 35/35; e2e; tabs rellenadas) |
| M08 | Portfolio | ✅ completado (PortfolioItem ADR-001; 40/40; e2e; bajo Knowledge) |
| M09 | Home | ✅ completado (dashboard derivado; loop IMP-009 cerrado; 44/44; context API) |
| M10 | Global Search | ✅ completado (FTS GIN 11 tablas; ⌘K; 49/49; e2e) |
| M11 | Automation infra | ✅ completado (jobs SKIP LOCKED + outbox transaccional + worker real; 55/55; e2e) |
| M12 | Twenty adapter | ✅ completado y **PROBADO EN VIVO** (Bloque 2 · Fase 1: pull real de company/person/opportunity/task + write-back) |
| M13 | Notion adapter | ✅ completado y **PROBADO EN VIVO** (Bloque 2 · Fase 3: 8 DBs bidireccionales, propiedad por campo) |
| M14 | Git adapter | ✅ completado y **PROBADO EN VIVO** (Bloque 2 · Fase 2: repos→assets, con paginación `Link`) |
| M15 | Google Drive adapter | ✅ completado y **PROBADO EN VIVO** (Bloque 2 · Fase 4: service account + carpeta recursiva) |
| M16 | Audit + System Health | ✅ completado (audit+change events, Activity timeline, System Health; 69/69) |
| M17 | Security + testing | ✅ completado (CSRF/rate-limit/headers; e2e journeys 5/5 + hardening) |
| M18 | Deployment (Pi) | ✅ completado (backup/restore drill verde; compose prod validado; runbook) |

**🎉 MVP COMPLETO (18/18).** Ver el resumen de cierre en [`BUILD_LOG.md`](./BUILD_LOG.md). Pendiente de infra/creds:
pull real de integraciones + `docker compose up` de producción en la Pi (ver [`DEPLOYMENT.md`](./DEPLOYMENT.md)).
