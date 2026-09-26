# Control Tower — Backlog de automatizaciones propuestas

> Catálogo **vivo** de automatizaciones candidatas para implementar con el tiempo, tanto **internas** (dentro de
> los propios procesos de CT) como **con las apps conectadas** (Twenty, Notion, GitHub, Google Drive, Google
> Calendar). No es un plan comprometido: es un inventario para **decidir después** qué merece la pena, priorizado
> por impacto/esfuerzo. Cada ítem se ancla a la arquitectura real para que sea directamente implementable.
> **§1 lista lo que YA está activo** (`ACT-*`) para no re-proponerlo; el resto son propuestas (`AUT-*`).
>
> Convención de estado: ⬜ propuesta · 🚧 en curso · ✅ hecha. Impacto: Alto/Medio/Bajo. Esfuerzo: S/M/L.

---

## 0. Cómo funciona la automatización en CT (base para todo lo de abajo)

Tres motores, todos **de código** (ERRATA-009: no hay constructor visual):

1. **Por evento — Outbox transaccional.** Un comando emite `emitOutbox(tx, { eventType, aggregateType,
   aggregateId, payload })` **en la misma transacción** que el cambio; el worker drena el Outbox cada tick
   (`dispatchOutboxOnce`) y ejecuta el handler registrado en `outboxRegistry` (`apps/worker/src/index.ts`).
   Reintentos con backoff, idempotente. **Referencia: `opportunity.won` → `createProjectFromWonOpportunity`.**
   - Hoy solo se emiten **2 eventos**: `opportunity.won` (con handler) y `project.status_changed` (sin handler
     → solo se loguea). **El resto de transiciones de estado aún no emiten evento** → son el terreno libre.
2. **Programado — tick del worker.** Bloques temporizados en `tick()` (como el barrido de retención y el
   scheduler de sync). Añadir una automatización periódica = un bloque `if (now - lastX >= INTERVAL) {…}` o un
   `enqueueJob` + handler en `jobRegistry`.
3. **Por integración — hooks del sync.** En el bucle de cada `sync-*.ts`, las ramas `created`/`updated` son el
   punto donde enganchar "registro externo nuevo/cambiado → emitir evento". El **Inbox por webhook**
   (`/api/v1/inbox/webhook/[channelId]`) es la vía de entrada para sistemas externos (n8n/ChatGPT/email).

**Guardarraíles (obligatorios en toda automatización):**
- **Idempotencia** (re-ejecutar no duplica; comprobar antes de crear, como hace `createProjectFromWonOpportunity`).
- **Sin bucles**: el sync corre como actor `SYSTEM`; los push a Notion/Twenty se suprimen para `userId:'system'`.
  Una automatización disparada por sync debe emitir un **evento propio**, no reusar los push helpers.
- **Propiedad por campo** (no pisar al dueño del dato) y **NUNCA secretos** en DB/Notion.

---

## 1. Automatizaciones ya ACTIVAS (referencia — NO re-proponer)

Lo que ya corre sobre los motores de §0. Úsalo para no duplicar.

| ID | Automatización | Disparo | Qué hace | Dónde vive |
|---|---|---|---|---|
| ACT-1 | **Oportunidad WON → Proyecto** | evento `opportunity.won` | Crea el proyecto (idempotente, hereda nombre/cliente) | `automations/createProjectFromWonOpportunity`, emitido en `crm/commands.ts` |
| ACT-2 | **Push en tiempo real a Notion** | un USER edita una entidad espejo → `recordAudit` encola `notion.push` | Empuja las propiedades gestionadas a su fila de Notion (10 entidades) | `audit/index` + handler `notion.push` |
| ACT-3 | **Write-back a Twenty** | un USER edita client/contact/opportunity → `twenty.push` | PATCH de los campos gestionados a Twenty (solo existentes) | `push-twenty` + handler `twenty.push` |
| ACT-4 | **Sync programado de integraciones** | 1×/día a `SYNC_DAILY_HOUR` (7am, tz de la org) | Encola el sync de cada integración conectada (dedupe) | `maintenance/scheduler` + tick |
| ACT-5 | **Barrido de retención** | ~cada hora | Purga tareas completadas antiguas (`settings.completedTaskRetentionDays`) | `maintenance/retention` + tick |
| ACT-6 | **Sync Twenty** | job `integration.twenty.sync` | Pull company/person/opportunity/task + write-back | `sync-twenty` |
| ACT-7 | **Sync Notion** | job `integration.notion.sync` | Pull tipado + push propiedad-por-campo (10 DBs) | `sync-notion-entity` |
| ACT-8 | **Sync GitHub** | job `integration.github.sync` | Repos → assets (referencia) | `sync-git` |
| ACT-9 | **Sync Google Drive** | job `integration.gdrive.sync` | Ficheros recursivo → documents + **reconcilia borrados** | `sync-drive` |
| ACT-10 | **Sync Google Calendar** | job `integration.gcalendar.sync` | Eventos de hoy → `calendar_events` + **reconcilia borrados** | `sync-calendar` |
| ACT-11 | **Captura del Inbox por webhook** | POST externo con token de canal | Crea entrada en knowledge_inbox (n8n/ChatGPT/email…) | `inbox-channels` + webhook route |
| ACT-12 | **Auto-archivado de oportunidades cerradas** | 1×/día | Archiva las de la columna «Cerradas» (`LOST`/`ONBOARDED`) ~7 días después de cerrarse (las **ganadas no**). Sólo afecta a CT: en Twenty no cambia nada | `maintenance/retention` (`runOpportunityArchiveSweep`) |
| ACT-13 | **Purga de la bandeja procesada** | 1×/día | Borra las capturas ya procesadas/descartadas según la política | `runInboxPurgeSweep` |
| ACT-14 | **Purga de archivados** | 1×/día | Borra definitivamente lo archivado que supera `settings.archivedRetentionDays` | `runArchivedPurgeSweep` |
| ACT-15 | **Purga del historial de syncs** (F-16) | 1×/día | Conserva los 50 runs más recientes por proveedor | `runSyncRunsPurgeSweep` |

> **Gancho listo pero sin usar:** `project.status_changed` **se emite** en cada cambio de estado de proyecto pero
> **no tiene handler** (solo se loguea) → aún no es una automatización; es el enganche natural para AUT-06/07/09/10/17.
> Los guardarraíles anti-bucle (USER/SYSTEM), el audit log, los `change_events`, el **reaper** de jobs/outbox colgados y
> el **watchdog** del worker son **infraestructura de robustez**, no automatizaciones de producto.

---

## 2. Habilitadores transversales (prerequisitos que desbloquean muchas automatizaciones)

| ID | Habilitador | Por qué | Imp·Esf |
|---|---|---|---|
| **HAB-1** | **Canal de notificación de salida.** ⚑ **Canal elegido: bot de Telegram** (owner, 2026-09-01) — un POST HTTP con token + chat_id, sin SMTP ni entregabilidad, y llega al móvil aunque estés fuera de Tailscale. **NO implementado todavía** (el owner lo aparca a propósito): hoy NO existe ningún sink de notificación a humano. | Prerrequisito de casi todo "avísame/recuérdame/resume". Encaja como un **adapter de integración** + un `eventType` `notify.*` + handler en `outboxRegistry`. | Alto·M |
| **HAB-2** | **Emitir Outbox en cada transición de estado** (generalizar la emisión más allá de los 2 eventos actuales). | Convierte cada cambio de estado en un punto de enganche reutilizable para automatizaciones. | Alto·S |
| **HAB-3** | **Plantillas de proyecto/servicio** (fases/tareas/entregables por defecto al crear proyecto según su servicio). | Base de varias automatizaciones de bootstrap. | Medio·M |
| **HAB-4** | **Auto-vinculación por convención de nombres** (carpeta de Drive / evento de Calendar → cliente/proyecto por slug). | Base para enlazar documentos y eventos a su entidad sin intervención manual. | Medio·M |

---

## 3. Automatizaciones internas por evento (transiciones de estado dentro de CT)

### CRM (Clientes / Contactos / Oportunidades)
| ID | Disparo → Acción | Sistemas | Prereq | Imp·Esf |
|---|---|---|---|---|
| AUT-01 | ✅ **oportunidad → WON** → crear proyecto. **YA ACTIVA (ver ACT-1)** — se deja como referencia del patrón. | CT | — | — |
| AUT-02 | oportunidad → WON → **bootstrap completo**: carpeta en Drive + página de proyecto en Notion + (opcional) repo en GitHub + tareas de kickoff. | CT·Drive·Notion·GitHub | HAB-3 | Alto·L |
| AUT-03 | oportunidad → PREPARING_PROP → crear tarea "enviar propuesta" + recordatorio; enlazar la propuesta desde Drive. | CT·Drive | HAB-1 | Medio·S |
| AUT-04 | oportunidad → LOST → **post-mortem**: crear una nota/decisión DRAFT "motivo de pérdida" para capturar el aprendizaje. | CT | — | Medio·S |
| AUT-05 | **cliente creado** → checklist de onboarding (tareas por defecto) + carpeta Drive + página Notion. | CT·Drive·Notion | HAB-3 | Medio·M |

### Proyectos / Tareas / Entregables
| ID | Disparo → Acción | Sistemas | Prereq | Imp·Esf |
|---|---|---|---|---|
| AUT-06 | **proyecto → DELIVERED/CLOSED** → disparar el "flywheel": crear decisión DRAFT de **retrospectiva** + capturas de **lecciones** (knowledge inbox) + `portfolio_item` CANDIDATE. | CT | HAB-2 | Alto·M |
| AUT-07 | proyecto → BLOCKED/WAITING → marcar atención + **notificar**. | CT | HAB-1,HAB-2 | Medio·S |
| AUT-08 | **tarea vencida** → escalar prioridad automáticamente y/o **notificar** (el Home ya las lista; falta el aviso). | CT | HAB-1 | Alto·S |
| AUT-09 | **tarea DONE** y era la última activa de su fase → **avanzar `current_phase`** del proyecto. | CT | HAB-2 | Medio·M |
| AUT-10 | **todos los entregables APPROVED/DELIVERED** → sugerir pasar el proyecto a REVIEW/DELIVERED. | CT | HAB-2 | Medio·S |
| AUT-11 | entregable → REVIEW → crear tarea de revisión / notificar. | CT | HAB-1,HAB-2 | Bajo·S |

### Conocimiento / Decisiones (y el ciclo aprender→documentar→estandarizar)
| ID | Disparo → Acción | Sistemas | Prereq | Imp·Esf |
|---|---|---|---|---|
| AUT-12 | **captura en Inbox (webhook) NEW** → pipeline: clasificación preliminar + sugerencia de enlaces → PROCESSING. *(hoy la captura termina ahí)* | CT·(IA) | HAB-2 | Alto·M |
| AUT-13 | **knowledge_item APPROVED** repetido/patrón → sugerir crear **plantilla/asset** reutilizable (paso "conocimiento → plantilla → servicio"). | CT | — | Medio·M |
| AUT-14 | decisión DRAFT→REVIEW → notificar revisor; APPROVED → (ya espeja a Notion) enlazar a su proyecto. | CT·Notion | HAB-1 | Bajo·S |
| AUT-15 | **learning_item COMPLETED** → sugerir subir la **madurez de la capacidad** relacionada (ciclo skill→capability). | CT | HAB-2 | Medio·S |
| AUT-16 | **capacidad → AVAILABLE** → sugerir vincularla a un **servicio** ofertable. | CT | — | Bajo·S |

### Portfolio
| ID | Disparo → Acción | Sistemas | Prereq | Imp·Esf |
|---|---|---|---|---|
| AUT-17 | proyecto DELIVERED → `portfolio_item` CANDIDATE auto-creado (borrador) con enlace al proyecto. *(complementa AUT-06)* | CT | HAB-2 | Medio·S |

---

## 4. Automatizaciones programadas (tick del worker / scheduler)

| ID | Cadencia → Acción | Sistemas | Prereq | Imp·Esf |
|---|---|---|---|---|
| AUT-18 | **Briefing diario** (cada mañana): eventos de hoy + tareas de hoy + vencidas + atención + capturas por procesar → al canal de notificación (o página digest en Notion). | CT·Calendar·Notion | HAB-1 | Alto·M |
| AUT-19 | **Barrido de vencidas** (diario): escalar y/o notificar las tareas vencidas. *(complementa AUT-08)* | CT | HAB-1 | Alto·S |
| AUT-20 | **Oportunidad/proyecto estancado** (sin cambios en N días) → recordatorio. | CT | HAB-1 | Medio·S |
| AUT-21 | **Revisión semanal** generada (salud de proyectos, decisiones pendientes, KPIs) → digest/Notion. | CT·Notion | HAB-1 | Medio·M |
| AUT-22 | **Alerta de salud de integración**: si un sync pasa a ERROR → notificar (hoy solo se ve en Automation › Health). | CT·(integr.) | HAB-1 | Alto·S |
| AUT-23 | **Recordatorio de backup / verificación de restore** (M18). | Infra | HAB-1 | Medio·S |
| AUT-24 | ✅ **HECHO** — el barrido ya no es solo de tareas completadas: cubre **archivados** (`archivedRetentionDays`), **bandeja procesada** y **historial de syncs** (ver ACT-13/14/15). | CT | — | — |

---

## 5. Automatizaciones con apps conectadas (integraciones)

| ID | Disparo → Acción | Sistemas | Prereq | Imp·Esf |
|---|---|---|---|---|
| AUT-25 | **Google Drive**: fichero nuevo dentro de la carpeta de un cliente/proyecto → **auto-enlazar** el documento a ese cliente/proyecto (por convención de nombres). | Drive·CT | HAB-4 | Alto·M |
| AUT-26 | **Google Drive**: fichero en una carpeta "Inbox" → **capturar** al knowledge inbox. | Drive·CT | HAB-2 | Medio·S |
| AUT-27 | **Google Calendar**: evento con nombre de cliente/proyecto → enlazar + **surfacing de contexto** al abrir el día; reunión terminada → crear **tarea de seguimiento** + solicitar notas/decisión. | Calendar·CT | HAB-4 | Alto·M |
| AUT-28 | **GitHub**: release/tag nuevo → subir **versión del asset** + crear knowledge_item de changelog; issue etiquetada → crear tarea en CT; PR mergeado → registrar actividad del proyecto. | GitHub·CT | HAB-2 | Medio·M |
| AUT-29 | **Notion**: página en una DB de "peticiones" (o checkbox) → crear **tarea/knowledge** en CT (Notion como entrada, no solo espejo). | Notion·CT | HAB-2 | Medio·M |
| AUT-30 | **Twenty**: enriquecimiento de contactos. *(El **sync bidireccional de tareas** que incluía este ítem queda ❌ **descartado** el 2026-09-26: decisión del owner, no se crean tareas en Twenty — ver F-18.)* | Twenty·CT | — | Medio·M |
| AUT-31 | **Inbox pipeline** (n8n/ChatGPT/Claude/email → webhook): captura → **auto-clasificación** → knowledge_item → sugerencia de relaciones. *(usa AUT-12)* | Externo·CT·(IA) | HAB-2 | Alto·M |
| AUT-32 | **Cross-app kickoff** al ganar una oportunidad (= AUT-02 detallado): Drive + Notion + GitHub + tareas, todo idempotente y trazado en audit. | Twenty·Drive·Notion·GitHub·CT | HAB-3 | Alto·L |

---

## 6. Automatizaciones asistidas por IA (Fase 2+, anotadas para después)

Fuera del MVP (AI/RAG/vector es Fase 2 según el roadmap), pero encajan sobre los mismos motores:

| ID | Idea | Notas |
|---|---|---|
| AUT-33 | **Auto-clasificación del Inbox** + sugerencia de tipo/relaciones (el flujo captura→clasificar→enlazar del doc de Notion). | Motor de AUT-12/31 + un modelo. |
| AUT-34 | **Notas de reunión → extracción de decisión/conocimiento** (desde Calendar + notas). | Requiere fuente de notas. |
| AUT-35 | **Resumen semanal narrativo** (encima de AUT-21). | — |
| AUT-36 | **Oportunidad → borrador de alcance/plan** del proyecto al ganar. | Encima de AUT-02. |
| AUT-37 | **Resumen de documento/asset** (SOLO metadatos/resumen; nunca se guarda el contenido del fichero — regla dura). | — |

---

## 7. Secuencia recomendada (impacto/esfuerzo)

1. **Habilitadores primero**: **HAB-1** (canal de notificación — **Telegram, ya elegido; falta implementarlo**) y
   **HAB-2** (emitir evento en cada transición). Sin ellos, la mitad del catálogo no se puede hacer bien.
   Diseño acordado para HAB-1: adapter en `packages/integrations` (con el `withTimeout` que ya existe) + `eventType`
   `notify.*` en el `outboxRegistry` + destino en `integrations.configuration` y el token en `.env` + deduplicación por
   evento/día (como `enqueueScheduledSyncs`) + un job programado para los digests.
2. **Quick wins de alto impacto**: AUT-08/AUT-19 (vencidas → notificar), AUT-22 (alerta de sync en ERROR),
   AUT-18 (briefing diario), AUT-06 (flywheel al cerrar proyecto).
3. **Bootstrap y enlace**: HAB-3/HAB-4 → AUT-02/AUT-32 (kickoff cross-app), AUT-25/AUT-27 (auto-enlace Drive/Calendar).
4. **Entrada de conocimiento**: AUT-12/AUT-31 (pipeline de Inbox), AUT-29 (Notion como entrada).
5. **IA (Fase 2)**: AUT-33..37 cuando se aborde el dominio de IA.

> Cómo implementar cada una: seguir el patrón de `createProjectFromWonOpportunity` — comando/handler **idempotente**,
> emitido por `emitOutbox` en la tx del cambio (o un bloque temporizado en el tick), registrado en `outboxRegistry`/
> `jobRegistry`, con `requireCan`/org-scoping/`recordAudit` y **sin bucles** (actor SYSTEM). Anotar cada una en
> [`FINDINGS_AND_DEFERRED.md`](./FINDINGS_AND_DEFERRED.md) al pasarla a "en curso".
