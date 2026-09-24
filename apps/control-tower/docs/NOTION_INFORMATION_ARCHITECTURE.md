# Control Tower ↔ Notion — Information Architecture (contrato de sincronización)

> **Propósito.** Contrato **congelable** contra el que se construirá el adapter de Notion (Fase 3). Define el
> inventario de bases de datos de Notion, sus propiedades, relaciones, estados, y **quién es la fuente de verdad de
> cada campo**. Sin este contrato el adapter tendría que "adivinar" el workspace.
>
> **Estado:** BORRADOR v1 (redactado por Claude a partir de *Consideraciones sobre notion.docx* + el modelo de CT).
> Faltan los datos que solo tú puedes poner: los **IDs de base de datos** y las **opciones exactas de cada select**
> una vez creadas en Notion. Búscalos como `⟨PENDIENTE⟩`.

---

## 0. Cómo se rellena y se usa
1. Creas en Notion las bases de datos de la §4 con esas propiedades.
2. Rellenas cada `database_id` `⟨PENDIENTE⟩` y confirmas nombres/opciones de propiedades.
3. Compartes cada base con la integración de Notion (permiso **de edición** en las que CT empuja; lectura en las de
   solo-referencia).
4. Guardamos los `database_id` en `integrations.configuration` (no en código, no secretos). Congelamos este doc.
5. Recién entonces se construye: pull tipado → push por entidad.

---

## 1. Principios (congelados con el owner)
- **Un solo dueño por campo, sin ciclos** (doc 3 §3A.6). Nada se edita "libremente" en los dos lados.
- **Propiedad por campo** (decisión del owner):
  - **CT posee la ficha estructurada** (propiedades: nombre, tipo, estado, relaciones, fechas). CT **empuja** esos
    campos a la fila de Notion. En Notion son un **espejo de solo-lectura** (regla humana; añadir un callout
    "Propiedades gestionadas por Control Tower — editar en CT"). Si se editan en Notion, el siguiente push las pisa.
  - **Notion posee el cuerpo de la página** (prosa rica, embeds, adjuntos). CT **solo enlaza** (`notion_url`),
    nunca lo sobrescribe.
- **Notion = Knowledge + Documentation + Operational Context.** No compite con Twenty (CRM), Drive (ficheros), Git
  (código) ni el gestor de secretos (credenciales).
- **Secretos NUNCA en Notion** (regla dura #2). Systems solo guarda referencias (App/Env/URL/Status), jamás
  passwords/API keys/tokens.
- **Notas de Notion "sueltas"** (páginas de prosa que no son fila de una DB del contrato) → Notion las posee; CT las
  referencia como Knowledge Items tipo `REFERENCE` (sin traer el contenido).

### Direcciones posibles (notación usada en §4)
| Dirección | Significado |
|---|---|
| **CT→Notion** | CT es dueño; empuja/actualiza la propiedad en Notion (espejo). |
| **Notion→CT** | Notion es dueño; CT lee y referencia (read-only en CT). |
| **Notion (body)** | Cuerpo de la página; Notion dueño; CT solo enlaza. |
| **derivado** | Calculado; no se almacena ni se sincroniza. |

---

## 2. Arquitectura de Notion (páginas vs bases de datos)
Se adopta la IA propuesta. **Regla:** son **bases de datos** solo las entidades repetibles/relacionables; el resto son
**páginas** (dashboards y documentación de prosa).

```
NOTION
├── 00 HOME                 → página dashboard (vistas filtradas; NO es DB)
├── 01 BUSINESS OS          → páginas de prosa + DBs: Capabilities, Services, Decisions
│   (Carta Fundacional, Dirección, Modelo, Procesos, Metodología = páginas/prosa → ref)
│   (+ DB Strategic Areas, DB Goals)
├── 02 KNOWLEDGE            → DB central: Knowledge Items (+ Inbox como vista/estado)
│   (Research/Learnings/Sources = tipos/vistas de la misma DB o páginas → ref)
├── 03 PROJECTS             → DB: Projects (+ notas/knowledge de proyecto = páginas → ref)
├── 04 CLIENTS             → páginas de "client knowledge" (la verdad del cliente es Twenty)
├── 05 MARKETING & SALES    → FUTURO (fuera de alcance ahora)
├── 06 ASSETS & TEMPLATES   → DB: Assets (metadata) + contenido de plantillas = páginas → ref
├── 07 LEARNING             → FUTURO (mapea a Skills↔Capabilities; fuera de alcance ahora)
├── 08 SYSTEMS              → FUTURO en CT (dominio E-5, ADR+migración); por ahora solo-referencia
└── 99 ARCHIVE              → NO es DB; se modela con estado ARCHIVED + vistas filtradas
```

**En alcance para Fase 3** (mapean a entidades que CT ya posee): Knowledge Items, Decisions, Capabilities, Services,
Strategic Areas, Goals, Projects, Assets. **Fuera de alcance ahora** (referencia/relleno futuro): Marketing, Learning,
Systems, Clients-como-DB, Tasks (ver §4).

---

## 3. Convenciones técnicas de sincronización
- **Identidad/idempotencia:** por cada entidad sincronizada, CT guarda en `external_identities`:
  `provider='NOTION'`, `internalType=<entidad>`, `internalId=<uuid CT>`, `externalId=<notion_page_id>`,
  `externalType=<database key>`, `metadata.url=<notion_url>`, `lastSyncedAt`. **No hace falta migración** (la tabla ya
  existe). Push = upsert por `notion_page_id`; pull = resolve por `notion_page_id`.
- **Config (no secretos):** los `database_id` van en `integrations.configuration` (jsonb del row de Notion), p. ej.
  `{ "databases": { "knowledgeItems": "⟨ID⟩", "decisions": "⟨ID⟩", ... } }`. Resuelve **E-4 (scoping)**: CT solo toca
  esas DBs, no "todas las páginas".
- **Relaciones:** las relaciones de Notion apuntan a `page_id`. CT resuelve `uuid interno ↔ notion_page_id` con
  `external_identities`. Por eso el **orden de sync importa** (una relación solo se puede escribir si el destino ya
  tiene `notion_page_id`). Orden recomendado:
  `Strategic Areas → Capabilities → Services → Goals → Clients(ref) → Projects → Decisions → Knowledge Items → Assets`.
- **Push = Outbox (E-1):** escribir a Notion usa el Transactional Outbox → worker → `NotionAdapter.push()`. Requiere
  **token de Notion con permiso de edición** en las DBs con dirección CT→Notion.
- **Pull tipado:** el adapter consulta `POST /v1/databases/{id}/query` por cada DB del contrato y mapea **propiedades
  tipadas** (no `search` genérico como hoy). El sync actual (página→knowledge_item genérico) se **reescribe**.
- **Borrar una página (M40, 2026-09-24):** el pull de Notion excluye lo que está en la papelera, así que una página
  borrada deja de venir. La reconciliación (`integrations/reconcile.ts`) marca esa identidad y **archiva** la fila de
  CT — reversible, visible en Ajustes › Archivados; si la página vuelve, la fila se restaura sola.
  **Dos límites importantes:**
  - Sólo aplica a las DBs **bidireccionales** (las que tienen `importFromNotion`). Las **push-only** (`resources`,
    `learning`) no tienen pull: allí CT es el único autor y borrar la página no significa nada.
  - CT **no archiva un registro que tenga identidad de otro proveedor** (`onlyIfSoleIdentity`). En Notion CT
    ESCRIBE: es un espejo, no la fuente de existencia. Que falte la página de un reutilizable que vino de GitHub no
    quiere decir que el repo no exista; de eso responde GitHub con su propia reconciliación. En ese caso el push
    **recrea** la página en el siguiente sync, en vez de intentar actualizar una página muerta y dar 404 para
    siempre.
  - Consecuencia que conviene tener clara: una entidad creada **en CT** y espejada a Notion sólo tiene identidad de
    Notion, así que borrar allí su página **sí** la archiva aquí. Es el comportamiento pedido por el owner («si
    cancelo información en Notion, que se quite también de Control Tower»), y es reversible.

---

## 4. Contrato por base de datos

> Leyenda de "Owner": **CT** = CT dueño (empuja) · **Notion** = Notion dueño (CT lee) · **body** = cuerpo de página ·
> **der.** = derivado. Los `⟨PENDIENTE⟩` los rellenas tú al crear las DBs.

### 4.1 Knowledge Items  ·  DB `database_id = ⟨PENDIENTE⟩`  ·  ficha CT→Notion + cuerpo Notion
CT entity: `knowledge_items`. Origen mixto (algunos nacen en CT, otros en Notion); tras el primer pull, **las
propiedades las gobierna CT**; **el cuerpo lo gobierna Notion**.

| Propiedad Notion | Tipo Notion | Owner | Campo CT | Notas |
|---|---|---|---|---|
| Title | title | CT→Notion | `title` | |
| Type | select | CT→Notion | `knowledge_type` | opciones = enum CT (§5): NOTE, LESSON, INSIGHT, PROCESS, PATTERN, RESEARCH, REFERENCE |
| Status | select | CT→Notion | `status` | INBOX, DRAFT, REVIEW, APPROVED, ARCHIVED |
| Summary | rich_text | CT→Notion | `summary` | resumen corto (la prosa larga va en el cuerpo) |
| Area | relation→Strategic Areas | CT→Notion | (vía relación) | opcional |
| Project | relation→Projects | CT→Notion | `project_id`* | *hoy KI no liga a project en el modelo físico; ver nota |
| Client | relation→Clients | CT→Notion | — | requiere Clients en Notion (§4.9) |
| Service | relation→Services | CT→Notion | — | |
| Capability | relation→Capabilities | CT→Notion | — | |
| Canonical URL | **rich_text** | **CT→Notion** | `source_url` | «URLs relacionadas»: **texto libre que admite VARIAS urls** (owner 2026-09-02) — ver la nota de abajo. La escribe CT; Notion sólo gana en la importación inicial |
| Source | select | Notion→CT | `source_type` | MANUAL/NOTION/… |
| (cuerpo de la página) | — | **Notion (body)** | — | CT enlaza vía `notion_url`; nunca lo trae |
| Created / Updated | created/edited time | der. | `created_at`/`updated_at` | Notion los mantiene solo |

> **⚠ Nota sobre `Canonical URL` / «URLs relacionadas» (owner 2026-09-02).** Es **texto**, no una propiedad de tipo
> `url`, y es **deliberado**: un recurso de la biblioteca puede tener varias fuentes y el owner quiere poder pegar más
> de una. Consecuencias que hay que tener presentes si algún día da problemas:
> - **En Notion la propiedad debe ser de tipo Texto.** Si se crea como `URL`, el push de ese campo falla (el sync la
>   salta y lo anota en «registros saltados», sin romper el resto) — un fallo silencioso salvo que se mire ahí.
> - **La escribe CT.** El push recorre TODAS las filas de CT en cada sync y hace `updatePage`, así que lo que se
>   escriba en Notion en una página ya sincronizada se pierde en la siguiente pasada. Notion sólo gana en la
>   importación inicial (página sin identidad en CT). **Regla: este campo se edita en Control Tower.**
> - **La interfaz sólo puede enlazar UNA.** `singleExternalUrl` (`apps/web/lib/external-url.ts`) decide si el texto
>   es exactamente una url; si hay varias, la columna «Enlace» de la Biblioteca cae al enlace de la página de Notion.
>   Las urls completas se siguen viendo en la ficha y en el panel, así que no se pierde nada.
> - **Si algún día se quiere una url «principal» enlazable siempre**, la salida limpia es una columna nueva
>   (`primary_url`) y dejar `source_url` como el saco de urls relacionadas; no convertir el campo, que perdería datos.

> Nota: varias relaciones (Client/Service/Capability/Area) **no existen** hoy en `knowledge_items` del modelo físico
> congelado → o se guardan solo en Notion (mirror sin contrapartida en CT), o requieren migración en CT. Marcar en la
> revisión cuáles quieres de verdad (evitar prometer relaciones que CT no persiste).

### 4.2 Decisions  ·  `⟨PENDIENTE⟩`  ·  CT→Notion (mirror) + cuerpo Notion
CT entity: `decisions`. **CT es dueño** (se crean/gestionan en CT). Notion = espejo navegable + prosa opcional.

| Propiedad Notion | Tipo | Owner | Campo CT |
|---|---|---|---|
| Title | title | CT→Notion | `title` |
| Status | select | CT→Notion | `status` (DRAFT/REVIEW/APPROVED/SUPERSEDED/ARCHIVED) |
| Context | rich_text | CT→Notion | `context` |
| Decision | rich_text | CT→Notion | `decision` |
| Rationale | rich_text | CT→Notion | `rationale` |
| Project | relation→Projects | CT→Notion | `project_id` |
| Service | relation→Services | CT→Notion | `service_id` |
| Decided at | date | CT→Notion | `decided_at` |
| (cuerpo) | — | Notion (body) | — |

### 4.3 Capabilities  ·  `⟨PENDIENTE⟩`  ·  CT→Notion
CT entity: `capabilities`.

| Notion | Tipo | Owner | CT |
|---|---|---|---|
| Name | title | CT→Notion | `name` |
| Description | rich_text | CT→Notion | `description` |
| Status | select | CT→Notion | `status` (PLANNED/DEVELOPING/AVAILABLE/RETIRED) |
| Maturity | select | CT→Notion | `maturity` (BEGINNER/INTERMEDIATE/ADVANCED/EXPERT) |
| Related Services | relation→Services | CT→Notion | (N:M service_capabilities) |
| Notes | rich_text | CT→Notion | `notes` |

### 4.4 Services  ·  `⟨PENDIENTE⟩`  ·  CT→Notion
CT entity: `services`.

| Notion | Tipo | Owner | CT |
|---|---|---|---|
| Name | title | CT→Notion | `name` |
| Description | rich_text | CT→Notion | `description` |
| Status | select | CT→Notion | `status` (IDEA/DESIGNING/READY/ACTIVE/PAUSED/RETIRED) |
| Type | rich_text/select | CT→Notion | `service_type` |
| Capabilities | relation→Capabilities | CT→Notion | (N:M) |
| Notes | rich_text | CT→Notion | `notes` |

### 4.5 Strategic Areas  ·  `⟨PENDIENTE⟩`  ·  CT→Notion
CT entity: `strategic_areas`. Campos: `name`(title), `description`(rich_text), `status`(select ACTIVE/ARCHIVED),
`sort_order`(number). Relación inversa: Goals.

### 4.6 Goals  ·  `⟨PENDIENTE⟩`  ·  CT→Notion
CT entity: `goals`. Campos: `name`(title), `description`(rich_text), `status`(ACTIVE/ARCHIVED), `priority`(LOW/MEDIUM/
HIGH/URGENT), `target_date`(date), Area(relation→Strategic Areas ← `strategic_area_id`).

### 4.7 Projects  ·  `⟨PENDIENTE⟩`  ·  ficha CT→Notion + notas Notion
CT entity: `projects`. **CT dueño de la ficha**; la página de proyecto en Notion aloja Overview/Meetings/Notes
(Notion body → ref).

| Notion | Tipo | Owner | CT |
|---|---|---|---|
| Name | title | CT→Notion | `name` |
| Status | select | CT→Notion | `status` (PLANNED/ACTIVE/BLOCKED/WAITING/REVIEW/DELIVERED/CLOSED/ARCHIVED) |
| Priority | select | CT→Notion | `priority` |
| Client | relation→Clients | CT→Notion | `client_id` (si Clients en Notion) |
| Service | relation→Services | CT→Notion | `service_id` |
| Start / Target | date | CT→Notion | `start_date`/`target_date` |
| Description | rich_text | CT→Notion | `description` |
| (Tasks/Deliverables/Decisions/Docs) | relations/vistas | — | ver §4.8 |

### 4.8 Tasks / Deliverables — **NO se reflejan a Notion (por ahora)**
CT es la herramienta operativa de tareas. Mantener tareas en Notion = doble gestión. Se dejan **solo en CT** respecto a
Notion. (Si más adelante quieres verlas en Notion, sería CT→Notion read-only.)

> **Origen de las tareas (F-18):** dentro de CT, las tareas tendrán **doble origen** — unas creadas en CT (propiedad de
> CT) y otras **importadas de Twenty** (Twenty es la única app conectada con objeto Task). Todas se ven juntas en
> `/tasks`, con badge de fuente (CT/Twenty), cada una con un único dueño (su origen) para crearlas en ambos sitios sin
> conflictos. Es **trabajo nuevo** anotado en FINDINGS F-18; no afecta al contrato de Notion.

### 4.9 Clients — **Twenty es la verdad**; Notion solo "client knowledge"
No crear una DB `Clients` que compita con Twenty. En Notion: páginas de conocimiento/documentación por cliente
(Notion→CT como Knowledge Items/Documents ref). Si se quiere una relación `Client` en otras DBs de Notion, la DB de
clientes de Notion guardaría solo `Name` + `Twenty ID`(rich_text) como espejo de Twenty (CT→Notion, derivado del CRM).

### 4.10 Assets  ·  `⟨PENDIENTE⟩`  ·  metadata CT→Notion + contenido Notion
CT entity: `assets`. Metadata (Name, Type, Status DRAFT/ACTIVE/DEPRECATED/ARCHIVED, Version, External URL, Repository
URL) = CT→Notion. El **contenido** de una plantilla/SOP vive en el cuerpo de Notion (Notion body → ref).

### 4.11 Review Queue («Por revisar»)  ·  `database_id = ⟨PENDIENTE⟩`  ·  **bidireccional** (por campo)
CT entity: `review_items` (Conocimiento › **Por revisar**). Cola de artículos, vídeos, libros y demás pendientes de
leer/ver. Bidireccional a propósito: guardas el enlace en Notion desde el móvil y aparece en CT, o lo creas en CT y se
refleja allí. Clave de configuración: **`reviewItems`**.

| Propiedad en Notion | Tipo | Campo en CT | Notas |
|---|---|---|---|
| *(título de la DB)* | Title | `title` | El nombre de la propiedad título da igual: se detecta por tipo. |
| `Kind` | Select | `kind` | Sugeridos: `ARTICLE`, `VIDEO`, `BOOK`, `PODCAST`, `COURSE`, `THREAD`, `OTHER`. |
| `Status` | Select | `status` | **Debe** tener: `TO_REVIEW`, `REVIEWING`, `REVIEWED`, `DISCARDED`. Sin valor al importar → `TO_REVIEW`. |
| `Sector` | **Text** | `sector` | Etiqueta libre, mismo vocabulario que la biblioteca. Es texto y no `select` a propósito: así no hay que mantener las opciones también en Notion — en CT el desplegable se rellena solo con los sectores ya usados. |
| `URL` | URL | `url` | El enlace al recurso: es lo único que hace falta para volver a él (ni CT ni Notion guardan el contenido). |
| `Notes` | Text | `notes` | Notas cortas. Lo largo, en el cuerpo de la página (lo gobierna Notion). |

### 4.12 Systems (Applications/Environments/Infrastructure) — FUTURO
Mapea al dominio **E-5** de CT, que está diferido (ADR + migración). Por ahora: solo-referencia (Notion→CT como
documents/knowledge), **sin secretos**. Se aborda cuando se decida el dominio de infra en CT.

---

## 5. Mapeo de enums (Notion select ↔ CT)
**Recomendación:** que los `select` de Notion usen **exactamente los valores del enum de CT** (menos fricción, cero
mapeo). Si prefieres nombres "humanos" en Notion, aquí el mapa para Knowledge → `knowledge_type`:

| Notion (propuesta docx) | CT `KNOWLEDGE_TYPE` |
|---|---|
| Concept | NOTE |
| Learning | LESSON |
| Insight | INSIGHT |
| Observation | NOTE |
| Procedure | PROCESS |
| Research | RESEARCH |
| Reference | REFERENCE |
| (Pattern) | PATTERN |
| Decision | → **no es tipo**; va a la DB **Decisions** (§4.2) |

Estados: usar los de CT tal cual (Decisions, Capability, Service, Project, Asset, Lifecycle) — ver §4. Prioridad:
LOW/MEDIUM/HIGH/URGENT.

---

## 6. Qué NO se sincroniza
- Páginas de **prosa/documentación** que no son fila de una DB del contrato (Carta Fundacional, Metodología, notas de
  reunión, etc.) → Notion las posee; CT como mucho las referencia (Knowledge Item `REFERENCE`), sin traer el cuerpo.
- **Cuerpos** de página (siempre Notion; CT enlaza).
- **Secretos** (jamás).
- Marketing / Learning / Systems-como-dominio → futuro.

---

## 7. Secuencia de construcción (tras congelar este doc)
1. **Contrato congelado** (este archivo, con IDs reales).
2. **Pull tipado** (read-only, rápido): adapter lee las DBs en alcance → entidades CT; idempotencia por
   `notion_page_id`; scoping por `integrations.configuration`. Reescribe el sync genérico actual.
3. **Push (E-1) por entidad**, empezando por un **slice vertical** (recomendado: Knowledge Items **o** Decisions):
   `NotionAdapter.push()` + handler de Outbox + resolución de relaciones en el orden de §3. Verificar ida y vuelta sin
   ciclos (una propiedad editada en CT aparece en Notion; el cuerpo editado en Notion se respeta).
4. Extender push al resto de entidades CT→Notion en el orden de relaciones.

---

## 8. Pendiente de ti (para cerrar el contrato) — ✅ COMPLETADO (ver §9)
- [x] Crear las DBs en alcance (§4) con esas propiedades y **pegar cada `database_id`**.
- [x] Confirmar/renombrar propiedades y **fijar las opciones de cada `select`** (verificadas = enums de CT, §5).
- [x] Decidir qué **relaciones** de Knowledge Items quieres de verdad → **decisión: se gestionan a mano en Notion**;
      CT no las trae ni las empuja (F-20).
- [x] Compartir cada DB con la integración de Notion.
- [x] Confirmar el **slice vertical** para el primer push → Decisions (piloto), y hoy las 8 DBs sincronizan.
```

---

## 9. IDs confirmados y verificación de esquema (2026-08-13)
`database_id` reales (van en `integrations.configuration.databases`). Propiedad título = **"Nome"** en todas
(autodetectada por tipo). **Opciones de los `select`: verificadas = enums de CT** ✓.

| Entidad | database_id | Estado |
|---|---|---|
| Decisions | `3babecf260de802aa2d0c25fa802780b` | ✅ piloto en producción (bidireccional) |
| Strategic Areas | `3bbbecf260de8067a74ec7fbaa46c7cc` | ✅ (limpiar relación duplicada `Goals 1`) |
| Capabilities | `3bbbecf260de80a29200fe7102d73a1f` | ✅ ok |
| Services | `3bbbecf260de803ab430c7a1adb7a550` | 🔧 `Capabilities` texto sobra; la relación es `Capabilities 1` → renombrar a `Capabilities` |
| Goals | `3bbbecf260de80f296f3e7cdd9ed2426` | ✅ ok (Area, Priority, Target Date, Status) |
| Projects | `3bbbecf260de800a8b9dd93a80b3364b` | 🔧 `Start / Target` (1 fecha) → separar en `Start date` + `Target date`; typo `Knowlegde Items`; `Client`=texto (ok) |
| Knowledge Items | `3bbbecf260de80af9b27e29c3914c317` | ❓ relaciones Area/Project/Client/Service/Capability sin contrapartida en CT (§4.1) — decidir |
| Assets | `3bbbecf260de807ea535c54ea5cbd588` | ➕ falta `Description` (rich_text) |

**Relaciones:** el push de relaciones (Goal→Area, Project→Service, Services↔Capabilities) es una 2ª pasada (resuelven
`notion_page_id` cruzando `external_identities`, en el orden de §3). La 1ª pasada empuja campos escalares.

**2026-08-13 — Estado:** las **8 DBs sincronizan bidireccionalmente** (campos escalares) y verificado idempotente en vivo.
Fixes del owner aplicados (Services/Projects/StrategicAreas/Assets). Relaciones = solo en Notion (F-20).
