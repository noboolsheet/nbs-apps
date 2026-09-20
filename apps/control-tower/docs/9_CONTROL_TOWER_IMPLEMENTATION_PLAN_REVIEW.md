# CONTROL TOWER — IMPLEMENTATION PLAN REVIEW

> **Documento de diseño ORIGINAL (línea base, 2026-08-10).** Se conserva como referencia técnica/histórica; su cuerpo no se reescribe al evolucionar la implementación. Para el **estado actual** y las **desviaciones**, mandan `BUILD_LOG.md`, `FINDINGS_AND_DEFERRED.md`, `adr/` y `DECISIONS_FROZEN.md`. Índice en [`README.md`](./README.md).

## Verdict

**APPROVED WITH MINOR CORRECTIONS BEFORE HANDOFF TO CLAUDE.**

The implementation plan is coherent with the architecture package and the
implementation errata. It is suitable as the execution roadmap, but I would
freeze a small number of clarifications before using it as the primary build
instruction.

## 1. What is already correct

- The plan correctly treats architecture as the source of implementation
  constraints rather than redesigning the product during coding.
- The sequence Foundation → Auth/Organization → Data → Domain/Application →
  API/UI → modules → integrations → hardening is sound.
- MVP scope is explicitly constrained.
- Portfolio is correctly included in MVP.
- Client terminology is consistent with the errata.
- Decision lifecycle is handled through the architecture/errata rather than
  inventing another lifecycle.
- External systems are treated as adapters rather than leaking provider
  schemas into the domain.
- Search remains database-backed in MVP.
- The plan includes organization isolation, auditability, testing, backups,
  observability and deployment.
- Claude is instructed to work incrementally and stop on unresolved
  contradictions.

## 2. Corrections / clarifications to freeze

### IMP-001 — Explicit source-of-truth precedence

The implementation plan should explicitly repeat the same precedence defined
in the Cross-Document Architecture Review:

1. Explicit architecture decisions
2. Implementation Errata
3. Domain Model
4. Physical Data Model
5. Information Architecture
6. Wireframes
7. Earlier exploratory descriptions

This prevents Claude from treating the implementation plan itself as a new
source of domain truth.

### IMP-002 — Physical Data Model is authoritative for schema details

The plan correctly says that exact fields follow the Physical Data Model.
Make this operational:

> Claude must not invent database columns, enums, relationships or indexes
> when the Physical Data Model already defines them.

If implementation requires a schema change, Claude must flag it as an
architecture change before applying it.

### IMP-003 — Stack Decision is authoritative for technology choices

The plan intentionally allows some implementation flexibility, but Claude
must not substitute frameworks, databases, ORMs, authentication providers or
infrastructure components without an explicit decision.

The Stack Decision remains authoritative.

### IMP-004 — Portfolio implementation must be reflected in migrations

Because Portfolio was the main cross-document inconsistency, the first
implementation pass must verify that:

```text
portfolio_items
```

exists in the physical model/migrations and that:

```text
Project → PortfolioItem
```

is represented correctly.

### IMP-005 — MVP boundary must be enforced

The plan contains a good Phase 2 backlog. Add an explicit rule:

> A Phase 2 entity must not be added to the MVP database, API or navigation
> simply because it exists in the broader Domain Model.

### IMP-006 — Integration order is a priority, not a dependency

The sequence:

```text
Twenty
Notion
Git
Google Drive
```

is good, but integrations must not block the core application.

The application must remain fully usable without any external integration.

### IMP-007 — Jobs and workers

The plan includes `Job`, `OutboxEvent` and workers. Their minimum MVP
contract should be:

```text
queued
running
succeeded
failed
retryable
```

with timestamps and error information sufficient for System Health.

Do not build a full workflow engine.

### IMP-008 — Definition of Done should include migration reproducibility

For every database-affecting feature:

```text
migration created
migration applies from clean DB
migration rolls back where supported
seed/test environment remains valid
```

### IMP-009 — E2E critical path

The current E2E journeys are good. Add the core daily operating loop:

```text
Login
→ Home
→ identify attention item
→ open source entity
→ update it
→ return to Home
```

This validates that Control Tower actually works as the operational cockpit,
not merely as a collection of CRUD pages.

### IMP-010 — Self-hosted deployment constraint

The plan correctly targets the Raspberry Pi/self-hosted environment.
Before production deployment, Claude must verify:

- ARM compatibility of all images/dependencies;
- persistent storage;
- PostgreSQL backup location;
- reverse proxy configuration;
- HTTPS;
- restart behavior;
- health checks;
- resource consumption.

## 3. Recommended implementation gate

Before M01 begins, verify:

```text
[ ] Cross-document review + errata available
[ ] Implementation plan reviewed
[ ] Stack Decision available
[ ] Physical Data Model available
[ ] Portfolio correction confirmed
[ ] Client terminology confirmed
[ ] Decision lifecycle confirmed
[ ] MVP / Phase 2 boundary confirmed
[ ] Repository location selected
[ ] Deployment target confirmed
```

## 4. Final assessment

No architectural redesign is required.

The plan is ready to become the execution baseline after applying the
clarifications above.

The next artifact should **not** be another conceptual architecture
document.

The next step is implementation preparation:

```text
Repository structure
→ development environment
→ M01 Foundation
```

Claude should then build incrementally and report each milestone before
moving to the next.

