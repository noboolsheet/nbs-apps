---
title: "Control Tower — Wireframes"
version: "1.0.0"
status: "DRAFT — Product Design Gate"
date: "2026-08-10"
project: "Control Tower"
document_type: "Wireframes"
---

# CONTROL TOWER — WIREFRAMES

> **Documento de diseño ORIGINAL (línea base, 2026-08-10).** Se conserva como referencia técnica/histórica; su cuerpo no se reescribe al evolucionar la implementación. Para el **estado actual** y las **desviaciones**, mandan `BUILD_LOG.md`, `FINDINGS_AND_DEFERRED.md`, `adr/` y `DECISIONS_FROZEN.md`. Índice en [`README.md`](./README.md).

## 0. Propósito
Convertir la Information Architecture aprobada en layouts funcionales concretos: pantallas, navegación, componentes, acciones, estados, filtros, relaciones, responsive behavior, empty states y errores.

No define todavía branding, colores finales, tipografía definitiva, CSS, React ni animaciones.

# 1. Design principles
- Control Tower, no dashboard decorativo.
- Desktop-first.
- Progressive disclosure.
- Entity-centric navigation.
- Actionability.
- Las fuentes externas se identifican claramente.

# 2. Global shell

```text
┌──────────────────┬───────────────────────────────────────────┐
│ CONTROL TOWER    │ Header: Breadcrumb / Search / User       │
│                  ├───────────────────────────────────────────┤
│ Home             │                                           │
│ Business         │ Main Content                               │
│ CRM              │                                           │
│ Projects         │                                           │
│ Knowledge        │                                           │
│ Automation       │                                           │
│                  │                                           │
│ Settings         │                                           │
│                  │                                           │
│ Search           │                                           │
│ + Create         │                                           │
└──────────────────┴───────────────────────────────────────────┘
```

Sidebar persistente y colapsable.

# 3. Global Search

Siempre accesible.

```text
┌─────────────────────────────────────────────────────┐
│ Search anything...                            ⌘K    │
└─────────────────────────────────────────────────────┘
```

Resultados agrupados por entidad con tipo, contexto, estado y relación.

Ejemplo:
```text
Projects
  Project Beta — Active · Client Beta
Clients
  Beta Company
Decisions
  Decision #14 · Landing architecture
Assets
  Beta Landing Template
```

# 4. Global Quick Create

```text
+ Create
├── New Client
├── New Opportunity
├── New Project
├── New Task
├── New Decision
└── Capture Knowledge
```

Debe heredar contexto cuando se abre desde una entidad.

# 5. HOME

```text
┌──────────────────────────────────────────────────────────────┐
│ Home                                      + Create           │
├──────────────────────────────────────────────────────────────┤
│ Executive Snapshot                                           │
│ [Clients] [Projects] [Opportunities] [Tasks] [Decisions]   │
├──────────────────────────────────────────────────────────────┤
│ ⚠ Attention Required                                        │
│ Project Beta — Deliverable awaiting review                  │
│ Project X — Task overdue                                    │
├──────────────────────────────┬───────────────────────────────┤
│ Active Projects              │ Today's Work                 │
│ Project Beta   65%           │ □ Review landing             │
│ Project X      40%           │ □ Send proposal              │
├──────────────────────────────┼───────────────────────────────┤
│ Recent Decisions             │ Knowledge Inbox              │
│ Decision #14                 │ 3 items awaiting review      │
├──────────────────────────────┴───────────────────────────────┤
│ Recent Activity                                               │
├──────────────────────────────────────────────────────────────┤
│ System Health                                                 │
└──────────────────────────────────────────────────────────────┘
```

Orden conceptual:
1. Executive Snapshot
2. Attention Required
3. Active Projects
4. Today's Work
5. Recent Decisions
6. Knowledge Inbox
7. Recent Activity
8. System Health

No gráficos decorativos en MVP.

# 6. BUSINESS

## Overview
Debe mostrar Strategic Areas, Goals, Capabilities y Services.

## Services list
```text
Services
[Search] [Filters] [+ New Service]

Name | Status | Type | Capabilities | Active Projects
```

## Service detail
```text
Service Name                         Edit
Status: READY
Description

Capabilities
[Capability A] [Capability B]

Active Projects
Project A
Project B

Assets / Templates
Template A
```

## Capabilities list
```text
Capability | Maturity | Status | Services | Learning Needs
```

## Goals list
```text
Goal | Strategic Area | Status | Priority | Target Date
```

# 7. CRM

## Clients list
```text
Clients                         + New Client
Search... | Status | Sort

Client | Status | Projects | Opportunities | Last Activity
```

## Client detail
```text
CRM / Clients / Client Beta

Client Beta                         Active
Industry / basic context

[Overview] [Contacts] [Opportunities] [Projects]
[Documents] [Activity]

Active Projects
Project Beta

Open Opportunities
Opportunity A

External CRM
[Open in CRM]
```

## Contacts
```text
Name | Client | Role | Email | Phone | Last Activity
```

## Opportunities
Kanban:
```text
Lead | Qualified | Proposal | Won
```
También tabla.

# 8. PROJECTS

## Collection
```text
Projects                         + New Project
Search | Status | Client | Service | Priority | Target

Project | Client | Service | Phase | Progress | Target | Risk
```

Tabs:
All / Active / At Risk / Blocked / Completed.

## Project detail
```text
Projects / Project Beta

Project Beta
Client Beta · Service: Website

Status: ACTIVE   Phase: Build   Progress: 65%
Target: 20 Aug  Priority: High

⚠ Attention
Client review pending

[Overview] [Tasks] [Deliverables] [Decisions]
[Documents] [Assets] [Activity]

Current Phase: Build
Current Task: Implement landing CTA
Next Milestone: Client review
```

## Tasks
```text
[+ New Task]
□ Implement CTA     High   Today
□ Test mobile       Med    Tomorrow
□ Client review     High   20 Aug
```
Vista Kanban opcional: To Do / In Progress / Blocked / Done.

## Deliverables
```text
Deliverable | Status | Due | Review | External Source
```

## Decisions
Lista de decisiones relacionadas y CTA `+ Record Decision`.

## Documents
Metadatos + fuente externa + `Open external`.

## Assets
Activos reutilizables relacionados.

## Activity
Timeline de cambios.

# 9. KNOWLEDGE

## Inbox
```text
Knowledge Inbox                         + Capture
New | Processing | Needs Review | Approved

Capture
"Decision about project architecture..."
Source: ChatGPT
[Review] [Classify]
```

## Review
```text
Review Knowledge Capture

Original Capture
[content]

Type [Decision ▼]
Related Project [Project Beta ▼]
Related Service [Website ▼]
Destination [Notion ▼]

[Approve] [Save Draft] [Discard]
```

Ciclo:
Captured → Processing → Needs Review → Approved → Linked → Canonical Source.

## Library
```text
Knowledge
[Search] [Type] [Project] [Service] [Status]

Knowledge Item | Type | Status | Related Project | Source | Updated
```

## Decision detail
Debe mostrar:
- título;
- estado;
- fecha;
- contexto;
- decisión;
- razón;
- relaciones;
- fuente;
- supersedes/superseded by.

## Assets
```text
Name | Type | Reusable | Source | Updated
```

# 10. AUTOMATION

## Integrations
```text
Notion        ● Healthy   Last sync: 5 min ago   [Open]
Google Drive  ● Healthy   Last sync: 12 min ago  [Open]
Twenty        ● Healthy   Last sync: 3 min ago   [Open]
```

## System Health
```text
Integrations  Healthy
Workers       Running
Outbox        3 pending
Jobs          0 failed / 2 processing
Recent Errors None
```

# 11. SETTINGS

Organization:
```text
Name
Description
Timezone
Default settings
```

MVP: current user. Future users, roles and permissions.

# 12. Entity creation

Forms deben ser cortos:
```text
Required
↓
Common optional
↓
Advanced
```

Ejemplo Project:
```text
Name *
Client *
Service
Status
Priority
Target date
Description
[Create Project]
```

# 13. Contextual creation

Desde Project Beta → New Task → `project_id = Beta`.

Desde Client Beta → New Project → `client_id = Beta`.

# 14. Empty states

Ejemplo:
```text
No active projects.

Start tracking work by creating your first project.

[Create Project]
```

Knowledge:
```text
Your knowledge inbox is empty.

Capture a decision, lesson or insight to start building
your organizational memory.

[Capture Knowledge]
```

# 15. Loading and errors

Usar skeletons para dashboard, tablas, detalle y timeline.

Error:
```text
Unable to load projects.
The server could not retrieve project data.
[Retry]
```

Integration:
```text
Notion sync failed.
Last successful sync: 10:42
[Retry Sync] [View Error]
```

# 16. Confirmations

Confirmar acciones destructivas:
- delete;
- archive;
- discard capture;
- disconnect integration.

No pedir confirmación excesiva para cambios reversibles.

# 17. Status design

Nunca depender exclusivamente del color.

Ejemplo:
```text
● ACTIVE
⚠ AT RISK
■ BLOCKED
✓ COMPLETED
```

# 18. Responsive behavior

Desktop: sidebar persistente.

Tablet: sidebar colapsable.

Mobile:
```text
Top bar
Content
Bottom navigation / More
```

Mobile primary navigation:
Home / Projects / Knowledge / Search / More.

Las tablas se convierten en cards.

# 19. Modal vs page

Modal/drawer:
- quick create;
- quick edit;
- quick capture;
- confirmación.

Full page:
- project detail;
- client detail;
- knowledge review;
- decision detail;
- formularios complejos.

# 20. Navigation targets

- Home → active project: ≤2 clics.
- Home → today's task: ≤2 clics.
- Home → pending decision: ≤2 clics.
- Search → entity: ≤1 selección.
- Project → related entity: ≤1 clic.

# 21. Accessibility

MVP:
- navegación por teclado;
- foco visible;
- botones semánticos;
- labels accesibles;
- contraste suficiente;
- estados no dependientes solo de color;
- diálogos accesibles;
- navegación predecible.

# 22. MVP screen inventory

1. Home
2. Business Overview
3. Services List
4. Service Detail
5. Capabilities List
6. Goals List
7. Clients List
8. Client Detail
9. Contacts List
10. Opportunities
11. Projects List
12. Project Detail
13. Project Tasks
14. Project Deliverables
15. Project Decisions
16. Project Documents
17. Project Assets
18. Project Activity
19. Knowledge Inbox
20. Knowledge Review
21. Knowledge Library
22. Decision Detail
23. Assets Library
24. Integrations
25. System Health
26. Organization Settings

# 23. Reusable UI components

```text
AppShell
Sidebar
Header
Breadcrumbs
GlobalSearch
QuickCreateMenu

MetricCard
AttentionItem
EntityTable
EntityCard
StatusBadge
PriorityBadge
FilterBar
Tabs
Pagination

Timeline
ActivityItem
EmptyState
ErrorState
LoadingSkeleton

EntityHeader
RelatedEntities
ExternalSourceLink

CreateForm
EditForm
ConfirmDialog

KnowledgeCapture
KnowledgeReview
```

# 24. Product boundaries

Fuera del MVP:
- AI Assistant
- RAG
- Vector search
- Custom objects/fields
- Custom dashboards
- Workflow builder
- Billing
- Financial BI
- Advanced marketing analytics
- Client Portal
- Multi-tenant administration

# 25. Acceptance criteria

### Panorama
Home comunica el estado de la empresa en 30–60 segundos.

### Actionability
Toda alerta tiene una siguiente acción clara.

### Context
Las páginas de entidad exponen sus relaciones relevantes.

### Knowledge
Una captura puede entrar rápidamente en Inbox y recorrer su ciclo.

### Search
Global Search localiza las entidades principales.

### External sources
Toda referencia externa identifica claramente su fuente.

### Consistency
Los componentes comunes tienen comportamiento consistente.

### Responsive
Los flujos principales funcionan en tablet y móvil.

### MVP discipline
Ninguna funcionalidad futura es necesaria para utilizar el núcleo del producto.

# 26. Design Gate

**STATUS: READY FOR VISUAL DESIGN / IMPLEMENTATION PLANNING**

Siguiente:
Visual language → Component system → Final stack confirmation → Implementation architecture → MVP development.

