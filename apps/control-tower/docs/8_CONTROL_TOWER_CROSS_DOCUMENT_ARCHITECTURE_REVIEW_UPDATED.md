---
title: "Control Tower — Cross-Document Architecture Consistency Review"
version: "1.0.0"
status: "ARCHITECTURE GATE — REVIEW COMPLETE"
date: "2026-08-10"
documents_reviewed:
  - CONTROL_TOWER_SPEC.md
  - CONTROL_TOWER_DOMAIN_MODEL.md
  - CONTROL_TOWER_TECHNICAL_ARCHITECTURE.md
  - CONTROL_TOWER_STACK_DECISION.md
  - CONTROL_TOWER_PHYSICAL_DATA_MODEL.md
  - CONTROL_TOWER_INFORMATION_ARCHITECTURE.md
  - CONTROL_TOWER_WIREFRAMES.md
---

# CONTROL TOWER — CROSS-DOCUMENT ARCHITECTURE CONSISTENCY REVIEW

> **Documento de diseño ORIGINAL (línea base, 2026-08-10).** Se conserva como referencia técnica/histórica; su cuerpo no se reescribe al evolucionar la implementación. Para el **estado actual** y las **desviaciones**, mandan `BUILD_LOG.md`, `FINDINGS_AND_DEFERRED.md`, `adr/` y `DECISIONS_FROZEN.md`. Índice en [`README.md`](./README.md).

## 0. Objetivo

Esta revisión comprueba la coherencia entre los seis documentos
arquitectónicos congelados y los wireframes:

1. Product & Technical Specification
2. Domain Model
3. Technical Architecture
4. Stack Decision
5. Physical Data Model
6. Information Architecture
7. Wireframes

La revisión no sustituye el contenido de esos documentos ni introduce
nuevos requisitos por conocimiento externo.

---

# 1. VEREDICTO EJECUTIVO

## Estado

**NO CONGELAR TODAVÍA.**

La arquitectura general es sólida y coherente, pero existen
**4 inconsistencias de arquitectura que deben resolverse antes de
entregar el conjunto a Claude como contrato de implementación.**

No son problemas de visión general. Son principalmente problemas de
alineación entre:

```text
Spec
  ↓
Domain
  ↓
Physical Data Model
  ↓
Information Architecture
  ↓
Wireframes
```

La Technical Architecture y el Stack Decision son compatibles con el
enfoque general.

---

# 2. HALLAZGO CRÍTICO 1 — PORTFOLIO

## Problema

El `CONTROL_TOWER_SPEC.md` incluye Portfolio explícitamente dentro del MVP.

El Spec establece:

```text
MVP
└── Portfolio
```

y define `PortfolioItem` como entidad.

El Domain Model también conserva `PortfolioItem` y establece relaciones
con Project.

Sin embargo:

- el Physical Data Model no contiene `portfolio_items`;
- la Information Architecture no tiene sección Portfolio;
- los Wireframes no contienen Portfolio;
- el inventario de pantallas MVP tampoco incluye Portfolio.

## Impacto

Claude podría interpretar que Portfolio forma parte del MVP por el Spec
o que está fuera del MVP por los documentos posteriores.

Eso produciría una implementación inconsistente.

## Decisión recomendada

Dado que Portfolio es importante para el objetivo real de Control Tower
y además forma parte explícita del MVP original:

**MANTENER PORTFOLIO EN MVP.**

Debe añadirse:

```text
Physical:
portfolio_items

IA:
Portfolio

Wireframes:
Portfolio List
Portfolio Detail
```

Relación mínima:

```text
Project
   ↓
PortfolioItem
```

y también:

```text
Asset / CaseStudy / Demo / Template / Product
        ↓
PortfolioItem
```

No se necesita un sistema editorial complejo.

---

# 3. HALLAZGO CRÍTICO 2 — ENTIDADES DEL DOMAIN MODEL SIN REPRESENTACIÓN FÍSICA

El Domain Model contiene entidades que no aparecen como tablas en el
Physical Data Model.

Entre ellas:

```text
Initiative
Milestone
Interaction
Meeting
Skill
LearningItem
Environment
MarketingChannel
MarketingCampaign
FunnelStage
PortfolioItem
Experiment
Risk
Issue
Dependency
DailyUpdate
```

Además, algunas aparecen como entidades explícitas del dominio pero no
tienen una ruta clara en IA/Wireframes.

## Problema

No es necesariamente incorrecto que una entidad del dominio no tenga
tabla en MVP.

El problema es que no está suficientemente explícito qué casos son:

```text
A. MVP real
B. Dominio futuro
C. Derived
D. External projection
```

## Decisión recomendada

Clasificar formalmente las entidades en tres grupos:

### MVP físico

```text
Organization
User
OrganizationMember
StrategicArea
Goal
Capability
Service
ServiceCapability
Client
Contact
Opportunity
Project
ProjectPhase
Task
Deliverable
Decision
KnowledgeInbox
KnowledgeItem
Document
Asset
ExternalIdentity
Integration
Automation
Job
OutboxEvent
AuditLog
ChangeEvent
PortfolioItem
```

### Dominio definido pero FASE 2+

```text
Initiative
Milestone
Interaction
Meeting
Skill
LearningItem
Environment
MarketingChannel
MarketingCampaign
FunnelStage
Experiment
Risk
Issue
Dependency
DailyUpdate
```

### Extensiones futuras

```text
Custom Objects
Custom Fields
Custom Relationships
Custom Pages
Custom Views
Custom Dashboards
Custom Workflows
```

Esto permite conservar el dominio sin obligar al MVP a implementar todo.

---

# 4. HALLAZGO CRÍTICO 3 — CLIENT vs CUSTOMER

El Spec utiliza:

```text
Customer
```

como entidad.

El Domain Model utiliza:

```text
Client
```

El Physical Data Model utiliza:

```text
clients
```

## Decisión recomendada

**Congelar `Client` como nombre de dominio.**

Usar:

```text
Domain: Client
Database: clients
API: /clients
UI: Clients
```

`Customer` debe eliminarse del vocabulario del producto para evitar dos
conceptos aparentemente diferentes.

La referencia conceptual del Spec debe actualizarse.

---

# 5. HALLAZGO CRÍTICO 4 — DECISION STATUS

El Domain Model define:

```text
PROPOSED
→ ACCEPTED
→ SUPERSEDED / REJECTED
```

El Physical Data Model define:

```text
DRAFT
REVIEW
APPROVED
SUPERSEDED
ARCHIVED
```

La Technical Architecture además utiliza de forma general:

```text
DRAFT
→ REVIEW
→ APPROVED
→ ARCHIVED
```

## Problema

No existe un único lifecycle contractual.

## Decisión recomendada

Para `Decision`, separar claramente:

### Editorial lifecycle

```text
DRAFT
→ REVIEW
→ APPROVED
```

### Histórico

```text
APPROVED
→ SUPERSEDED
→ ARCHIVED
```

No usar `ACCEPTED` en el modelo físico.

Decisión final:

```text
DRAFT
REVIEW
APPROVED
SUPERSEDED
ARCHIVED
```

`REJECTED` puede reservarse para propuestas descartadas si se considera
necesario, pero no debe introducirse sin actualizar el modelo completo.

---

# 6. HALLAZGO IMPORTANTE — KNOWLEDGE INBOX

Aquí la arquitectura es coherente.

Domain:

```text
CAPTURED
→ TRIAGED
→ PROCESSING
→ CLASSIFIED
→ INTEGRATED
→ ARCHIVED
```

Wireframes muestran:

```text
New
Processing
Needs Review
Approved
```

## Problema menor

Los nombres de las columnas de UI no son idénticos al lifecycle del
dominio.

## Decisión recomendada

No cambiar el dominio.

La UI puede presentar estados agrupados:

```text
New
  = CAPTURED / TRIAGED

Processing
  = PROCESSING / CLASSIFIED

Needs Review
  = necesita intervención humana

Integrated
  = INTEGRATED

Archived
  = ARCHIVED
```

El UI label no tiene que ser idéntico al enum interno.

---

# 7. HALLAZGO IMPORTANTE — PROJECT PHASE / MILESTONE

El Domain Model define:

```text
ProjectPhase
Milestone
```

El Physical Data Model implementa:

```text
project_phases
```

pero no tiene:

```text
milestones
```

## Decisión recomendada

Para MVP:

**Mantener ProjectPhase.**

`Milestone` puede pasar a Fase 2 si el MVP no necesita una entidad
independiente.

Pero debe quedar documentado como:

```text
Domain entity: Fase 2
Physical table: no MVP
UI: no MVP
```

Si se quiere mantener "Upcoming milestones" en Home como funcionalidad
MVP, entonces debe existir una fuente física inequívoca para los hitos.

No conviene que Claude invente una implementación alternativa.

---

# 8. HALLAZGO — "AT RISK" VS RISK

La IA y los Wireframes contienen:

```text
At Risk
```

como filtro/vista de Projects.

El Domain Model tiene una entidad:

```text
Risk
```

pero el Physical Model no la implementa.

## Decisión recomendada

Para MVP:

`At Risk` debe ser un **estado/health derivado del Project**, no una
entidad Risk independiente.

Por tanto:

```text
Project
  status = ACTIVE
  health = AT_RISK
```

o equivalente derivado.

La entidad `Risk` queda para Fase 2.

Esto mantiene el dashboard sencillo.

---

# 9. HALLAZGO — AUTOMATION / INTEGRATION

Domain distingue correctamente:

```text
Application
Integration
Automation
```

Physical implementa:

```text
integrations
automations
```

pero no implementa `applications` ni `environments` como parte clara del
MVP físico.

## Decisión recomendada

Para MVP:

```text
Integration = conexión de un sistema externo con Control Tower
Automation = proceso automatizado
```

Las aplicaciones utilizadas por la empresa pueden representarse
inicialmente mediante las propias Integrations.

`Application` y `Environment` pueden quedar en Fase 2 si no son necesarios
para el MVP operativo.

Esto es especialmente importante porque el objetivo inicial es controlar
el negocio, no construir un CMDB.

---

# 10. HALLAZGO — MARKETING

El Domain Model define:

```text
MarketingChannel
MarketingCampaign
FunnelStage
```

El Spec también contempla Marketing.

Pero la IA y Wireframes no contienen una sección Marketing.

## Decisión recomendada

No añadir Marketing al MVP actual.

Clasificarlo como:

```text
Fase 2
```

La información de marketing puede seguir viviendo en sus fuentes
externas mientras Control Tower se concentra en:

```text
Business
CRM
Projects
Knowledge
Automation
```

Esto reduce alcance y es coherente con el principio de no
sobrediseñar.

---

# 11. HALLAZGO — LEARNING / CAPABILITIES

El Domain Model contempla:

```text
Skill
LearningItem
```

pero el Physical Model y Wireframes MVP no los implementan como entidades
independientes.

La IA sí muestra:

```text
Capabilities
```

## Decisión recomendada

Mantener:

```text
Capability = MVP
```

y tratar:

```text
Skill
LearningItem
Roadmap
```

como Fase 2.

Esto no impide mostrar una indicación simple de "Learning Needs" en
Capabilities si es un dato derivado o futuro, pero no debe crear una
segunda arquitectura de formación dentro del MVP.

---

# 12. HALLAZGO — GLOBAL SEARCH

La arquitectura es coherente:

```text
IA:
Global Search

Technical Architecture:
MVP search

Stack:
PostgreSQL search inicial
```

Los Wireframes muestran búsqueda transversal.

## Estado

**APROBADO.**

No introducir vector search en MVP.

---

# 13. HALLAZGO — SOURCE OF TRUTH

La arquitectura es coherente en el principio:

```text
Control Tower = contexto / gobierno
External system = detalle cuando corresponda
```

También existe:

```text
ExternalIdentity
```

y la Technical Architecture contempla adapters, mapping e idempotencia.

## Estado

**APROBADO.**

Única regla que debe mantenerse durante implementación:

> Ningún adapter externo puede introducir directamente entidades del
> proveedor dentro del Domain Model.

Siempre:

```text
External DTO
↓
Mapping
↓
Domain command
↓
Domain entity
```

---

# 14. HALLAZGO — STACK

El Stack Decision es coherente con Technical Architecture:

```text
TypeScript
Node.js 24 LTS
Next.js
PostgreSQL
Drizzle
Better Auth
Tailwind
shadcn/ui + Radix
Zod
PostgreSQL-backed jobs
Transactional Outbox
Docker
Caddy
Git
CI/CD
```

No se detecta una contradicción estructural entre stack y arquitectura.

## Estado

**APROBADO.**

---

# 15. HALLAZGO — MULTI-TENANCY

La arquitectura es coherente:

```text
organization_id
```

desde el principio, pero:

```text
multi-tenant preparado
≠
multi-tenant implementado
```

Esto coincide con el objetivo del producto configurable sin introducir
complejidad SaaS prematuramente.

## Estado

**APROBADO.**

---

# 16. HALLAZGO — API

La Technical Architecture establece API-first y el Spec exige API.

Los Wireframes no necesitan representar endpoints.

## Estado

**APROBADO.**

Antes de implementar, el API debe derivarse del Domain Model y no de la
estructura de las pantallas.

---

# 17. HALLAZGO — AUDIT LOG VS CHANGE EVENT

Los documentos distinguen correctamente:

```text
AuditLog
= quién hizo qué

ChangeEvent
= cómo cambió el estado
```

El Physical Model implementa ambos.

## Estado

**APROBADO.**

No fusionarlos.

---

# 18. HALLAZGO — KNOWLEDGE SOURCE

La arquitectura general mantiene:

```text
KnowledgeItem
↓
Markdown / Git / Obsidian / Notion según caso
```

y Control Tower mantiene principalmente:

```text
metadata
relations
status
source reference
```

Esto es coherente con el principio de no duplicación.

## Estado

**APROBADO.**

---

# 19. HALLAZGO — WIREFRAMES VS IA

La mayor parte de las rutas coinciden.

## Correctamente representadas

```text
Home
Business
  Strategic Areas / Goals / Capabilities / Services
CRM
  Clients / Contacts / Opportunities
Projects
  Projects / Detail / Tasks / Deliverables / Decisions
Knowledge
  Inbox / Review / Library / Decisions / Assets
Automation
  Integrations / System Health
Settings
```

## Falta

```text
Portfolio
```

por la razón explicada en el Hallazgo 1.

---

# 20. HALLAZGO — PROJECT DETAIL

Project Detail está bien alineado con el dominio.

Representa:

```text
Client
Service
Phase
Tasks
Deliverables
Decisions
Documents
Assets
Activity
```

## Estado

**APROBADO.**

---

# 21. HALLAZGO — DOCUMENTS

Domain Model y Physical Model contemplan Documents.

Los Wireframes muestran Documents como referencia externa.

## Estado

**APROBADO.**

Debe mantenerse la regla:

```text
Document metadata
+
external source
```

y no convertirlo en un editor documental.

---

# 22. HALLAZGO — ASSETS

Domain Model, Physical Model, IA y Wireframes están alineados.

La relación:

```text
Project
→ Asset
```

y la reutilización futura son coherentes con la visión de convertir
proyectos importantes en plantillas.

## Estado

**APROBADO.**

---

# 23. MATRIZ DE CONSISTENCIA

| Área | Spec | Domain | Physical | IA | Wireframes | Estado |
|---|---|---|---|---|---|---|
| Organization | ✓ | ✓ | ✓ | implícita | ✓ | OK |
| Goals | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Capabilities | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Services | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Client | Customer | Client | Client | Client | Client | **CORREGIR** |
| Contacts | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Opportunities | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Projects | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Project Phases | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Tasks | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Deliverables | ✓* | ✓ | ✓ | ✓ | ✓ | OK |
| Milestones | ✓ | ✓ | ✗ | ✗ | ✗ | **DECIDIR FASE** |
| Decisions | ✓ | ✓ | ✓ | ✓ | ✓ | **STATUS CORREGIR** |
| Knowledge Inbox | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Knowledge Items | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Documents | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Assets | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Integrations | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Automations | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Portfolio | ✓ MVP | ✓ | ✗ | ✗ | ✗ | **CRÍTICO** |
| Marketing | ✓ | ✓ | ✗ | ✗ | ✗ | **FASE 2** |
| Risks | ✓ | ✓ | ✗ | derived | ✗ | **FASE 2** |
| Issues | ✓ | ✓ | ✗ | ✗ | ✗ | **FASE 2** |
| Dependencies | ✓ | ✓ | ✗ | ✗ | ✗ | **FASE 2** |
| DailyUpdate | ✓ | ✓ | ✗ | ✗ | ✗ | **FASE 2** |
| Search | ✓ | ✓/technical | ✓ | ✓ | ✓ | OK |
| Audit | ✓ | ✓ | ✓ | — | — | OK |
| Change Events | ✓ | ✓ | ✓ | ✓ | ✓ | OK |
| Multi-org boundary | ✓ | ✓ | ✓ | — | — | OK |
| API-first | ✓ | ✓ | ✓ | — | — | OK |
| Outbox | ✓ | ✓/technical | ✓ | — | — | OK |

`*` Deliverables fue añadido explícitamente durante la revisión del Domain Model.

---

# 24. DECISIONES QUE DEBEN CONGELARSE AHORA

Antes de implementación, congelar exactamente:

## Decision A — Naming

```text
Client
```

es el término oficial.

## Decision B — Decision lifecycle

```text
DRAFT
REVIEW
APPROVED
SUPERSEDED
ARCHIVED
```

## Decision C — Portfolio

**Portfolio entra en MVP.**

## Decision D — Milestone

Recomendación:

**Fase 2**, salvo que se quiera implementar "Upcoming Milestones" como
funcionalidad real del MVP.

## Decision E — Risk

`At Risk` en MVP es un estado/health derivado del Project.

`Risk` como entidad = Fase 2.

## Decision F — Marketing

Marketing entities = Fase 2.

## Decision G — Learning detail

Capabilities = MVP.

Skill / LearningItem / Roadmap = Fase 2.

## Decision H — Infrastructure depth

Integrations + Automations + System Health = MVP.

Application + Environment + CMDB-like functionality = Fase 2.

---

# 25. CAMBIOS MÍNIMOS NECESARIOS ANTES DE IMPLEMENTAR

No se necesita rediseñar la arquitectura.

Se necesitan solamente estos ajustes:

```text
1. Spec:
   Customer → Client

2. Domain:
   Decision lifecycle → DRAFT / REVIEW / APPROVED /
                         SUPERSEDED / ARCHIVED

3. Physical:
   Añadir portfolio_items

4. Information Architecture:
   Añadir Portfolio

5. Wireframes:
   Añadir Portfolio List
   Añadir Portfolio Detail
   Añadir Portfolio al MVP screen inventory

6. Scope:
   Marcar Milestone, Marketing, Risk, Issue, Dependency,
   DailyUpdate, Skill, LearningItem, Environment e Initiative
   como Fase 2 si no se implementan físicamente.

7. Home:
   Si se mantiene "Upcoming Milestones", decidir si usa
   Project target dates en MVP o se incorpora Milestone.
```

---

# 26. LO QUE NO DEBEMOS HACER

No resolver estas inconsistencias mediante código condicional.

No:

```text
if portfolio...
if niche...
if marketing...
if external_system...
```

La solución correcta es contractual:

```text
Domain
↓
Physical model
↓
Application layer
↓
UI
```

con límites explícitos de MVP.

---

# 27. ARQUITECTURE GATE FINAL

## Estado actual

**CONDITIONAL PASS**

La arquitectura está suficientemente madura para implementación, pero
**no debe entregarse todavía a Claude como contrato congelado**.

## Para obtener PASS definitivo

Resolver los 7 cambios mínimos de la sección 25.

Después:

```text
SPEC                  🔒
DOMAIN MODEL          🔒
TECHNICAL ARCH         🔒
STACK                  🔒
PHYSICAL MODEL         🔒
INFORMATION ARCH.      🔒
WIREFRAMES             🔒
```

y el conjunto podrá considerarse:

> **IMPLEMENTATION BASELINE v1.0**

---

# 28. SIGUIENTE PASO

Una vez aplicados esos cambios, el siguiente documento recomendado es:

```text
CONTROL_TOWER_IMPLEMENTATION_PLAN.md
```

Debe convertir la arquitectura congelada en:

- estructura exacta del repositorio;
- módulos;
- orden de implementación;
- migraciones;
- seed data;
- API resources;
- autenticación;
- integración Twenty;
- integración Notion;
- integración Git;
- jobs;
- outbox;
- testing;
- deployment;
- Definition of Done por sprint.

Ese documento será el puente entre:

```text
ARQUITECTURA
     ↓
IMPLEMENTACIÓN CON CLAUDE
```


# 29. IMPLEMENTATION ERRATA — CHANGES TO APPLY WITHOUT EDITING THE SOURCE DOCUMENTS

This section is an explicit correction layer for implementation.

**Important:** Claude must treat this section as authoritative for resolving
the inconsistencies identified in this review. The original architecture
documents do not need to be rewritten before implementation; these changes
must be applied as an implementation errata layer.

## ERRATA-001 — Client naming

Replace the inconsistent `Customer` terminology with:

```text
Domain: Client
Database: clients
API: /clients
UI: Clients
```

Do not create a separate Customer entity.

## ERRATA-002 — Decision lifecycle

Use this lifecycle consistently:

```text
DRAFT
→ REVIEW
→ APPROVED
→ SUPERSEDED
→ ARCHIVED
```

Do not implement `PROPOSED` or `ACCEPTED` as alternative Decision states.

`REJECTED` is not part of the MVP Decision enum unless explicitly added
later through a new architecture decision.

## ERRATA-003 — Portfolio is MVP

Portfolio remains part of the MVP.

Add the missing implementation representation:

```text
Database:
portfolio_items

Information Architecture:
Portfolio

UI:
Portfolio List
Portfolio Detail
```

Minimum conceptual relationship:

```text
Project → PortfolioItem
```

Portfolio should remain intentionally simple in MVP. It is not a complete
CMS or publishing platform.

## ERRATA-004 — Explicit MVP / Phase 2 boundary

The following domain entities are defined for the broader product but are
**not required as physical MVP entities** unless another explicit decision
overrides this errata:

```text
Initiative
Milestone
Interaction
Meeting
Skill
LearningItem
Environment
MarketingChannel
MarketingCampaign
FunnelStage
Experiment
Risk
Issue
Dependency
DailyUpdate
```

They remain part of the future domain and should not be forgotten.

## ERRATA-005 — Project milestones

`Milestone` is Phase 2.

If the MVP Home displays an "Upcoming Milestones" concept, implement it
using existing Project target/due-date information rather than inventing
an unmodelled Milestone entity.

## ERRATA-006 — Project risk

`At Risk` is an MVP Project health/status concept, not an MVP `Risk`
entity.

Use an appropriate Project health representation such as:

```text
Project.health = AT_RISK
```

or an equivalent derived value defined by the physical model.

The standalone `Risk` entity remains Phase 2.

## ERRATA-007 — Marketing scope

The following remain Phase 2:

```text
MarketingChannel
MarketingCampaign
FunnelStage
```

Do not add a Marketing module to the MVP navigation merely because these
entities exist in the broader Domain Model.

## ERRATA-008 — Learning scope

MVP includes:

```text
Capability
```

The following remain Phase 2:

```text
Skill
LearningItem
Learning/Roadmap management
```

Do not build a second LMS inside Control Tower.

## ERRATA-009 — Infrastructure/application scope

MVP includes:

```text
Integration
Automation
Job / worker infrastructure
System Health
```

Do not build CMDB-style application/environment management in MVP.

`Application` and `Environment` remain future concepts unless explicitly
required by a later architecture decision.

## ERRATA-010 — External systems and source of truth

Control Tower must not silently duplicate the full content of external
systems.

Maintain the distinction:

```text
Control Tower
= context + relationships + status + governance + references

External system
= canonical detailed content where applicable
```

Adapters must follow:

```text
External DTO
→ Mapping / normalization
→ Domain command
→ Domain entity
```

Do not leak provider-specific schemas into the domain model.

## ERRATA-011 — Search

Global Search is MVP.

Initial search must remain conventional/database-backed.

Do not introduce vector search, RAG, embeddings or an AI search layer into
MVP.

## ERRATA-012 — Multi-tenancy

Keep organization boundaries in the data model from day one.

However:

```text
multi-tenant-ready
≠
full SaaS administration
```

Do not implement a complete tenant administration system in MVP.

## ERRATA-013 — Audit vs Change Events

Keep these concepts separate:

```text
AuditLog
= who did what

ChangeEvent
= what changed in the system / state transition
```

Do not merge them into one generic activity table.

## ERRATA-014 — Documents

Documents remain metadata/references in MVP.

Do not turn Control Tower into a document editor.

Use:

```text
Document metadata
+
external source/reference
+
Open external
```

where appropriate.

## ERRATA-015 — UI terminology and lifecycle labels

The UI may use friendlier labels than internal enums.

For example:

```text
Knowledge Inbox:
New / Processing / Needs Review / Integrated / Archived
```

may map to the domain lifecycle without requiring the UI labels to equal
the internal enum names.

Do not create a second incompatible lifecycle merely because a UI label is
different.

## ERRATA-016 — Scope discipline

Do not solve missing future entities by introducing conditional,
niche-specific code such as:

```text
if marketing...
if salon...
if course...
if ecommerce...
```

The product must remain generic through:

```text
stable core domain
+
relationships
+
configuration/extensibility later
```

rather than hard-coded vertical exceptions.

# 30. FINAL IMPLEMENTATION AUTHORITY

For implementation, resolve contradictions using this precedence:

```text
1. Explicit architecture decisions
2. This IMPLEMENTATION ERRATA section
3. Domain Model
4. Physical Data Model
5. Information Architecture
6. Wireframes
7. Earlier exploratory descriptions
```

If Claude encounters a contradiction not resolved by this document, it must
**stop and flag the contradiction rather than inventing a new domain rule.**

# 31. HANDOFF STATUS

The source architecture documents remain intentionally unchanged.

This file is the:

> **ARCHITECTURE ERRATA / CORRECTION LAYER**

to be provided together with the architecture package during implementation.

The next artifact is:

```text
CONTROL_TOWER_IMPLEMENTATION_PLAN.md
```

which must operationalize the corrected architecture without silently
changing the domain.

