---
title: "Control Tower — Stack Decision"
version: "1.0.0"
status: "FROZEN — Stack Decision"
date: "2026-08-10"
project: "Control Tower"
depends_on:
  - "CONTROL_TOWER_SPEC.md"
  - "CONTROL_TOWER_DOMAIN_MODEL.md v1.0.0 — FROZEN"
  - "CONTROL_TOWER_TECHNICAL_ARCHITECTURE.md v1.0.0 — FROZEN"
document_type: "Architecture Decision Record / Stack Selection"
---

# CONTROL TOWER — STACK DECISION

> **Documento de diseño ORIGINAL (línea base, 2026-08-10).** Se conserva como referencia técnica/histórica; su cuerpo no se reescribe al evolucionar la implementación. Para el **estado actual** y las **desviaciones**, mandan `BUILD_LOG.md`, `FINDINGS_AND_DEFERRED.md`, `adr/` y `DECISIONS_FROZEN.md`. Índice en [`README.md`](./README.md).

## 0. Propósito

Este documento selecciona el stack tecnológico oficial para implementar Control Tower.

La selección se realiza después de congelar:

1. la especificación funcional;
2. el Domain Model;
3. la Technical Architecture.

El objetivo no es seleccionar las tecnologías "más modernas", sino las que mejor equilibran:

- capacidad técnica;
- simplicidad;
- self-hosting;
- coste prácticamente cero;
- desarrollo asistido por IA;
- mantenibilidad por una sola persona;
- compatibilidad con Raspberry Pi/ARM64;
- facilidad de deployment;
- seguridad;
- capacidad de automatización;
- evolución futura hacia un producto configurable y potencialmente SaaS.

---

# 1. Decisión ejecutiva

## Stack oficial del MVP

| Capa | Decisión |
|---|---|
| Lenguaje principal | **TypeScript** |
| Runtime | **Node.js 24 LTS** |
| Web + API | **Next.js + App Router** |
| UI | **React** |
| Estilos | **Tailwind CSS** |
| Componentes UI | **shadcn/ui + Radix UI** cuando sea necesario |
| Validación | **Zod** |
| ORM / DB toolkit | **Drizzle ORM** |
| Base de datos | **PostgreSQL 18.x** |
| Autenticación | **Better Auth** |
| Background jobs | **Worker Node.js propio + PostgreSQL-backed jobs** |
| Eventos | **Transactional Outbox en PostgreSQL** |
| API | **REST mediante Next.js Route Handlers** |
| Documentación API | **OpenAPI**, generada/documentada cuando el API alcance estabilidad |
| Testing unitario | **Vitest** |
| Testing E2E | **Playwright** |
| Package manager | **pnpm** |
| Repositorio | **Git** |
| CI/CD | **GitHub Actions** |
| Contenedores | **Docker** |
| Orquestación inicial | **Docker Compose** |
| Reverse proxy / HTTPS | **Caddy** |
| Deployment objetivo | **Self-hosted Linux ARM64/x64** |
| Observabilidad MVP | **structured logs + health checks + audit log** |
| Secretos | **Environment variables / secret files fuera de Git** |
| Cache | **Ninguna inicialmente** |
| Redis | **NO en MVP** |
| Kafka/RabbitMQ | **NO en MVP** |
| Kubernetes | **NO en MVP** |
| Vector DB | **NO en MVP** |

---

# 2. Decisión arquitectónica principal

La aplicación se implementará como:

> **Modular Monolith TypeScript**

con varios procesos que comparten el mismo código de dominio:

```text
                         CONTROL TOWER
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ↓                               ↓
        Next.js Web/API                  Worker Node.js
              │                               │
              └───────────────┬───────────────┘
                              ↓
                         Domain Layer
                              │
                         Drizzle ORM
                              │
                         PostgreSQL
                              │
                 ┌────────────┼────────────┐
                 ↓            ↓            ↓
               Twenty       Notion        Git
```

No se crearán microservicios independientes para el MVP.

---

# 3. Por qué TypeScript

TypeScript es la decisión principal de lenguaje.

## Razones

### 3.1 Un solo lenguaje

Permite utilizar el mismo lenguaje para:

- frontend;
- API;
- domain;
- application services;
- integrations;
- worker;
- scripts;
- tests.

Esto reduce significativamente la carga cognitiva para una sola desarrolladora.

### 3.2 Compatibilidad con Next.js

Next.js es un framework React full-stack y permite construir la aplicación web y sus endpoints API dentro del mismo proyecto.

### 3.3 Compatibilidad con desarrollo asistido por IA

Un único lenguaje y una arquitectura modular hacen que Claude pueda razonar sobre una mayor parte del sistema sin tener que mantener simultáneamente dos ecosistemas principales.

### 3.4 Futuro

TypeScript no impide utilizar Python posteriormente para:

- agentes;
- pipelines de IA;
- procesamiento especializado;
- data science;
- servicios externos.

Pero esas necesidades no justifican introducir Python en el core del MVP.

---

# 4. Node.js 24 LTS

Se utilizará **Node.js 24 LTS**.

La versión LTS es preferible a utilizar la versión Current para producción. Node.js mantiene líneas LTS con soporte prolongado; la rama 24 está catalogada oficialmente como LTS. 

No se utilizará Node.js Current simplemente por ser más reciente.

La versión exacta de patch se fijará mediante:

- `package.json`;
- lockfile;
- imagen Docker.

El proyecto deberá actualizar periódicamente los patch releases de seguridad.

---

# 5. Next.js

## Decisión

**Next.js con App Router.**

## Responsabilidades

- UI;
- routing;
- server rendering cuando sea útil;
- Route Handlers para API;
- middleware/protecciones apropiadas;
- integración con autenticación;
- construcción del frontend.

Next.js se utilizará como **web application + API host**, no como sustituto de las capas Domain/Application.

La arquitectura interna seguirá siendo:

```text
Next.js
│
├── UI
├── API
├── Application
├── Domain
└── Infrastructure
```

No se permitirá que componentes React contengan reglas de negocio críticas.

---

# 6. API

## Decisión

REST sobre HTTP utilizando **Next.js Route Handlers**.

Ejemplo:

```text
GET    /api/v1/projects
GET    /api/v1/projects/:id
POST   /api/v1/projects
PATCH  /api/v1/projects/:id
POST   /api/v1/projects/:id/archive
```

## Principios

- `/api/v1`;
- DTOs explícitos;
- validación con Zod;
- errores estructurados;
- autorización antes de ejecutar acciones;
- domain/application services detrás del endpoint;
- ningún acceso directo desde UI a PostgreSQL.

## OpenAPI

La API deberá poder documentarse mediante OpenAPI.

No es necesario generar una infraestructura compleja de API management en MVP.

---

# 7. PostgreSQL

## Decisión

**PostgreSQL 18.x** como base de datos principal.

PostgreSQL 18 es una rama soportada oficialmente y el proyecto mantiene soporte de cada major durante cinco años. PostgreSQL también soporta arquitecturas ARM, relevantes para el self-hosting previsto. 

## Responsabilidades

PostgreSQL será la fuente de verdad física de Control Tower para:

- entidades del dominio;
- relaciones;
- estados;
- auditoría;
- outbox;
- jobs;
- configuración interna;
- external identities.

## No utilizar

No se añadirá otra base de datos para el MVP.

---

# 8. Drizzle ORM

## Decisión

**Drizzle ORM**.

Drizzle ofrece soporte nativo para PostgreSQL y trabaja con drivers como `node-postgres` y `postgres.js`. También proporciona herramientas para schema y migraciones. 

## Razones

- TypeScript-first;
- tipado fuerte;
- cercano a SQL;
- buen control sobre PostgreSQL;
- migrations explícitas;
- menor abstracción que ORMs más pesados;
- adecuado para un modelo relacional rico;
- buena compatibilidad con el objetivo de que la desarrolladora comprenda exactamente qué ocurre en la base de datos.

## Regla

Drizzle será infraestructura.

El Domain Layer no debe depender directamente de Drizzle.

```text
Domain
  ↑
Application
  ↑
Repository interfaces
  ↑
Drizzle implementation
```

---

# 9. Better Auth

## Decisión

**Better Auth** para autenticación y gestión de sesiones.

Better Auth es un framework de autenticación TypeScript que soporta email/password, sesiones, proveedores sociales y capacidades de organización/access control. También tiene integración con PostgreSQL y Drizzle. 

## MVP

Utilizar inicialmente:

- email/password;
- sesiones;
- recuperación de cuenta cuando sea necesaria;
- protección de rutas;
- organización básica.

No activar inicialmente todos los plugins.

## Futuro

Podrá ampliarse a:

- Google OAuth;
- GitHub OAuth;
- passkeys;
- 2FA;
- organizaciones;
- SSO;
- otras capacidades.

No deben añadirse hasta que exista una necesidad real.

---

# 10. Tailwind CSS

## Decisión

**Tailwind CSS** para estilos.

Razones:

- desarrollo rápido;
- consistencia;
- integración natural con React/Next.js;
- facilidad para que Claude produzca y modifique interfaces;
- no requiere un sistema CSS propietario.

No crear una capa de diseño compleja antes de validar el producto.

---

# 11. shadcn/ui + Radix UI

Se utilizará **shadcn/ui** como base de componentes reutilizables cuando sea apropiado.

Objetivo:

```text
Button
Dialog
Dropdown
Table
Tabs
Form
Command
Popover
Tooltip
...
```

No se construirá desde cero cada componente de interfaz.

Los componentes deberán poder adaptarse al sistema visual de Control Tower.

La librería no debe determinar el Domain Model ni la arquitectura.

---

# 12. Validación con Zod

## Decisión

**Zod** para validación de datos en boundaries.

Aplicaciones:

```text
HTTP request
Webhook payload
External API payload
Form input
Environment configuration
```

Ejemplo conceptual:

```text
External/Input
      ↓
Zod validation
      ↓
DTO
      ↓
Application
      ↓
Domain
```

No utilizar validación solamente en frontend.

---

# 13. Background Worker

## Decisión

Un **worker Node.js separado**, dentro del mismo repositorio y utilizando los mismos packages de dominio/aplicación.

```text
apps/
├── web
└── worker
```

## Responsabilidades

- sincronizaciones;
- retries;
- outbox processing;
- jobs programados;
- procesamiento de webhooks;
- tareas largas;
- generación de datos derivados.

## No introducir

No Redis.

No BullMQ.

No RabbitMQ.

No Kafka.

La cola inicial será persistida en PostgreSQL.

---

# 14. PostgreSQL-backed Job Queue

Los jobs tendrán conceptualmente:

```text
id
type
payload
status
attempts
available_at
locked_at
completed_at
failed_at
error
created_at
```

Flujo:

```text
Job created
    ↓
PENDING
    ↓
Worker claims job
    ↓
PROCESSING
    ↓
COMPLETED
```

o:

```text
PROCESSING
    ↓
FAILED
    ↓
RETRY
```

Debe utilizarse locking/transacciones apropiadas para evitar que dos workers procesen el mismo job simultáneamente.

---

# 15. Transactional Outbox

La implementación será mediante PostgreSQL.

```text
BEGIN
  update entity
  insert outbox event
COMMIT
```

Después:

```text
Worker
  ↓
Outbox
  ↓
Handler
```

La arquitectura no utilizará Event Sourcing.

---

# 16. Cache

## Decisión

**No cache externo en MVP.**

No Redis.

No Memcached.

No CDN como requisito de arquitectura interna.

PostgreSQL + índices + paginación deberán ser suficientes para el volumen inicial.

Si posteriormente aparecen problemas reales:

```text
performance evidence
        ↓
profiling
        ↓
cache decision
```

Nunca introducir cache simplemente por anticipación.

---

# 17. Package manager

## Decisión

**pnpm**

Razones:

- workspace support;
- eficiencia de almacenamiento;
- lockfile;
- buen soporte para monorepos;
- adecuado para separar `web`, `worker` y packages compartidos.

---

# 18. Estructura de repositorio

Propuesta:

```text
control-tower/
│
├── apps/
│   ├── web/
│   └── worker/
│
├── packages/
│   ├── domain/
│   ├── application/
│   ├── db/
│   ├── integrations/
│   ├── validation/
│   └── shared/
│
├── infrastructure/
│   ├── docker/
│   ├── caddy/
│   └── scripts/
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── docs/
│
├── compose.yml
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

La estructura podrá ajustarse durante implementación si una decisión concreta del framework lo requiere, pero debe conservar la separación conceptual.

---

# 19. Domain package

`packages/domain`

Debe contener:

- entities;
- value objects;
- domain rules;
- state transitions;
- domain events;
- domain errors.

No puede importar:

- Next.js;
- React;
- Drizzle;
- Better Auth;
- APIs externas.

---

# 20. Application package

`packages/application`

Debe contener:

- commands;
- queries;
- use cases;
- context services;
- orchestration;
- authorization policies;
- transaction boundaries cuando corresponda.

Ejemplos:

```text
CreateProject
UpdateProject
ArchiveProject
CreateDecision
CaptureKnowledge
GetProjectContext
SyncClientFromTwenty
```

---

# 21. Database package

`packages/db`

Contendrá:

- Drizzle schema;
- repositories;
- migrations;
- DB connection;
- persistence adapters.

No debe contener reglas de negocio.

---

# 22. Integrations package

`packages/integrations`

Inicialmente:

```text
Twenty
Notion
Git
```

Posteriormente:

```text
Google Calendar
Google Drive
n8n
```

Cada adapter debe respetar interfaces internas.

Ejemplo conceptual:

```text
TwentyAdapter
├── connect
├── healthCheck
├── pull
├── handleWebhook
└── map
```

---

# 23. Testing

## Unit

**Vitest**

Para:

- domain rules;
- state transitions;
- application services;
- pure functions.

## Integration

Vitest + PostgreSQL de test.

Para:

- repositories;
- transactions;
- API/application integration;
- jobs.

## E2E

**Playwright**.

Playwright proporciona testing E2E para aplicaciones web modernas y permite ejecutar pruebas en Chromium, Firefox y WebKit, además de funcionar en CI. 

Flujos iniciales:

```text
login
create client
create project
update project
create decision
capture knowledge
search
sync CRM
```

---

# 24. Git

## Decisión

Git será el sistema de control de versiones.

Repositorio remoto:

**GitHub** inicialmente.

Razones:

- integración sencilla con CI;
- colaboración futura;
- issues;
- pull requests;
- Actions;
- ecosistema.

El repositorio será privado mientras el producto no deba ser público.

---

# 25. CI/CD

## Decisión

**GitHub Actions**.

Pipeline inicial:

```text
Push / Pull Request
        ↓
Install
        ↓
Lint
        ↓
Typecheck
        ↓
Unit Tests
        ↓
Build
        ↓
E2E crítico
```

El deployment productivo puede ser manual inicialmente:

```text
approved release
        ↓
deploy
```

Automatizar deployment posteriormente.

---

# 26. Docker

## Decisión

**Docker + Docker Compose**

Docker Compose permite definir y ejecutar aplicaciones multi-contenedor mediante un archivo Compose, incluyendo servicios, redes y volúmenes. 

## Servicios iniciales

```text
caddy
web
worker
postgres
```

No añadir servicios sin necesidad.

---

# 27. Caddy

## Decisión

**Caddy** como reverse proxy/HTTPS cuando Control Tower se publique con dominio.

Caddy puede actuar como reverse proxy y gestionar HTTPS automáticamente cuando el dominio es públicamente accesible. 

Ejemplo conceptual:

```text
Internet
   ↓
Caddy :443
   ↓
Next.js
```

Para desarrollo local no es necesario.

---

# 28. Deployment

## MVP

Self-hosted Linux.

Objetivos:

- ARM64;
- x86_64;
- Docker;
- Docker Compose.

Esto permite utilizar:

- Raspberry Pi;
- servidor doméstico;
- VPS barato;
- servidor dedicado posterior.

No se acoplará el producto a un proveedor cloud.

---

# 29. Raspberry Pi

La Raspberry Pi puede ser entorno válido para:

- desarrollo;
- staging;
- primer deployment personal;
- laboratorio.

Pero la arquitectura no asumirá que producción futura debe permanecer en Raspberry Pi.

El producto deberá poder migrarse a:

```text
Raspberry Pi
→ VPS
→ Dedicated Server
→ Cloud
```

sin cambiar el dominio.

---

# 30. Storage

## MVP

No habrá object storage externo obligatorio.

Para documentos y archivos grandes:

```text
Control Tower
    ↓
external reference
    ↓
Google Drive / Git / filesystem según caso
```

La base de datos almacena metadata y referencias.

Si posteriormente se necesita almacenamiento propio:

```text
S3-compatible object storage
```

podrá incorporarse.

No introducir MinIO en MVP sin necesidad.

---

# 31. Search

## MVP

PostgreSQL Full-Text Search / búsqueda textual según necesidad.

Índices adecuados.

Filtros estructurados.

## Futuro

Podrá añadirse:

```text
semantic search
embeddings
vector index
RAG
```

pero solamente después de demostrar una necesidad real.

---

# 32. AI / Agents

No se incorpora un framework de agentes al core.

La arquitectura deja preparada una futura:

```text
Agent Layer
```

que utilizará:

```text
Agent
 ↓
Context Service
 ↓
API
 ↓
Application
 ↓
Domain
```

Un agente no tendrá acceso directo a:

```text
PostgreSQL
filesystem
secrets
external APIs
```

sin pasar por los mecanismos de integración y autorización.

---

# 33. Python

Python no forma parte del stack core del MVP.

Podrá introducirse posteriormente para:

- agentes;
- RAG;
- procesamiento documental;
- pipelines ML;
- automatizaciones específicas.

La razón para no introducirlo ahora es reducir:

```text
lenguajes
runtimes
dependencias
deployments
```

mientras el producto todavía está validándose.

---

# 34. Seguridad

## Principios

- HTTPS en producción;
- secrets fuera de Git;
- environment variables protegidas;
- password hashing gestionado por Better Auth;
- sesiones seguras;
- autorización server-side;
- validación de inputs;
- protección de webhooks;
- logs sin secretos;
- backups protegidos.

## Nunca

```text
API keys en frontend
passwords en DB de dominio
tokens en logs
.env en Git
external secrets en markdown
```

---

# 35. Configuration

Configuración mediante environment variables:

```text
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
APP_URL
TWENTY_API_URL
TWENTY_API_KEY
NOTION_API_KEY
...
```

Los nombres exactos podrán cambiar según las integraciones.

Secrets reales nunca se documentan en repositorio.

Se mantendrá un `.env.example` sin valores secretos.

---

# 36. Observabilidad

## MVP

### Structured logging

Formato JSON o equivalente estructurado.

Campos mínimos:

```text
timestamp
level
service
request_id
event
metadata
```

### Health

```text
/health
```

y comprobaciones internas de:

```text
database
worker
integrations
```

### Audit

El dominio mantiene `AuditLog`.

No se necesita inicialmente un stack completo tipo Prometheus/Grafana/Loki.

---

# 37. Backups

PostgreSQL debe disponer de:

- backup automático;
- retención;
- almacenamiento separado cuando sea posible;
- prueba periódica de restauración.

El deployment debe permitir reconstruir la aplicación desde:

```text
Git
+
environment configuration
+
database backup
```

---

# 38. Versionado de dependencias

Principios:

- lockfile obligatorio;
- actualizaciones controladas;
- no actualizar major automáticamente en producción;
- patch/security updates periódicos;
- revisión de breaking changes antes de majors.

El stack debe permanecer reproducible.

---

# 39. Decisiones descartadas

## FastAPI + Python como backend principal

### Ventajas

- excelente ecosistema Python;
- natural para IA;
- muy buena API;
- familiar para muchos proyectos de automatización.

### Motivo de descarte para MVP

Introduce:

```text
Python backend
+
TypeScript frontend
```

cuando todavía no existe una necesidad que justifique dos lenguajes.

Python queda reservado para futuros componentes de IA si aportan valor.

---

## NestJS como backend separado

### Ventajas

- arquitectura TypeScript;
- modularidad;
- dependency injection;
- API backend estructurada.

### Motivo de descarte

Duplicaría parte de lo que Next.js ya puede proporcionar y obligaría a mantener:

```text
Next.js
+
NestJS
```

como dos aplicaciones principales.

Para el MVP el coste operacional no está justificado.

---

## Prisma

### Ventajas

- ecosistema maduro;
- buen DX;
- fuerte tipado.

### Motivo de descarte

Para este proyecto preferimos un toolkit más cercano a SQL y con menor abstracción sobre PostgreSQL.

---

## Redis

### Motivo de descarte

No existe todavía una necesidad real de:

- cache;
- distributed queue;
- pub/sub.

PostgreSQL puede cubrir el job queue inicial.

---

## Kafka / RabbitMQ

Excesivos para:

- una empresa de una persona;
- un único deployment;
- bajo volumen;
- MVP.

---

## Kubernetes

No necesario.

Docker Compose resuelve el deployment inicial.

---

## Supabase como backend completo

No se selecciona como dependencia principal porque el objetivo arquitectónico es mantener:

```text
Control Tower
+
PostgreSQL
+
self-hosted
```

sin depender de una plataforma externa.

Supabase podría considerarse para una evolución futura si las necesidades del producto lo justificasen, pero no forma parte del MVP.

---

# 40. Coste esperado

El stack seleccionado está compuesto mayoritariamente por software open source.

Coste de software:

```text
≈ 0 €
```

cuando se ejecuta sobre infraestructura propia.

Costes posibles posteriores:

- dominio;
- electricidad;
- VPS;
- backups externos;
- email transaccional;
- servicios de IA;
- almacenamiento externo.

Estos costes no son requisitos del MVP.

---

# 41. Matriz de decisión

Puntuación conceptual:

| Criterio | TS + Next.js | Next + FastAPI | Next + NestJS |
|---|---:|---:|---:|
| Simplicidad para una persona | **5** | 3 | 4 |
| Un solo lenguaje | **5** | 2 | **5** |
| Self-hosting | **5** | **5** | **5** |
| Coste | **5** | **5** | **5** |
| Desarrollo asistido por IA | **5** | 4 | **5** |
| Ecosistema web | **5** | 4 | 4 |
| Futuro AI | 4 | **5** | 4 |
| Arquitectura modular | **5** | **5** | **5** |
| Operación | **5** | 3 | 4 |
| Adecuación MVP | **5** | 4 | 4 |

Conclusión:

> **TypeScript + Next.js obtiene el mejor equilibrio global para este producto en su etapa actual.**

---

# 42. Reglas de implementación derivadas del stack

Claude deberá respetar:

1. TypeScript estricto.
2. No usar `any` salvo excepción justificada.
3. Domain independiente de frameworks.
4. UI no accede directamente a DB.
5. Drizzle solo en persistence.
6. Integraciones detrás de adapters.
7. Validación en boundaries.
8. Jobs largos fuera de HTTP requests.
9. Todos los cambios relevantes deben poder auditarse.
10. Migrations versionadas.
11. Tests para reglas de dominio.
12. E2E para flujos críticos.
13. Secrets fuera del repositorio.
14. No introducir infraestructura adicional sin ADR/decisión explícita.
15. No crear microservicios durante MVP.
16. No introducir Redis/vector DB/colas externas sin necesidad demostrada.
17. No introducir Python en core sin una decisión arquitectónica posterior.
18. No acoplar el dominio a Twenty.
19. No acoplar el dominio a Notion.
20. Mantener preparada la futura API para agentes.

---

# 43. Definition of Done — Stack

El stack se considera decidido cuando:

- [x] lenguaje definido;
- [x] runtime definido;
- [x] framework web definido;
- [x] API definida;
- [x] DB definida;
- [x] ORM definido;
- [x] auth definida;
- [x] jobs definidos;
- [x] eventos definidos;
- [x] testing definido;
- [x] deployment definido;
- [x] containerización definida;
- [x] reverse proxy definido;
- [x] CI/CD definido;
- [x] observabilidad inicial definida;
- [x] secrets strategy definida;
- [x] search inicial definida;
- [x] estrategia de IA futura definida;
- [x] tecnologías descartadas documentadas.

---

# 44. Gate para el siguiente paso

**STATUS: READY FOR PHYSICAL DATA MODEL**

El stack está suficientemente definido para diseñar el modelo físico.

La siguiente especificación será:

```text
CONTROL_TOWER_PHYSICAL_DATA_MODEL.md
```

Debe convertir:

```text
Domain Model
+
Technical Architecture
+
Stack Decision
```

en:

```text
PostgreSQL schema
```

incluyendo:

- tablas;
- columnas;
- tipos;
- PK;
- FK;
- índices;
- constraints;
- enums;
- cardinalidades;
- timestamps;
- archive/delete;
- organization boundaries;
- external identities;
- outbox;
- jobs;
- audit;
- migrations.

No debe introducir nuevas entidades de dominio salvo que una necesidad técnica inevitable lo requiera; cualquier excepción deberá documentarse.

---

# 45. Regla final

> **El stack debe desaparecer detrás del producto.**

La persona usuaria debe percibir:

```text
Control Tower
```

no:

```text
Next.js
Drizzle
PostgreSQL
Docker
```

La tecnología es infraestructura para hacer posible el sistema, no el sistema en sí.

