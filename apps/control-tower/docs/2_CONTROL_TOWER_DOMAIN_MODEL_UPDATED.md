---
date: 2026-08-10
document_type: Domain Model
parent_specification: CONTROL_TOWER_SPEC.md
project: Control Tower
status: Draft --- Product Architecture Review
title: Control Tower --- Domain Model
version: 0.2.0
---

# CONTROL TOWER --- DOMAIN MODEL

> **Documento de diseño ORIGINAL (línea base, 2026-08-10).** Se conserva como referencia técnica/histórica; su cuerpo no se reescribe al evolucionar la implementación. Para el **estado actual** y las **desviaciones**, mandan `BUILD_LOG.md`, `FINDINGS_AND_DEFERRED.md`, `adr/` y `DECISIONS_FROZEN.md`. Índice en [`README.md`](./README.md).

## 0. Propósito

Este documento define el **modelo de dominio conceptual** de Control
Tower después de la revisión arquitectónica de `CONTROL_TOWER_SPEC.md`.

Cierra, antes de elegir stack y diseñar la base de datos física:

-   entidades;
-   responsabilidades;
-   ownership y fuentes de verdad;
-   relaciones;
-   estados y ciclos de vida;
-   invariantes;
-   sincronización con sistemas externos;
-   extensibilidad para distintos tipos de empresa.

No define todavía PostgreSQL, ORM, framework, endpoints concretos ni
wireframes.

------------------------------------------------------------------------

# 1. Visión del dominio

Control Tower es una **capa de gobierno, orientación y contexto
empresarial**.

No sustituye Twenty, Notion, Git, Drive, Calendar, Gmail, n8n ni otras
herramientas especializadas.

Su pregunta principal es:

> **¿Qué está pasando en mi empresa, qué necesita atención, qué
> decisiones hemos tomado y dónde está la información relevante?**

Los sistemas especializados conservan el detalle. Control Tower conserva
el contexto y las relaciones.

------------------------------------------------------------------------

# 2. Ownership de la información

Toda información manejada por Control Tower pertenece a una de cuatro
categorías.

## 2.1 OWNED

Control Tower es la fuente de verdad.

Ejemplos:

-   Organization
-   Goals
-   Initiatives
-   Services
-   Capabilities
-   Projects
-   Decisions
-   Risks
-   Issues
-   Dependencies
-   Portfolio metadata
-   Daily Updates
-   Change Events
-   configuración de integraciones

## 2.2 SYNCHRONIZED

La fuente de verdad está fuera, pero Control Tower mantiene una
representación estructurada.

Ejemplos:

-   Clients desde Twenty.
-   Contacts desde Twenty.
-   Opportunities desde Twenty.
-   Tasks seleccionadas.
-   Meetings.
-   Interactions.
-   actividad de repositorios.

## 2.3 LINKED

Control Tower conserva principalmente una referencia:

-   página de Notion;
-   archivo o carpeta de Drive;
-   repositorio Git;
-   demo;
-   web pública;
-   documentación.

## 2.4 DERIVED

Información calculada por Control Tower.

Ejemplos:

-   progreso;
-   health de proyectos;
-   tareas atrasadas;
-   clientes que necesitan atención;
-   proyectos bloqueados;
-   próximos hitos;
-   What Changed;
-   Daily Briefing;
-   métricas;
-   prioridades sugeridas.

Los datos derivados deben poder rastrearse hasta sus fuentes.

------------------------------------------------------------------------

# 3. Principios de modelado

## 3.1 El dominio no conoce herramientas externas

El dominio utiliza conceptos como:

-   Client
-   Project
-   Opportunity
-   Task
-   KnowledgeItem
-   Asset
-   Integration

No debe utilizar conceptos como `TwentyCompany` o `NotionPage`.

Las integraciones traducen entre el modelo externo y el modelo interno.

## 3.2 Project es una entidad propia

Project no es una página de Notion ni una Opportunity de Twenty.

El proyecto conecta:

``` text
Client
Opportunity
Service
Capability
Tasks
Milestones
Decisions
Issues
Risks
Assets
Knowledge
Portfolio
```

## 3.3 Decision es memoria ejecutiva

Las decisiones importantes son entidades nativas de Control Tower.

Una decisión antigua puede quedar `SUPERSEDED`, pero no desaparecer.

## 3.4 Application e Integration son diferentes

-   Application = qué software utilizamos.
-   Integration = cómo está conectado con Control Tower.

## 3.5 Knowledge y Asset son diferentes

-   Knowledge = conocimiento estructurado.
-   Asset = recurso reutilizable producido o mantenido por la empresa.

Flujo:

``` text
Proyecto
↓
Experiencia
↓
Knowledge
↓
SOP / Lesson / Template
↓
Asset reutilizable
```

## 3.6 Identidad externa

Todo registro sincronizado debe poder identificarse mediante:

``` text
source_system
external_entity_type
external_id
external_url
```

La combinación de fuente + tipo + ID externo debe ser única para lograr
sincronización idempotente.

------------------------------------------------------------------------

# 4. Configurabilidad del producto

Control Tower se construye inicialmente para la propia empresa, pero
**no debe codificarse como una aplicación específica para consultoras**.

No deben existir ramas como:

``` text
if company_type == "agency" ...
if company_type == "coach" ...
```

La especialización futura debe producirse mediante configuración.

## 4.1 Core Domain

El núcleo contiene las entidades comunes:

-   Organization
-   User
-   StrategicArea
-   Goal
-   Initiative
-   Service
-   Capability
-   Skill
-   LearningItem
-   Client
-   Contact
-   Opportunity
-   Interaction
-   Meeting
-   Project
-   ProjectPhase
-   Task
-   Milestone
-   Decision
-   ChangeEvent
-   KnowledgeItem
-   KnowledgeInboxItem
-   Asset
-   Application
-   Environment
-   InfrastructureResource
-   Integration
-   Automation
-   MarketingChannel
-   MarketingCampaign
-   FunnelStage
-   PortfolioItem
-   Experiment
-   Risk
-   Issue
-   Dependency
-   DailyUpdate

## 4.2 Capa configurable futura

Posteriormente podrá existir:

-   CustomObject
-   CustomField
-   CustomRelationship
-   CustomView
-   CustomPage
-   CustomDashboard
-   CustomStatus
-   CustomWorkflow

Ejemplos de objetos que otra empresa podría crear:

-   Equipment
-   Property
-   Course
-   Supplier
-   Campaign
-   Patient
-   Product
-   Contract

No se implementan completamente en el MVP, pero la arquitectura debe
dejar espacio para ellos.

------------------------------------------------------------------------

# 5. Entidades

## 5.1 Organization

**Propósito:** empresa/workspace.

**Ownership:** Control Tower.

**Campos:**

-   id
-   name
-   description
-   status
-   timezone
-   locale
-   created_at
-   updated_at

**Relaciones:** Users, StrategicAreas, Goals, Initiatives, Services,
Capabilities, Clients, Projects, Assets, Applications, Integrations.

**Invariante:** todo dato operativo pertenece a una Organization.

------------------------------------------------------------------------

## 5.2 User

Persona que utiliza Control Tower.

**Campos:**

-   id
-   name
-   email
-   role
-   status
-   last_login_at

Puede crear decisiones, proyectos, tareas, conocimiento y administrar
integraciones según permisos.

------------------------------------------------------------------------

## 5.3 StrategicArea

Agrupador estratégico/operativo.

Ejemplos:

-   Dirección
-   Business OS
-   KOS
-   Marketing
-   Comercial
-   Operaciones
-   Formación
-   Portfolio
-   Infraestructura

No debe estar hardcoded.

------------------------------------------------------------------------

## 5.4 Goal

Objetivo empresarial.

**Campos:**

-   id
-   title
-   description
-   strategic_area_id
-   priority
-   status
-   target_date
-   progress
-   owner_id

**Relaciones:** Initiatives.

------------------------------------------------------------------------

## 5.5 Initiative

Iniciativa importante de construcción o mejora.

Ejemplos:

-   crear KOS;
-   implementar Twenty;
-   crear portfolio;
-   crear Control Tower;
-   crear servicio.

**Campos:**

-   id
-   title
-   description
-   type
-   status
-   priority
-   start_date
-   target_date
-   progress
-   strategic_area_id
-   owner_id

------------------------------------------------------------------------

## 5.6 Service

Servicio ofrecido o en desarrollo.

**Campos:**

-   id
-   name
-   description
-   problem_solved
-   target_customer
-   status
-   readiness
-   delivery_model
-   price_reference
-   public_visibility

**Relaciones:**

``` text
Service
├── Capabilities
├── Skills
├── Assets
├── Projects
├── LearningItems
└── PortfolioItems
```

------------------------------------------------------------------------

## 5.7 Capability

Capacidad empresarial.

Es un activo central de la empresa: puede producir servicios,
demostrarse mediante proyectos, requerir formación y evolucionar.

**Campos:**

-   id
-   name
-   description
-   category
-   level
-   evidence
-   status
-   next_goal

**Relaciones:** Services, Skills, LearningItems, Projects, Assets.

**Estados:**

``` text
IDENTIFIED → LEARNING → PRACTICING → WORKING → VALIDATED → ADVANCED
```

------------------------------------------------------------------------

## 5.8 Skill

Habilidad específica que contribuye a una Capability.

Ejemplo:

``` text
Capability: Automation
Skills:
- API integration
- Webhooks
- n8n
- Python
- Data mapping
```

------------------------------------------------------------------------

## 5.9 LearningItem

Recurso o actividad de aprendizaje.

Tipos:

-   curso;
-   libro;
-   vídeo;
-   documentación;
-   proyecto práctico;
-   laboratorio.

**Relación:** LearningItem → Capability.

------------------------------------------------------------------------

## 5.10 Client

Organización cliente dentro del dominio.

**Importante:** no es `TwentyCompany`.

**Fuente actual:** Twenty.

**Campos:**

-   id
-   name
-   status
-   segment
-   source_system
-   external_id
-   external_url
-   last_synced_at

**Relaciones:** Contacts, Opportunities, Interactions, Meetings,
Projects.

------------------------------------------------------------------------

## 5.11 Contact

Persona relacionada con Client.

**Fuente actual:** Twenty.

**Campos:**

-   id
-   name
-   email
-   phone
-   role
-   client_id
-   external_id
-   external_url

------------------------------------------------------------------------

## 5.12 Opportunity

Oportunidad comercial.

**Fuente actual:** Twenty.

**Campos:**

-   id
-   title
-   client_id
-   value
-   stage
-   probability
-   expected_close_date
-   last_activity
-   next_action
-   external_id
-   external_url

**Pipeline conceptual:**

``` text
LEAD → CONTACTED → QUALIFIED → MEETING → PROPOSAL → NEGOTIATION → WON / LOST
```

Los estados concretos pueden depender del CRM conectado.

------------------------------------------------------------------------

## 5.13 Interaction

Interacción significativa con cliente, contacto u oportunidad.

Tipos:

-   email importante;
-   llamada;
-   mensaje;
-   reunión;
-   propuesta;
-   seguimiento.

**Campos:**

-   id
-   type
-   timestamp
-   summary
-   client_id
-   contact_id
-   opportunity_id
-   project_id
-   source_system
-   external_id
-   external_url

Permite calcular la última interacción significativa sin sustituir el
historial completo del CRM.

------------------------------------------------------------------------

## 5.14 Meeting

Reunión relevante.

**Campos:**

-   id
-   title
-   date
-   duration
-   participants
-   client_id
-   project_id
-   agenda
-   outcome
-   notes_url
-   source_system
-   external_id

Puede proceder de Calendar, Twenty o entrada manual.

------------------------------------------------------------------------

## 5.15 Project

Unidad de trabajo ejecutable y entidad central del dominio.

**Tipos:**

``` text
INTERNAL
CLIENT
LAB
```

**Campos:**

-   id
-   name
-   type
-   description
-   status
-   phase
-   priority
-   client_id
-   opportunity_id
-   service_id
-   start_date
-   target_date
-   completion_date
-   progress
-   next_action
-   blocked
-   owner_id

**Relaciones:**

-   Client
-   Opportunity
-   Service
-   Capabilities
-   Tasks
-   Milestones
-   Meetings
-   Decisions
-   Issues
-   Risks
-   Assets
-   KnowledgeItems
-   PortfolioItem

Puede tener referencias a Notion, Drive, Git, Twenty y web.

**Estados:**

``` text
PLANNED → ACTIVE → REVIEW → DELIVERED → CLOSED → ARCHIVED
```

Auxiliares:

-   BLOCKED
-   WAITING

**Invariantes:**

-   un CLIENT Project debe tener Client;
-   un Project cerrado no debe tener Tasks activas salvo excepción
    explícita;
-   las referencias externas no cambian el ownership interno del
    Project.

------------------------------------------------------------------------

## 5.16 ProjectPhase

Fase del ciclo de vida de un Project.

Ejemplos:

-   Discovery
-   Design
-   Preparation
-   Implementation
-   Review
-   Delivery
-   Closure

Las fases deben poder configurarse posteriormente.

------------------------------------------------------------------------

## 5.17 Task

Acción ejecutable.

Puede ser propia de Control Tower o sincronizada desde otro sistema.

**Campos:**

-   id
-   title
-   description
-   status
-   priority
-   due_date
-   owner_id
-   project_id
-   source_system
-   external_id
-   external_url

**Estados:**

``` text
TODO → IN_PROGRESS → BLOCKED → DONE / CANCELLED
```

------------------------------------------------------------------------

## 5.18 Milestone

Hito significativo de proyecto.

**Campos:**

-   id
-   title
-   description
-   project_id
-   due_date
-   status

------------------------------------------------------------------------

## 5.19 Decision

Decisión empresarial importante.

**Campos:**

-   id
-   title
-   date
-   decision
-   rationale
-   alternatives
-   impact
-   status
-   author_id
-   source_reference

Puede relacionarse con cualquier entidad relevante.

**Estados:**

``` text
PROPOSED → ACCEPTED → SUPERSEDED / REJECTED
```

Una decisión histórica nunca debe perderse por haber sido sustituida.

------------------------------------------------------------------------

## 5.20 ChangeEvent

Evento significativo de cambio empresarial.

Ejemplos:

-   proyecto creado;
-   proyecto cambiado de estado;
-   Opportunity WON;
-   tarea completada;
-   decisión creada;
-   automatización fallida;
-   integración sincronizada.

**Campos:**

-   id
-   timestamp
-   actor_type
-   actor_id
-   source
-   entity_type
-   entity_id
-   event_type
-   summary
-   metadata

Alimenta:

-   What Changed;
-   Daily Briefing;
-   notificaciones;
-   automatizaciones.

------------------------------------------------------------------------

## 5.21 KnowledgeInboxItem

Captura de conocimiento pendiente de procesar.

**Campos:**

-   id
-   title
-   raw_reference
-   source
-   captured_at
-   status
-   suggested_type
-   suggested_area
-   processing_notes

**Estados:**

``` text
CAPTURED → TRIAGED → PROCESSING → CLASSIFIED → INTEGRATED → ARCHIVED
```

------------------------------------------------------------------------

## 5.22 KnowledgeItem

Conocimiento estructurado.

Tipos:

-   SOP
-   Lesson
-   Template
-   Experiment
-   Concept
-   CaseStudy
-   Research
-   Decision
-   Prompt
-   Guide

**Fuentes habituales:**

-   Markdown;
-   Git;
-   Obsidian;
-   Notion según el caso.

Control Tower conserva principalmente metadatos, relaciones, estado y
referencia.

**Estados:**

``` text
DRAFT → REVIEW → VALIDATED → ACTIVE → OBSOLETE → ARCHIVED
```

------------------------------------------------------------------------

## 5.23 Asset

Recurso reutilizable.

Ejemplos:

-   plantilla;
-   prompt;
-   workflow;
-   script;
-   documento;
-   componente;
-   dashboard;
-   checklist;
-   producto digital.

**Campos:**

-   id
-   name
-   type
-   version
-   status
-   owner_id
-   repository
-   storage_link
-   documentation_link
-   related_service
-   related_project

**Relación con Knowledge:**

``` text
Project → Experience → KnowledgeItem → Asset
```

------------------------------------------------------------------------

## 5.24 Application

Software utilizado por la empresa.

Ejemplos:

-   Twenty;
-   Notion;
-   n8n;
-   Obsidian;
-   Metabase;
-   Google Workspace.

**Campos:**

-   id
-   name
-   category
-   description
-   status
-   url
-   documentation_url
-   owner_id

------------------------------------------------------------------------

## 5.25 Environment

Entorno de una Application.

Ejemplos:

-   development;
-   staging;
-   production;
-   demo;
-   client;
-   laboratory.

Relación:

``` text
Application → Environment
```

------------------------------------------------------------------------

## 5.26 InfrastructureResource

Recurso técnico.

Ejemplos:

-   Raspberry Pi;
-   servidor;
-   VPS;
-   database;
-   container host;
-   domain;
-   storage.

**Campos:**

-   id
-   name
-   type
-   environment
-   status
-   address
-   provider
-   documentation_url

**Seguridad:** nunca almacenar secretos.

------------------------------------------------------------------------

## 5.27 Integration

Conexión entre Control Tower y un sistema externo.

**Ejemplo:**

``` text
Twenty → API Integration → Control Tower
```

**Campos:**

-   id
-   name
-   source_application
-   target_system
-   integration_type
-   status
-   authentication_method
-   sync_frequency
-   last_sync_at
-   health
-   configuration_reference

**Estados:**

``` text
DESIGNED → CONFIGURED → CONNECTED → ACTIVE → ERROR → DISABLED → RETIRED
```

Las credenciales se guardan fuera del dominio mediante un mecanismo
seguro.

------------------------------------------------------------------------

## 5.28 Automation

Workflow automatizado.

**Campos:**

-   id
-   name
-   description
-   status
-   trigger
-   source_system
-   target_system
-   workflow_reference
-   documentation
-   last_execution
-   health
-   owner_id

**Estados:**

``` text
DESIGNED → DEVELOPMENT → TESTING → ACTIVE → ERROR → DISABLED → RETIRED
```

------------------------------------------------------------------------

## 5.29 MarketingChannel

Canal de marketing/adquisición.

Ejemplos:

-   Instagram;
-   TikTok;
-   LinkedIn;
-   Website;
-   Email;
-   YouTube.

No debe limitarse a una lista cerrada.

------------------------------------------------------------------------

## 5.30 MarketingCampaign

Campaña o iniciativa de marketing.

Relación conceptual:

``` text
MarketingChannel → MarketingCampaign → Opportunity
```

------------------------------------------------------------------------

## 5.31 FunnelStage

Etapa conceptual del funnel.

Ejemplo:

``` text
Awareness → Interest → Lead → Qualified → Opportunity → Customer
```

No debe confundirse con el Sales Pipeline del CRM.

------------------------------------------------------------------------

## 5.32 PortfolioItem

Elemento publicable.

Tipos:

-   Project;
-   CaseStudy;
-   Demo;
-   Template;
-   Product;
-   Experiment.

**Estados:**

``` text
NOT_ELIGIBLE → CANDIDATE → IN_PREPARATION → PUBLISHED → ARCHIVED
```

No todo Project tiene que publicarse.

------------------------------------------------------------------------

## 5.33 Experiment

Prueba técnica o laboratorio.

**Campos:**

-   id
-   title
-   question
-   hypothesis
-   technology
-   status
-   result
-   learning
-   reusable_asset
-   service_potential

**Estados:**

``` text
IDEA → PLANNED → RUNNING → COMPLETED / FAILED → ARCHIVED
```

------------------------------------------------------------------------

## 5.34 Risk

Riesgo.

**Campos:**

-   id
-   title
-   description
-   probability
-   impact
-   severity
-   mitigation
-   owner_id
-   status
-   project_id

**Estados:**

``` text
OPEN → MITIGATING → ACCEPTED → RESOLVED → CLOSED
```

------------------------------------------------------------------------

## 5.35 Issue

Problema actual.

**Campos:**

-   id
-   title
-   description
-   severity
-   status
-   owner_id
-   project_id
-   resolution

Puede relacionarse con Project, Integration, Automation, Application o
InfrastructureResource.

------------------------------------------------------------------------

## 5.36 Dependency

Dependencia explícita entre entidades.

Ejemplos:

``` text
Service → depends_on → Capability
Project → depends_on → Project
Application → deployed_on → InfrastructureResource
```

**Campos:**

-   source_entity
-   target_entity
-   dependency_type
-   status
-   notes

------------------------------------------------------------------------

## 5.37 DailyUpdate

Resumen diario.

**Campos:**

-   id
-   date
-   user_id
-   done
-   decided
-   problems
-   next
-   status

Alimenta recuperación de contexto y Daily Briefing.

------------------------------------------------------------------------

## 5.38 ExternalIdentity

Identidad de una entidad interna en un sistema externo.

Conceptualmente:

``` text
Internal Entity
└── ExternalIdentity
    ├── source_system
    ├── external_entity_type
    ├── external_id
    ├── external_url
    └── last_synced_at
```

Debe existir una restricción única conceptual sobre:

``` text
source_system + external_entity_type + external_id
```

------------------------------------------------------------------------

# 6. Relaciones principales

## Empresa

``` text
Organization
├── StrategicAreas
│   ├── Goals
│   └── Initiatives
├── Services
│   └── Capabilities
│       ├── Skills
│       └── LearningItems
└── Portfolio
```

## Comercial

``` text
MarketingChannel
↓
Campaign
↓
Opportunity
↓
Client
↓
Project
```

## Proyecto

``` text
Project
├── Client
├── Opportunity
├── Service
├── Capability
├── Tasks
├── Milestones
├── Meetings
├── Decisions
├── Issues
├── Risks
├── Assets
├── KnowledgeItems
└── PortfolioItem
```

## Conocimiento

``` text
KnowledgeInboxItem
↓
KnowledgeItem
↓
Asset
```

## Infraestructura

``` text
Application
├── Environment
├── Integration
├── Automation
└── InfrastructureResource
```

------------------------------------------------------------------------

# 7. Fuente de verdad por dominio

  Dominio           Fuente actual                             Papel de Control Tower
  ----------------- ----------------------------------------- ------------------------
  Organization      Control Tower                             Own
  Goals             Control Tower                             Own
  Initiatives       Control Tower                             Own
  Services          Control Tower                             Own
  Capabilities      Control Tower                             Own
  Clients           Twenty                                    Sync
  Contacts          Twenty                                    Sync
  Opportunities     Twenty                                    Sync
  Interactions      Twenty / otras                            Sync
  Meetings          Calendar / CRM                            Sync
  Projects          Control Tower                             Own
  Tasks             Control Tower / Notion / Twenty           Own/Sync
  Decisions         Control Tower                             Own
  Knowledge         Markdown/Git/Obsidian/Notion según tipo   Linked/Sync
  Knowledge Inbox   Control Tower                             Own
  Assets            Git/Drive/Control Tower según activo      Linked/Sync
  Applications      Control Tower                             Own
  Environments      Control Tower                             Own
  Infrastructure    Control Tower + infraestructura técnica   Own/Sync
  Integrations      Control Tower                             Own
  Automations       n8n / otros                               Sync/Linked
  Marketing         Control Tower                             Own
  Portfolio         Control Tower                             Own
  Experiments       Control Tower                             Own
  Risks             Control Tower                             Own
  Issues            Control Tower                             Own
  Dependencies      Control Tower                             Own
  Daily Updates     Control Tower                             Own

------------------------------------------------------------------------

# 8. Flujo de información

## 8.1 Externo → Control Tower

``` text
External System
↓
Integration
↓
Adapter / Mapping
↓
Identity Resolution
↓
Domain Entity
↓
ChangeEvent
↓
Derived Views
↓
Dashboard
```

## 8.2 Usuario → Control Tower

``` text
User
↓
Control Tower
↓
Domain Entity
↓
ChangeEvent
↓
Dashboard / Automation
```

## 8.3 Captura de conocimiento

``` text
Capture
↓
KnowledgeInboxItem
↓
Triaging
↓
KnowledgeItem
↓
Validated Knowledge
↓
Asset / SOP / Template / Capability / Service
```

## 8.4 Proyecto → conocimiento reutilizable

``` text
Project
↓
Experience
↓
Retrospective
↓
Knowledge Inbox
↓
Knowledge Item
↓
Reusable Asset
↓
Future Project
```

------------------------------------------------------------------------

# 9. Reglas de sincronización

## Idempotencia

Una sincronización repetida no crea duplicados.

## Mapping

Toda integración necesita un mapping explícito:

``` text
External Object → Internal Object
```

## Source precedence

Si dos sistemas pueden modificar el mismo dato, debe existir una regla
explícita de precedencia.

No asumir automáticamente "last write wins".

## Conflictos

Si existe conflicto entre datos externos e internos:

``` text
External
vs
Internal
```

debe registrarse y resolverse mediante una regla definida.

## Estado de integración

``` text
HEALTHY
WARNING
ERROR
DISCONNECTED
```

------------------------------------------------------------------------

# 10. ChangeEvent vs AuditLog

No son la misma entidad.

## ChangeEvent

Pregunta:

> ¿Qué cambió en el negocio?

Ejemplo:

``` text
Project Beta
PLANNED → ACTIVE
```

## AuditLog

Pregunta:

> ¿Qué acción ejecutó un usuario o sistema?

Ejemplo:

``` text
User X
PATCH
Project Beta
10:34
```

Ambos conceptos deben existir.

------------------------------------------------------------------------

# 11. Datos derivados

Control Tower puede calcular:

### Project Health

A partir de:

-   estado;
-   tareas atrasadas;
-   bloqueos;
-   deadlines;
-   issues;
-   actividad reciente.

### Client Attention

A partir de:

-   última interacción;
-   oportunidades abiertas;
-   tareas;
-   proyectos;
-   deadlines;
-   bloqueos.

### Company Progress

A partir de:

-   Goals;
-   Initiatives;
-   Projects;
-   Services;
-   Capabilities.

### What Changed

A partir de ChangeEvents.

### Daily Briefing

A partir de:

-   ChangeEvents;
-   Tasks;
-   Meetings;
-   Projects;
-   Opportunities;
-   Issues;
-   Risks.

------------------------------------------------------------------------

# 12. Configurabilidad futura

La arquitectura debe permitir que una empresa añada:

## Custom Objects

``` text
CustomObject
├── name
├── description
├── icon
├── plural_name
└── status
```

## Custom Fields

Tipos iniciales posibles:

-   Text
-   Number
-   Boolean
-   Date
-   DateTime
-   Currency
-   Email
-   URL
-   Select
-   MultiSelect
-   Relation
-   User
-   FileReference

## Custom Relationships

``` text
Object A
↓
relationship
↓
Object B
```

## Custom Pages

Una página representa una vista de uno o varios objetos.

## Custom Views

Un mismo objeto puede verse como:

-   Table;
-   Kanban;
-   List;
-   Calendar;
-   Timeline.

## Custom Dashboards

Composición configurable de widgets.

## Custom Workflows

``` text
Trigger
↓
Condition
↓
Action
↓
Event
```

Estas funcionalidades pertenecen a fases posteriores.

------------------------------------------------------------------------

# 13. Dominio vs interfaz

Una entidad no equivale a una página.

Ejemplo:

``` text
Project
├── Table
├── Kanban
├── Timeline
├── Detail
└── Dashboard Widget
```

La UI debe poder cambiar sin modificar el dominio.

------------------------------------------------------------------------

# 14. Invariantes globales

1.  Toda entidad de negocio pertenece a una Organization.
2.  Todo ID interno es único.
3.  Los registros externos son idempotentes.
4.  Las credenciales nunca pertenecen al dominio.
5.  Las decisiones históricas se conservan.
6.  Todo dato sincronizado identifica su fuente.
7.  Los datos derivados son trazables.
8.  El dominio no depende de APIs concretas.
9.  Los estados respetan transiciones permitidas.
10. Un CLIENT Project necesita Client.
11. Un Project cerrado no debería tener Tasks activas salvo excepción
    explícita.
12. Los objetos configurables futuros no deben requerir código
    específico por nicho.

------------------------------------------------------------------------

# 15. Alcance del MVP

## Entidades físicas prioritarias

-   Organization
-   User
-   StrategicArea
-   Goal
-   Initiative
-   Service
-   Capability
-   Client
-   Contact
-   Opportunity
-   Project
-   ProjectPhase
-   Task
-   Milestone
-   Decision
-   ChangeEvent
-   KnowledgeInboxItem
-   KnowledgeItem
-   Asset
-   Application
-   Environment
-   Integration
-   Automation
-   PortfolioItem
-   Risk
-   Issue
-   Dependency

## Integraciones

Prioridad:

1.  Twenty
2.  Notion
3.  Git

Google Drive y Calendar pueden comenzar como referencias simples.

## Fuera del MVP

-   Custom Objects completos.
-   Custom Fields completos.
-   Custom Pages.
-   Custom Dashboards.
-   Custom Workflows.
-   agente IA.
-   RAG.
-   vector database.
-   billing.
-   client portal.
-   ERP.
-   gestor de contraseñas.
-   contabilidad.

La arquitectura sí debe permitirlos posteriormente.

------------------------------------------------------------------------

# 16. Contrato para la arquitectura técnica

La siguiente fase debe respetar:

1.  Separación entre Domain e Integrations.
2.  Separación entre Domain y UI.
3.  IDs internos independientes de IDs externos.
4.  Migraciones reproducibles.
5.  Integridad referencial.
6.  Auditoría.
7.  Eventos.
8.  Sincronización idempotente.
9.  Gestión segura de secretos.
10. Preparación para multi-tenancy.
11. Preparación para Custom Objects.
12. API-first.
13. Jobs asíncronos para sincronizaciones.
14. Preparación para agentes IA.

------------------------------------------------------------------------

# 17. Decisiones arquitectónicas cerradas

-   [x] Control Tower es una capa de gobierno y contexto.
-   [x] No es un CRM.
-   [x] No es Notion.
-   [x] No es un gestor de proyectos.
-   [x] Project es entidad propia.
-   [x] Client es entidad propia y no TwentyCompany.
-   [x] Decision es entidad nativa.
-   [x] ChangeEvent forma parte del núcleo.
-   [x] AuditLog y ChangeEvent son conceptos distintos.
-   [x] Application e Integration son diferentes.
-   [x] Environment es diferente de Application.
-   [x] Knowledge y Asset son diferentes.
-   [x] Knowledge Inbox precede al Knowledge estructurado.
-   [x] Las fuentes externas se representan mediante
    identidad/referencia.
-   [x] La sincronización debe ser idempotente.
-   [x] El dominio no depende de APIs concretas.
-   [x] Vectorización no es requisito del MVP.
-   [x] Agente IA no es requisito del MVP.
-   [x] El Core Domain debe ser extensible.
-   [x] No se crearán excepciones por nicho mediante if/else.
-   [x] La especialización futura se realizará mediante objetos, campos,
    relaciones, vistas, páginas y workflows configurables.
-   [x] El producto se validará primero sobre la propia empresa.

------------------------------------------------------------------------

# 18. Decisiones abiertas

Se resolverán en la arquitectura técnica:

-   Stack frontend.
-   Stack backend.
-   ORM.
-   Base de datos.
-   autenticación;
-   mecanismo de eventos;
-   jobs;
-   secretos;
-   deployment;
-   observabilidad;
-   estrategia concreta de multi-tenancy;
-   implementación física de Custom Objects;
-   implementación física de Custom Fields;
-   estrategia futura de búsqueda;
-   memoria/agente;
-   necesidad real de vector search.

------------------------------------------------------------------------

# 19. Criterio final

El modelo será válido si puede representar la empresa actual sin
entidades especiales para ella y si, posteriormente, puede representar
empresas diferentes mediante configuración.

Ejemplo actual:

``` text
Empresa
├── Dirección
├── Servicios
├── Capacidades
├── Formación
├── Clientes
├── Opportunities
├── Proyectos
├── Marketing
├── Conocimiento
├── Portfolio
├── Aplicaciones
├── Infraestructura
└── Automatizaciones
```

Ejemplo futuro:

``` text
Otra empresa
├── Productos
├── Proveedores
├── Inventario
├── Clientes
├── Contratos
└── Proyectos
```

sin modificar el núcleo conceptual.

> **Construir el producto sobre un modelo real y útil para la empresa
> propia, pero hacer que la especialización futura se produzca mediante
> configuración y no mediante código específico para cada nicho.**

------------------------------------------------------------------------

# 20. Siguiente documento

Una vez validado este Domain Model, el siguiente documento será:

**`CONTROL_TOWER_TECHNICAL_ARCHITECTURE.md`**

Secuencia:

``` text
Domain Model
↓
Technical Architecture
↓
Physical Data Model
↓
Wireframes / UX
↓
Stack Decision
↓
MVP Implementation
```

------------------------------------------------------------------------

# 21. Revisión arquitectónica v1.0 --- cambios incorporados

Esta sección registra las decisiones tomadas durante la revisión final
del Domain Model antes de congelarlo.

## 21.1 Entidades añadidas

### Document

Recurso documental referenciado por Control Tower.

Control Tower no sustituye el almacenamiento documental. El documento
real puede vivir en Drive, Notion, Git u otro sistema externo.

``` text
Document
├── id
├── title
├── type
├── source
├── url
├── project
├── owner
├── status
└── metadata
```

Relaciones principales:

``` text
Project → Documents
KnowledgeItem → Documents
Decision → Documents
```

### Deliverable

Resultado que debe ser producido o entregado dentro de un proyecto.

Es distinto de `Task` y de `Asset`.

``` text
Project
├── Task        → acción
├── Milestone   → hito
└── Deliverable → resultado entregable
```

Estados:

``` text
PLANNED → IN_PROGRESS → REVIEW → APPROVED → DELIVERED
```

También puede pasar a `REJECTED` cuando corresponda.

Un Deliverable puede convertirse posteriormente, mediante el proceso de
conocimiento, en un Asset reutilizable.

### Tag

Mecanismo transversal de clasificación ligera.

Ejemplos:

``` text
AI
Automation
Marketing
Web
CRM
Internal
Client
Learning
HighPriority
```

No se utilizará para sustituir las relaciones de dominio. Su función
principal será facilitar búsqueda, filtros, agrupación y vistas.

------------------------------------------------------------------------

# 22. Relaciones revisadas

## Opportunity → Project

Una Opportunity puede generar cero o varios Projects.

``` text
Opportunity
    │
    └── WON
          ↓
       Project(s)
```

Esto permite que una única venta genere posteriormente varios proyectos.

## Project ↔ Service

Un proyecto puede utilizar uno o varios Services y un Service puede
estar presente en múltiples Projects.

Conceptualmente:

``` text
Project ↔ Service = N:M
```

La implementación MVP puede simplificar esta relación si es necesario,
pero el dominio no debe impedirla.

## Project → Deliverable

``` text
Project
   └── Deliverables
```

## Project → Document

``` text
Project
   └── Documents
```

## Project → KnowledgeItem

``` text
Project
   └── KnowledgeItems
```

## Project → Asset

``` text
Project
   └── Assets
```

## Project → PortfolioItem

``` text
Project
   └── PortfolioItem
```

No todos los proyectos tienen que generar un elemento de portfolio.

## Decision → KnowledgeItem

Una Decision puede producir posteriormente un KnowledgeItem.

No son la misma entidad:

``` text
Decision
= qué decidimos

KnowledgeItem
= qué sabemos
```

Por tanto:

``` text
Decision
   │
   └── may_generate
           ↓
      KnowledgeItem
```

## Automation

Una Automation puede relacionarse con:

``` text
Application
Integration
Project
ChangeEvent
```

------------------------------------------------------------------------

# 23. Entidades deliberadamente NO añadidas al MVP

Para evitar que el dominio crezca sin control, se decidió explícitamente
no añadir estas entidades en la primera implementación:

### Lead

No se duplica el concepto de Lead del CRM.

Twenty continúa siendo la fuente de verdad comercial. Control Tower
sincroniza las entidades CRM necesarias.

### Comment

No se construye un sistema de comentarios/chat interno en el MVP.

### Offering

Concepto futuro para agrupar:

``` text
Service
Product
Package
```

Se mantiene como evolución posible, pero no es necesario para validar el
núcleo.

### Evidence

La evidencia de una Capability se puede representar inicialmente
mediante relaciones con:

-   Projects;
-   Assets;
-   PortfolioItems;
-   LearningItems.

No se crea una entidad independiente.

------------------------------------------------------------------------

# 24. Configurabilidad futura --- memoria explícita para fases posteriores

Estas funcionalidades forman parte de la visión del producto, pero **no
deben implementarse en el MVP**.

Deben conservarse como requisitos de evolución arquitectónica.

## 24.1 Custom Objects

Permitir que cada empresa cree objetos propios:

``` text
Equipment
Property
Supplier
Course
Product
Contract
Inventory
```

sin modificar el código del Core Domain.

## 24.2 Custom Fields

Tipos previstos:

-   Text
-   Number
-   Boolean
-   Date
-   DateTime
-   Currency
-   Email
-   URL
-   Select
-   MultiSelect
-   Relation
-   User
-   FileReference

## 24.3 Custom Relationships

Relaciones configurables entre objetos.

``` text
Object A
    ↓
Relationship
    ↓
Object B
```

## 24.4 Custom Pages

Páginas configurables por empresa.

## 24.5 Custom Views

Vistas configurables:

-   Table
-   Kanban
-   List
-   Calendar
-   Timeline

## 24.6 Custom Dashboards

Dashboards construidos mediante widgets configurables.

## 24.7 Custom Statuses

Estados configurables para objetos y procesos.

## 24.8 Custom Workflows

Automatizaciones configurables:

``` text
Trigger
↓
Condition
↓
Action
↓
Event
```

------------------------------------------------------------------------

# 25. Funcionalidades expresamente fuera del MVP

Esta lista debe conservarse como **MVP EXCLUSION LIST** y utilizarse
como referencia durante la implementación para evitar scope creep.

## Fuera del MVP --- Fase posterior

-   [ ] Custom Objects completos
-   [ ] Custom Fields completos
-   [ ] Custom Relationships completos
-   [ ] Custom Pages
-   [ ] Custom Views avanzadas
-   [ ] Custom Dashboards
-   [ ] Custom Statuses avanzados
-   [ ] Custom Workflows
-   [ ] Agente IA autónomo
-   [ ] RAG
-   [ ] Vector Database / vectorización
-   [ ] Memoria semántica avanzada
-   [ ] Portal completo para clientes
-   [ ] Sistema de billing/facturación
-   [ ] ERP
-   [ ] Contabilidad
-   [ ] Gestor de contraseñas/secrets
-   [ ] Sistema interno de comentarios/chat
-   [ ] Lead como entidad CRM propia
-   [ ] Offering como abstracción completa
-   [ ] Evidence como entidad propia
-   [ ] Automatización autónoma de la gestión del conocimiento
-   [ ] Motor de recomendación empresarial
-   [ ] Multi-tenant avanzado para terceros

### Nota arquitectónica

Que una funcionalidad esté fuera del MVP **no significa que deba
ignorarse durante el diseño técnico**.

La arquitectura debe evitar bloquear estas capacidades futuras, pero no
debe implementarlas prematuramente.

La regla es:

> **Design for extensibility, implement for validation.**

------------------------------------------------------------------------

# 26. Scope guard

Durante la implementación del MVP, cualquier nueva funcionalidad debe
clasificarse:

``` text
CORE MVP
    ↓
Necesaria para validar el producto

PHASE 2
    ↓
Importante pero no necesaria para validar el núcleo

PHASE 3+
    ↓
Visión futura / extensibilidad

OUT OF SCOPE
    ↓
No relacionada con el objetivo actual
```

No se añadirá una entidad, módulo o integración únicamente porque pueda
resultar útil algún día.

------------------------------------------------------------------------

# 27. Dominio congelado

A partir de la versión `1.0.0`, este documento se considera:

**FROZEN**

Esto significa:

-   las entidades principales están cerradas;
-   las relaciones principales están cerradas;
-   las responsabilidades están cerradas;
-   las fuentes de verdad están cerradas;
-   las invariantes están cerradas;
-   el MVP está delimitado;
-   las funcionalidades futuras están registradas.

Cualquier modificación posterior deberá registrarse como:

``` text
Architecture Decision Record
```

o como una propuesta de cambio de dominio.

No se modificará silenciosamente el modelo durante la implementación.

------------------------------------------------------------------------

# 28. Estado final de arquitectura

``` text
CONTROL_TOWER_SPEC.md
        │
        ▼
CONTROL_TOWER_DOMAIN_MODEL.md
        │
        │ 🔒 FROZEN v1.0
        ▼
CONTROL_TOWER_TECHNICAL_ARCHITECTURE.md
        │
        ▼
PHYSICAL DATA MODEL
        │
        ▼
WIREFRAMES / UX
        │
        ▼
STACK DECISION
        │
        ▼
MVP IMPLEMENTATION
```

## Criterio de congelación

El dominio se considera suficientemente estable cuando:

1.  representa la empresa actual;
2.  no contiene entidades específicas de un nicho;
3.  no duplica innecesariamente sistemas especializados;
4.  permite conectar CRM, conocimiento, documentos, código e
    infraestructura;
5.  permite gobernar proyectos y decisiones;
6.  permite capturar conocimiento y convertirlo en activos;
7.  permite construir dashboards ejecutivos;
8.  permite evolucionar hacia objetos configurables;
9.  no obliga a implementar IA, RAG o vectorización para validar el
    producto;
10. permite construir el MVP sin introducir complejidad prematura.

------------------------------------------------------------------------

# 29. Mensaje para la implementación con Claude

Cuando este documento se entregue al agente de implementación, debe
interpretarse de la siguiente manera:

> Este Domain Model es la definición de dominio congelada de Control
> Tower v1.0.
>
> Implementa primero el núcleo necesario para validar el producto.
>
> No implementes funcionalidades incluidas en la MVP EXCLUSION LIST.
>
> No introduzcas entidades nuevas para resolver problemas puntuales sin
> registrar primero la necesidad y evaluar su impacto sobre el dominio.
>
> Las funcionalidades futuras deben quedar arquitectónicamente
> desbloqueadas cuando sea razonable, pero no deben formar parte del
> MVP.
>
> Control Tower debe construirse como un producto configurable y
> extensible, no como una aplicación codificada específicamente para un
> nicho empresarial.

