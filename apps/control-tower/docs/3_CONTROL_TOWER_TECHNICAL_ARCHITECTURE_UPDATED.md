---
date: 2026-08-10
depends_on: CONTROL_TOWER_DOMAIN_MODEL.md v1.0.0 --- FROZEN
document_type: Technical Architecture
project: Control Tower
status: Draft --- Technical Architecture
title: Control Tower --- Technical Architecture
version: 0.1.0
---

# CONTROL TOWER --- TECHNICAL ARCHITECTURE

> **Documento de diseño ORIGINAL (línea base, 2026-08-10).** Se conserva como referencia técnica/histórica; su cuerpo no se reescribe al evolucionar la implementación. Para el **estado actual** y las **desviaciones**, mandan `BUILD_LOG.md`, `FINDINGS_AND_DEFERRED.md`, `adr/` y `DECISIONS_FROZEN.md`. Índice en [`README.md`](./README.md).

## 0. Propósito

Este documento transforma el **Domain Model v1.0.0 --- FROZEN** en una
arquitectura técnica implementable.

Define:

-   arquitectura general;
-   separación de capas;
-   componentes;
-   responsabilidades;
-   persistencia;
-   API;
-   autenticación y autorización;
-   eventos;
-   jobs;
-   integraciones;
-   sincronización;
-   gestión de secretos;
-   observabilidad;
-   backups;
-   deployment;
-   seguridad;
-   estrategia de extensibilidad;
-   estrategia de testing;
-   decisiones técnicas pendientes;
-   límites del MVP.

No define todavía los wireframes ni constituye el documento final de
decisión de stack.

------------------------------------------------------------------------

# 1. Contexto arquitectónico

Control Tower es una aplicación de gobierno y contexto empresarial.

No sustituye:

-   CRM;
-   gestor documental;
-   knowledge base;
-   calendario;
-   email;
-   gestor de código;
-   automatizador externo;
-   gestor de secretos.

La arquitectura debe permitir que Control Tower funcione como una **capa
central de contexto** sobre estos sistemas.

``` text
                  ┌─────────────────────────────┐
                  │        CONTROL TOWER         │
                  │                             │
                  │  Domain + API + UI + Events │
                  └──────────────┬──────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ↓                      ↓                      ↓
        Twenty                 Notion                  Git
          │                      │                      │
          ↓                      ↓                      ↓
        CRM                  Knowledge                Code

          ┌──────────────────────┼──────────────────────┐
          ↓                      ↓                      ↓
       Google                  Drive                   n8n
      Calendar                                       Automations
```

------------------------------------------------------------------------

# 2. Objetivos técnicos

La arquitectura debe conseguir:

1.  simplicidad para una empresa de una sola persona;
2.  self-hosting viable;
3.  coste operativo mínimo;
4.  facilidad de backup y recuperación;
5.  separación clara entre dominio e integraciones;
6.  API-first;
7.  sincronización idempotente;
8.  trazabilidad;
9.  extensibilidad futura;
10. seguridad desde el principio;
11. capacidad de automatización;
12. posibilidad futura de incorporar IA;
13. capacidad futura de evolucionar a producto multiempresa.

------------------------------------------------------------------------

# 3. Principios arquitectónicos

## 3.1 Modular Monolith First

El MVP será un **monolito modular**, no microservicios.

``` text
Control Tower
├── Web UI
├── API
├── Domain
├── Persistence
├── Integration Modules
├── Event Bus interno
└── Background Jobs
```

Razón:

-   una sola desarrolladora;
-   pocos usuarios inicialmente;
-   bajo coste;
-   despliegue sencillo;
-   menor superficie operacional;
-   facilidad de evolución.

La arquitectura modular debe permitir separar componentes posteriormente
si aparece una razón real.

------------------------------------------------------------------------

## 3.2 Domain-first

El Domain Model es la referencia conceptual.

Las integraciones no deben contaminar el dominio.

Incorrecto:

``` text
Project
└── twentyProjectId
```

Correcto:

``` text
Project
└── ExternalIdentity
      ├── source_system
      ├── external_entity_type
      └── external_id
```

------------------------------------------------------------------------

## 3.3 API-first

La interfaz web no accederá directamente a la base de datos.

``` text
Browser
   ↓
API
   ↓
Application Services
   ↓
Domain
   ↓
Persistence
```

Las automatizaciones y futuros agentes utilizarán la misma API o una
capa de integración explícitamente definida.

------------------------------------------------------------------------

## 3.4 Integrations as adapters

Cada sistema externo tendrá un adaptador.

``` text
Integration Layer
├── TwentyAdapter
├── NotionAdapter
├── GitAdapter
├── GoogleCalendarAdapter
├── GoogleDriveAdapter
└── N8nAdapter
```

Los adaptadores traducen:

``` text
External Model
      ↓
Mapping
      ↓
Domain Model
```

El dominio nunca debe depender de SDKs externos.

------------------------------------------------------------------------

## 3.5 Source of Truth explícita

Cada dato debe tener una autoridad conocida:

``` text
OWNED
SYNCHRONIZED
LINKED
DERIVED
```

La arquitectura no permitirá que un campo tenga múltiples fuentes de
verdad implícitas.

------------------------------------------------------------------------

## 3.6 Idempotencia

Toda operación de sincronización deberá poder ejecutarse repetidamente
sin crear duplicados.

Clave conceptual:

``` text
source_system
+
external_entity_type
+
external_id
```

------------------------------------------------------------------------

## 3.7 Secrets outside the domain

Nunca almacenar:

-   API keys;
-   OAuth client secrets;
-   passwords;
-   tokens;
-   private keys.

en:

-   tablas de dominio;
-   logs;
-   Git;
-   respuestas de API.

Las credenciales estarán gestionadas por un mecanismo de secretos o
variables de entorno protegidas.

------------------------------------------------------------------------

## 3.8 Configuration over hardcoding

El sistema debe preferir:

``` text
configuration
```

sobre:

``` text
if company_type == ...
```

La extensibilidad futura se apoyará en metadata y configuración.

------------------------------------------------------------------------

# 3A. Decisiones resultantes de la revisión arquitectónica

Esta sección incorpora las decisiones adoptadas durante la revisión de arquitectura y tiene precedencia sobre cualquier formulación anterior del documento que resulte contradictoria.

## 3A.1 Source of Truth Matrix

Control Tower debe registrar explícitamente la autoridad de cada tipo de información.

| Información | Control Tower | Twenty | Notion | Drive | Git | Calendar |
|---|---|---|---|---|---|---|
| Cliente | sincronizado | **VERDAD** | referencia | — | — | — |
| Contacto | sincronizado | **VERDAD** | referencia | — | — | — |
| Opportunity | sincronizado | **VERDAD** | — | — | — | — |
| Proyecto | **VERDAD** | referencia | documentación | archivos | código | eventos |
| Task interna | **VERDAD** | — | referencia | — | — | — |
| Decisión | **VERDAD** | — | documentación | — | — | — |
| Knowledge Item | metadata/referencia | — | **VERDAD** inicialmente | — | posible fuente futura | — |
| Document | referencia | — | posible | **VERDAD** cuando corresponda | posible | — |
| Código | referencia | — | — | — | **VERDAD** | — |
| Evento | referencia | — | — | — | — | **VERDAD** |

La matriz podrá evolucionar, pero cada integración debe declarar explícitamente ownership y dirección de sincronización.

## 3A.2 Operational Core vs Knowledge/Context

Control Tower tiene dos responsabilidades complementarias:

### Operational Core

- Clients
- Opportunities
- Projects
- Tasks
- Deliverables
- Services
- Capabilities
- Goals

### Knowledge / Context Layer

- Decisions
- Knowledge Inbox
- Knowledge Items
- Documents
- Assets
- Daily Briefings
- External references

La separación es conceptual y no implica bases de datos separadas.

## 3A.3 Context Service

Se incorpora un `Context Service` como servicio de aplicación.

No es una entidad del dominio.

Su función es construir contexto compuesto para humanos y futuros agentes.

Ejemplos:

```text
CompanyContext
ClientContext
ProjectContext
ServiceContext
DailyContext
```

Ejemplo:

```text
Project Context
├── Project
├── Client
├── Current Phase
├── Tasks
├── Deliverables
├── Decisions
├── Documents
├── Knowledge
├── Risks
├── Dependencies
└── External Links
```

El futuro agente accederá a este contexto mediante la API, nunca directamente a PostgreSQL.

## 3A.4 Knowledge Source

El sistema de conocimiento no debe quedar arquitectónicamente acoplado a Notion.

Conceptualmente:

```text
Knowledge Source
├── notion
├── git
├── markdown
└── future source
```

En MVP puede implementarse mediante metadata dentro de `KnowledgeItem`/`ExternalIdentity`, sin crear un motor genérico de Knowledge Sources.

La arquitectura futura debe permitir que el contenido resida en distintas fuentes sin cambiar el dominio.

## 3A.5 Transactional Outbox

La arquitectura utiliza **Transactional Outbox**, no Event Sourcing ni un Event Store.

En una misma transacción:

```text
UPDATE entity
+
INSERT outbox_event
```

Después:

```text
Outbox
↓
Worker
↓
Handler
↓
Integration / derived state / notification
```

No se introduce Kafka, RabbitMQ ni infraestructura distribuida en MVP.

## 3A.6 Sincronización y ownership

La sincronización bidireccional genérica no es el comportamiento por defecto.

Cada dato sincronizado debe tener un único propietario.

Ejemplo:

```text
Twenty
  ↓
Control Tower
```

para información CRM.

Solo se implementará escritura hacia un sistema externo cuando exista un caso de uso concreto y una política explícita de ownership/conflictos.

El sistema no debe entrar en ciclos de sincronización:

```text
A → B → A
```

## 3A.7 Integration Mapping

En MVP, los mappings de campos pueden residir en código/configuración de cada adapter.

Conceptualmente se reserva un futuro:

```text
IntegrationMapping
├── source_field
├── target_field
├── transformation
└── ownership
```

No se implementa un editor genérico de mappings en MVP.

## 3A.8 Agent permissions

La API futura para agentes debe distinguir:

```text
READ
WRITE
DESTRUCTIVE
```

Las acciones sensibles podrán requerir aprobación humana.

Conceptualmente:

```text
Agent
 ↓
Permission
 ↓
Action
 ↓
Validation
 ↓
Audit
 ↓
Execution
```

No se implementa el agente en MVP, pero la arquitectura no debe impedir este modelo.

## 3A.9 Draft / Review lifecycle

El contenido generado o capturado automáticamente no debe convertirse automáticamente en verdad empresarial.

Para conceptos apropiados se contempla:

```text
DRAFT
↓
REVIEW
↓
APPROVED
↓
ARCHIVED
```

Especialmente:

- Decisions
- Knowledge
- Services
- Capabilities
- Portfolio Items

Los estados concretos pertenecen al Domain Model.

## 3A.10 Daily Briefing

El Daily Briefing debe ser principalmente una **vista derivada**, no un registro que obligue a duplicar manualmente información ya existente.

Puede combinar:

```text
Projects
Tasks
Deadlines
Calendar
Decisions
Risks
Changes
```

y permitir una pequeña nota manual del día.

## 3A.11 Deletion and archival policy

Distinguir:

```text
ACTIVE
ARCHIVED
DELETED
```

No todas las entidades se eliminan físicamente.

### Inmutables / históricos

- AuditLog
- ChangeEvent

### Preferencia por archive/soft delete

- Projects
- Clients
- Services
- Assets
- Knowledge

Cuando una fuente externa elimina un recurso, Control Tower no debe asumir automáticamente un `DELETE` físico. Debe registrar el estado externo y aplicar la política de lifecycle correspondiente.

## 3A.12 Organization boundary

`Organization` existe desde el principio.

Las entidades principales deben poder asociarse a una organización.

Esto prepara la evolución futura a producto multiempresa sin implementar todavía:

- billing;
- planes;
- suscripciones;
- tenant management avanzado.

Principio:

> multi-tenant preparado ≠ multi-tenant implementado.

## 3A.13 Identidad y URLs

Las entidades utilizan un ID interno estable, normalmente UUID.

Cuando sea útil podrán existir:

```text
id
slug
external_id
```

Las URLs de la aplicación deben preferir identificadores internos o slugs propios frente a IDs de sistemas externos.

---

# 3B. Corrección del alcance del MVP

El MVP técnico se reduce deliberadamente para permitir que una sola persona pueda construirlo, validarlo y mantenerlo.

## MVP vertical 1 — Governance

- Dashboard
- Strategic Areas
- Goals
- Services
- Capabilities

## MVP vertical 2 — Operations

- Clients
- Contacts
- Opportunities
- Projects
- Project Phases
- Tasks
- Deliverables

## MVP vertical 3 — Knowledge / Context

- Decisions
- Knowledge Inbox
- Knowledge Items
- Documents
- Assets

## MVP vertical 4 — Infrastructure

- Integrations
- Automations
- External Identities
- Audit Log
- Change Events

## Cross-cutting

- Authentication
- Authorization básica
- Search
- Dashboard
- PostgreSQL
- API
- Migrations
- Background jobs
- Transactional Outbox
- Logging
- Health checks
- Backup
- Reproducible deployment

No es necesario que todas las entidades del Domain Model tengan CRUD completo en la primera versión.

El objetivo es disponer de un **vertical slice operativo**, no de implementar todo el dominio de una vez.

---

# 3C. Decisión sobre el orden de diseño

La secuencia oficial queda:

```text
CONTROL_TOWER_SPEC.md
        ↓
CONTROL_TOWER_DOMAIN_MODEL.md
        ↓
CONTROL_TOWER_TECHNICAL_ARCHITECTURE.md
        ↓
ARCHITECTURE REVIEW
        ↓
CONTROL_TOWER_STACK_DECISION.md
        ↓
CONTROL_TOWER_PHYSICAL_DATA_MODEL.md
        ↓
INFORMATION ARCHITECTURE / WIREFRAMES
        ↓
IMPLEMENTATION PLAN
        ↓
MVP
```

El Domain Model permanece congelado.

La Technical Architecture queda congelada después de esta revisión.

El Physical Data Model se diseñará después de seleccionar el stack, ORM, estrategia de autenticación, jobs y deployment.


# 4. Arquitectura lógica

``` text
┌───────────────────────────────────────────────┐
│                    UI Layer                   │
│ Dashboard / Lists / Detail / Search / Forms │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│                   API Layer                   │
│ Auth / Validation / DTO / Rate Limit / REST  │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│              Application Layer               │
│ Use Cases / Commands / Queries / Workflows  │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│                  Domain Layer                 │
│ Entities / Rules / States / Policies / Events│
└───────────────┬───────────────────┬───────────┘
                │                   │
                ▼                   ▼
┌────────────────────────┐   ┌──────────────────┐
│   Persistence Layer    │   │ Integration Layer│
│ DB / Repositories      │   │ Adapters / Sync  │
└────────────┬───────────┘   └─────────┬────────┘
             │                         │
             ▼                         ▼
       PostgreSQL                External Systems

                    ┌──────────────────┐
                    │ Background Jobs  │
                    │ Sync / Events /  │
                    │ Notifications    │
                    └──────────────────┘
```

------------------------------------------------------------------------

# 5. Capas

## 5.1 UI Layer

Responsable de:

-   navegación;
-   dashboards;
-   tablas;
-   formularios;
-   filtros;
-   vistas;
-   feedback;
-   errores de interfaz.

No contiene reglas de negocio críticas.

------------------------------------------------------------------------

## 5.2 API Layer

Responsable de:

-   autenticación;
-   autorización;
-   validación;
-   serialización;
-   DTOs;
-   versionado;
-   rate limiting;
-   errores HTTP.

No contiene lógica de negocio compleja.

------------------------------------------------------------------------

## 5.3 Application Layer

Orquesta casos de uso.

Ejemplos:

``` text
CreateProject
UpdateProjectStatus
CreateDecision
CompleteTask
SyncClient
ProcessKnowledgeInboxItem
GenerateDailyBriefing
PublishPortfolioItem
```

Es la capa que coordina entidades y servicios de dominio.

------------------------------------------------------------------------

## 5.4 Domain Layer

Contiene:

-   entidades;
-   value objects;
-   reglas;
-   estados;
-   transiciones;
-   domain services;
-   domain events.

No debe importar:

-   framework web;
-   ORM;
-   SDK de Twenty;
-   SDK de Notion;
-   UI.

------------------------------------------------------------------------

## 5.5 Persistence Layer

Responsable de:

-   PostgreSQL;
-   repositorios;
-   queries;
-   transacciones;
-   migraciones;
-   índices.

------------------------------------------------------------------------

## 5.6 Integration Layer

Responsable de:

-   APIs externas;
-   OAuth;
-   webhooks;
-   sincronizaciones;
-   mapping;
-   retries;
-   rate limits;
-   external identities.

------------------------------------------------------------------------

# 6. Componentes principales

## 6.1 Web Application

Funciones:

-   dashboard;
-   navegación;
-   CRUD;
-   búsqueda;
-   filtros;
-   vistas;
-   configuración;
-   health de integraciones.

------------------------------------------------------------------------

## 6.2 API Server

API central.

Debe ser stateless siempre que sea posible.

------------------------------------------------------------------------

## 6.3 PostgreSQL

Base de datos principal.

Responsabilidades:

-   datos de dominio;
-   relaciones;
-   estados;
-   eventos;
-   configuración;
-   external identities;
-   auditoría.

PostgreSQL será la **fuente de verdad física de Control Tower**.

------------------------------------------------------------------------

## 6.4 Background Worker

Procesa:

-   sincronizaciones;
-   retries;
-   jobs programados;
-   procesamiento de eventos;
-   recalculado de datos derivados;
-   generación de resúmenes.

No ejecutar operaciones largas dentro de requests HTTP.

------------------------------------------------------------------------

## 6.5 Scheduler

Programa:

-   sincronización diaria;
-   sincronización periódica;
-   Daily Briefing;
-   health checks;
-   limpieza;
-   backups lógicos si procede.

Puede formar parte inicialmente del worker.

No es necesario introducir un sistema distribuido de scheduling en MVP.

------------------------------------------------------------------------

## 6.6 Event Bus interno

Para MVP puede ser persistido mediante PostgreSQL.

Conceptualmente:

``` text
Domain Event
      ↓
Event Store / Outbox
      ↓
Worker
      ↓
Handlers
```

No se requiere Kafka/RabbitMQ en MVP.

------------------------------------------------------------------------

# 7. Patrón Outbox

Los cambios de dominio y sus eventos deben ser consistentes.

Ejemplo:

``` text
Transaction
├── UPDATE Project
└── INSERT OutboxEvent
```

Ambos ocurren dentro de la misma transacción.

Después:

``` text
Outbox
↓
Worker
↓
Integration / Derived View / Notification
```

Esto evita perder eventos si la aplicación falla después de modificar la
base de datos.

------------------------------------------------------------------------

# 8. Modelo de persistencia

La base física debe reflejar el Domain Model, pero no necesariamente
copiarlo literalmente.

Principios:

-   UUIDs internos;
-   timestamps UTC;
-   foreign keys;
-   índices;
-   constraints;
-   soft archive cuando corresponda;
-   migrations versionadas.

------------------------------------------------------------------------

# 9. Identidad

## 9.1 Internal ID

Cada entidad tiene:

``` text
id
```

generado por Control Tower.

## 9.2 External Identity

Tabla conceptual:

``` text
external_identities
├── id
├── entity_type
├── entity_id
├── source_system
├── external_entity_type
├── external_id
├── external_url
├── last_synced_at
└── sync_metadata
```

Constraint:

``` text
UNIQUE(
  source_system,
  external_entity_type,
  external_id
)
```

------------------------------------------------------------------------

# 10. Estados

Los estados pertenecen al dominio.

La UI no debe inventar transiciones.

Ejemplo:

``` text
Project:
PLANNED
ACTIVE
REVIEW
DELIVERED
CLOSED
ARCHIVED
BLOCKED
WAITING
```

Una transición inválida debe ser rechazada por la Application/Domain
Layer, no solamente ocultada en la interfaz.

------------------------------------------------------------------------

# 11. API

## 11.1 Estilo

API HTTP/REST para MVP.

Ejemplo:

``` text
GET    /api/v1/projects
GET    /api/v1/projects/:id
POST   /api/v1/projects
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id
```

------------------------------------------------------------------------

## 11.2 Resources

Inicialmente:

``` text
organizations
users
strategic-areas
goals
initiatives
services
capabilities
skills
learning-items
clients
contacts
opportunities
projects
project-phases
tasks
milestones
deliverables
documents
decisions
knowledge-inbox
knowledge-items
assets
applications
environments
infrastructure-resources
integrations
automations
marketing-channels
marketing-campaigns
funnel-stages
portfolio-items
experiments
risks
issues
dependencies
tags
daily-updates
change-events
```

No todas necesitan endpoints completos en el MVP.

------------------------------------------------------------------------

# 12. API para agentes futuros

El futuro agente debe consumir capacidades explícitas.

Ejemplos conceptuales:

``` text
GET /api/v1/context/company
GET /api/v1/context/projects
GET /api/v1/context/today
GET /api/v1/context/attention
GET /api/v1/context/decisions
GET /api/v1/context/knowledge
```

Y acciones:

``` text
POST /api/v1/actions/create-task
POST /api/v1/actions/create-decision
POST /api/v1/actions/capture-knowledge
POST /api/v1/actions/update-project
```

No implementar el agente en MVP.

Pero la API debe evitar quedar diseñada exclusivamente para clicks
humanos.

------------------------------------------------------------------------

# 13. Búsqueda

## MVP

Usar búsqueda textual sobre PostgreSQL.

Debe permitir buscar:

-   Projects;
-   Clients;
-   Decisions;
-   KnowledgeItems;
-   Assets;
-   Documents;
-   Services;
-   Capabilities.

Filtros:

-   status;
-   type;
-   tag;
-   date;
-   client;
-   project;
-   strategic area.

## Futuro

Puede añadirse:

-   full-text search avanzada;
-   búsqueda semántica;
-   embeddings;
-   vector search.

No es requisito del MVP.

------------------------------------------------------------------------

# 14. Integración con Twenty

Twenty es la fuente de verdad para el CRM.

Sincronizar inicialmente:

``` text
Company → Client
Person → Contact
Opportunity → Opportunity
Activity/Interaction → Interaction
```

El mapping debe ser explícito.

## Flujo

``` text
Twenty
  ↓
API/Webhook
  ↓
TwentyAdapter
  ↓
Identity Resolution
  ↓
Upsert
  ↓
ChangeEvent
```

## Requisitos

-   idempotencia;
-   retries;
-   logging;
-   control de errores;
-   última sincronización;
-   health.

No copiar indiscriminadamente todo Twenty.

------------------------------------------------------------------------

# 15. Integración con Notion

Notion es una fuente externa de conocimiento/documentación según el
sistema de Knowledge definido.

Control Tower debe guardar principalmente:

-   referencia;
-   URL;
-   tipo;
-   relación;
-   metadata;
-   estado de procesamiento.

No duplicar todo el contenido en PostgreSQL salvo que una funcionalidad
concreta lo requiera.

------------------------------------------------------------------------

# 16. Integración con Git

Git puede ser fuente de:

-   documentación Markdown;
-   código;
-   templates;
-   assets;
-   experimentos;
-   versiones.

Control Tower conserva:

``` text
repository
path
branch/version
url
related entity
```

El contenido completo continúa en Git.

------------------------------------------------------------------------

# 17. Google Calendar

Fuente de verdad de calendarios.

Control Tower puede sincronizar:

-   meetings;
-   eventos relevantes;
-   próximos compromisos.

No sustituye Calendar.

------------------------------------------------------------------------

# 18. Google Drive

Fuente documental externa.

Control Tower conserva:

-   URL;
-   nombre;
-   tipo;
-   proyecto;
-   cliente;
-   metadata.

No debe convertirse en un sistema de almacenamiento de archivos en MVP.

------------------------------------------------------------------------

# 19. n8n

n8n puede ser el motor externo de automatización.

Arquitectura:

``` text
Control Tower
      ↕
n8n
      ↕
External Systems
```

Control Tower puede:

-   disparar workflows;
-   recibir webhooks;
-   registrar automatizaciones;
-   consultar health.

No necesita recrear n8n internamente.

------------------------------------------------------------------------

# 20. Integraciones como módulos

Cada integración deberá implementar conceptualmente:

``` text
connect()
authenticate()
healthCheck()
pull()
push()
map()
upsert()
handleWebhook()
disconnect()
```

No todos los métodos tienen que estar disponibles para todos los
sistemas.

------------------------------------------------------------------------

# 21. Sincronización

## Tipos

### Pull

``` text
External → Control Tower
```

### Push

``` text
Control Tower → External
```

### Webhook

``` text
External
   ↓
Webhook
   ↓
Control Tower
```

### Bidirectional

Solo cuando sea estrictamente necesario.

Debe definirse:

-   ownership;
-   precedencia;
-   conflicto.

------------------------------------------------------------------------

# 22. Sync State

Cada integración tendrá estado:

``` text
NOT_CONFIGURED
CONNECTED
SYNCING
HEALTHY
WARNING
ERROR
DISCONNECTED
```

Y métricas:

-   last successful sync;
-   last failed sync;
-   records processed;
-   records created;
-   records updated;
-   records skipped;
-   errors.

------------------------------------------------------------------------

# 23. Retry policy

Los errores transitorios no deben romper una sincronización.

Conceptualmente:

``` text
Attempt 1
↓
retry
↓
Attempt 2
↓
retry
↓
Attempt 3
↓
FAILED
```

Usar exponential backoff.

Los errores permanentes deben registrarse para intervención.

------------------------------------------------------------------------

# 24. Webhooks

Los webhooks deben:

1.  validar autenticidad;
2.  registrar recepción;
3.  generar un evento;
4.  procesarse de forma asíncrona;
5.  ser idempotentes.

No ejecutar lógica pesada dentro del endpoint del webhook.

------------------------------------------------------------------------

# 25. Automatizaciones

Una Automation contiene:

``` text
Trigger
Condition
Action
Target
Status
Health
```

Pero el workflow puede residir en n8n.

Control Tower registra:

``` text
Automation
└── workflow_reference
```

------------------------------------------------------------------------

# 26. Seguridad

## 26.1 Authentication

Para MVP:

-   email/password seguro o proveedor OAuth;
-   sesiones seguras;
-   cookies HttpOnly si se utiliza sesión web;
-   protección CSRF cuando corresponda.

La decisión concreta depende del stack.

## 26.2 Authorization

Modelo inicial:

``` text
Owner
Admin
Member
Viewer
```

Aunque la empresa inicial tenga un solo usuario.

## 26.3 Secrets

Nunca:

``` text
database
Git
logs
frontend
```

Las credenciales deben vivir en:

-   secret manager;
-   variables de entorno seguras;
-   mecanismo equivalente.

------------------------------------------------------------------------

# 27. Multi-tenancy futura

Aunque inicialmente exista una única empresa:

``` text
Organization
```

debe formar parte de las relaciones de las entidades principales.

La estrategia futura será:

``` text
tenant_id / organization_id
```

en los recursos.

No implementar todavía un SaaS multi-tenant complejo.

Pero evitar datos globales accidentalmente compartidos.

------------------------------------------------------------------------

# 28. Auditoría

Debe existir `AuditLog`.

Ejemplo:

``` text
actor
action
entity
entity_id
timestamp
metadata
ip / client metadata cuando sea apropiado
```

La auditoría responde:

> ¿Quién hizo qué?

Mientras:

``` text
ChangeEvent
```

responde:

> ¿Qué cambió en el negocio?

------------------------------------------------------------------------

# 29. Observabilidad

## Logs

Estructurados.

Ejemplo:

``` text
timestamp
level
service
request_id
user_id
event
metadata
```

Nunca incluir secretos.

## Health

Endpoints conceptuales:

``` text
/health
/health/db
/health/integrations
```

## Métricas

Mínimas:

-   request errors;
-   response latency;
-   failed jobs;
-   sync failures;
-   integration health;
-   database health.

------------------------------------------------------------------------

# 30. Error handling

Todos los errores deben tener:

``` text
error_code
message
request_id
details opcionales
```

Separar:

``` text
User Error
Validation Error
Authentication Error
Authorization Error
Integration Error
Transient Error
Internal Error
```

No mostrar stack traces al usuario.

------------------------------------------------------------------------

# 31. Backups

La base de datos debe tener:

-   backup automático;
-   retención definida;
-   prueba de restauración;
-   backup fuera del mismo entorno cuando sea posible.

Los backups no son suficientes si nunca se prueba el restore.

------------------------------------------------------------------------

# 32. Disaster Recovery

MVP mínimo:

``` text
Database backup
+
Configuration backup
+
Deployment reproducible
```

Debe ser posible reconstruir la aplicación sin depender de cambios
manuales olvidados.

------------------------------------------------------------------------

# 33. Deployment

Primera opción conceptual:

``` text
Self-hosted Server
       │
       ├── Reverse Proxy
       ├── Control Tower App
       ├── Worker
       └── PostgreSQL
```

Puede desplegarse mediante contenedores.

Objetivo:

``` text
docker compose up
```

o equivalente reproducible.

No introducir Kubernetes en MVP.

------------------------------------------------------------------------

# 34. Entornos

Mínimo:

``` text
Development
Production
```

Opcional:

``` text
Staging
```

El entorno de desarrollo no debe utilizar credenciales productivas.

------------------------------------------------------------------------

# 35. Versionado

Versionar:

-   código;
-   migraciones;
-   configuración no secreta;
-   documentación;
-   decisiones arquitectónicas.

No versionar:

-   secretos;
-   tokens;
-   bases de datos productivas;
-   archivos sensibles.

------------------------------------------------------------------------

# 36. CI/CD

Mínimo:

``` text
Push
↓
Lint
↓
Tests
↓
Build
↓
Deploy
```

El deployment productivo puede seguir siendo manual inicialmente.

Automatizarlo cuando el flujo sea estable.

------------------------------------------------------------------------

# 37. Testing

## Unit tests

Para:

-   reglas;
-   estados;
-   transiciones;
-   servicios de dominio.

## Integration tests

Para:

-   DB;
-   repositorios;
-   API;
-   integraciones.

## End-to-end

Para flujos críticos:

``` text
Login
Create Project
Update Project
Create Decision
Sync Client
Capture Knowledge
```

No intentar tener cobertura exhaustiva antes de validar el producto.

------------------------------------------------------------------------

# 38. Arquitectura de extensibilidad

El MVP debe dejar preparada la separación entre:

``` text
Core Domain
```

y:

``` text
Configuration Layer
```

Futuro:

``` text
ObjectDefinition
FieldDefinition
RelationshipDefinition
ViewDefinition
PageDefinition
DashboardDefinition
WorkflowDefinition
```

Estas estructuras no deben formar parte del dominio core del MVP.

------------------------------------------------------------------------

# 39. Custom Objects --- estrategia futura

Cuando se implemente, evitar:

``` text
if object == "equipment"
if object == "property"
if object == "course"
```

El motor debe leer metadata:

``` text
ObjectDefinition
       ↓
FieldDefinitions
       ↓
RelationshipDefinitions
       ↓
Generic CRUD
       ↓
Generic Views
```

La personalización será declarativa.

------------------------------------------------------------------------

# 40. AI / Agent Layer futura

La arquitectura futura podrá añadir:

``` text
AI Agent
    ↓
Context Service
    ↓
Control Tower API
    ↓
Domain
```

El agente no accederá directamente a PostgreSQL.

Esto permitirá:

-   permisos;
-   auditoría;
-   validación;
-   acciones controladas.

------------------------------------------------------------------------

# 41. Knowledge Agent futuro

Arquitectura futura:

``` text
Sources
├── Markdown
├── Notion
├── Git
├── Documents
└── Control Tower
       ↓
Knowledge Ingestion
       ↓
Index
       ↓
Search / Retrieval
       ↓
Agent
       ↓
Control Tower API
```

La primera implementación puede utilizar búsqueda textual.

Vectorización solo se añadirá si el problema real lo justifica.

------------------------------------------------------------------------

# 42. Data lifecycle

Cada dato debe poder pasar por:

``` text
Created
↓
Active
↓
Updated
↓
Archived
```

No borrar automáticamente información histórica relevante.

Para entidades críticas:

-   Decision;
-   ChangeEvent;
-   AuditLog;
-   Knowledge;

la conservación histórica es prioritaria.

------------------------------------------------------------------------

# 43. Performance

MVP no necesita arquitectura distribuida.

Objetivos:

-   UI rápida;
-   queries indexadas;
-   paginación;
-   jobs asíncronos;
-   no bloquear requests;
-   evitar N+1 queries.

La optimización prematura está fuera de alcance.

------------------------------------------------------------------------

# 44. Coste operativo

Prioridad:

1.  open source;
2.  self-hosting;
3.  servicios gratuitos cuando sean adecuados;
4.  evitar SaaS de pago durante validación;
5.  añadir servicios de pago solo cuando aporten valor real.

Esto es especialmente importante porque el producto se está construyendo
con presupuesto inicial prácticamente nulo.

------------------------------------------------------------------------

# 45. Stack --- estado

**No decidido todavía.**

Este documento define requisitos técnicos, no una selección definitiva.

La selección de stack debe evaluar:

-   experiencia técnica disponible;
-   facilidad de desarrollo con IA;
-   self-hosting;
-   coste;
-   mantenimiento;
-   PostgreSQL;
-   autenticación;
-   background jobs;
-   integración API;
-   deployment;
-   extensibilidad.

La decisión se documentará en:

**`CONTROL_TOWER_STACK_DECISION.md`**

------------------------------------------------------------------------

# 46. Recomendación de arquitectura de implementación

Independientemente del stack final:

``` text
/apps
  web
  api
  worker

/packages
  domain
  application
  integrations
  persistence
  shared

/infrastructure
  docker
  migrations
  deployment

/docs
  architecture
  decisions
```

La estructura exacta dependerá del stack.

No debe considerarse una obligación tecnológica.

------------------------------------------------------------------------

# 47. MVP técnico

El alcance oficial del MVP es el definido en **§3B — Corrección del alcance del MVP**.

El MVP debe demostrar un flujo completo:

```text
Governance
   ↓
Client / Opportunity
   ↓
Project
   ↓
Task / Deliverable
   ↓
Decision / Knowledge
   ↓
Dashboard / Context
```

junto con al menos una integración CRM real y una arquitectura de sincronización robusta.

# 48. Fuera del MVP técnico

No implementar:

-   microservices;
-   Kubernetes;
-   Kafka;
-   vector database;
-   RAG;
-   AI agent;
-   autonomous agent actions;
-   custom object engine;
-   custom page builder;
-   custom workflow engine;
-   client portal completo;
-   billing;
-   ERP;
-   accounting;
-   password manager;
-   advanced analytics warehouse;
-   advanced multi-tenancy;
-   mobile native app.

------------------------------------------------------------------------

# 49. Criterios de aceptación de la arquitectura

La arquitectura será aceptable cuando:

1. el dominio pueda ejecutarse como monolito modular;
2. PostgreSQL sea la fuente de verdad física de Control Tower;
3. las integraciones estén aisladas mediante adapters;
4. Twenty pueda sincronizar Clients, Contacts y Opportunities;
5. las sincronizaciones sean idempotentes;
6. cada dato sincronizado tenga ownership explícito;
7. los eventos transaccionales se gestionen mediante Transactional Outbox;
8. exista auditoría;
9. exista autenticación y autorización;
10. existan backups;
11. el despliegue sea reproducible;
12. no haya secretos en el código;
13. el sistema pueda ejecutarse self-hosted;
14. el coste inicial pueda mantenerse cercano a cero;
15. la UI no acceda directamente a la DB;
16. los futuros agentes puedan utilizar la API;
17. la API pueda distinguir operaciones de lectura y escritura y reservar acciones sensibles para autorización futura;
18. la arquitectura no obligue a implementar IA o vectorización;
19. la arquitectura no dependa de Twenty como CRM concreto;
20. el sistema pueda evolucionar hacia Custom Objects;
21. el núcleo siga siendo útil para empresas diferentes;
22. el MVP pueda ser construido y mantenido por una sola persona;
23. el modelo físico pueda diseñarse después de decidir el stack sin modificar el Domain Model;
24. el sistema diferencie claramente datos operativos, contexto y referencias externas;
25. el Daily Briefing pueda derivarse de datos existentes sin duplicación innecesaria.

# 50. Decisiones técnicas abiertas

Antes de comenzar implementación deben decidirse:

-   frontend framework;
-   backend framework;
-   lenguaje;
-   ORM;
-   PostgreSQL deployment;
-   authentication provider/implementation;
-   session strategy;
-   job queue;
-   scheduler;
-   secret management;
-   container strategy;
-   reverse proxy;
-   logging;
-   monitoring;
-   CI/CD;
-   testing framework;
-   API documentation;
-   deployment target.

Estas decisiones se documentarán en `CONTROL_TOWER_STACK_DECISION.md` antes de diseñar el Physical Data Model y antes de implementar el MVP.

------------------------------------------------------------------------

# 51. Siguiente secuencia

Una vez validado este documento:

``` text
CONTROL_TOWER_SPEC.md
        ↓
DOMAIN_MODEL.md 🔒
        ↓
TECHNICAL_ARCHITECTURE.md ← ESTE DOCUMENTO
        ↓
PHYSICAL_DATA_MODEL.md
        ↓
WIREFRAMES / INFORMATION ARCHITECTURE
        ↓
STACK_DECISION.md
        ↓
IMPLEMENTATION PLAN
        ↓
MVP
```

No comenzar la implementación antes de completar las decisiones técnicas
necesarias.

------------------------------------------------------------------------

# 52. Regla final

> **Construir una arquitectura suficientemente sólida para no hipotecar
> el futuro, pero suficientemente simple para que una sola persona pueda
> mantenerla hoy.**

La complejidad debe aparecer como respuesta a necesidades reales, no
como anticipación de todos los problemas posibles.

