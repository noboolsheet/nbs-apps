---
title: "Control Tower — Physical Data Model"
version: "1.0.0"
status: "FROZEN — Physical Data Model"
date: "2026-08-10"
project: "Control Tower"
document_type: "PostgreSQL Physical Data Model"
depends_on:
  - "CONTROL_TOWER_SPEC.md"
  - "CONTROL_TOWER_DOMAIN_MODEL.md v1.0.0 — FROZEN"
  - "CONTROL_TOWER_TECHNICAL_ARCHITECTURE.md v1.0.0 — FROZEN"
  - "CONTROL_TOWER_STACK_DECISION.md v1.0.0 — FROZEN"
---

# CONTROL TOWER — PHYSICAL DATA MODEL

> **Documento de diseño ORIGINAL (línea base, 2026-08-10).** Se conserva como referencia técnica/histórica; su cuerpo no se reescribe al evolucionar la implementación. Para el **estado actual** y las **desviaciones**, mandan `BUILD_LOG.md`, `FINDINGS_AND_DEFERRED.md`, `adr/` y `DECISIONS_FROZEN.md`. Índice en [`README.md`](./README.md).

## 0. Propósito

Este documento convierte el Domain Model congelado y la Technical Architecture en un modelo físico inicial para PostgreSQL.

El modelo está diseñado para:

- una implementación **Modular Monolith**;
- PostgreSQL como fuente de verdad física;
- Drizzle ORM como persistence layer;
- self-hosting;
- una única empresa/organización inicialmente;
- preparación para evolución futura hacia múltiples organizaciones;
- integraciones externas sin acoplar el dominio a un proveedor concreto;
- auditoría;
- Transactional Outbox;
- jobs persistidos en PostgreSQL;
- futuras capacidades de agentes mediante API.

### Regla fundamental

> El modelo físico no redefine el dominio.

Cuando exista una diferencia entre una necesidad de persistencia y una entidad conceptual del dominio, la solución preferida es crear una estructura técnica de soporte, no introducir silenciosamente una nueva entidad de negocio.

---

# 1. Principios físicos

## 1.1 PostgreSQL es la fuente de verdad física

Control Tower persiste su propio estado en PostgreSQL.

Los sistemas externos continúan siendo fuente de verdad de sus propios dominios cuando así se definió en la arquitectura.

---

## 1.2 UUID como identificador interno

Las entidades principales utilizarán UUID como PK.

Ventajas:

- estabilidad;
- ausencia de IDs secuenciales expuestos;
- facilidad para integración;
- preparación para múltiples organizaciones;
- generación desde aplicación o DB.

Formato conceptual:

```text
id UUID PRIMARY KEY
```

---

## 1.3 Timestamps

Las entidades gestionadas utilizarán:

```text
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

Cuando el lifecycle lo requiera:

```text
archived_at TIMESTAMPTZ NULL
deleted_at TIMESTAMPTZ NULL
```

No se utilizarán timestamps sin zona horaria para datos operativos.

---

## 1.4 Soft delete / archive

La eliminación física no será el comportamiento por defecto.

Preferencia:

```text
ACTIVE
  ↓
ARCHIVED
```

y solamente cuando exista una necesidad específica:

```text
DELETED
```

Los registros históricos y de auditoría no se eliminarán mediante cascadas destructivas.

---

# 2. Convenciones de nombres

PostgreSQL:

```text
snake_case
```

Tablas:

```text
plural_snake_case
```

Ejemplos:

```text
organizations
projects
project_tasks
audit_logs
outbox_events
```

PK:

```text
id
```

FK:

```text
<entity>_id
```

Ejemplo:

```text
project_id
```

---

# 3. Tipos comunes

## 3.1 IDs

```sql
UUID
```

## 3.2 Fechas

```sql
TIMESTAMPTZ
```

## 3.3 Texto corto

```sql
VARCHAR
```

o `TEXT` cuando no exista una longitud semántica real.

## 3.4 Texto largo

```sql
TEXT
```

## 3.5 Datos estructurados

```sql
JSONB
```

Se utilizará JSONB solamente cuando:

- el contenido sea realmente flexible;
- represente metadata externa;
- corresponda a payloads;
- sea una configuración extensible;
- no tenga valor relacional suficiente para justificar columnas.

No se utilizará JSONB para evitar diseñar correctamente entidades o relaciones conocidas.

## 3.6 Dinero

No utilizar `FLOAT`.

Para importes monetarios:

```sql
NUMERIC(14,2)
```

acompañado de una moneda:

```text
currency_code CHAR(3)
```

---

# 4. Multi-organization boundary

Aunque inicialmente Control Tower será utilizado por una sola organización, `organizations` existe desde el principio.

Esto prepara:

```text
single organization
        ↓
multiple organizations
        ↓
SaaS
```

sin implementar todavía:

- billing;
- planes;
- subscriptions;
- tenant management avanzado.

---

# 5. Tabla: organizations

Representa una organización propietaria de los datos.

```text
organizations
------------------------------
id                  UUID PK
name                VARCHAR NOT NULL
slug                VARCHAR NOT NULL
status              VARCHAR NOT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Constraints:

```text
UNIQUE(slug)
```

---

# 6. Tabla: users

Representa usuarios internos de Control Tower.

La autenticación y las credenciales son responsabilidad de Better Auth.

Control Tower no debe duplicar passwords ni secretos de autenticación en tablas propias.

```text
users
------------------------------
id                  UUID PK
name                VARCHAR NOT NULL
email               VARCHAR NOT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

La implementación exacta podrá adaptar esta tabla al esquema requerido por Better Auth.

---

# 7. Tabla: organization_members

Relaciona usuarios con organizaciones.

```text
organization_members
------------------------------
id                  UUID PK
organization_id     UUID FK → organizations.id
user_id             UUID FK → users.id
role                VARCHAR NOT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

Constraints:

```text
UNIQUE(organization_id, user_id)
```

Roles iniciales:

```text
OWNER
ADMIN
MEMBER
VIEWER
```

El modelo no implementa todavía un sistema avanzado de permisos por objeto.

---

# 8. Tabla: strategic_areas

Representa áreas de dirección estratégica.

```text
strategic_areas
------------------------------
id                  UUID PK
organization_id     UUID FK
name                VARCHAR NOT NULL
description         TEXT NULL
status              VARCHAR NOT NULL
sort_order          INTEGER NOT NULL DEFAULT 0
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

---

# 9. Tabla: goals

Representa objetivos de la organización.

```text
goals
------------------------------
id                  UUID PK
organization_id     UUID FK
strategic_area_id   UUID FK NULL
parent_goal_id      UUID FK NULL
name                VARCHAR NOT NULL
description         TEXT NULL
status              VARCHAR NOT NULL
priority            VARCHAR NOT NULL
target_date         TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Relación:

```text
strategic_area 1 ─── N goals
goal           1 ─── N child goals
```

La autorreferencia de `parent_goal_id` permite jerarquías sin crear otro objeto.

---

# 10. Tabla: capabilities

Representa capacidades que la organización posee o está desarrollando.

```text
capabilities
------------------------------
id                  UUID PK
organization_id     UUID FK
name                VARCHAR NOT NULL
description         TEXT NULL
status              VARCHAR NOT NULL
maturity            VARCHAR NOT NULL
notes               TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Estados sugeridos:

```text
PLANNED
DEVELOPING
AVAILABLE
RETIRED
```

Maturity:

```text
BEGINNER
INTERMEDIATE
ADVANCED
EXPERT
```

---

# 11. Tabla: services

Representa servicios ofrecidos por la organización.

```text
services
------------------------------
id                  UUID PK
organization_id     UUID FK
name                VARCHAR NOT NULL
slug                VARCHAR NOT NULL
description         TEXT NULL
status              VARCHAR NOT NULL
service_type        VARCHAR NULL
notes               TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Constraints:

```text
UNIQUE(organization_id, slug)
```

Estados sugeridos:

```text
IDEA
DESIGNING
READY
ACTIVE
PAUSED
RETIRED
```

---

# 12. Tabla: service_capabilities

Relaciona servicios y capacidades.

```text
service_capabilities
------------------------------
service_id          UUID FK
capability_id       UUID FK
created_at          TIMESTAMPTZ NOT NULL
```

PK:

```text
PRIMARY KEY(service_id, capability_id)
```

Relación:

```text
services N ─── N capabilities
```

---

# 13. Tabla: clients

Representa organizaciones externas que son clientes.

```text
clients
------------------------------
id                  UUID PK
organization_id     UUID FK
name                VARCHAR NOT NULL
slug                VARCHAR NOT NULL
status              VARCHAR NOT NULL
industry            VARCHAR NULL
website_url         TEXT NULL
notes               TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Constraints:

```text
UNIQUE(organization_id, slug)
```

`clients` es una entidad propia de Control Tower.

Cuando la información proceda de Twenty:

```text
Twenty = source of truth CRM
Control Tower = operational/context projection
```

---

# 14. Tabla: contacts

Representa personas relacionadas con clientes u oportunidades.

```text
contacts
------------------------------
id                  UUID PK
organization_id     UUID FK
client_id           UUID FK NULL
first_name          VARCHAR NULL
last_name           VARCHAR NULL
email               VARCHAR NULL
phone               VARCHAR NULL
job_title           VARCHAR NULL
status              VARCHAR NOT NULL
notes               TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Índices:

```text
INDEX contacts_client_id
INDEX contacts_email
```

La unicidad de email no será global porque una misma persona puede aparecer en diferentes contextos.

La deduplicación CRM se gestionará mediante identidad externa y reglas de integración.

---

# 15. Tabla: opportunities

Representa oportunidades comerciales.

```text
opportunities
------------------------------
id                  UUID PK
organization_id     UUID FK
client_id           UUID FK NULL
primary_contact_id  UUID FK NULL
name                VARCHAR NOT NULL
stage               VARCHAR NOT NULL
status              VARCHAR NOT NULL
estimated_value     NUMERIC(14,2) NULL
currency_code       CHAR(3) NULL
expected_close_date DATE NULL
source              VARCHAR NULL
notes               TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
closed_at           TIMESTAMPTZ NULL
archived_at         TIMESTAMPTZ NULL
```

---

# 16. Tabla: projects

Representa proyectos de la organización.

```text
projects
------------------------------
id                  UUID PK
organization_id     UUID FK
client_id           UUID FK NULL
opportunity_id      UUID FK NULL
service_id          UUID FK NULL
name                VARCHAR NOT NULL
slug                VARCHAR NOT NULL
description         TEXT NULL
status              VARCHAR NOT NULL
priority            VARCHAR NOT NULL
current_phase_id    UUID NULL
start_date          DATE NULL
target_date         DATE NULL
completed_at        TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Constraints:

```text
UNIQUE(organization_id, slug)
```

Relaciones:

```text
client      1 ─── N projects
opportunity 1 ─── N projects
service     1 ─── N projects
```

`current_phase_id` se añadirá como FK después de crear `project_phases`, o se gestionará mediante migration posterior para evitar dependencia circular de creación.

---

# 17. Tabla: project_phases

Representa las fases de un proyecto.

```text
project_phases
------------------------------
id                  UUID PK
project_id          UUID FK
name                VARCHAR NOT NULL
description         TEXT NULL
status              VARCHAR NOT NULL
sort_order          INTEGER NOT NULL
started_at          TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

Relación:

```text
project 1 ─── N project_phases
```

---

# 18. Tabla: tasks

Representa tareas operativas.

```text
tasks
------------------------------
id                  UUID PK
organization_id     UUID FK
project_id          UUID FK NULL
parent_task_id      UUID FK NULL
title               VARCHAR NOT NULL
description         TEXT NULL
status              VARCHAR NOT NULL
priority            VARCHAR NOT NULL
assignee_user_id    UUID FK NULL
due_date            DATE NULL
completed_at        TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Relaciones:

```text
project 1 ─── N tasks
task    1 ─── N child tasks
user    1 ─── N assigned tasks
```

Estados iniciales:

```text
TODO
IN_PROGRESS
BLOCKED
DONE
CANCELLED
```

---

# 19. Tabla: deliverables

Representa entregables relevantes de un proyecto.

```text
deliverables
------------------------------
id                  UUID PK
organization_id     UUID FK
project_id          UUID FK
name                VARCHAR NOT NULL
description         TEXT NULL
status              VARCHAR NOT NULL
due_date            DATE NULL
completed_at        TIMESTAMPTZ NULL
external_url        TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Estados:

```text
PLANNED
IN_PROGRESS
REVIEW
APPROVED
DELIVERED
ARCHIVED
```

---

# 20. Tabla: decisions

Representa decisiones relevantes tomadas dentro de la organización.

```text
decisions
------------------------------
id                  UUID PK
organization_id     UUID FK
project_id          UUID FK NULL
service_id          UUID FK NULL
title               VARCHAR NOT NULL
context             TEXT NULL
decision            TEXT NOT NULL
rationale           TEXT NULL
status              VARCHAR NOT NULL
decided_by_user_id  UUID FK NULL
decided_at          TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Estados:

```text
DRAFT
REVIEW
APPROVED
SUPERSEDED
ARCHIVED
```

Una decisión puede ser global o estar relacionada con un proyecto/servicio.

---

# 21. Tabla: knowledge_items

Representa unidades de conocimiento capturadas por Control Tower.

```text
knowledge_items
------------------------------
id                  UUID PK
organization_id     UUID FK
title               VARCHAR NOT NULL
summary             TEXT NULL
content             TEXT NULL
knowledge_type      VARCHAR NOT NULL
status              VARCHAR NOT NULL
source_type         VARCHAR NOT NULL
source_url          TEXT NULL
source_external_id  VARCHAR NULL
captured_at         TIMESTAMPTZ NOT NULL
reviewed_at         TIMESTAMPTZ NULL
approved_at         TIMESTAMPTZ NULL
created_by_user_id  UUID FK NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Tipos iniciales:

```text
NOTE
LESSON
INSIGHT
PROCESS
PATTERN
RESEARCH
REFERENCE
```

Estados:

```text
INBOX
DRAFT
REVIEW
APPROVED
ARCHIVED
```

La información canónica puede continuar residiendo en Notion u otra fuente externa. `knowledge_items` almacena el contexto y metadata necesarios para gobernarla.

---

# 22. Tabla: knowledge_inbox

Representa capturas pendientes de clasificación.

```text
knowledge_inbox
------------------------------
id                  UUID PK
organization_id     UUID FK
title               VARCHAR NULL
raw_content         TEXT NOT NULL
source_type         VARCHAR NOT NULL
source_url          TEXT NULL
source_external_id  VARCHAR NULL
status              VARCHAR NOT NULL
captured_at         TIMESTAMPTZ NOT NULL
processed_at        TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

Estados:

```text
NEW
PROCESSING
PROCESSED
DISCARDED
```

Objetivo:

```text
capture
  ↓
knowledge_inbox
  ↓
classification
  ↓
knowledge_item
  ↓
external canonical knowledge source
```

---

# 23. Tabla: documents

Representa documentos o referencias documentales.

```text
documents
------------------------------
id                  UUID PK
organization_id     UUID FK
project_id          UUID FK NULL
client_id           UUID FK NULL
name                VARCHAR NOT NULL
document_type       VARCHAR NULL
mime_type           VARCHAR NULL
external_url        TEXT NULL
external_provider   VARCHAR NULL
external_id         VARCHAR NULL
status              VARCHAR NOT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

El archivo físico no tiene que residir en PostgreSQL.

Por defecto:

```text
Control Tower
    ↓
metadata/reference
    ↓
Drive / Git / external storage
```

---

# 24. Tabla: assets

Representa activos reutilizables de la empresa.

Ejemplos:

- plantillas;
- landing templates;
- procesos;
- scripts;
- demos;
- componentes;
- recursos comerciales;
- documentos reutilizables.

```text
assets
------------------------------
id                  UUID PK
organization_id     UUID FK
name                VARCHAR NOT NULL
asset_type          VARCHAR NOT NULL
description         TEXT NULL
status              VARCHAR NOT NULL
version             VARCHAR NULL
external_url        TEXT NULL
repository_url      TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Estados:

```text
DRAFT
ACTIVE
DEPRECATED
ARCHIVED
```

---

# 25. Tabla: external_identities

Tabla crítica de integración.

Relaciona una entidad interna con un recurso externo.

```text
external_identities
------------------------------
id                  UUID PK
organization_id     UUID FK
provider            VARCHAR NOT NULL
external_type      VARCHAR NOT NULL
external_id         VARCHAR NOT NULL
internal_type      VARCHAR NOT NULL
internal_id         UUID NOT NULL
metadata            JSONB NULL
last_synced_at      TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

Constraint:

```text
UNIQUE(provider, external_type, external_id)
```

Ejemplos:

```text
TWENTY / company / abc123 → client UUID
TWENTY / person / xyz456 → contact UUID
NOTION / page / page123   → knowledge_item UUID
GITHUB / repository / ... → asset UUID
```

Esta tabla evita acoplar cada entidad del dominio a un proveedor concreto.

---

# 26. Tabla: integrations

Representa una integración configurada.

```text
integrations
------------------------------
id                  UUID PK
organization_id     UUID FK
provider            VARCHAR NOT NULL
status              VARCHAR NOT NULL
display_name        VARCHAR NOT NULL
configuration      JSONB NULL
last_health_check_at TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

No almacenar secretos directamente en `configuration` si pueden resolverse mediante environment variables o secret storage.

Estados:

```text
CONFIGURED
ACTIVE
ERROR
DISABLED
```

---

# 27. Tabla: automations

Representa automatizaciones internas configuradas.

```text
automations
------------------------------
id                  UUID PK
organization_id     UUID FK
name                VARCHAR NOT NULL
description         TEXT NULL
trigger_type        VARCHAR NOT NULL
status              VARCHAR NOT NULL
configuration      JSONB NULL
last_run_at         TIMESTAMPTZ NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
archived_at         TIMESTAMPTZ NULL
```

Estados:

```text
DRAFT
ACTIVE
PAUSED
ERROR
ARCHIVED
```

En MVP no se implementa un constructor visual genérico de automatizaciones.

---

# 28. Tabla: outbox_events

Implementa Transactional Outbox.

```text
outbox_events
------------------------------
id                  UUID PK
organization_id     UUID FK NULL
event_type          VARCHAR NOT NULL
aggregate_type      VARCHAR NOT NULL
aggregate_id        UUID NOT NULL
payload             JSONB NOT NULL
status              VARCHAR NOT NULL
attempts            INTEGER NOT NULL DEFAULT 0
available_at        TIMESTAMPTZ NOT NULL
processed_at        TIMESTAMPTZ NULL
last_error          TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
```

Estados:

```text
PENDING
PROCESSING
PROCESSED
FAILED
```

Índices:

```text
(status, available_at)
(aggregate_type, aggregate_id)
```

---

# 29. Tabla: jobs

Cola persistida para background worker.

```text
jobs
------------------------------
id                  UUID PK
organization_id     UUID FK NULL
job_type            VARCHAR NOT NULL
payload             JSONB NOT NULL
status              VARCHAR NOT NULL
priority             INTEGER NOT NULL DEFAULT 0
attempts            INTEGER NOT NULL DEFAULT 0
max_attempts        INTEGER NOT NULL DEFAULT 5
available_at        TIMESTAMPTZ NOT NULL
locked_at           TIMESTAMPTZ NULL
locked_by           VARCHAR NULL
completed_at        TIMESTAMPTZ NULL
failed_at           TIMESTAMPTZ NULL
last_error          TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
```

Estados:

```text
PENDING
PROCESSING
COMPLETED
FAILED
CANCELLED
```

El worker deberá reclamar jobs mediante mecanismos transaccionales apropiados.

---

# 30. Tabla: audit_logs

Registro inmutable de acciones relevantes.

```text
audit_logs
------------------------------
id                  UUID PK
organization_id     UUID FK NULL
actor_user_id       UUID FK NULL
actor_type          VARCHAR NOT NULL
action              VARCHAR NOT NULL
entity_type         VARCHAR NOT NULL
entity_id           UUID NULL
metadata            JSONB NULL
ip_address          INET NULL
user_agent          TEXT NULL
created_at          TIMESTAMPTZ NOT NULL
```

Ejemplos:

```text
CREATE
UPDATE
ARCHIVE
DELETE
LOGIN
SYNC
EXPORT
APPROVE
```

No debe existir cascade delete sobre `audit_logs`.

---

# 31. Tabla: change_events

Representa cambios significativos de estado para seguimiento interno.

```text
change_events
------------------------------
id                  UUID PK
organization_id     UUID FK NULL
entity_type         VARCHAR NOT NULL
entity_id           UUID NOT NULL
change_type         VARCHAR NOT NULL
previous_state      JSONB NULL
new_state           JSONB NULL
actor_type          VARCHAR NOT NULL
actor_id            UUID NULL
created_at          TIMESTAMPTZ NOT NULL
```

Diferencia:

```text
audit_logs
    = quién hizo qué

change_events
    = cómo cambió el estado de una entidad
```

---

# 32. Relaciones principales

```text
Organization
│
├── Users
│     └── OrganizationMembers
│
├── StrategicAreas
│     └── Goals
│
├── Capabilities
│
├── Services
│     └── ServiceCapabilities
│
├── Clients
│     └── Contacts
│
├── Opportunities
│
├── Projects
│     ├── ProjectPhases
│     ├── Tasks
│     └── Deliverables
│
├── Decisions
├── KnowledgeInbox
├── KnowledgeItems
├── Documents
├── Assets
├── Integrations
├── Automations
├── ExternalIdentities
├── Jobs
├── OutboxEvents
├── AuditLogs
└── ChangeEvents
```

---

# 33. Cardinalidades

| Relación | Cardinalidad |
|---|---|
| Organization → Users | N:M mediante organization_members |
| Organization → StrategicAreas | 1:N |
| StrategicArea → Goals | 1:N |
| Goal → child Goals | 1:N |
| Organization → Capabilities | 1:N |
| Organization → Services | 1:N |
| Service ↔ Capability | N:M |
| Organization → Clients | 1:N |
| Client → Contacts | 1:N |
| Client → Opportunities | 1:N |
| Client → Projects | 1:N |
| Opportunity → Project | 1:N opcional |
| Service → Projects | 1:N |
| Project → Phases | 1:N |
| Project → Tasks | 1:N |
| Project → Deliverables | 1:N |
| Organization → Decisions | 1:N |
| Project → Decisions | 1:N opcional |
| Organization → KnowledgeItems | 1:N |
| Organization → KnowledgeInbox | 1:N |
| Project → Documents | 1:N |
| Client → Documents | 1:N |
| Organization → Assets | 1:N |
| Organization → Integrations | 1:N |
| Organization → Automations | 1:N |
| Organization → ExternalIdentities | 1:N |
| Organization → Jobs | 1:N |
| Organization → OutboxEvents | 1:N |
| Organization → AuditLogs | 1:N |
| Organization → ChangeEvents | 1:N |

---

# 34. Índices

## Índices obligatorios iniciales

Todas las FK de alta utilización deberán tener índices.

Especialmente:

```text
organization_id
client_id
project_id
opportunity_id
service_id
status
due_date
created_at
updated_at
```

## Composite indexes

Cuando el patrón de consulta lo justifique:

```text
projects(organization_id, status)
tasks(organization_id, status, due_date)
tasks(project_id, status)
decisions(organization_id, status)
knowledge_items(organization_id, status)
jobs(status, available_at)
outbox_events(status, available_at)
external_identities(provider, external_type, external_id)
```

No crear índices indiscriminadamente.

---

# 35. Constraints

El modelo debe utilizar constraints de DB para proteger invariantes importantes.

Ejemplos:

```text
NOT NULL
UNIQUE
FOREIGN KEY
CHECK
```

La aplicación también validará reglas de negocio.

Principio:

> Las reglas críticas de integridad deben estar protegidas en la base de datos cuando sea razonable.

---

# 36. Enums vs VARCHAR

Para estados del dominio se recomienda inicialmente utilizar `VARCHAR` + validación de aplicación y `CHECK` cuando la estabilidad del conjunto de valores esté clara.

Motivo:

- las migraciones de PostgreSQL para enums son menos flexibles;
- los estados pueden evolucionar;
- el dominio sigue siendo configurable.

Los valores canónicos serán definidos en el Domain/Application layer.

---

# 37. JSONB policy

JSONB se reserva para:

### Apropiado

```text
external payload
integration metadata
automation configuration
job payload
outbox payload
audit metadata
change snapshots
```

### No apropiado

```text
client.name
project.status
task.due_date
service.name
decision.title
```

No convertir el modelo relacional en un documento JSON gigante.

---

# 38. Organization isolation

Toda entidad de negocio que pertenezca directamente a una organización deberá disponer de:

```text
organization_id
```

Las relaciones entre entidades deben respetar la misma organización.

Ejemplo:

```text
project.organization_id
=
client.organization_id
```

Esto debe validarse mediante:

- aplicación;
- constraints donde resulte viable;
- tests de integración.

El MVP no requiere PostgreSQL Row Level Security.

---

# 39. External identity strategy

Nunca utilizar:

```text
twenty_company_id
notion_page_id
```

como PK del dominio.

Utilizar:

```text
internal UUID
+
external_identities
```

Esto permite:

```text
Twenty
↓
external_identity
↓
client
```

y posteriormente:

```text
HubSpot
Salesforce
Other CRM
```

sin modificar `clients`.

---

# 40. Source-of-truth mapping

| Información | Control Tower | Fuente externa |
|---|---|---|
| Organization | **VERDAD** | — |
| Project | **VERDAD** | — |
| Task | **VERDAD** | — |
| Decision | **VERDAD** | — |
| Service | **VERDAD** | — |
| Capability | **VERDAD** | — |
| Client CRM data | proyección/contexto | Twenty |
| Contact CRM data | proyección/contexto | Twenty |
| Opportunity CRM data | proyección/contexto | Twenty |
| Knowledge canonical content | metadata/contexto | Notion inicialmente |
| Documents | metadata/reference | Drive/Git/etc. |
| Code | referencia | Git |
| Calendar events | referencia | Calendar |

---

# 41. Search físico inicial

La búsqueda inicial utilizará PostgreSQL.

Se contemplan:

- índices B-tree para campos estructurados;
- Full Text Search para contenido textual cuando sea necesario;
- filtros por organization;
- filtros por entity type;
- filtros por status.

No se crea:

```text
pgvector
ElasticSearch
OpenSearch
Meilisearch
```

en MVP.

---

# 42. Future custom objects

La arquitectura futura podrá añadir:

```text
custom_object_definitions
custom_field_definitions
custom_object_records
custom_views
```

pero estas tablas están explícitamente **fuera del MVP**.

No se añadirá un EAV genérico ahora.

Principio:

> Primero validar el producto con objetos nativos; después generalizar la plataforma.

---

# 43. Future AI / knowledge extensions

Fuera del MVP:

```text
embeddings
vector indexes
chunks
RAG documents
agent memories
agent executions
tool permissions
```

La arquitectura actual solamente requiere que exista una API capaz de construir:

```text
ProjectContext
ClientContext
ServiceContext
DailyContext
```

---

# 44. Migrations

Drizzle Kit gestionará migrations.

Reglas:

1. Toda modificación de schema debe producir migration.
2. Nunca editar producción manualmente como método normal.
3. Las migrations deben ser versionadas en Git.
4. Las migrations deben poder ejecutarse desde cero.
5. Debe probarse una instalación limpia periódicamente.
6. No borrar columnas con datos sin migration explícita y revisión.
7. Cambios destructivos requieren backup previo.

---

# 45. Seed data

El proyecto deberá disponer de seed inicial para:

- organización;
- usuario inicial;
- roles;
- estados/configuración necesaria;
- datos mínimos de desarrollo.

Los seeds de desarrollo no deben contener datos reales de clientes.

---

# 46. Backup / restore

El modelo físico debe poder restaurarse mediante:

```text
PostgreSQL backup
+
migrations
+
application release
+
environment configuration
```

Se deberá probar periódicamente:

```text
backup
↓
new PostgreSQL instance
↓
restore
↓
migrations
↓
application
```

---

# 47. MVP — tablas obligatorias

## Governance

```text
organizations
users
organization_members
strategic_areas
goals
capabilities
services
service_capabilities
```

## CRM / Sales

```text
clients
contacts
opportunities
external_identities
```

## Operations

```text
projects
project_phases
tasks
deliverables
```

## Knowledge

```text
decisions
knowledge_inbox
knowledge_items
documents
assets
```

## Infrastructure

```text
integrations
automations
outbox_events
jobs
audit_logs
change_events
```

---

# 48. MVP — tablas fuera de implementación inicial

Aunque puedan existir conceptualmente en el modelo, no requieren CRUD completo desde el primer sprint:

```text
goals
capabilities
service_capabilities
automations
change_events
```

Estas tablas pueden comenzar con soporte mínimo si son necesarias para el dashboard y governance.

---

# 49. Fuera del MVP

No implementar todavía:

```text
custom_object_definitions
custom_field_definitions
custom_object_records
custom_views
subscriptions
billing
tenant_billing
agent_runs
agent_memory
embeddings
vector_documents
rag_chunks
semantic_search
workflow_builder
advanced_permissions
SSO
SCIM
2FA obligatorio
full audit analytics
event sourcing
distributed messaging
Redis
Kafka
RabbitMQ
Kubernetes
```

---

# 50. Consistency Check

## Domain consistency

El modelo físico conserva las entidades principales:

```text
Organization
User
Client
Contact
Opportunity
Project
ProjectPhase
Task
Deliverable
Decision
Knowledge
Document
Asset
Service
Capability
Goal
```

y añade únicamente estructuras técnicas necesarias para soportarlas:

```text
organization_members
service_capabilities
knowledge_inbox
external_identities
integrations
automations
outbox_events
jobs
audit_logs
change_events
```

Estas últimas no deben interpretarse automáticamente como nuevos conceptos de negocio.

---

## Technical Architecture consistency

Se mantienen:

- Modular Monolith;
- PostgreSQL;
- Drizzle;
- Transactional Outbox;
- PostgreSQL-backed jobs;
- external adapters;
- audit;
- Context Service;
- source-of-truth separation;
- self-hosting;
- API-first access for future agents.

---

## Stack consistency

El modelo utiliza directamente las decisiones del Stack Decision:

```text
TypeScript
Next.js
Drizzle
PostgreSQL
Better Auth
Docker
Worker Node.js
```

No requiere:

```text
Redis
Kafka
Vector DB
Python
microservices
```

---

# 51. Physical Model Gate

**STATUS: CONSISTENT — READY FOR INFORMATION ARCHITECTURE**

El modelo físico queda preparado para pasar a:

```text
INFORMATION ARCHITECTURE
        ↓
NAVIGATION
        ↓
WIREFRAMES
        ↓
IMPLEMENTATION PLAN
```

Antes de implementar, deberán revisarse en detalle:

1. esquema exacto de Better Auth;
2. migrations iniciales;
3. índices reales según queries;
4. constraints multi-organization;
5. estrategia de polling/webhooks de Twenty;
6. estructura exacta de integrations;
7. API DTOs;
8. permisos.

Estas decisiones no deben reabrir el Domain Model salvo que aparezca una contradicción real.

---

# 52. Regla final

> **El Physical Data Model implementa el dominio; no lo reemplaza.**

La base de datos debe ser suficientemente estructurada para proteger la integridad del sistema y suficientemente flexible para permitir la evolución futura de Control Tower.

El objetivo del MVP no es construir una plataforma genérica.

El objetivo es construir:

> **el Control Tower que necesitamos nosotros, sobre un dominio limpio y una arquitectura que permita convertirlo posteriormente en un producto configurable.**

