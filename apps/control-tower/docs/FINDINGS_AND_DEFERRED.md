# Control Tower — Hallazgos y funcionalidad diferida

> Registro **vivo** de todo lo que se encontró durante la construcción y que quedó **reducido,
> diferido o resuelto con una simplificación** respecto a lo que sugieren el dominio o los
> wireframes. Objetivo: que el owner pueda **evaluar después** qué merece implementarse.
>
> Regla aplicada en MVP: no inventar columnas/entidades fuera del modelo físico congelado
> (IMP-002); ante contradicción no cubierta por la errata → parar y señalar. Cada ítem dice
> **qué haría falta** para implementarlo completo.

Leyenda impacto: 🟢 cosmético/menor · 🟡 funcional visible · 🔴 decisión de arquitectura.

> **⚑ Repaso de estados (2026-09-01).** Se revisó ítem por ítem contra el código y se marcaron los que ya estaban
> hechos pero seguían abiertos en el registro (B-4, C-2, C-4, C-5, B-6, E-5, E-7, F-17, y los residuos de E-4/E-8/E-9/F-1).
> **Lo que sigue REALMENTE abierto**, agrupado:
> - **Necesitan una decisión o un habilitador:** A-7 y E-11 (multi-usuario) · alertas por evento (dependen de HAB-1, el
>   canal de notificación: ya elegido —bot de Telegram— pero sin implementar por decisión del owner).
> - **Seguridad de la cuenta:** E-9a — cambiar **email y contraseña** con verificación por correo (hoy el email es solo
>   lectura a propósito).
> - **Decisión de producto pendiente:** **E-18** — `primary_contact_id`, `source` y `notes` de las oportunidades no
>   viajan a Twenty y están vacías; hay que decidir si se mapean, se quedan como datos propios de CT o se retiran.
> - **Pendiente de una acción en la Pi:** **F-31** — activar el cgroup de memoria (`cgroup_enable=memory` en
>   `/boot/firmware/cmdline.txt` + reinicio) para que los `mem_limit` dejen de descartarse, y medir entonces de verdad.
> - **Trabajo pendiente acotado:** B-2 (Kanban de tareas) · drag-reorder de FILAS (E-12) · varias carpetas/DBs por
>   proveedor (E-4) · ver ejecuciones de los **barridos** y editar cadencias desde el panel (E-8) · edición de perfil e
>   invitaciones (E-9/E-11) · `Initiatives`/sub-goals (E-3) · tareas por asignado (E-2).
> - **Menores de UI/UX** (`AUDIT_UIUX_2026-08-30.md`): micro-confirmación al guardar · aviso si falla el GET del panel ·
>   copy desincronizado en Clients · `EmptyState` que enseñe el siguiente paso · login sin primitivas y con el enlace
>   «Regístrate» ya inútil · jerarquía de encabezados y métricas (P2).
> - **Seguridad** (`SECURITY_CHECKLIST.md`): ✅ guarda de `BETTER_AUTH_SECRET` · ✅ UUID en los params de ruta ·
>   **queda**: redacción de claves sensibles en el logger · `folderId` de Drive · contraseña de Postgres (acción
>   del owner en la Pi; el deploy ya avisa).
> - **Rendimiento:** E-14 — medir consultas por página e índices (el owner reporta varios segundos por página en la
>   Pi; 47/47 páginas `force-dynamic` y sólo 18 paralelizan sus consultas). Ahora también **F-28**: ninguna consulta
>   de lista lleva `LIMIT`.
> - **Verificación en vivo del owner:** F-18 (crear una tarea en Twenty para probar su pull).
>
> **⚑ Añadido por la revisión de producto (2026-09-01, sesión 27 — sección G).** Lo que salió **nuevo** al evaluar la
> app como producto, cotejado antes contra este registro y las dos auditorías:
> - ✅ **F-26 HECHO (2026-09-01)** — cuatro pantallas de error/404 sobre `MessageScreen`, en español y con salidas.
> - ✅ **F-29 HECHO (2026-09-01)** — `RecordTable` + `ListPage` + `FilterTabs`; 19 vistas unificadas, 0 mapeos
>   duplicados. **Esto desbloquea F-28.**
> - ✅ **F-32 HECHO (2026-09-01)** — el e2e por journeys llevaba tiempo roto en silencio (server que no moría +
>   alta bootstrap-only + aserciones caducadas). **59/59 en verde.**
> - ✅ **F-33 HECHO (2026-09-02)** — «Por revisar»: REVISADO es terminal (no se edita ni se deshace) y la purga
>   sólo borra un revisado **si ya está en la biblioteca**. Antes se perdía información.
> - ✅ **F-34 HECHO (2026-09-02)** — el buscador ignoraba 4 de las 15 entidades indexadas (Por revisar,
>   Aprendizaje, Recursos, Pagos). Añadidas, más exclusión de lo archivado y un test que ata ambas listas.
> - ✅ **F-35 HECHO (2026-09-24, M40)** — los syncs no reconciliaban borrados y la idempotencia no sobrevivía a
>   una base de CT vacía: eso duplicó los reutilizables al migrar a vibox. Ahora lo que desaparece del origen se
>   **archiva** (y se restaura si vuelve), la purga limpia los punteros de sync y GitHub adopta el asset que ya
>   existe con su URL. **Queda pasar `cleanup-duplicates.ts` en vibox** para limpiar lo ya duplicado, y **A-7
>   queda ampliado**: falta la unicidad `(provider, internal_type, internal_id)`.
> - ✅ **F-28 HECHO (2026-09-02)** — ordenación por columna (con `aria-sort`), filtro rápido y tope de 500 con
>   aviso en pantalla. Implementado **una vez** sobre `RecordTable`, como estaba previsto al hacer F-29 antes.
> - 🟡 **F-31 PARCIAL (reabierto 2026-09-02)** — imagen del worker **1,35 GB → 413 MB** ✅ (y de paso salió que
>   `tsx` estaba mal declarado como devDependency: con `--prod` el deploy se quedaba sin poder migrar). Pero el
>   **techo de memoria NO estaba en efecto en la Pi**: el kernel trae el cgroup de memoria desactivado y Docker
>   **descartaba** los límites con un aviso. Pendiente: que el owner active `cgroup_enable=memory` y reiniciar.
> - ✅ **F-27 HECHO (2026-09-02)** — barrido amortizado dentro de `rateLimit()` (nada de temporizadores que
>   alguien deba arrancar) y `channelId` del webhook validado como UUID antes de tocar el limitador.
> - ✅ **Lote de seguridad HECHO (2026-09-02)** — la web **no arranca** sin `BETTER_AUTH_SECRET` (antes arrancaba
>   y sólo fallaba al iniciar sesión, con un 500 opaco) · `parseId()` en **53 rutas**: un id mal formado ya no da
>   `500 Error interno` sino `400` · el deploy avisa si la contraseña de Postgres sigue siendo la de por defecto.
>   Detalle en `SECURITY_CHECKLIST.md`.
> - **Acabado:** **F-30** (claves de i18n auto-extraídas del castellano + literales sueltos; F-29 se llevó por
>   delante los de la cabecera de Tareas y el breadcrumb de Contactos, queda el resto).
> - **Huecos de producto:** **E-15** notas/comentarios por registro (el único que es una ausencia real) ·
>   **E-16** adjuntos (necesita decisión: choca con «sólo referencias») · **E-17** exportar datos de negocio e
>   informes de evolución.
> - **NO son deuda, comprobado:** el diseño **responsive** es decisión de alcance del owner (sólo escritorio,
>   2026-08-30) y el atajo **⌘K ya existe**.

---

## Índice por tipo
- [A. Gaps modelo físico ↔ dominio/wireframes](#a-gaps-modelo-físico--dominiowireframes)
- [B. Simplificaciones de UI/UX](#b-simplificaciones-de-uiux)
- [C. Diferido a un milestone concreto](#c-diferido-a-un-milestone-concreto)
- [D. Convenciones elegidas donde el modelo no enumeraba](#d-convenciones-elegidas-donde-el-modelo-no-enumeraba)
- [E. Roadmap de producto (dudas del owner tras el primer uso)](#e-roadmap-de-producto-dudas-del-owner-tras-el-primer-uso)
- [G. Revisión de producto (2026-09-01, sesión 27)](#g-revisión-de-producto-2026-09-01-sesión-27) — F-26…F-34, E-15…E-17

---

## A. Gaps modelo físico ↔ dominio/wireframes

### A-1 · `project.type` no existe → invariante "CLIENT project requiere client" ✅ RESUELTO (2026-09-01, ADR-005)
- **Hallado en:** M06.
- **Qué dice el dominio:** Project tiene tipo INTERNAL/CLIENT/LAB; invariante "un CLIENT project debe tener client".
- **Modelo físico (doc 5 §16):** `projects` **no tiene columna `type`**. `client_id` es opcional.
- **Estado original:** no había tipo de proyecto; `client_id` opcional; el invariante no se aplicaba.
- **Resuelto (2026-09-01):** migración aditiva **0014/m30** añade `projects.type` (INTERNAL/CLIENT/LAB) con CHECK y
  backfill (los que ya tenían cliente → CLIENT). El invariante es **DURO** (decisión del owner): crear o dejar un
  proyecto CLIENT sin cliente devuelve `PROJECT_CLIENT_REQUIRED`, validado sobre el estado RESULTANTE del PATCH.
  Un proyecto personal se fuerza a INTERNAL; el que nace de una oportunidad ganada hereda CLIENT si ella trae cliente.
  UI: campo en el panel, columna en la lista y línea en el Resumen. Ver [ADR-005](./adr/ADR-005-project-type.md).

### A-2 · `decisions` sin columna de enlace supersede ✅ RESUELTO (2026-09-01, ADR-006)
- **Hallado en:** M07.
- **Wireframe (Decision Detail):** muestra "supersedes / superseded by" (vínculo entre decisiones).
- **Modelo físico (doc 5 §20):** `decisions` no tiene `supersedes_id`/`superseded_by_id`.
- **Estado original:** una decisión pasaba a `SUPERSEDED` sin registrar **qué decisión la reemplaza**.
- **Resuelto (2026-09-01):** migración **0014/m30** añade `decisions.supersedes_decision_id` (la NUEVA apunta a la
  ANTIGUA; el inverso se resuelve por query con `getDecisionLinks`, sin duplicar columna). `supersedeDecision(old, by)`
  marca estado + escribe el enlace en una transacción, rechaza el auto-reemplazo (`DECISION_SELF_SUPERSEDE`) y el
  segundo reemplazo de la misma decisión (`DECISION_ALREADY_SUPERSEDED`). En el panel hay campo «Reemplaza a» y en la
  lista una columna «Cadena» con los dos sentidos. Ver [ADR-006](./adr/ADR-006-decision-supersede-link.md).

### A-3 · `assets` sin `project_id` → sin enlace directo proyecto→asset ✅ RESUELTO (2026-09-01, ADR-007)
- **Hallado en:** M06/M07.
- **Dominio:** Project → Asset (reutilización); wireframe "Project Assets".
- **Modelo físico (doc 5 §24):** `assets` es de organización, **sin `project_id`** ni tabla puente.
- **Estado original:** assets a nivel org; la pestaña "Assets" del proyecto remitía a Knowledge → Assets.
- **Resuelto (2026-09-01):** **N:M** con tabla puente `project_assets` (migración 0014/m30) — la razón de ser de un
  asset es reutilizarlo en varios proyectos, así que 1:N habría obligado a duplicar catálogo. Enlazar es idempotente y
  desenlazar NO borra el activo. UI: pestaña **«Reutilizables»** en la ficha del proyecto (enlazar del catálogo,
  desenlazar, y crear+enlazar en un paso). Ver [ADR-007](./adr/ADR-007-project-assets.md).

### A-4 · `portfolio_items` no estaba en el modelo físico congelado ✅ RESUELTO (ADR-001)
- **Hallado en:** análisis inicial (C-2). La errata ordenaba crearla pero el doc 5 no la tenía.
- **Resuelto:** [ADR-001](./adr/ADR-001-portfolio-items-schema.md) fija el esquema. Se implementa en **M08**.

### A-5 · `opportunities.stage` sin enum en el modelo físico ✅ RESUELTO (ADR-002)
- **Hallado en:** análisis inicial (C-1). Wireframe Kanban 4 columnas vs dominio 8 estados.
- **Resuelto:** [ADR-002](./adr/ADR-002-opportunity-stages.md) → 8 estados de dominio; la UI agrupa en columnas.

### A-7 · `external_identities` UNIQUE sin `organization_id` → colisión multi-org 🔴
- **Hallado en:** M12.
- **Modelo físico (doc 5 §25):** `UNIQUE(provider, external_type, external_id)` — **global**, no incluye `organization_id`.
- **Consecuencia:** dos organizaciones que sincronicen el MISMO sistema externo no podrían mapear el mismo
  `external_id` (colisión de la constraint). En **MVP single-org no afecta** (ERRATA-012).
- **Para multi-org real:** cambiar la unique a `(organization_id, provider, external_type, external_id)` — ADR + migración.
  Es un cambio de esquema congelado; no se toca en MVP (IMP-002), sólo se registra.
- **Ampliado (2026-09-24, M40):** falta además unicidad por el OTRO lado, `(provider, internal_type, internal_id)`.
  Sin ella un mismo registro de CT puede acumular varias páginas de Notion y `getExternalIdentityFor`
  (`integrations/identity.ts`) devuelve **una arbitraria** (el `select` no lleva `ORDER BY`), así que los updates
  pueden ir a la página equivocada. Es justo lo que pasó con los reutilizables duplicados tras la migración a
  vibox. M40 ataca la **causa** (adopción por URL + reconciliación) y el script de limpieza deshace el estado
  actual, pero la constraint que lo haría imposible sigue sin existir: añadirla exige decidir antes qué hacer
  con los duplicados que ya haya en la base.

### A-6 · Enums dominio ↔ físico divergentes (knowledge/assets/decision) ✅ RESUELTO por precedencia
- **Hallado en:** M02/M07. P. ej. dominio KnowledgeItem `DRAFT→REVIEW→VALIDATED→ACTIVE→OBSOLETE` vs físico `INBOX/DRAFT/REVIEW/APPROVED/ARCHIVED`.
- **Resuelto:** gana el modelo físico (precedencia #4). Documentado en `DECISIONS_FROZEN.md`.

---

## B. Simplificaciones de UI/UX

### B-1 · Opportunities Kanban sin drag & drop ❌ REVERTIDO (2026-09-02, decisión del owner)
- **Hallado en:** M05.
- **Wireframe:** Kanban con tarjetas arrastrables entre columnas.
- **Estado original:** columnas server-rendered; el stage sólo se cambiaba con el `<select>` de cada tarjeta.
- **Hecho (2026-09-01):** arrastrar y soltar con los **eventos nativos de HTML5** (sin añadir dnd-kit ni ninguna
  dependencia). Como una columna agrupa varios stages (ADR-002), al soltar se elige el primer stage de la columna al
  que la oportunidad PUEDE moverse (`canChangeOpportunityStage` en `@ct/domain`): una ganada arrastrada a «Cerradas»
  pasa a CLOSED; una ya cerrada avisa sin llamar al servidor. El `<select>` de cada card se conserva como ruta
  accesible por teclado. Mismo endpoint `PATCH /opportunities/[id]/stage`.
- **❌ Retirado (2026-09-02, [ADR-008](./adr/ADR-008-opportunity-state-machine.md)):** el owner lo quitó por el motivo
  que ya se ve en el párrafo de arriba — **una columna agrupa varios estados**, así que soltar una tarjeta obligaba a
  *adivinar* a cuál («el primer stage alcanzable») y el gesto no decía lo que el usuario quería decir. El estado se
  cambia siempre en el desplegable de la tarjeta y el tablero vuelve a ser un componente de **servidor**. El hallazgo
  queda cerrado como descartado, no como pendiente: no hay nada que rehacer aquí.

### B-2 · Task board (To Do/In Progress/Blocked/Done) como lista, no Kanban 🟢 SIGUE ABIERTO
- **Hallado en:** M06.
- **Wireframe:** opción Kanban de tareas.
- **Hoy:** tareas en tabla con control de estado y **agrupadas por vencimiento** (Vencidas/Hoy/Esta semana/Próximas/
  Bloqueadas/Sin fecha), que en la práctica cubre el "¿qué hago ahora?". El Kanban por estado sigue sin hacerse.
- **Si se aborda:** el componente del tablero de oportunidades sigue sirviendo (columnas + tarjetas), pero **ya no
  lleva arrastrar y soltar** (retirado en B-1). Aquí sí tendría sentido: cada columna sería **un solo** `TASK_STATUS`,
  que es justo lo que le faltaba al de oportunidades para que el gesto fuera inequívoco. Endpoint
  `PATCH /tasks/[id]/status`.

### B-3 · Client Detail: tab "Projects" sin listado inverso 🟢 hecho (Fase 5)
- ✅ `listProjects(db, ctx, { clientId })` + render en la tab Projects del cliente (con estado y progreso, enlace al proyecto).
  El contador aparece en la etiqueta de la pestaña ("Projects (N)").

### B-4 · "Open in CRM" (Twenty) es placeholder ✅ RESUELTO (Bloque 2 · Fase 0A)
- **Hallado en:** M05. El Client Detail mostraba una nota "disponible en M12".
- **Resuelto:** el enlace es real y condicional: sale del `metadata.url` guardado en `external_identities` durante el
  sync, con el formato de detalle de Twenty (`/object/<singular>/<id>`, corregido en F-14). Si el registro es nativo de
  CT, no aparece. Ver **F-1** y **F-14**, que ya lo documentaban; este ítem se quedó sin marcar.

### B-5 · Portfolio no es módulo top-level de nav ✅ RESUELTO (2026-09-01, decisión del owner)
- **Hallado en:** M08.
- **Tensión:** ERRATA-003 (precedencia #2) mete Portfolio en MVP con pantallas List/Detail; la IA (doc 6, precedencia #5) congela la nav en 7 ítems y dice "no añadir módulos independientes de … Portfolio".
- **MVP actual (resolución):** Portfolio tiene sus pantallas en `/portfolio` y `/portfolio/[id]`, accesibles desde la tarjeta **Portfolio** en la overview de Knowledge (es un catálogo, afín a Assets). **No** aparece como ítem del sidebar → respeta ambas fuentes.
- **Resuelto (2026-09-01):** el owner decide subirlo a **primer nivel**: «Portafolio» es ya un ítem propio de la
  barra lateral y se retira su tarjeta de la overview de Conocimiento (con sus migas de pan). Es la **única desviación**
  de la nav congelada del doc 6 y queda anotada aquí y en el propio `components/sidebar.tsx`.

---

## C. Diferido a un milestone concreto (ya en el roadmap)

### C-1 · Audit log + Change events — cobertura COMPLETA ✅ (2026-09-01)
- **Hecho en M16:** `recordAudit`/`recordChangeEvent` cableados en las acciones clave del doc 5 §30:
  createProject/changeProjectStatus, createTask/updateTaskStatus (COMPLETE), createClient, changeOpportunityStage,
  captureKnowledge, createDecision/updateDecisionStatus (APPROVE), connectIntegration. Timeline por entidad
  (`listEntityActivity`) + Home Recent Activity + System Health.
- **Cobertura parcial (para revaluar):** Bloque 2 · Fase 0B añadió audit CREATE a los destinos de sync
  (createContact/Opportunity/KnowledgeItem/Document/Asset) para que las entidades traídas por integraciones aparezcan en la
  actividad. **Aún faltan:** createService/Capability/StrategicArea/Goal, createDeliverable, portfolio, y los
  updateServiceStatus/CapabilityStatus/DeliverableStatus/KnowledgeItemStatus.
- **✅ Cerrado (2026-09-01):** ya registran `createDeliverable`, `updateDeliverableStatus`, `updateCapabilityStatus`,
  `updateServiceStatus`, `link/unlinkServiceCapability`, `updateKnowledgeItemStatus`, `updateAssetStatus`,
  `promoteInboxToItem`, `discardInboxItem` y **todo el módulo portfolio** (que no auditaba nada). Los cambios de estado
  emiten además `change_event` STATUS, y los que reflejan a Notion pasan a hacerlo dentro de la transacción.
- **Actor SYSTEM:** las acciones de sync (jobs, `ctx.userId='system'`) se registran con `actorType=SYSTEM` (userId null).

### C-2 · Home / dashboard operativo (loop IMP-009 completo) ✅ RESUELTO (M09)
- **Hallado en:** M06. El loop "Home→atención→entidad→update→Home" no se puede cerrar sin Home.
- **Resuelto en M09** (y ampliado después): Executive Snapshot (5 métricas enlazadas), Requiere atención, Proyectos
  activos, Vencidas (con completar y reprogramar **desde la propia tarjeta**), Trabajo de hoy, Eventos de hoy
  (Calendar), Decisiones recientes, Actividad reciente y Estado del sistema. Todo derivado, sin datos propios.

### C-3 · Búsqueda global (⌘K) 🟡 — **M10** ✅. · Automatización/outbox/worker 🔴 — **M11** ✅. · Integraciones (Twenty/Notion/Git/Drive) 🔴 — **M12–M15**. · System Health 🟡 — **M16**.

### C-4 · Outbox cableado sólo en `changeProjectStatus` ✅ RESUELTO EN LA PRÁCTICA
- **Hallado en:** M11. El Outbox estaba implementado pero sólo se emitía en `changeProjectStatus`, como demostración.
- **Hoy:** el Outbox mueve **todos los efectos externos reales**. `recordAudit` encola `notion.push`/`twenty.push` en la
  MISMA transacción del cambio, y eso cubre los **26 comandos** que reflejan a Notion/Twenty (Fase 5 + sesión 9).
  Aparte hay dos eventos de dominio explícitos: `opportunity.won` (con handler: crea el proyecto) y
  `project.status_changed` (emitido, aún sin handler — es el enganche de AUT-06/07/09/10/17).
- **Lo que queda no es este ítem, sino HAB-2** del `AUTOMATION_BACKLOG`: *generalizar* la emisión a cada transición de
  estado para tener un punto de enganche uniforme. Se hará cuando haya automatizaciones que lo consuman.

### C-5 · Automations: sólo lectura de estado, sin authoring 🟢 mayormente resuelto (Fase 6)
- **Hallado en:** M11. `/automation` sólo mostraba estado de jobs/outbox.
- **Hoy sí hay gestión:** **Automatización › Automatizaciones** (`/automation/list`) es el inventario de todo lo que la
  app hace sola, con panel de detalle (qué hace, disparo, frecuencia) y acciones **Activar/Desactivar** (`toggleable`) y
  **Ejecutar ahora** (`runnable`). El estado vive en `automations/state`; el núcleo del motor aparece como solo lectura.
- **Lo único que sigue sin hacerse, y por diseño** (doc 5 §27 / ERRATA-009): un **constructor visual genérico** de
  automatizaciones. Las automatizaciones son handlers de código; el catálogo de las que faltan está en
  [`AUTOMATION_BACKLOG.md`](./AUTOMATION_BACKLOG.md).

---

## D. Convenciones elegidas donde el modelo no enumeraba

### D-1 · `priority` (LOW/MEDIUM/HIGH/URGENT) 🟢
- Ni doc 5 ni el dominio enumeran prioridad. Se eligió LOW/MEDIUM/HIGH/URGENT en `@ct/domain` (con CHECK). Cambiable por ADR si se quiere otra escala.

### D-2 · Estados no enumerados dejados como VARCHAR sin CHECK 🟢
- `organizations.status`, `strategic_areas.status`, `goals.status`, `documents.status`, `contacts.status` no están enumerados en doc 5 → se validan en la app (a menudo con `LIFECYCLE_STATUS` ACTIVE/ARCHIVED) pero **sin CHECK en DB** para no inventar el conjunto. Si se quiere endurecer, definir el set y añadir CHECK vía migración.

### D-3 · `project.status` con CHECK usando el set del dominio 🟢
- doc 5 no enumera `projects.status`; se usó el set del Domain Model §5.15 (PLANNED/ACTIVE/BLOCKED/WAITING/REVIEW/DELIVERED/CLOSED/ARCHIVED) con CHECK. Coherente con precedencia (dominio manda donde el físico calla).

### D-4 · Better Auth: verificación de email desactivada 🟢
- MVP de una sola usuaria: `requireEmailVerification: false`. Activar cuando haya colaboradores/multi-usuario real.

### D-5 · TASK_TRANSITIONS: TODO→DONE permitido 🟢
- Se añadió (checkbox de "marcar hecha" directamente). Decisión de UX, no del modelo.

### B-6 · Registro abierto → auto-provisión de organización (OWNER) ✅ RESUELTO (2026-08-31)
- **Hallado en:** primer arranque en Docker (post-M18). El registro fallaba por falta de `BETTER_AUTH_SECRET`
  (arreglado: se setea en el compose dev y en `.env` de prod), y un usuario nuevo no tenía organización.
- **MVP actual:** al registrarse, un hook (`ensureUserOrganization`) une al usuario a la **primera organización
  existente como OWNER** (o crea "Mi organización" si no hay ninguna). `getCurrentContext` también auto-provisiona
  (auto-heal). Cookies `Secure` sólo sobre HTTPS (antes rompían el login por http://localhost).
- **Consecuencia de seguridad:** el **registro es abierto** y todo nuevo usuario se vuelve OWNER de la org por
  defecto → aceptable en self-hosted single-user tras Tailscale/LAN, **peligroso si se expone públicamente**.
- **Para revaluar (Fase 2):** cerrar el registro tras el primer usuario / invitaciones por org / que usuarios
  nuevos obtengan su propia org aislada en vez de unirse a la existente. Ver `docs/SECURITY.md`.

### D-7 · E2E Playwright: verificación equivalente por HTTP 🟢
- **Hallado en:** M17. El stack fija Playwright para e2e de UI; existe `tests/e2e/critical-journeys.spec.ts` +
  `playwright.config.ts`. En este entorno **no se pudieron descargar los navegadores** (`playwright install chromium`
  requiere red), así que la verificación de los 5 journeys se hace con `scripts/e2e-journeys.sh` (HTTP contra la app real).
- **Para correr el Playwright de UI:** `pnpm exec playwright install chromium` en un entorno con red y `pnpm test:e2e`.
  El spec y el script HTTP cubren los mismos journeys (old_9 §25).

### D-6 · Búsqueda FTS con config `'simple'` (sin stemming) 🟢
- **Hallado en:** M10. Las columnas `search_vector` usan `to_tsvector('simple', …)` para ser inmutables y
  language-agnostic (contenido mixto ES/EN). Consecuencia: **no hay stemming** → "proyecto" no matchea
  "proyectos". Se mitiga con el fallback ILIKE (subcadena) en el título.
- **Para mejorar:** usar config `'spanish'`/`'english'` (o `unaccent` + diccionario) si se quiere stemming y
  acentos-insensible en el cuerpo del texto. Requiere migración (regenerar columnas) y decidir idioma por campo.

---

## E. Roadmap de producto (dudas del owner tras el primer uso)

Prioridades que surgieron al usar la app por primera vez. No son bugs: son el siguiente nivel de producto.

### E-1 · Write-back / push a sistemas externos (bidireccional controlado) 🟢 hecho
- ✅ **Notion:** push en tiempo real por entidad reflejada (propiedad por campo). Ver Fase 5 (BUILD_LOG).
- ✅ **Twenty (write-back):** editar en CT un **cliente/contacto** ya sincronizado —o mover el **stage** de una
  oportunidad— empuja sus **campos gestionados** vía Outbox (`twenty.push` → `runTwentyEntityPush` → `PATCH /rest/{objeto}/{id}`), resolviendo el id de
  Twenty por `external_identities`. Alcance v1: **solo actualizar existentes** (los nuevos se crean en Twenty).
  - Campos: company `name`/`domainName`/`industry`; person `name`/`emails`/`phones`/`jobTitle`; opportunity **sólo
    `stage`** (recortado el 2026-09-02 por ADR-008: CT es su máquina de estados y nada más; antes empujaba también
    `name`/`amount`/`closeDate`, que son de Twenty). CT y Twenty mantienen el **mismo enum de stage** → mapeo directo (entonces 8;
    hoy **13**, realineados en la sesión 33 / migración `0023_m39` porque el owner los cambió en Twenty); industry
    TEXT; los compuestos (name/emails/phones/domainName/amount) se arman con su forma exacta.
    **Ojo al mantenerlo:** el mapeo es por identidad y no valida nada, así que si los dos enums se separan no salta
    ningún error — el pull cae a `LEAD` y el push devuelve `400`.
  - Sin ciclos: solo se empuja en ediciones de **USER** (el sync es SYSTEM y no re-emite). PATCH parcial → no pisa los
    campos que CT no gestiona.
  - Verificado: unit (reverse mappers) + integración (emite en UPDATE, no en CREATE, skip sin identidad, SYSTEM no
    emite) + **smoke en vivo** contra Twenty real (industry '' → TEST-WRITEBACK → restaurado; name/domain intactos).
- 🟡 **Pendiente (fase posterior):** crear en Twenty desde CT (POST), y write-back de tareas si se decidiera.

### E-2 · Today's Work: priorización y vistas de tareas 🟢 hecho (Fase 4)
- ✅ **Home** muestra sólo tareas activas con fecha == **hoy** (sin vencidas ni completadas), en la zona horaria de la org;
  las **vencidas** salen de la lista y aparecen como **aviso** (severidad alta) con enlace a `/tasks` para reprogramar.
- ✅ **Vista global `/tasks`** con buckets **Vencidas / Hoy / Esta semana / Próximas / Bloqueadas / Sin fecha** (helper de
  dominio `taskBoardBucket`, ordenado por prioridad→fecha), con **reprogramación rápida de fecha** por tarea (`TaskDueDateControl`)
  y estado editable. Enlazada desde Projects ("Ver todas las tareas").
- ✅ **Retención de completadas** (Settings): conservar siempre o borrar tras N días (el registro queda en `audit_logs`);
  barrido automático en el worker + botón "Purgar ahora". `dueDate` en el form de creación de tarea ya se añadió en Fase 1.
- 🟡 **Pendiente:** vista/creación de tareas por asignado (multiusuario) y "esperando terceros" — cuando haya más usuarios.

### E-3 · Módulo Business con más profundidad 🟢 hecho (Fase 1 + Fase 5)
- ✅ Detalle + edición de Strategic Area / Goal / Capability / Service (Fase 1). **Área↔Goal** navegable en ambos sentidos
  (Fase 5): el detalle de Área lista sus Goals; el form de crear Goal y su detalle tienen **selector de Área** (nombre→id); la
  lista de Goals muestra su Área.
- 🟡 **Pendiente (fase posterior):** Initiatives (jerarquía Área→Goals→Iniciativas) y sub-goals (`parent_goal_id` existe pero
  sin UI).

### E-4 · Scoping de las fuentes externas 🟢 resuelto en la práctica
- **Notion:** el sync por *search* se retiró; ahora el motor **tipado** apunta a **DBs concretas** (`configuration.databases.*`),
  así que solo trae lo configurado. **Drive:** scoping por **carpeta** (`configuration.folderId`, F-21). **GitHub:** acotado por
  `GITHUB_OWNER` (**con paginación**, F-17 ✅). Cada ámbito vive en `integrations.configuration`. Idempotencia resuelta.
- 🟡 **Menor pendiente:** permitir **varias** carpetas/DB por proveedor (hoy es una carpeta de Drive y un conjunto fijo de
  DBs de Notion). La paginación de GitHub ya está hecha (F-17).

### E-5 · Activos por cliente/proyecto ✅ hecho CT-nativo + espejo a Notion (Fase 8)
- **Hoy:** `assets` no enlaza a cliente ni proyecto (A-3); accesos/apps/infra son el dominio Application/Environment/
  InfrastructureResource = **Fase 2** (ERRATA-009).
- **Objetivo:** por cada cliente, ver todos sus activos entre sus proyectos: accesos a cuentas/canales, programas activos/
  en construcción/hosteados (en tu infra o la del cliente), con **referencia a la fuente** — **NUNCA el secreto** (regla dura #2;
  solo "existe este acceso, está en el gestor X"). Requiere: enlace asset↔client/project + tipos de asset (ACCESS/HOSTED_APP/
  INFRA) o traer Application/Environment/InfrastructureResource de Fase 2. ADR + migración.

### E-6 · Canales de captura del Inbox 🟢 hecho (Fase 7) — PROBADO
- ✅ **Canales con nombre** (tabla `inbox_channels`, migración 0004): cada canal = conexión con **token** (SHA-256 hasheado,
  mostrado una sola vez). Webhook `POST /api/v1/inbox/webhook/[channelId]` autenticado por token (sin sesión, rate-limited) →
  crea entrada en el Inbox con `source_type` = nombre del canal. Gestión en Knowledge → Inbox → "Canales de captura"
  (crear/activar/desactivar/regenerar/eliminar; sólo OWNER). Es el **conector universal**: n8n/email/extensión/ChatGPT apuntan
  al webhook. e2e J13 (captura con token válido; 401 con token inválido o canal desactivado).
- 🟡 **Futuro:** canales con nombre específico (email dedicado, extensión) como envoltorios finos sobre este webhook.

### E-7 · Vistas de detalle + "Open source" consistente (Knowledge, Decisions, todo) ✅ COMPLETO (Fase 1 + Fase 5)
- ✅ **Detalle + edición inline** construido para TODAS las entidades de lista (Knowledge Item/Decision/Asset, Contact/
  Opportunity, Capability/Goal/Strategic Area, Task/Deliverable). Ficha `DescriptionList` + `InlineEditSection` (PATCH →
  refresh) + "Fuente de verdad" + timeline. Título de cada lista enlaza a su detalle. Form de Decision capta context/rationale;
  form de Task capta descripción/dueDate. Verificado con J6 del e2e. Ver `BUILD_LOG.md` (Fase 1).
- ✅ **Hecho (Fase 2):** `SourceBadge` uniforme (nativo vs Twenty/Notion/GitHub/Drive + "Open external") en las listas de
  Knowledge Library, Assets, Portfolio y Clients, y en los detalles (Client con "Open in CRM" real/condicional vía
  `external_identities`, sin pull). Ver `BUILD_LOG.md` (Fase 2).
- ✅ **Cerrado (Fase 5, ver F-6):** editar **relaciones por nombre** (selector nombre→id) está hecho y hoy es el patrón
  estándar de los campos `relation` del panel lateral. No queda nada pendiente de este ítem.

### E-8 · Automatizaciones reales + scheduler 🟢 hecho (Fase 6)
- ✅ **Scheduler:** `enqueueScheduledSyncs` en el tick del worker encola un sync por integración conectada **una vez
  al día** a `SYNC_DAILY_HOUR` (default 7 = 7am) en la zona horaria de la org, dedup en PENDING. (Antes: cada 15 min.)
- ✅ **Automatización por evento (1ª):** **Opportunity WON → crear Project**. `changeOpportunityStage` emite
  `opportunity.won` en el Outbox **atómicamente** al pasar a WON (sólo en la transición, no si ya estaba WON); el handler
  del worker llama `createProjectFromWonOpportunity` (hereda cliente, enlaza `opportunityId`, **idempotente**: no duplica).
  Sin constructor visual (ERRATA-009). Verificado: integración (emite + crea + idempotente + no-emite en stage no ganador) +
  smoke live (evento → proyecto; re-emit → 1 solo proyecto).
- 🟡 **Futuro (más automatizaciones, a demanda):** Project CLOSED → postmortem; error de integración → **alerta**
  (necesita HAB-1, el canal de notificación: ya está elegido —bot de Telegram— pero sin implementar). El error de
  integración **sí es visible en la app** desde F-16, lo que falta es que te avise sin mirar.
- ✅ **Inventario + control (Sesión 5, 2026-08-17):** pestaña **Automatizaciones** (`/automation/list`) que lista las 14
  automatizaciones (catálogo en código `packages/application/src/automations/catalog.ts`) con título/estado/frecuencia y
  un **panel lateral** (`?auto=<key>`) con todos los detalles + **activar/desactivar** (enforcement real por org en
  `organizations.settings.automations`, guardas `isAutomationEnabled` en worker/barridos; núcleo = solo lectura) +
  **«Ejecutar ahora»** (sync → encola job; sweep → inline). API en `app/api/v1/automations`.
- 🟡 **Diferido (ideas para el panel, el owner sólo pidió "Ejecutar ahora"):** (1) ~~ver ejecuciones recientes~~ →
  **hecho para los syncs** (F-16: `sync_runs` con contadores y fallos en la página de Integraciones); faltaría lo mismo
  para los **barridos** y los eventos de outbox; (2) **editar cadencia/config inline** (hora del sync diario, días de
  retención, ventana de autoarchivado); (3) **enlace directo a la integración/origen** desde cada sync/evento.

### E-9 · Settings 🟢 hecho (Fase 3)
- ✅ **Construido:** `/settings` con **organización editable** (nombre, zona horaria, moneda por defecto — persistidos en
  `organizations.settings` jsonb, migración aditiva 0003; sólo OWNER vía `manage_org`), **perfil** de usuario (nombre/email/rol,
  lectura), acceso a **Integraciones**, y aviso de seguridad sobre el **registro abierto** (B-6). Sidebar "Settings" habilitado.
- ✅ **Edición del nombre (2026-09-01):** se edita en línea en Ajustes › Tu perfil (`updateProfile`).
- 🟡 **E-9a · Cambiar email y contraseña con verificación — PENDIENTE (decisión del owner, 2026-09-01).** El email se
  llegó a hacer editable y **se revirtió el mismo día**: es la credencial de acceso y cambiarlo escribiendo otro, sin
  comprobar que el buzón existe ni que es tuyo, convierte una sesión robada en una cuenta robada. Hoy es **solo
  lectura** (esquema `.strict()`: mandarlo en el cuerpo da error de validación, no se ignora en silencio).
  **Cuando se aborde, con su propio flujo:** (1) pedir la **contraseña actual** para confirmar identidad; (2) enviar un
  correo de **verificación al email nuevo** y no aplicar el cambio hasta que se confirme (token de un solo uso y
  caducidad corta); (3) **avisar al email anterior** de que se ha solicitado el cambio; (4) invalidar/rotar sesiones
  tras el cambio; (5) lo mismo para la **contraseña** (actual + nueva, y cierre del resto de sesiones).
  Better Auth trae piezas para esto (`changeEmail`, `changePassword`, verificación por correo, hoy desactivada) →
  conviene apoyarse en ellas en vez de escribir en `users` a mano. Encaja con **HAB-1** (hace falta un canal de correo).
- 🟡 **Pendiente (fase posterior):** gestión de usuarios/roles con **invitaciones** (E-11). El **registro abierto ya
  está cerrado** (B-6, bootstrap-only). *(Nota menor de UI: el login sigue mostrando el enlace «Regístrate» aunque el
  alta ya falle; conviene ocultarlo.)*

### E-10 · Internacionalización (i18n / multiidioma) ✅ HECHO (2026-09-01) — un idioma, estructura lista
- **Ahora:** toda la UI de la app (títulos, etiquetas, navegación) se alinea a **español** (se van traduciendo por vista;
  Home + navegación + componentes compartidos ya en español). Los valores de enum mostrados (ACTIVE, WON…) siguen en inglés
  (son datos de dominio) — decidir si se muestran traducidos vía un mapa de etiquetas.
- **Hecho (2026-09-01), con el alcance que pidió el owner:** un solo idioma (español) pero **todo el texto de la app
  externalizado** y la estructura lista para añadir otro. `apps/web/lib/i18n/`: diccionario `es.ts` (≈580 claves) +
  `t(key, vars)` con interpolación, `tPlural` (claves `.one`/`.other`) y `tOptional` para claves dinámicas.
  `enumLabel` lee ahora `enum.<CODIGO>` del diccionario. **Los datos del usuario y lo importado de terceros NO se
  traducen** (siguen mostrándose tal cual). Tests: paridad de claves entre diccionarios, sin valores vacíos y
  **cobertura de todos los códigos de enum del dominio** (se resuelven en runtime, TypeScript no los protege).
- **Para añadir un idioma:** copiar `es.ts`, traducir los VALORES (las claves no se tocan), registrarlo en
  `dictionaries`/`LOCALES` y hacer que `resolveLocale()` devuelva la preferencia real. No hay que tocar ninguna vista.

### E-11 · Espacios de trabajo + colaboradores con jerarquía de permisos 🔴 futuro (petición del owner)
- **Idea:** pasar de single-user a **multi-workspace**: crear espacios de trabajo e **invitar colaboradores** con una
  **jerarquía de permisos** (roles OWNER/ADMIN/MEMBER/VIEWER ya existen en el dominio, pero el registro es single-user y
  abierto — ver B-6). Requiere: invitaciones, gestión de miembros/roles por workspace, aislamiento por workspace
  (hoy el aislamiento es por `organization_id`), y cerrar el registro abierto.
- **Para implementarlo:** modelo de invitaciones + UI de miembros/roles + auth con selección de workspace + endurecimiento
  de seguridad multiusuario (ver `SECURITY_CHECKLIST.md` Parte II). Cambio de arquitectura grande; abordar cuando se
  quiera colaborar en equipo.

### E-12 · Filas de lista: reordenar (diferido) · ver archivados (✅ hecho)
Del trabajo "fila de lista como componente" (`DataTable`, columnas alineadas + selección + **archivar**).
- **Drag & drop en el Kanban de oportunidades** ✅ HECHO (2026-09-01, ver B-1): eventos nativos de HTML5, sin
  dependencias nuevas.
- **Drag-reorder** (arrastrar FILAS de lista) 🟡 SIGUE DIFERIDO: necesita orden manual persistido por entidad
  (`sortOrder`) + endpoint de reorden + UI drag-and-drop. Solo tiene sentido en listas con orden manual (áreas estratégicas, fases, portfolio, y
  listas de hijos como subtareas/entregables/objetivos); choca con los `orderBy` por fecha/nombre del resto. Hoy solo
  `strategic_areas` y `project_phases` tienen `sortOrder`.
- **Ver archivados / restaurar** ✅ HECHO: página central **Ajustes › Archivados** (`/settings/archived`) que agrupa lo
  archivado por entidad y permite **restaurar en lote** (`restoreRecords` + `POST /api/v1/restore`, pone `archived_at =
  null`). `DataTable` admite modo `restore`. Se optó por una vista central (una query genérica `listArchived`) en vez de
  un toggle por lista (habría requerido parametrizar ~15 queries).

### E-13 · Sistema de tema: tokens semánticos + primitivas 🟢 hecho (queda opcional)
Se centralizó el tema: tokens semánticos en `globals.css` + primitivas `Button`/`Input`/`Card`/`TextLink` + refactor de
`status-tone`/`health-badge`/`source-badge`. **Migración del color inline COMPLETA**: todo el `neutral-*`/`dark:` y los
rojos/ámbar sueltos de páginas y componentes pasaron a tokens (de ~592 usos crudos a 0, salvo el bloque de código de
markdown y los overlays `bg-black/*`). Luz idéntica; oscuro unificado. Guía y estado en **`docs/DESIGN_TOKENS.md`**.
**Opcional pendiente:** adoptar `<Card>` donde aún hay `rounded border border-line` a mano (cosmético). Selector de
tema claro/oscuro: ✅ hecho (está en el menú de usuario). Tipografía por `next/font`: ✅ hecha (Inter auto-hospedada).
**Añadido (2026-09-01):** tokens `--ring` (foco de teclado) y `--row-selected` (fila seleccionada) → los últimos 4
colores crudos (`accent-neutral-*`, `bg-blue-50/60`) desaparecen; 0 colores crudos fuera de `markdown`/overlays.

### E-14 · Rendimiento: consultas por página e índices 🟡 EN CURSO — instrumentación ✅ hecha (2026-09-02), falta MEDIR en la Pi
- **Origen:** al retirar el esqueleto de carga (sesión 26) el owner dijo que las páginas tardan **varios segundos**
  en la Pi. Eso es más de lo que debería tardar aunque el hardware sea modesto, así que **hay que medirlo**, no
  suponerlo. Ojo: el esqueleto no era la causa, sólo lo hizo visible.
- **Lo que ya se sabe (recogido el 2026-09-01, sin optimizar nada todavía):**
  - Las **47 páginas** de `(app)` son `force-dynamic` ⇒ cada navegación es un render en servidor con sus consultas.
    No hay ni una estática ni cacheada.
  - Sólo **18 de 47** agrupan sus consultas en `Promise.all`; las demás las encadenan con `await` secuenciales, así
    que suman latencias de ida y vuelta en vez de solaparlas. Las más cargadas: ficha de proyecto (~20 llamadas),
    Conocimiento (~19), ficha de cliente (~14), Estado del sistema (~12).
  - **Índices:** el inventario NO muestra un agujero evidente. `change_events` y `deliverables` no tienen índice que
    empiece por `organization_id`, pero se consultan por `(entity_type, entity_id)` y por `project_id`
    respectivamente, y ambos existen; `jobs`/`outbox_events` van por `(status, available_at)`, que es como los lee el
    worker. Es decir: **no dar por hecho que el problema son los índices** hasta medir.
  - `change_events` es **append-only y no rota nunca** (a diferencia de `jobs`/`outbox_events`, F-24). Con el tiempo
    es la candidata a crecer sin freno; el bloque «Historial» del panel la consulta en cada apertura.
  - **Añadido en la sesión 27 (ver F-28):** ninguna consulta de lista lleva `LIMIT`, y además `listProjects`
    (`projects/queries.ts:88`) carga en memoria **todos los clientes y todos los contactos** de la organización en
    cada petición sólo para resolver dos nombres para mostrar (debería ser un `leftJoin`). Mismo patrón en el resto
    de listas. Hoy no se nota con datos de un usuario, pero es techo cero: cuando se note, se notará de golpe.
- **✅ Paso 1 HECHO (2026-09-02) — ya hay con qué medir.** No existía **ninguna** instrumentación en el proyecto,
  así que «medir primero» no se podía ni intentar. Ahora:
  - `packages/db/src/instrument.ts` mide **toda** consulta (web y worker) envolviendo `unsafe()` del cliente de
    postgres.js, que es por donde Drizzle ejecuta todo. Mide de **emisión a resultado**, con la espera por una
    conexión libre del pool dentro — a propósito: si el pool se queda corto, se ve aquí en vez de quedar invisible.
  - **`Server-Timing`** en todas las rutas `/api/v1/*` (`db;dur` + `total;dur`), visible en la pestaña Red del
    navegador sin instalar nada.
  - **Aviso de consulta lenta** en el log por encima de `DB_SLOW_QUERY_MS` (200 ms por defecto), y
    `DB_LOG_QUERIES=true` para registrar todas en una sesión de diagnóstico.
  - **`scripts/measure-perf.sh`**: se corre **en la Pi**, inicia sesión y saca una tabla de tiempo de pared por
    página (fría / mejor / media) más el reparto `db`/`total` de las rutas de API. Cómo interpretarlo, en
    `DEPLOYMENT.md § Medir el rendimiento`.
- **⚑ Dato que cambia la hipótesis de este ítem.** Medido en el portátil con el build standalone y la app
  caliente: **12–27 ms por página**. El código no hace nada patológico, así que **contar consultas e índices
  probablemente NO es la causa** de los «varios segundos» de la Pi. Sí salieron dos números altos que conviene
  mirar cuando toque optimizar: `/api/v1/context/home` hace **28 consultas** y la búsqueda global **18** (una por
  entidad). Sospecha principal a comprobar en la Pi: **presión de memoria / swap contra la tarjeta SD** — enlaza
  directamente con **F-31** (ningún servicio tiene límite de memoria).
- **Qué queda (en este orden):**
  1. **Correr `measure-perf.sh` en la Pi** y mirar `free -h` / `docker stats` a la vez. Sin ese dato, cualquier
     optimización es a ciegas.
  2. Con el dato, atacar lo que salga: paralelizar los `await` encadenados de las páginas gordas, `EXPLAIN ANALYZE`
     de las consultas lentas, e índices sólo donde el plan los pida.
  3. Revisar si algo se puede sacar de `force-dynamic` (o cachear por poco tiempo) sin romper el aislamiento por
     organización.
  4. Decidir qué hacer con `change_events` a largo plazo (¿rotación como en F-24, o retención propia?).
- **Contexto que importa:** el owner **descartó** los esqueletos de carga (ver `AUDIT_UIUX_2026-08-30.md`), así que el
  arreglo tiene que ser rendimiento de verdad, no maquillaje mientras se espera.

---

## Cómo se mantiene este documento
Cada milestone añade aquí lo que encuentre (misma tabla: hallado en / MVP actual / para implementarlo).
El detalle cronológico está en [`BUILD_LOG.md`](./BUILD_LOG.md); las decisiones firmes en
[`DECISIONS_FROZEN.md`](./DECISIONS_FROZEN.md) y los ADRs.

---

## Hallazgos durante Fase 1/2 (a tener en cuenta / mejoras futuras)

### F-1 · "Open in CRM" — URL del registro externo 🟢 hecho (Bloque 2 · Fase 0A)
- ✅ Los `sync-*` ahora guardan `metadata.url` en `external_identities` (refrescada en `upsertIdentity` on-conflict). Para
  Twenty se deriva el deep-link de un **`TWENTY_CRM_URL`** (URL del navegador/Tailscale) → `.../objects/<plural>/<id>`; sin él,
  `metadata.url` queda null (el detalle ya lo maneja). Para Notion/GitHub/Drive se guarda la URL del propio registro.
- ✅ **Verificado al conectar Twenty:** el formato real es `/object/<singular>/<id>` (el de lista daba 404); corregido y
  re-sincronizado — ver **F-14**.

### F-10 · Salud de integración ahora se actualiza 🟢 hecho (Bloque 2 · Fase 0A)
- ✅ El worker envuelve cada sync (`withIntegrationHealth`): al terminar marca `ACTIVE`, si falla `ERROR`, y setea
  `lastHealthCheckAt` (antes `setIntegrationHealth` era código muerto → la página mostraba siempre "sin check").

### F-2 · SourceBadge en Contacts y Opportunities 🟢 hecho (Bloque 2 · Fase 0B)
- ✅ Listas de Contacts (columna Fuente) y Opportunities (badge por tarjeta) y sus detalles (badge en cabecera + fila "Fuente de
  verdad" + "Open in CRM" cuando hay identidad Twenty), reusando `listIdentitiesByInternalType` / `getIdentityForInternal`.

### F-11 · `created_by_user_id = ctx.userId` rompía en sync (SYSTEM) 🔴 hecho (Bloque 2 · Fase 0B)
- **Bug latente:** `createKnowledgeItem`/`promoteInbox` ponían `created_by_user_id: ctx.userId`; el worker corre los syncs con
  `ctx.userId='system'` (no es UUID) → el INSERT en la columna uuid habría **roto el sync de Notion** en producción (los tests
  usaban un UUID real y no lo detectaban).
- ✅ **Fix:** helper `creatorId(ctx)` → null si `ctx.userId` no es UUID. Regresión cubierta en `notion-sync.test.ts` (sync como
  SYSTEM crea items con `created_by_user_id` null + audit `actorType=SYSTEM`).

### F-3 · Documents: lista + detalle (solo lectura) 🟢 hecho (Fase 4)
- ✅ `/knowledge/documents` (lista con SourceBadge + "Abrir en Drive") y `/knowledge/documents/[id]` (detalle **solo lectura**
  que redirige al archivo real en su origen; CT no exporta ni guarda el contenido). Card en la overview de Knowledge.

### F-21 · Drive: auth por cuenta de servicio + scoping por carpeta 🟢 PROBADO EN VIVO (Fase 4)
- ✅ `makeGoogleTokenProvider` (JWT-bearer de service account, cachea el token; test unitario RS256); `HttpDriveDataSource` con
  `getToken` + `folderId` (scoping E-4) + paginación; worker arma el proveedor desde `GOOGLE_SA_KEY_B64` y lee `folderId` de
  `integrations.configuration`. **Verificado en vivo:** token OK, carpeta compartida con la SA → 1 archivo → `documents`
  (provider GDRIVE + enlace), job COMPLETED, GDRIVE ACTIVE, re-sync idempotente.
- **Gotcha de setup (para futuros secretos):** el `.env` del owner tenía la línea **duplicada**
  (`GOOGLE_SA_KEY_B64=GOOGLE_SA_KEY_B64=<b64>`) por copiar a mano → JSON inválido. Validar siempre el base64 decodifica a JSON
  antes del sync.

### F-4 · `updateX` (edición inline) no emitía change_events por campo ✅ RESUELTO (2026-09-01)
- **Estado original:** las ediciones registraban `audit_log` (UPDATE) pero no el diff; sólo status/stage emitían eventos.
- **Resuelto:** helper `recordFieldChanges(before, changed)` en `audit/index.ts` — compara lo que el UPDATE va a escribir
  con la fila previa y emite **un** `change_event` `FIELDS` con **sólo los campos que cambian**; si no cambia nada, no
  escribe (el panel autoguarda por campo y llenar la tabla de eventos vacíos la haría inútil). Cableado en los `update*`
  de project, task, deliverable, client, contact, opportunity, strategic_area, goal, capability, service,
  knowledge_item, decision, asset, resource, learning_item, portfolio_item y knowledge_inbox.
- **Superficie:** `listEntityChanges` + `GET /api/v1/history` + bloque **«Historial»** plegable al pie del panel lateral
  (carga bajo demanda y traduce el nombre técnico del campo a su etiqueta del formulario).

### F-5 · `source_type` es varchar libre (sin enum) 🟢 nota
- `knowledge_items/inbox.source_type` no tiene enum. `SourceBadge` mapea etiquetas conocidas (MANUAL/NOTION/GITHUB/GDRIVE/TWENTY)
  y cae al literal crudo para desconocidos. Si se estandariza el conjunto, crear un enum en `@ct/domain`.

### F-6 · Edición de relaciones por nombre 🟢 hecho (Fase 5)
- ✅ `InlineEditSection` ahora acepta opciones etiquetadas `{ value, label }` (además de `string[]`), lo que permite selects
  **nombre→id**. Aplicado a: **Goal→Área**, **Contact→Cliente**, **Opportunity→Cliente/Contacto** (los commands ya validaban
  pertenencia a la org). El patrón queda disponible para cualquier relación futura (p. ej. Task→Proyecto, F-8).

### F-7 · `organizations` no tenía columnas de ajustes → migración aditiva en Fase 3 🟢 resuelto
- El modelo físico congelado no incluía timezone ni defaults. Fase 3 añade `settings jsonb` (migración **0003**, aditiva, no rompe
  nada) para guardar `{ timezone, defaultCurrency }`. Timezone se usará en Fase 4 (Today's Work) para ordenar/mostrar fechas.

### F-8 · Tarea↔proyecto es opcional (project_id nullable) ✅ RESUELTO (2026-09-01)
- **Estado:** `tasks.project_id` existe pero es **opcional**; una tarea puede no tener proyecto. En la vista global `/tasks`
  se muestra "Sin proyecto" cuando falta. La creación hoy es siempre contextual (dentro de un proyecto), así que en la práctica
  las tareas creadas por UI sí tienen proyecto; pero el modelo permite huérfanas (p. ej. vía API).
- **Resuelto (2026-09-01):** (a) HECHO — el campo **Proyecto** del panel de tarea es seleccionable: al crear desde la
  vista global `/tasks` se elige proyecto (ya no nace huérfana) y en edición se puede reasignar (el comando aplica la
  exclusión proyecto/oportunidad/personal). Sigue oculto cuando es heredado (subtarea o tarea de preventa).
  (b) **NO se hace** (decisión del owner): obligar `project_id` rompería las tareas personales y las de oportunidad,
  que existen por diseño.

### F-9 · Barrido de retención sin scheduler formal 🟢 nota
- El borrado automático de tareas completadas lo ejecuta el **worker** en su tick (~cada hora, guardado por timestamp en
  memoria), no un scheduler real (E-8 sigue diferido). Es suficiente para retención; si se añade el scheduler, mover allí.
- La purga **no borra tareas que sean padre** de otra (evita romper la self-FK `parent_task_id`); esas se conservan y se
  informa en el resultado (`skippedParents`).

### F-12 · Twenty `domainName` sin esquema rompía `createClient` 🔴 hecho (Bloque 2 · Fase 1, bug real)
- **Detectado en el primer pull real:** Twenty guarda el dominio como `"alondrama.com"` (sin `http(s)://`); `createClientSchema.websiteUrl`
  exige `url()` → el sync fallaba y la integración quedaba `ERROR` (la salud sí se marcó, verificando 0A-2).
- ✅ **Fix:** helper `toUrl()` en `twenty/mapper.ts` normaliza a URL absoluta (o `undefined` si no es parseable). Test de regresión.

### F-13 · Resiliencia por-registro en los syncs 🟢 hecho (Bloque 2 · Fase 1B)
- ✅ Los 4 syncs envuelven cada registro en try/catch: un registro inválido **no aborta el pull**; se acumula en `summary.skipped`
  (`{ entity, externalId, error }`) y el worker lo loguea. Helper común en `integrations/sync-common.ts`. Test de regresión en
  `twenty-sync.test.ts` (industry demasiado largo → sólo ese se salta).

### F-14 · Formato de URL de "Open in CRM" 🟢 corregido (Bloque 2 · Fase 1A)
- El deep-link era `/objects/<plural>/<id>` (lista) → **404**. Corregido a la ruta de detalle de Twenty
  `${TWENTY_CRM_URL}/object/<singular>/<id>` (company/person/opportunity). Re-sync actualizó los `metadata.url` existentes.

### F-16 · Gestión real de errores por-registro (superficie + persistencia) ✅ RESUELTO (2026-09-01)
- **Estado hoy:** la resiliencia por-registro (F-13) **genera** la info (`summary.skipped` = `{entity, externalId, error}`) y **no
  aborta** el sync; hoy sólo se puede consultar por los **logs del worker**. Falta "verlo/gestionarlo cómodamente desde la app".
- **Para tenerlo completo (encaja en el módulo Automation):**
  1. **Persistir los skips** — guardar `summary.skipped` (y created/updated) en una tabla propia (p. ej. `sync_runs`) o en
     `jobs`/`change_events`, para tener **historial consultable** por integración.
  2. **Superficarlo en la UI** — en `/automation` o en el detalle de la integración: "última sync: N creados, M actualizados,
     K saltados" + la **lista de fallidos con su motivo**.
  3. **Salud más fina** — hoy la integración es `ACTIVE`/`ERROR` global; añadir un estado intermedio **"ACTIVE con advertencias"**
     cuando el sync termina bien pero con `skipped > 0`.
- **✅ Resuelto (2026-09-01), los tres puntos:** tabla **`sync_runs`** (migración 0015/m31) con una fila por ejecución
  (provider, jobType, creados/actualizados/borrados, `skipped_count`, el detalle de los saltados en jsonb —recortado a
  50— y el error si falló el sync entero); estado `COMPLETED` · `COMPLETED_WITH_WARNINGS` · `FAILED`. `toSyncOutcome`
  normaliza el summary de cualquier sync. En **/automation/integraciones**: "última sync: N creados · M actualizados",
  chip ámbar con los saltados y «Ver detalle» con el motivo de cada uno, más el badge **«Con advertencias»** junto al
  estado (sin inventar un estado nuevo en el CHECK de `integrations`). Retención: barrido diario que conserva los 50
  runs más recientes por proveedor.

### F-15 · compose.yml local ahora carga `apps/control-tower/.env` (opcional) 🟢
- El `compose.yml` self-contained no inyectaba los secretos de integración al worker. Añadido `env_file: [{ path: ./.env,
  required: false }]` (no rompe si no existe). `environment` sigue ganando (DATABASE_URL → servicio `db`).

### F-17 · GitHub: sin paginación (tope 100 repos) + scoping por `GITHUB_OWNER` ✅ RESUELTO (2026-08-31)
- **Era:** el cliente pedía `?per_page=100` **sin paginar** → con >100 repos sólo traía los primeros 100.
- **Resuelto:** `git/client.ts` sigue el header `Link: rel="next"` hasta agotar las páginas (helper `nextLink`), con test
  unitario. Twenty pagina por cursor y Notion respeta `Retry-After` (misma tanda). Scoping: `GITHUB_OWNER` acota a un
  usuario/org (`/users/<owner>/repos`); sin él usa `/user/repos`.

### F-18 · Tareas con doble origen: CT-propias + importadas de Twenty 🟢 código listo (Bloque 2)
- **Contexto:** Twenty tiene su propio objeto **Task** (relacionado con records/oportunidades) — es la única de las apps
  conectadas con ese objeto. Las tareas de CT deben poder **coexistir**: unas creadas en CT (propiedad de CT) y otras
  importadas de Twenty (marcadas como origen Twenty), **todas juntas en la misma sección** `/tasks` para una visión
  completa, y **creables en ambos sitios sin conflictos** (cada tarea tiene un único dueño = su origen → sin peleas de
  campo).
- **Estado hoy:** el sync de Twenty (`sync-twenty.ts`) trae company/person/opportunity, **NO** tasks. Todas las tareas
  de CT son hoy CT-propias.
- **Para implementarlo (trabajo nuevo):**
  1. Añadir **Task** al pull de Twenty (`twenty/client.ts` + `mapper` + `sync-twenty.ts`): task de Twenty → `tasks` de CT,
     con identidad en `external_identities` (provider=TWENTY, internalType='task') → así el origen se sabe sin columna
     nueva (mismo patrón que el SourceBadge de clients/contacts).
  2. Mapear las **relaciones** de la task de Twenty (targets: company/person/opportunity) → `client_id`/`opportunity_id`
     de CT (verificar; Twenty no tiene "project" nativo salvo objeto custom).
  3. En `/tasks`, mostrar el **badge de fuente** (CT vs Twenty) reusando `listIdentitiesByInternalType(ctx,'task')`.
  4. (Opcional, E-1) **push** de tareas CT→Twenty si se quiere crear en CT y que aparezca en Twenty; si no, cada una vive
     en su origen y solo se **leen** juntas.
- **Notion:** ninguna tarea se refleja a Notion por ahora (ver §4.8 del contrato).
- ✅ **Hecho (Bloque 2):** pull de Twenty **tasks** → `tasks` de CT (identidad TWENTY/task; sin proyecto), badge de fuente CT/Twenty en la vista global `/tasks`. Pendiente sólo la **verificación en vivo** (el owner no tiene tareas en Twenty aún: crear una de ejemplo).

### F-25 · La purga de archivados dejaba fuera media aplicación, y en silencio 🔴 RESUELTO (2026-09-01, bug real)
- **Aviso del owner (2026-09-01):** «controla que los botones de purga están funcionando bien y no tienen errores,
  porque ahorita activé uno y dio error de servidor».
- **Reproducido** con un grafo completo de una fila por entidad archivable contra Postgres real: de 19 entidades
  archivadas y vencidas, `purgeArchivedRecords` borraba **14** y devolvía `skipped: 2` sin decir qué ni por qué.
- **Tres defectos encadenados:**
  1. `payment` y `review_item` estaban en `ARCHIVABLE` pero **no en `PURGE_ORDER`** → se podían archivar y no se
     purgaban nunca. Ni error ni aviso.
  2. El orden hijo→padre estaba **mal**: `document` y `review_item` iban después de sus padres, así que la FK
     bloqueaba `project`, `client` y `knowledge_item` **en todos los barridos**, no sólo en uno. El comentario decía
     «se reintenta en el siguiente barrido», pero el bloqueo era estructural: no se resolvía nunca.
  3. No se borraban las **hijas no archivables** que cuelgan del registro (`project_phases` —con
     `projects.current_phase_id` apuntándolas—, `project_assets`, `service_capabilities`), así que un proyecto o un
     servicio archivado era imborrable por definición.
- **Arreglado:** orden rehecho desde las FKs reales (`pg_constraint`), `deleteDependents` para las hijas, y **varias
  pasadas** para las auto-referencias (subtarea→tarea, decisión superseded, objetivo padre), parando en cuanto una
  pasada no avanza. Resultado: 19/19, `blocked: {}`.
- **Y que se note:** lo que un registro **vivo** aún referencia se sigue conservando a propósito, pero ahora se
  devuelve en `blocked` por entidad, se dice en el botón y se escribe con `logger.warn` + el error real. El
  `catch {}` mudo era lo que hacía el problema invisible.
- **Blindaje del resto:** `purgeCompletedTasks` protege cada borrado por separado (un fallo en una tarea ya no tumba
  el barrido entero con un «Error interno»), `purgeReviewedItems` deja rastro en `audit_logs` y
  `updateReviewItemStatus` pasa por `mapDbError`.
- **Faltaba además el botón** de «Purgar ahora» en la política de «Por revisar» → añadido con su ruta
  `POST /api/v1/maintenance/purge-reviewed`.
- **Regresión:** `packages/application/src/maintenance/archive.test.ts` obliga a que toda entidad archivable tenga su
  sitio en el orden de purga; `tests/integration/retention.test.ts` cubre los cuatro casos contra Postgres real.
- **Nota honesta:** el **error de servidor** concreto que vio el owner **no se ha reproducido**. Ninguno de los dos
  botones lanza excepción ni con el grafo completo ni con FKs bloqueadas. Si vuelve a aparecer, ahora el log del
  servidor dirá exactamente qué registro y qué error.

### F-24 · Rotación del histórico de procesos (el log ya no crece sin límite) ✅ RESUELTO (2026-09-01)
- **Punto de partida:** ni `jobs` ni `outbox_events` se purgaban nunca. Eso permitía descargar el histórico completo,
  pero a la larga crece sin freno.
- **Decisión del owner (2026-09-01):** rotar como un log — **por tamaño** (al superar N procesos terminados se cierra
  un lote y el activo vuelve a empezar) y guardando los lotes **en la propia base de datos, comprimidos**, para que el
  `pg_dump` de `backup.sh` los respalde sin gestionar ficheros ni permisos en la Pi.
- **Implementado:** tabla `job_log_archives` (migración 0016/m32) con `seq` incremental por organización, rango de
  fechas, nº de filas, tamaño y el **CSV en gzip**. `rotateJobLog` archiva **sólo lo TERMINADO**
  (COMPLETED/FAILED/CANCELLED) — un job PENDING/PROCESSING es trabajo vivo del worker y nunca se toca — y borra esas
  filas de `jobs`. Umbral `JOB_LOG_ROTATE_ROWS` = 5.000, en el barrido diario del worker.
- **UI:** en Estado del sistema, «Descargar CSV» baja el log **activo** y, cuando existe algún lote, aparece
  **«Archivos de log anteriores»** con su rango, nº de procesos y tamaño, cada uno descargable (se descomprime al vuelo).
- **Aparte, log de Docker:** el compose **no configuraba `logging`**, así que el json-file de web/worker/db crecía sin
  límite en la Pi. Ahora los tres llevan `max-size: 10m` + `max-file: 3` (30 MB máximo por servicio).
- **`outbox_events` rota igual (2026-09-01):** misma mecánica con sus estados terminales, `PROCESSED` y `FAILED`
  (PENDING/PROCESSING = envío vivo, nunca se archiva). Los dos logs comparten **una sola tabla** `log_archives` con un
  discriminador `kind` (JOBS/OUTBOX) y numeración de lote independiente por tipo: una tabla, un endpoint de descarga y
  una sección de UI en vez de duplicarlo todo. Migración 0017/m33 (renombra la tabla del lote anterior conservando su
  contenido).

### F-23 · Resumen vacío en conocimientos procesados · la bandeja NO conserva las capturas ✅ CERRADO (2026-09-01)
- **Aviso del owner:** «los knowledge items que procesé tienen el Resumen vacío».
- **Verificado:** el flujo actual **sí** copia el texto capturado al Resumen (`promoteInboxToItem`:
  `summary = data.summary ?? inbox.rawContent`), en la misma transacción del promote. Dos tests de integración lo fijan
  (captura → promover, y captura → editar la descripción en el panel → promover). Ese comportamiento entró el
  **2026-08-17** (`c1a3185`): lo promovido ANTES quedó con el resumen vacío y no se rellena solo → esos elementos se
  arreglan a mano (el campo Resumen es editable en el panel).
- **⚑ DECISIÓN DEL OWNER (2026-09-01): la purga inmediata de la bandeja es INTENCIONADA. NO se le pone retención.**
  Al procesar una captura, su texto pasa a la biblioteca; conservar además la captura sería una **segunda copia de la
  misma información** y llenaría la bandeja. Las descartadas tampoco se guardan.
  Se llegó a implementar una retención configurable (`settings.inboxRetentionDays`) creyendo que la purga sin ventana
  era un descuido: **se revirtió entera** al aclararlo el owner. El comando lleva el comentario correspondiente para que
  no se vuelva a "arreglar".

### F-22 · El pull de Twenty revertía en silencio un cambio local cuyo write-back había fallado 🔴 RESUELTO (2026-09-01, bug real)
- **Síntoma (owner):** «cambio el estado de una oportunidad en CT y me lo sigue reportando con el estado anterior hasta
  que lo cambio también en Twenty» (dos veces).
- **Causa:** el cambio SÍ se propaga —`changeOpportunityStage` → `recordAudit` → outbox `twenty.push` → `PATCH
  /rest/opportunities/{id}` con `stage`— pero si ese PATCH falla (p. ej. Twenty rechaza el valor: ya pasó con
  CLOSED/CANCELLED antes de que el owner los añadiera allí), **el evento moría en `FAILED` sin ninguna señal en la app**
  y el siguiente pull reescribía la fila con el valor viejo de Twenty. El usuario veía "no se ha guardado".
- **Resuelto, en dos frentes:**
  1. **El pull ya no pisa un cambio local en vuelo:** `syncTwenty` consulta los `twenty.push` en estado
     PENDING/PROCESSING/**FAILED** (`pendingPushTargets`) y **salta** esos client/contact/opportunity, contándolos en
     `summary.skipped` con el motivo (visible en el historial de syncs, F-16). Las **tasks no llevan el guard**: su push
     sólo empuja `dueDate`, campo que el pull nunca reescribe (propiedad por campo), así que no hay conflicto.
  2. **El fallo es visible y reintentable:** `listFailedOutbox` + sección **«Envíos fallidos a sistemas externos»** en
     Automatización › Estado del sistema, con el motivo, el registro afectado y un botón **Reintentar**
     (`POST /api/v1/outbox/failed/[id]/retry`). Antes sólo existía el contador "FAILED: N" sin el porqué.
- **Nota de propiedad:** Twenty sigue siendo el dueño del `stage`; lo que cambia es que **un cambio hecho en CT ya no se
  pierde**: o llega a Twenty, o se queda visible como envío fallido hasta que se resuelve.
- **Cerrar un fallido (2026-09-01):** un envío en `FAILED` **no está resuelto** — agotó sus 5 intentos y nadie lo
  reintenta solo. Dos salidas desde la app: **«Reintentar»** (re-encola y manda el valor que CT tiene AHORA, no el que
  falló) o **«Descartar»**, para cuando el dato ya se corrigió a mano en el sistema externo: pasa a `DISCARDED`
  (migración 0018/m34), deja de avisar y **deja de bloquear el pull** de ese registro, pero se conserva con su motivo.
  Antes sólo se podía reintentar, así que un fallo ya irrelevante se quedaba avisando para siempre y congelando esa
  entidad frente al origen.

### F-19 · Push a Notion en tiempo real (Outbox/E-1) 🟢 hecho (Fase 5) — PROBADO EN VIVO
- ✅ Al crear/actualizar una entidad reflejada en CT, `recordAudit` (sólo actor USER, no el sync SYSTEM → sin bucles) emite un
  evento outbox `notion.push`; el worker lo despacha → `runNotionEntityPush` empuja **esa** entidad a su DB de Notion (~2s).
  Cubre las 8 entidades reflejadas. Verificado en vivo (evento → worker → `res: updated`). El sync programado sigue como red de
  seguridad. **Nota:** algunos `updateXStatus` sin audit (p. ej. de service/KI) propagan por el sync programado, no al instante.
- Config: los `database_id` viven en `integrations.configuration.databases` (no secretos). En prod se setean una vez.

### F-20 · Notion: relaciones "solo en Notion" + Client de Projects diferido 🟢 nota (decisión del owner)
- **Decisión:** las relaciones entre DBs de Notion (KI→Area/Project/Client/Service/Capability, Goal→Area, Project→Service,
  Services↔Capabilities) se **gestionan en Notion a mano**; CT no las trae ni las empuja (el sync es de **campos escalares**).
- **Projects `Client`** (texto en Notion) queda sin rellenar por ahora (habría que resolver `client_id`→nombre). Mejora futura
  fácil (push-only del nombre del cliente).
- Si en el futuro se quisieran esas relaciones en CT, sería migración + 2ª pasada de sync que resuelve `notion_page_id`
  cruzados en el orden de §3 del contrato.

---

## G. Revisión de producto (2026-09-01, sesión 27)

> Origen: el owner pidió **evaluar la aplicación como producto en el estado actual** —calidad de código, UI/UX,
> seguridad (contexto: un usuario, red privada, sin exposición a internet) y qué le falta— explícitamente **sin
> guiarse por lo ya anotado**. Lo que sigue es sólo lo que resultó **nuevo** tras cotejarlo con este registro, con
> `AUDIT_2026-08-30.md`, `AUDIT_UIUX_2026-08-30.md` y `SECURITY_CHECKLIST.md`. Verificado en ejecución:
> `typecheck` ✓ · `lint` ✓ · **76 unit + 157 integración en verde** · 0 `any` / 0 `@ts-ignore` / 0 `eslint-disable`
> en 26.700 líneas propias.
>
> **Dos cosas que la revisión dio por malas y NO lo son** (corregido tras comprobarlas contra el código):
> - **Responsive/móvil**: no es deuda, es **decisión de alcance del owner (2026-08-30)** — la UI es sólo escritorio.
>   Queda como estaba en `AUDIT_UIUX_2026-08-30.md`; se reabre sólo si entra uso móvil o colaboradores (E-11).
> - **Atajo ⌘K**: **ya existe** (`global-search.tsx:33`, ⌘/Ctrl+K con `preventDefault`). No hay nada que hacer.

### F-26 · No existen pantallas propias de error ni de 404 ✅ RESUELTO (2026-09-01)
- **Hallado en:** sesión 27 (revisión de producto).
- **Qué pasa:** no hay **ni un** `error.tsx`, `not-found.tsx` ni `global-error.tsx` en toda la app. Doce fichas
  llaman correctamente a `notFound()` cuando el registro no existe (`projects/[id]`, `tasks/[id]`, `crm/*`,
  `business/*`…), pero al no haber página propia el usuario recibe **el 404 por defecto de Next**: en inglés, sin
  barra lateral y sin forma de volver. Y si un Server Component lanza, en producción la pantalla dice
  *«Application error: a server-side exception has occurred»*.
- **Por qué importa:** es el único punto donde la app se rompe visiblemente delante del usuario, y ocurre
  justo cuando más necesita orientación. Toda la disciplina de i18n y de tokens se evapora ahí.
- **Resuelto (2026-09-01)** con **cuatro** pantallas sobre una primitiva común, `components/ui/message-screen.tsx`
  (misma forma para las cuatro, para que un fallo no parezca de otra aplicación; filete superior en rojo sólo
  cuando es error, para no confundirlo con un 404):
  - `app/(app)/not-found.tsx` — el `notFound()` de las 12 fichas. Lleva **dos salidas**: «Ir al inicio» y
    **«Ver archivados»**, porque la causa más probable de llegar ahí desde un enlace que antes funcionaba es que
    el registro se archivó.
  - `app/not-found.tsx` — URL que no casa con ninguna ruta (fuera del grupo, sin sección donde situarla).
  - `app/(app)/error.tsx` — Server Component que lanza. Con `reset()` para reintentar el segmento sin recargar, y
    mostrando el `digest`: en producción Next oculta el mensaje real y ese hash es lo ÚNICO que permite cruzar
    «lo que vi» con el fallo en `docker logs`.
  - `app/global-error.tsx` — falla el layout raíz. Trae sus propios `<html>/<body>` y su CSS porque nada del layout
    está disponible; única acción posible: recargar.
- **Lo que NO se pudo hacer, y por qué (comprobado, no supuesto):** el 404 de las fichas **se pinta sin la barra
  lateral**. Next no aplica el layout del grupo `(app)` a un `not-found.tsx` aunque el fichero viva dentro. Se
  intentó montar el `AppShell` a mano leyendo la sesión, pero dentro de ese boundary `getCurrentContext()`
  devuelve null (Next no expone las cookies ahí) — quedaba igual y con una consulta de más, así que se retiró.
  Por eso la pantalla lleva sus propias salidas: con ellas el usuario no se queda atrapado.
- **Verificado en vivo** contra el build standalone: ficha inexistente → **404** con «Esta página no existe» en
  español; URL inexistente → **404**; lista real → 200; **cero** rastro del «This page could not be found» de Next.
- Textos nuevos en `lib/i18n/es.ts` bajo `error.*` (claves semánticas, no auto-extraídas — ver F-30).

### F-27 · El limpiador del rate limiter existe y no lo llama nadie ✅ RESUELTO (2026-09-02)
- **Hallado en:** sesión 27.
- **Qué pasa:** `sweepRateLimiter()` (`apps/web/lib/rate-limit.ts:33`) está escrito, exportado y documentado como
  «limpieza perezosa para evitar crecimiento ilimitado del Map»… y **no se invoca desde ningún sitio** (grep: sólo
  su definición). El `Map` de cubetas no se vacía nunca.
- **Lo que lo agrava:** el webhook del inbox usa como clave `inbox:${channelId}`
  (`app/api/v1/inbox/webhook/[channelId]/route.ts:25`) y ese `channelId` **lo elige quien llama**, sin autenticar
  todavía. Cualquiera con acceso a la red puede crear entradas nuevas sin límite. En la Pi, con memoria contada,
  importa; el resto de claves (`api:<ip>`) sí son de cardinalidad acotada.
- **Resuelto (2026-09-02):**
  - **Barrido amortizado dentro de `rateLimit()`**: una de cada 500 llamadas limpia las cubetas caducadas. Se
    eligió esto y no un `setInterval` justamente por el fallo original — un barrido que hay que acordarse de
    arrancar es un barrido que no se arranca. Así no hay temporizador vivo y funciona tras cualquier reinicio.
  - **`channelId` validado como UUID antes de tocar el limitador** (`parseId`), con lo que la cardinalidad de la
    clave queda acotada a canales que pueden existir. Un `channelId` libre daba **400** sin crear cubeta.
  - Tests en `apps/web/lib/rate-limit.test.ts`: que el barrido elimina lo caducado **y conserva lo vivo** (un
    barrido demasiado agresivo sería peor que la fuga), y que el limitador sigue limitando.
- **Verificado en vivo:** `POST /api/v1/inbox/webhook/basura` → **400**.

### F-28 · Ninguna lista tiene límite, ordenación ni filtro ✅ RESUELTO (2026-09-02)
- **Hallado en:** sesión 27. Complementa a **E-14** (rendimiento) por el lado del producto.
- **Qué pasa, en dos planos:**
  - **Sin techo:** ninguna consulta de lista lleva `LIMIT`. `listProjects`
    (`packages/application/src/projects/queries.ts:88`) carga todos los proyectos **y además todos los clientes y
    todos los contactos** de la organización en memoria en cada petición, sólo para resolver dos nombres para
    mostrar. El patrón se repite en el resto de listas.
  - **Sin manejo:** `DataTable` resuelve muy bien la selección y las acciones en lote, pero **no ordena por
    columna ni filtra**. Sólo 5 de 48 páginas tienen algún filtro, y siempre como pestañas de estado fijas.
- **Por qué importa:** hoy, con datos de un usuario, no se nota nada — el problema es que **no hay ningún techo**,
  así que el día que se note será de golpe. Y con 200 tareas la única forma de encontrar algo será ⌘K.
- **Resuelto (2026-09-02) sobre `RecordTable`**, que es exactamente por lo que F-29 se hizo antes: se implementó
  **una vez** y lo heredaron las 19 vistas.
  - **`Column.value`** (nuevo, opcional): el valor **plano** de la celda. Hacía falta porque `cell` devuelve un
    `ReactNode` que se prerenderiza en el servidor — el cliente recibe JSX ya pintado y no puede mirar dentro.
    Con `value`, el servidor manda también el dato en crudo. Sirve a la vez para **ordenar** y para **filtrar**.
  - **Ordenación por columna**: clic en la cabecera (asc → desc → sin orden), con `aria-sort` para que un lector
    de pantalla anuncie el estado. Las columnas sin `value` (acciones, controles) no son ordenables, que es lo
    correcto. Números como números y **fechas como instantes** (ordenar «10/03» y «9/03» por texto está mal).
  - **Filtro rápido** por texto sobre los valores planos de la fila.
  - Ambos **en cliente, a propósito**: no hay paginación, así que el servidor ya mandó todas las filas; hacerlo
    por URL costaría un viaje de ida y vuelta por clic, y en la Pi eso se nota.
- **El `LIMIT` es opt-in, y esa decisión importa.** `LIST_LIMIT = 500` lo pasa **quien pinta la página**, nunca
  la consulta por su cuenta: `listReviewItems`, `listLearningItems` y `listAssets` **las usa también el push a
  Notion** (`notion-specs.ts`) para saber qué empujar, y un tope ciego ahí habría dejado de sincronizar en
  silencio a partir de la fila 500 — mucho peor que una lista larga. Cuando una lista alcanza el tope,
  `RecordTable` **lo dice en pantalla**: recortar sin avisar sería mentir sobre lo que hay.
- **Detalle de implementación:** `.limit(undefined)` omite la cláusula en runtime (comprobado con `toSQL()`) pero
  su tipo no lo admite, así que el helper `rowCap()` documenta el porqué en un solo sitio en vez de repartir
  `as` por las consultas.
- **Verificado en vivo** contra el build standalone, lista por lista: Tareas 20 columnas ordenables, Proyectos 6,
  Pagos 6, Contactos 5, Objetivos 5, Por revisar 5, Portafolio 4… y filtro en todas. *(Ojo al medir: una lista
  vacía no pinta tabla, así que sale 0 hasta que tiene una fila — comprobado creando un pago y un recurso.)*
- **Lo que NO incluye:** paginación real. Con un tope de 500 y el aviso en pantalla, paginar sería resolver un
  problema que hoy no existe; si algún día se alcanza el tope de verdad, ese es el momento.

### F-29 · Las 25 páginas de lista son la misma página copiada ✅ RESUELTO (2026-09-01)
- **Hallado en:** sesión 27. Ya estaba señalado de pasada en `AUDIT_2026-08-30.md` («duplicación de boilerplate
  lista/detalle», en la lista de pendientes de bajo impacto); aquí se concreta y **sube de prioridad**, porque es
  el bloqueo práctico de F-28.
- **Qué pasa:** cada lista repite literalmente el mismo esqueleto —migas de pan, título con contador, botón
  `NewRecordButton`, `EmptyState`, y el mismo mapeo `columns → rows` para alimentar `DataTable`—. Sólo cambian las
  columnas. Comparar `business/goals/page.tsx` con `knowledge/decisions/page.tsx`: son el mismo fichero.
- **Resuelto (2026-09-01)** con **tres** componentes en vez del `<ListPage>` monolítico que se había esbozado.
  Partirlo así fue deliberado: un solo componente no encajaba en las pestañas de Pagos/Revisión ni en las secciones
  de las fichas, y habría obligado a contorsionarlas.
  - **`components/ui/record-table.tsx`** — la pieza que faltaba entre `Column<T>` y `DataTable`. Hace el mapeo
    `columns→rows` (que existía porque `DataTable` es de cliente y no puede recibir funciones `cell`) y absorbe el
    `length === 0 ? <EmptyState/> : <DataTable/>`. **Era el trozo más copiado: 19 veces.** Ahora queda 1.
  - **`components/ui/list-page.tsx`** — migas de pan, título con contador, acción y fila de filtros. El contenido
    entra como `children`, así que la misma cáscara sirve para una tabla, para `Tabs` o para lo que venga.
  - **`components/ui/filter-tabs.tsx`** — las pestañas por enlace (`?tab=`, `?status=`, `?view=`), que estaban
    duplicadas literalmente en 4 vistas. De paso ganan `aria-current="page"`, que ninguna tenía.
- **Alcance real:** 19 vistas tocadas — 14 listas completas + las 4 fichas con secciones de tabla
  (`projects/[id]`, `crm/clients/[id]`, `crm/opportunities/[id]`, `tasks/[id]`) + `resources/resource-list.tsx`.
  **No queda ni un mapeo `columns.map(({ header, className }) => …)` fuera de `record-table.tsx`** (verificado con
  `grep`); el docstring de `DataTable`, que enseñaba a hacerlo a mano, ahora remite a `RecordTable`.
- **De paso** (estaba en el camino, no es scope creep): salieron al diccionario los literales de la cabecera de
  Tareas —contador y «zona horaria»— y el aviso de retención, y el breadcrumb de Contactos dejó de tener `CRM`
  a pelo. Cuenta contra **F-30**, que sigue abierto para el resto.
- **Lo que esto desbloquea:** **F-28** (ordenación, filtro y `LIMIT`) ya se puede hacer **en un sitio**. Ese era
  el motivo de hacer esto primero.
- **Verificado:** typecheck · lint · 76 unit · 157 integración · build · **59/59 journeys e2e**, y humo manual
  sobre las 19 rutas contrastando el número de filas renderizadas contra la BD (contactos 6+cabecera=7,
  objetivos 1+1=2, pagos 0 → estado vacío, Tareas conserva sus 4 tablas apiladas con `fixedLayout`).

### F-30 · i18n: claves auto-extraídas del castellano y literales sueltos 🟢 ABIERTO
- **Hallado en:** sesión 27. Cierra el flanco que dejó **E-10** (i18n), que sí está hecho y bien: `t()` está tipado
  con `MessageKey`, así que una clave inexistente **no compila**, y un test comprueba que los diccionarios cuadran.
- **Lo que quedó mal, en dos frentes:**
  1. **61 claves** son el texto español convertido a camelCase y **cortado a lo bruto**:
     `knowledge.anadeRecursosReutilizablesConElBotonNuev` (truncada a mitad de palabra),
     `crm.creaElPrimeroConElBotonNuevo`. Y los espacios de nombres no corresponden: `crm.creada`,
     `crm.creado` y `crm.fuenteDeVerdad` se usan en **Negocio** (`business/goals/[id]`, `capabilities/[id]`,
     `strategic-areas/[id]`).
  2. **Literales que nunca llegaron al diccionario**: `Reemplaza a` / `Reemplazada por`
     (`knowledge/decisions/page.tsx:48,56`), `Última sync` (`integrations/sync-run-summary.tsx:31`) y el texto en
     español metido a mano en tres `confirm()` (`projects/forms.tsx:179`, `integrations/controls.tsx:119`,
     `knowledge/inbox-channels.tsx:97`).
- **Por qué importa:** la promesa de E-10 era «copia `es.ts`, traduce los valores y no toques las claves». Con
  claves que son frases españolas truncadas, quien traduzca no sabrá a qué pantalla pertenece cada una. No rompe
  nada hoy; encarece el día que se añada idioma.
- **Qué haría falta:** renombrar esas 61 claves a algo semántico (`empty.goals.hint`) y en su namespace correcto, y
  mover los literales sueltos al diccionario. El renombrado es seguro: al estar tipado, cualquier olvido **falla en
  el typecheck**, no en producción.

### F-31 · Despliegue: la imagen del worker lleva el proyecto entero y no hay límites de recursos 🟡 REABIERTO (2026-09-02) — el techo de memoria NO estaba en efecto en la Pi
- **Hallado en:** sesión 27. **Nuevo** respecto a `SECURITY_CHECKLIST.md`, que ya cubre lo de los contenedores
  **no-root** (§ tabla de prioridades, ítem 3) pero no esto.
- **Dos cosas distintas:**
  1. **La imagen del worker es la etapa `deps`**: código fuente completo, `devDependencies` incluidas, y ejecuta
     TypeScript con `tsx` en producción. La web sí es `standalone` y mínima. Más peso y más superficie justo en el
     servicio que habla con **todas** las APIs externas (Twenty, Notion, GitHub, Drive, Calendar).
  2. **Ningún servicio tiene límites de memoria ni de CPU** en `control-tower.docker-compose.prod.yml` (ni
     `deploy.resources.limits`, ni `mem_limit`). En una Raspberry Pi eso significa que un proceso con una fuga se
     lleva por delante la máquina entera, no sólo su contenedor. Los logs sí están acotados (`max-size 10m`).
- **Resuelto (2026-09-02), las dos partes:**
  - **Techo de memoria** en los tres servicios de los dos compose de la Pi (prod y dev): `mem_limit` +
    `memswap_limit`, configurables por `.env` (`CONTROL_TOWER_MEM_{WEB,WORKER,DB}`). Valores por defecto
    **medidos, no inventados**: web 768m (observado 247→289 MB navegando), worker 512m (~50 MB en reposo + los
    lotes de sync), db 512m (72 MB en reposo). ~2x de holgura, porque **un límite corto convierte «va lento» en
    «lo mata el OOM»**, que es peor que no tener límite.
  - ~~**`memswap_limit` = `mem_limit` ⇒ sin swap**, a propósito: en la Pi el swap va a la tarjeta SD~~ →
    **retirado el 2026-09-02, la premisa era falsa** (ver «Reabierto» abajo).
  - **Imagen del worker: 1,35 GB → 413 MB** (la web son 469 MB, para comparar). Etapa `worker-deps` nueva con
    `pnpm install --prod --filter "@ct/worker..."`, y la etapa final copia sólo eso más `packages/` y
    `apps/worker/`. Se **mantiene `tsx`** y el código como TypeScript: los paquetes exportan `./src/index.ts`
    sin paso de compilación, es la convención del repo y cambiarla afectaría también al `transpilePackages` de
    Next. Lo que se recortó son las devDependencies (next, react, vitest, playwright, eslint, drizzle-kit…).
- **Trampa que casi rompe el deploy, y que sólo salió por probarlo:** con `--prod`, `pnpm --filter @ct/db migrate`
  fallaba con `tsx: not found` — **el deploy corre las migraciones dentro del worker**, y `tsx` estaba declarado
  como **devDependency** de `@ct/db` y de `@ct/worker`. Era una declaración falsa: producción ejecuta `migrate` y
  el propio worker con tsx en cada despliegue. Movido a `dependencies` en ambos paquetes (`drizzle-kit` sí se
  queda en dev: sólo genera migraciones, en local).
- **Verificado construyendo y ejecutando la imagen**, no sólo mirando el Dockerfile: el worker arranca, conecta,
  procesa jobs, corre los barridos y escribe su heartbeat; `pnpm --filter @ct/db migrate` sale con **código 0**
  dentro del contenedor; y la etapa `web` sigue construyendo igual (469 MB).

#### 🟡 REABIERTO (2026-09-02, sesión 36) — el techo de memoria se estaba **descartando** en la Pi

El owner reportó que al levantar los contenedores en la Pi, web y worker avisan:
*«Your kernel does not support memory limit capabilities or the cgroup is not mounted. Limitation discarded.»*
Comprobado **en la máquina** (no deducido):

```
/proc/cmdline                     → … pci=pcie_bus_safe cgroup_disable=memory numa_policy=interleave …
/sys/fs/cgroup/cgroup.controllers → cpuset cpu io pids          (falta "memory")
docker stats                      → 0B / 0B en los 18 contenedores
CONFIG_MEMCG                      → =y  (el kernel lo soporta; sólo está apagado al arrancar)
```

- **Qué significa:** Docker pide el techo, el kernel no puede, Docker **descarta el límite** y arranca igual. Nada
  se rompe, pero **la protección de este hallazgo no existía**: una fuga en el worker se lleva la Pi entera, que era
  justo lo que se quería evitar. Y **tampoco había medición**: sin cgroup de memoria, `docker stats` no da datos por
  contenedor — así que el consejo que dejamos escrito («mira `docker stats` antes de apretar el límite») no se podía
  seguir en la Pi, y las cifras medidas de arriba salieron de **local**, no de la máquina real.
- **Origen:** no está en `cmdline.txt`; lo inyectan los **device tree blobs** de `/boot/firmware` (Raspberry Pi OS lo
  desactiva por defecto). Los parámetros de `cmdline.txt` se procesan **después**, así que se contrarresta desde ahí.
- **Acción del owner (pendiente, requiere root + reinicio de la Pi):**
  ```sh
  sudo cp /boot/firmware/cmdline.txt /boot/firmware/cmdline.txt.bak
  sudo sed -i '1 s/$/ cgroup_enable=memory cgroup_memory=1/' /boot/firmware/cmdline.txt
  cat /boot/firmware/cmdline.txt      # debe seguir siendo UNA sola línea
  sudo reboot
  # comprobación: `memory` en /sys/fs/cgroup/cgroup.controllers y `docker stats` sin 0B
  ```
- **Hecho en el repo (2026-09-02):** documentado el requisito del kernel en los dos compose y en `.env.example`, y
  **retirado `memswap_limit` de los tres servicios** (prod y dev). Su razón de ser era falsa: se comprobó que la raíz
  de esta Pi está en un **SSD** (`/dev/sda2`, 477 GB) y que el swap es **zram** — comprimido y **en RAM**, no en la
  tarjeta SD. Ahí swapear sale barato y hace de colchón ante un pico; prohibirlo sólo adelantaba el OOM. Sin
  `memswap_limit`, Docker admite hasta 2× `mem_limit` contando ese zram.
- **Qué falta para cerrarlo:** que el owner active el cgroup y reinicie, y **medir entonces en la Pi** los tres
  servicios con `docker stats` para confirmar (o ajustar) 768m/512m/512m. Enlaza con **E-14** (rendimiento): hasta
  ahora no se ha podido saber si la lentitud tenía que ver con memoria, porque no había forma de medirla por
  contenedor.
- **Observado de paso:** en la Pi corre un **`control-tower-worker-dev`** junto al stack de prod, sin su web ni su
  base de dev, levantado desde hace ~17 h. Si no es intencionado, está consumiendo memoria en una máquina que ya
  está usando 1 GB de swap (4,3 GB de 7,9 en uso).

### F-32 · El e2e por journeys llevaba tiempo roto, y en silencio ✅ RESUELTO (2026-09-01, bug real del tooling)
- **Hallado en:** sesión 27, al correr `scripts/e2e-journeys.sh` como verificación previa a commit de F-26/F-29.
- **Síntoma:** **59 de 62 checks fallando** con 307/308/401 por todas partes. Parecía una regresión gorda de la app.
  No lo era: `git stash` y ejecutarlo contra el árbol limpio daba **exactamente los mismos fallos**. Llevaba roto
  desde antes, y como nadie lo miraba, no constaba en ningún sitio.
- **Dos causas, ambas del propio script:**
  1. **La limpieza no mataba nada.** `pkill -f "standalone/apps/web/server.js"` no encuentra el proceso porque el
     server standalone de Next **se renombra** a `next-server (v15.5.23)` nada más arrancar. Resultado: un server de
     una ejecución anterior seguía ocupando el puerto, el nuevo no llegaba a levantar, y los `curl` hablaban con el
     VIEJO — que tenía otras variables de entorno. De ahí la cascada de 307/308.
  2. **El alta devolvía 403.** El registro es **bootstrap-only** (sólo el primer usuario; es la protección contra
     takeover). Contra la BD de dev, que ya tiene 14 usuarios, el `sign-up` del provisioning fallaba, el script se
     quedaba sin sesión y todo lo demás caía detrás. La guarda se añadió por seguridad y **nadie actualizó el script**.
- **Resuelto:** matar **por puerto** (`lsof -tiTCP:$PORT | xargs kill -9`, también al terminar) y arrancar el server
  de pruebas con `ALLOW_OPEN_REGISTRATION=true`, que es la vía de escape que el propio `lib/auth.ts` documenta y aquí
  se aplica a un servidor efímero.
- **Además, dos aserciones caducadas** que comprobaban texto que la app ya no dice: esperaban `Projects (1)` (la UI
  se tradujo, E-10 → `Proyectos`) y `Activos (1)` en la ficha de proyecto (el vocabulario se renombró el 2026-09-01:
  esa pestaña es **`Recursos`**). Actualizadas.
- **Estado: 59/59 en verde.** Lección para el backlog: la verificación que nadie mira acaba mintiendo. Si se toca
  auth, vocabulario visible o el arranque, hay que correr este script — está en la lista de verificación de
  `CLAUDE.md` precisamente por esto.

### F-33 · «Por revisar»: un revisado se podía deshacer y la purga se lo llevaba sin estar en la biblioteca ✅ RESUELTO (2026-09-02)
- **Reportado por el owner (2026-09-02)**, dos reglas de integridad sobre la cola «Por revisar».
- **Lo que pasaba:**
  1. Un recurso marcado como **REVISADO se podía editar y devolver a la cola**. `updateReviewItemStatus` no
     validaba nada, así que volver a `TO_REVIEW` **borraba el `reviewed_at`** y dejaba en la cola algo que quizá
     ya estaba en la biblioteca, como si nunca se hubiera mirado.
  2. La purga de retención borraba **cualquier** revisado fuera de plazo, estuviera o no en la biblioteca. Un
     revisado **sin procesar** es la única copia que queda —título, enlace y notas viven ahí y en ningún otro
     sitio—, así que era **pérdida de información**. El comentario del código daba por hecho que todo lo revisado
     estaba ya en la biblioteca; no es cierto, procesar es un paso manual.
- **Resuelto:**
  - **Regla de dominio** `isReviewItemFrozen` (`packages/domain/src/transitions.ts`): **REVISADO es terminal**.
    `updateReviewItem` y `updateReviewItemStatus` lanzan `REVIEW_ITEM_REVIEWED` (409). El no-op
    REVIEWED→REVIEWED se permite, para que reenviar el mismo estado no reviente.
  - **Cerrar también REVIEWED → DISCARDED** no es celo de más: sin eso la regla de la purga tenía puerta trasera
    (bastaba descartar un revisado sin procesar para que el barrido se lo llevara). Las dos reglas se sostienen
    juntas. Los demás estados siguen siendo libres: la cola es una bandeja de trabajo, no un flujo rígido.
  - **Purga acotada** (`purgeReviewedItems`): `DISCARDED` siempre; `REVIEWED` **sólo con `knowledge_item_id`**.
    Consecuencia buscada: un revisado sin procesar **se queda para siempre** hasta que decidas — la retención
    está para tirar lo resuelto, no para decidir por ti. El motivo del borrado queda en `audit_logs` con su estado.
  - **UI:** el `GET` devuelve `meta.readOnly` con el motivo (el panel lo pinta bloqueado con 🔒 en vez de fallar
    campo a campo al autoguardar), y la lista muestra **insignia en vez de desplegable** cuando está revisado —
    ofrecer un selector que el servidor va a rechazar es peor que no ofrecerlo. **Procesar sigue disponible**:
    no modifica el recurso, sólo lo enlaza.
- **Verificado en vivo** contra el build standalone: editar pendiente 200 · marcar revisado 200 · volver a la
  cola **409** · descartar **409** · editar **409** · reenviar REVISADO 200 · `readOnly=true` con motivo. Y la
  purga con política real de 30 días borró los dos revisados **ya procesados** y **conservó** el que no lo estaba,
  que sigue en la cola con su botón «Procesar».
- Tests: `knowledge.test.ts` (inmutabilidad + purga condicionada) y `retention.test.ts` (4 casos: sin procesar
  nunca · procesado sí · descartado sí · pendiente nunca). **Dos tests existentes codificaban el comportamiento
  viejo** (uno devolvía un revisado a la cola, otro esperaba que la purga se llevara uno sin procesar): reescritos.

### F-34 · El buscador «universal» ignoraba en silencio 4 de las 15 entidades indexadas ✅ RESUELTO (2026-09-02)
- **Reportado por el owner (2026-09-02):** «busqué por nombre un ítem de Por revisar y no lo listó en ningún
  momento».
- **Causa:** `review_items` **sí tiene** su `search_vector` y su índice GIN desde el principio —el coste ya se
  pagaba en cada escritura— pero **nadie la añadió a `TARGETS`** en `packages/application/src/search/index.ts`.
  Al revisarlo aparecieron **cuatro** en la misma situación: `review_items`, `learning_items`, `resources` y
  `payments`. 15 tablas indexadas, 11 buscables.
- **Por qué no lo detectó nadie:** el índice se crea solo con el esquema y una búsqueda sin resultados no parece
  un fallo, parece que no hay nada. No había ningún test que atara las dos listas.
- **Resuelto:**
  - Las **cuatro** entidades añadidas a `TARGETS`, cada una con su `href` (Por revisar → `/knowledge/review`,
    Aprendizaje → `/knowledge/learning`, Recursos → `/resources/{id}`, Pagos → `/payments`).
  - **Se excluye lo archivado** (`isNull(archivedCol)`): archivar oculta un registro de su lista, así que un
    resultado de búsqueda llevaría a una vista donde no está. Las 15 entidades tienen `archived_at`.
  - **Test de cobertura** en `search.test.ts` que compara las tablas con `search_vector` del esquema contra
    `SEARCH_TYPES`. **Comprobado que muerde:** quitando `review_item` de `TARGETS`, falla.
  - **De paso (i18n, cuenta contra F-30):** los encabezados de grupo estaban **en inglés y hardcodeados en la capa
    de aplicación** («Clients», «Knowledge»…), que no es sitio para texto de interfaz. Ahora la UI los traduce por
    tipo desde `search.type.*`; el `label` del API queda sólo como red de seguridad.
- **Verificado en vivo:** creado un recurso «Charla sobre Zentauro y colas» en Por revisar, buscar «Zentauro»
  lo devuelve en el grupo `review_item` con `href=/knowledge/review`.


### F-35 · Los syncs no reconciliaban borrados y la idempotencia no sobrevivía a un CT vacío ✅ RESUELTO (2026-09-24, M40)
- **Hallado en:** migración de la Raspberry Pi a vibox. El owner ve cada repo de GitHub **dos veces** en
  Reutilizables, más repos que había borrado de GitHub, y la base «Assets» de Notion igual de duplicada.
- **Cuatro defectos reales, no uno:**
  1. **Idempotencia 100% local.** El único dedup era `external_identities`, tabla de CT. Con la base vacía en el
     servidor nuevo (se repobló desde Notion en vez de restaurar el `pg_dump`), el import de Notion creó un asset
     por página y el sync de GitHub creó **otro** por repo, sin cruzarlos; el push posterior creó páginas nuevas
     en Notion. Cada arranque de CT desde cero añadía una copia de todo.
  2. **Sólo Drive y Calendar reconciliaban borrados.** GitHub, Twenty y Notion sólo creaban/actualizaban → un
     repo borrado, la oportunidad que el owner borró en Twenty o una página borrada en Notion se quedaban aquí
     para siempre.
  3. **La purga por retención no limpiaba `external_identities`** → puntero a fila muerta; el sync hacía
     `UPDATE … WHERE id = <muerto>`, tocaba 0 filas, contaba «actualizado» y el registro **no volvía nunca**.
  4. **Sin unicidad por `(provider, internal_type, internal_id)`** → un registro con varias páginas de Notion.
- ✅ **Resuelto (M40):** `integrations/reconcile.ts` (`reconcileMissing`, llamado **antes** del bucle de cada
  sync: purga identidades huérfanas → archiva lo desaparecido → restaura lo que vuelve), guardia del pull vacío,
  pull truncado convertido en error (`twenty/client.ts`, `git/client.ts`), `onlyIfSoleIdentity` para que Notion no
  archive lo que tiene origen en otro proveedor, Drive pasa de **borrar** a **archivar**, adopción de assets por
  URL en `syncGit` (corta la raíz del duplicado), `deleteExternalTraces` en la purga, migración
  `0024_m40_sync_reconciliation` (`missing_since` + `sync_runs.archived`) y contador visible en Integraciones.
  Script puntual `packages/db/src/scripts/cleanup-duplicates.ts` para el estado ya duplicado (seco por defecto).
- **Sigue abierto, a propósito:** el punto 4 (la constraint) → ver **A-7 ampliado**. Calendar sigue borrando su
  caché diaria (`calendar_events` no tiene `archived_at` y un día sin eventos es legítimo).
- **Regla operativa que sale de aquí:** migrar CT entre servidores es `pg_dump` + restore **completo**,
  `external_identities` incluida. Repoblar desde los orígenes duplica por diseño. En `DEPLOYMENT.md`.

### E-15 · Notas y comentarios por registro 🟡 futuro (hueco de producto)
- **Hallado en:** sesión 27.
- **Qué falta:** no hay tabla de comentarios ni sitio donde escribir texto libre asociado a un registro. Hay
  **historial de auditoría** (qué campo cambió, cuándo y quién, F-4) pero eso responde a «qué pasó», no a «qué
  hablamos». Hoy no hay dónde apuntar *«hablado con el cliente, mueve la entrega a marzo»* salvo el campo
  `description` de la propia entidad, que se sobrescribe.
- **Valoración:** de todos los huecos de producto de la sesión, **es el único que consideraría una ausencia real**
  y no un «estaría bien». En un CRM propio es lo primero que se echa de menos.
- **Qué haría falta:** una tabla `notes` (organización + `entity_type`/`entity_id` + autor + cuerpo + fechas,
  como `change_events`), su endpoint y un bloque en el panel lateral junto a «Historial». Ojo con la retención:
  entidad nueva ⇒ sitio en `PURGE_ORDER` (ver convenciones de `CLAUDE.md`).

### E-16 · Adjuntos 🟢 futuro (probablemente NO, decisión pendiente)
- **Hallado en:** sesión 27.
- **Qué falta:** no hay **ni un** `input type="file"` en toda la aplicación. Todo fichero vive fuera (Drive/Notion)
  y en CT sólo queda la referencia.
- **Matiz importante:** esto es **coherente con la decisión congelada** de que CT guarda referencias y nunca
  contenido de ficheros. La consecuencia práctica es que un contrato firmado o el logo de un cliente no tienen
  sitio propio. **Decisión del owner pendiente:** o se acepta (y entonces esto se cierra como ❌ descartado), o se
  admite un caso acotado (p. ej. sólo en Pagos, con el fichero en disco de la Pi y la ruta en la DB).

### E-17 · Sacar datos: exportación de negocio e informes de evolución 🟢 futuro
- **Hallado en:** sesión 27.
- **Qué falta, dos cosas relacionadas:**
  - **Exportar:** se exporta a CSV lo que menos falta hace —procesos, envíos y lotes de log (F-24)— y no se puede
    sacar la lista de clientes, los proyectos ni los pagos. Tampoco hay importación masiva: los datos sólo entran a
    mano o por integración.
  - **Informes:** el snapshot de Inicio está bien pero es una foto fija. No hay nada de **evolución**: ingresos por
    mes, tasa de conversión del pipeline, tiempo medio de cierre. Con Pagos (0019/m35) y Oportunidades ya
    modelados, **los datos ya están**; falta la lectura.
- **Qué haría falta:** para exportar, reutilizar el patrón de `jobs/export` (ya existe y funciona) sobre las
  queries de lista. Para informes, consultas de agregación por mes + una vista; nada de esquema nuevo.

### E-18 · Oportunidades: tres campos de CT que no viajan a Twenty 🔴 ABIERTO — necesita decisión del owner
- **Hallado en:** sesión 34, al aplicar [ADR-008](./adr/ADR-008-opportunity-state-machine.md) (CT como máquina de
  estados). El owner pidió explícitamente *«determinar si habrá algún dato que viva en CT pero que no vaya a ser
  reflejado en Twenty»*.
- **Lo que hay:** tres columnas de `opportunities` sin contrapartida en el sync, hoy **siempre vacías** en las
  oportunidades importadas (que a partir de ahora son todas):

  | Campo CT | ¿Existe en Twenty? | Por qué está vacío |
  |---|---|---|
  | `primary_contact_id` | Sí, `pointOfContact` | El mapper **no lo mapea** ni en el pull ni en el push |
  | `source` | No | El pull no lo rellena; sólo lo llenaba la creación manual, que ya no existe |
  | `notes` | No como campo (Twenty usa registros *Note* relacionados) | Ídem |

- **Cómo está mientras tanto:** los tres quedan **de solo lectura** en el panel y en la ficha (`readOnly: true` en
  `record-registry.ts`) y siguen en la tabla. No se ha borrado nada: retirar columnas es irreversible y la decisión es
  del owner.
- **Las tres salidas posibles:** (a) **mapearlos al sync** —`pointOfContact` es el único que Twenty puede dar, y
  exigiría resolver el contacto por `external_identities` en el pull—; (b) **conservarlos como datos propios de CT**,
  lo que obliga a reabrir un endpoint de edición **acotado a esos campos** (no el `updateOpportunity` general, que se
  retiró a propósito); (c) **retirarlos del modelo** con una migración.
- **Nota:** lo que sí es CT-only y NO está en duda: `closed_at`/`archived_at` (contabilidad de la máquina de estados)
  y las **tareas de preventa** (`tasks.opportunity_id`), que nunca han ido a Twenty.
