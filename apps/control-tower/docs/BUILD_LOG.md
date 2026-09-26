# Control Tower — Build Log

Bitácora cronológica de la construcción. Una entrada por paso. Lo más reciente arriba.
Estado autoritativo del progreso. Ver el plan completo en [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md).

Leyenda estado: ⬜ pendiente · 🚧 en curso · ✅ hecho · ⛔ bloqueado

## 2026-09-26 — Sin tareas en Twenty, y saneado lo que la mudanza a vibox dejó mintiendo ✅

Sesión de mantenimiento documental: una decisión del owner que cierra anotaciones, y tres incoherencias
detectadas al repasar el estado.

**Decisión del owner: NO se van a crear tareas en Twenty.** Las tareas son CT-nativas. Cerrado en todos los sitios
donde estaba anotado lo contrario:
- **F-18** ✅ cerrado (el código estaba hecho) con la **verificación en vivo ❌ descartada**: esperaba que el owner
  creara una tarea de ejemplo en Twenty, y eso no va a pasar. **El código del pull se queda** (`mapTask` + la rama de
  tasks de `sync-twenty.ts`): es inerte —un pull sin tareas no crea nada, y la guardia de M40 no archiva con pull
  vacío— y está probado por unit/integración si algún día se quisiera.
- **E-1** — «write-back de tareas si se decidiera» ❌ descartado; queda sólo el POST de clientes/contactos como
  pendiente de fase posterior. El único write-back de tarea que sobrevive es la **fecha** (`taskPatch`), que sólo
  actúa sobre una tarea que ya exista en Twenty.
- **AUT-30** — el «sync bidireccional de tareas» sale del ítem; queda el enriquecimiento de contactos.
- Corregidos además `apps/web/content/user-guide.md` (la fila «Tareas importadas» decía que las tareas **no tienen
  write-back**, que era falso: la fecha sí se empuja), `NOTION_INFORMATION_ARCHITECTURE.md` §4.8 (hablaba de F-18 como
  «trabajo nuevo» cuando está hecho) y este `CLAUDE.md`.

**Tres incoherencias saneadas:**
1. **El `UNIQUE` de `external_identities` se anotó como «F-33»** en la entrada de M40, y ese identificador ya era el de
   «Por revisar» (cerrado el 2026-09-02). Es **A-7 ampliado**, como decía la cabecera de `FINDINGS_AND_DEFERRED.md`.
2. **El plan del bloque Twenty reservaba la migración `0024_m40_crm_twenty_contract.sql`**, y `0024`/`m40` lo ocupó
   `sync_reconciliation`. Corregido a **`0025_m41_crm_twenty_contract.sql`** en el plan, y con él la del bloque del
   SOP, que ocupaba ese hueco → **`0026_m42_sop_process.sql`**.
3. **La documentación seguía siendo de la Raspberry Pi** en ítems vivos, cuando CT corre en **vibox (Fedora)** desde el
   2026-09-24. Reescrito lo que era **acción pendiente**, no lo histórico:
   - **F-31**: el arreglo del cgroup (`/boot/firmware/cmdline.txt`) **es de Raspberry Pi OS y en vibox no existe**.
     Fedora trae cgroup v2 con `memory` activo, así que lo más probable es que esa mitad del ítem esté resuelta por la
     mudanza; queda **comprobarlo con un comando** (`grep memory /sys/fs/cgroup/cgroup.controllers` + `docker stats`).
     Anotado también que **ya no son tres servicios sino dos**: la base salió del compose (vive en `nbs-db`), así que
     `CONTROL_TOWER_MEM_DB` sólo tiene sentido en local.
   - **E-14**: los «varios segundos por página» se reportaron **en la Pi** y nunca se midieron. Hay que medir **en
     vibox** antes de optimizar nada: puede que el ítem se haya ido con la máquina.
   - `DEPLOYMENT.md`, `SECURITY_CHECKLIST.md`, `README.md`, `.env.example` y los comentarios de los tres compose del
     servidor: «la Pi» → el servidor / vibox, dejando la historia de la Pi marcada como historia.

**Repaso de cinco ítems contra el código** (petición del owner), todos **siguen abiertos**: **E-15** (no hay tabla de
notas ni comentarios) · **E-16** (sin adjuntos; pero el enunciado decía «no hay ni un `input type=file`» y sí hay uno,
la foto de perfil, que guarda un data URL en `users.image` — enunciado recortado) · **F-30** (las claves truncadas y
los tres `confirm()` siguen ahí; sólo `Última sync` llegó al diccionario, y aparece un literal nuevo en
`profile-photo.tsx`) · **B-2** (el único tablero de columnas sigue siendo el de oportunidades) · **E-12** (sin endpoint
de reorden; `sort_order` sólo en `strategic_areas` y `project_phases`).

Sin cambios de código: sólo documentación, `.env.example` y comentarios de compose.

## 2026-09-24 — M40 · Reconciliación de borrados en los syncs (el duplicado de la migración a vibox) ✅

**El incidente.** Tras migrar de la Raspberry Pi a vibox, el owner ve en **Reutilizables** cada repo de GitHub
**dos veces**, más repos que borró de GitHub hace tiempo. La base «Assets» de Notion está igual: entradas
duplicadas y las viejas de repos que ya no existen. Pregunta directa: *¿cada vez que reinicio CT se duplica todo?
¿no controla lo que ya tiene? ¿y lo que ya no está?*

**El diagnóstico (cuatro defectos, todos reales):**

1. **La idempotencia era 100% local.** El único dedup es `external_identities`, una tabla de CT. Con la base
   vacía en el servidor nuevo (se repobló desde Notion en vez de restaurar el `pg_dump`), el import de Notion
   creó un asset por página y acto seguido el sync de GitHub creó **otro** por repo, sin que nada los cruzara; y
   el push posterior creó páginas nuevas en Notion. Cada arranque de CT desde cero añadía una copia de todo.
2. **Sólo Drive y Calendar reconciliaban borrados.** GitHub, Twenty y Notion sólo creaban y actualizaban: un
   repo borrado, una oportunidad borrada en Twenty (la que se le quedó colgada al owner) o una página borrada en
   Notion se quedaban en CT para siempre.
3. **La purga por retención no limpiaba `external_identities`.** El puntero quedaba apuntando a una fila muerta,
   el sync hacía `UPDATE … WHERE id = <muerto>`, tocaba 0 filas, contaba «actualizado» y el registro **no volvía
   a aparecer nunca**. Silencioso. (`deleteTasks` sí lo hacía; la purga, no.)
4. **Sin unicidad por `(provider, internal_type, internal_id)`**, un registro podía acumular varias páginas de
   Notion y `getExternalIdentityFor` cogía una arbitraria.

**Qué entra.**

- **`packages/application/src/integrations/reconcile.ts`** — `reconcileMissing`, el núcleo compartido. Se llama
  **antes** del bucle de create/update de cada sync (ahí es donde se ve el estado que dejó el sync anterior) y
  hace tres pasadas: **huérfanas** (identidades a filas inexistentes → se borran, así el registro se re-crea en
  ese mismo sync), **desaparecidas** (no vinieron en el pull → `missing_since` + **archivar**) y **reaparecidas**
  (vuelven → limpiar marca + **restaurar**).
- **Se archiva, no se borra**, y sólo en la **transición** a «desaparecido»: si el owner restaura algo a mano, el
  sync no se lo vuelve a archivar en la siguiente pasada.
- **Guardia del pull vacío:** si el pull no devuelve nada, no se reconcilia. Un token revocado devuelve `[]` con
  HTTP 200, y sin esto el primer sync tras el incidente archivaría el catálogo entero.
- **Un pull truncado ahora es un error** (`twenty/client.ts`, `git/client.ts`): tope de páginas alcanzado, o
  página llena sin `pageInfo`. Antes se devolvía media lista en silencio; con reconciliación eso archivaría la
  otra media.
- **Notion no archiva lo que tiene origen en otro proveedor** (`onlyIfSoleIdentity`): allí CT **escribe**, es un
  espejo. Que falte la página de un repo no significa que el repo no exista. Y si la página de un registro vivo
  desapareció, el push **recrea** la página en vez de dar 404 en cada sync para siempre.
- **Drive pasa de borrar a archivar.** Era el único que borraba de verdad, sin vuelta atrás y sin guardia.
- **Red de seguridad anti-duplicado en GitHub** (`adoptAssetByUrl`): si un repo no tiene identidad pero ya hay un
  asset con su misma URL, se **adopta** en vez de crear otro. La URL es el mismo dato en Notion y en GitHub, así
  que sirve de clave natural para re-vincular tras un arranque en vacío. Es lo que corta la raíz del incidente.
- **La purga limpia los rastros externos** (`deleteExternalTraces` en `archive.ts`): `external_identities` +
  `outbox_events`, después del borrado (si la FK lo bloquea, la fila vive y su puntero debe seguir ahí).
- **Migración `0024_m40_sync_reconciliation.sql`**: `external_identities.missing_since` (columna propia, no una
  clave de `metadata`: `metadata` se reescribe entera cada sync con la URL de «Open external») + índice parcial,
  y `sync_runs.archived` (contador propio: `deleted` es definitivo, `archived` es reversible; mezclarlos haría
  que el historial de syncs mintiera). La UI de Automatización › Integraciones lo muestra.
- **Script de limpieza puntual** `packages/db/src/scripts/cleanup-duplicates.ts` — el código nuevo evita que
  vuelva a pasar, pero no arregla lo ya duplicado. Cuatro fases, **en seco por defecto** (`--apply` para
  escribir): A identidades huérfanas · B reutilizables duplicados en CT (conserva uno, le lleva los enlaces de
  proyecto y portafolio, archiva el resto) · C repos muertos (con `GITHUB_TOKEN`) · D páginas duplicadas en la
  base «Assets» de Notion (con `NOTION_API_KEY`).

**Lo que queda fuera a propósito:** (a) el `UNIQUE` de `external_identities` sigue sin incluir
`organization_id` y sin cubrir `(provider, internal_type, internal_id)` — CT es mono-organización y añadirlo
exige decidir qué hacer con los duplicados existentes; queda anotado como **A-7 ampliado** (esta entrada decía
**F-33** por error: ese identificador era ya el de «Por revisar», cerrado el 2026-09-02 — corregido el 2026-09-26). (b) Calendar sigue borrando su
caché: `calendar_events` es una caché diaria sin `archived_at`, y un día sin eventos es legítimo.

**Regla nueva que hay que recordar:** migrar CT entre servidores es `pg_dump` + restore **completo**,
`external_identities` incluida. Repoblar desde Notion/GitHub duplica por diseño. Queda escrito en
`DEPLOYMENT.md`.

Verificado: `pnpm -r typecheck` · `pnpm lint` · `pnpm test` · `pnpm test:integration` · `pnpm build`.

## 2026-09-23 — Twenty: contrato de datos del CRM y motor del SOP (capa de dominio) 🚧

Primer paso de la adaptación al **handoff de implementación de Twenty**
(`_assets/control-tower/Control_Tower_Twenty_Implementation_Handoff.docx`), que reconfigura la
frontera: **Twenty posee los registros comerciales y la identidad de facturación; Control Tower
posee la ejecución del proceso** (puertas, criterios de salida, próximas acciones). Extiende a todo
el CRM lo que ADR-008 hizo sólo con la oportunidad.

Esta entrega es **sólo la capa de dominio** —pura, sin base de datos ni IO— porque es lo único que no
depende de dos cosas que faltan: acceso al Twenty real y los once documentos del SOP CLI 001.

**Qué entra** (`packages/domain/`):
- `enums.ts` — nueve enums del contrato: `ORGANIZATION_TYPE`, `COMPANY_RELATIONSHIP_ROLE` y
  `PERSON_RELATIONSHIP_ROLE` (listas distintas a propósito: sólo la persona tiene
  `INDIVIDUAL_CLIENT`), `PREFERRED_LANGUAGE`, `PREFERRED_CONTACT_CHANNEL`,
  `OPPORTUNITY_SERVICE_TYPE`, `OPPORTUNITY_LEAD_SOURCE`, `OPPORTUNITY_LOST_REASON` y
  `BILLING_SUBJECT`. `Annual Revenue` queda **desactivado**: no se lee ni se escribe.
- `crm-classification.ts` — organización vs particular (§2.2). Se **deriva, no se almacena**: sus dos
  insumos los posee Twenty y persistir la conclusión crearía un tercer valor que CT no podría
  corregir. `UNDETERMINED` es lo que sustituye a inventar una Company de relleno, que el handoff
  prohíbe.
- `billing-rules.ts` — Completitud Administrativa (§7.1) validando sobre **la entidad correcta**
  (Company si es organización, Person si es particular). Reglas **por país y configurables, como
  datos**: PEC y SDI son condicionales de Italia, no requisitos universales. Devuelve datos-que-faltan
  estructurados, no un booleano, para que la interfaz pueda enlazar al registro de Twenty. Sin país
  fiscal **nunca** se da por completo.
- `contactability.ts` — `Do Not Contact` como supresión dura (§10), por encima del canal preferido.
  Hoy CT no tiene outreach (HAB-1 sigue bloqueado), así que queda el guard listo y con test.
- `sop/` — motor del SOP: `gates.ts` (10 puertas + resultados como unión, con el subconjunto que
  admite cada una), `matrix.ts` (la tabla §11.3, que **devuelve un conjunto de destinos**, porque la
  mitad de las filas dicen «permanece o vuelve a X»), `catalog.ts` (los criterios como **datos
  versionados**, no como código) y `cli-001.ts`, el catálogo a la espera del SOP.

**Decisiones del owner en esta sesión:** se **conserva `PREPARING_PROP`** (idéntico a Twenty; el
vocabulario del SOP ya se resolvía en las etiquetas, que dicen «Preparando propuesta») · los
artefactos de Drive se guardan **sólo como URL**, CT no escribe en Drive · los criterios de las
puertas llegan con los documentos del SOP.

**Dos cosas que salen gratis de la matriz y conviene no perder:** ON_HOLD **no es alcanzable desde
LEAD ni QUALIFIED** (esperar una respuesta ahí es una Next Action, §11.1) sin necesidad de una regla
aparte; y `ACCEPTED` va a `CONTRACTING`, **nunca** directo a `WON`. Ambas atadas con test.

**Estado: 🚧 en curso.** Las diez puertas nacen en `PENDING_SOP` y el motor rechaza toda transición
cuya puerta no esté activa (`SOP_GATE_NOT_CONFIGURED`); se activan **de una en una** según llegue
cada documento, rellenando `cli-001.ts` — sin tocar la matriz ni los comandos.

**Bloqueado por dos entregas externas:** (1) los **11 documentos del SOP CLI 001**; (2) **acceso al
Twenty real** para resolver los identificadores de campo de su metadata — el handoff prohíbe
explícitamente inferirlos, y además hace falta para saber cómo se llama `Lost Reason` allí, sin lo
cual la transición a LOST no se puede implementar.

Verificado: `pnpm -r typecheck` · `pnpm lint` · `pnpm test` (129, **41 nuevos**) · `pnpm build`.
Plan completo por bloques en `~/.claude/plans/quiero-hacer-unas-mejoras-golden-blanket.md`.

> **⚑ ÚLTIMO (2026-09-26): mantenimiento documental.** Decisión del owner: **no se crean tareas en Twenty** (F-18
> cerrado, su verificación en vivo descartada, y con ella el write-back de tareas de E-1 y la mitad de AUT-30). Y
> saneadas tres incoherencias: el «F-33» mal puesto de M40 (es **A-7 ampliado**), la migración del plan de Twenty
> (`0024` estaba ocupada → **`0025_m41`**) y **toda la documentación viva que seguía hablando de la Raspberry Pi**
> cuando el servidor es **vibox**: F-31 (el arreglo del cgroup era de Raspberry Pi OS, en vibox hay que comprobarlo con
> un comando) y E-14 (hay que medir en vibox; el síntoma nunca se midió y la máquina es otra).
>
> **⚑ ANTERIOR (2026-09-24): M40 — los syncs ya reconcilian borrados.** Lo que desaparece del origen se **archiva**
> (y se restaura solo si vuelve), la purga limpia los punteros de sync, GitHub adopta el asset que ya existe con
> su misma URL en vez de duplicarlo, y un pull truncado o vacío **no** archiva nada. Queda pendiente pasar el
> script `packages/db/src/scripts/cleanup-duplicates.ts` en vibox para limpiar lo que ya está duplicado (va en
> seco por defecto). Detalle en la entrada de esa fecha. **Migrar CT entre servidores = `pg_dump` completo**, no
> repoblar desde Notion.
>
> **⚑ DÓNDE NOS QUEDAMOS (2026-09-01, sesión 14b).** *(Estado revisado ítem por ítem contra el código: ver la cabecera
> de `FINDINGS_AND_DEFERRED.md` para la lista agrupada de lo que sigue abierto.)* **Roadmap M01–M18 completo**, **auditoría técnica y de UI/UX
> cerradas** y, en esta sesión, **vaciado el grueso del backlog de hallazgos**: A-1/A-2/A-3 (gaps de modelo, con
> ADR-005/006/007 y migraciones 0014), C-1 + F-4 (auditoría completa + historial campo a campo), F-16 (historial de
> syncs visible), F-8, B-5 (Portafolio en la barra lateral), B-1/E-12 (drag & drop en el Kanban) y **E-10 (i18n: todo
> el texto de la app en un diccionario)**. **Git: `control-tower-mvp` = `dev` = `prod`**, nada sin mergear.
>
> **⚑ Lo siguiente que pidió el owner (2026-09-01, fin de la sesión 26): RENDIMIENTO.** Reporta que las páginas
> tardan **varios segundos** en la Pi. Encargo textual: *«mira el rendimiento, las consultas de cada página y los
> índices»*. Todo el contexto y los datos ya recogidos están en **E-14** de `FINDINGS_AND_DEFERRED.md`: 47/47 páginas
> `force-dynamic`, sólo 18 paralelizan sus consultas (ficha de proyecto ~20 llamadas, Conocimiento ~19), y el
> inventario de índices **no** muestra un agujero evidente → **medir en la Pi antes de tocar nada**. Ojo: el owner
> **descartó** los esqueletos de carga, así que aquí no vale maquillar la espera.
>
> **⚑ Sesión 36 (2026-09-02): el techo de memoria de la Pi no estaba puesto.** El kernel traía el cgroup de memoria
> desactivado, así que Docker **descartaba** los `mem_limit` de F-31 con un aviso: ni techo ni medición
> (`docker stats` daba 0B). En el repo: retirado `memswap_limit` (el swap de la Pi era zram, en RAM, y la raíz
> un SSD: prohibirlo sólo adelantaba el OOM) y F-31 reabierto. **⚠ Caducado por la mudanza (2026-09-24):** el arreglo
> era de Raspberry Pi OS (`cgroup_enable=memory` en `/boot/firmware/cmdline.txt`) y **en vibox no aplica**; queda
> comprobarlo allí con un comando — ver F-31 y `DEPLOYMENT.md`.
>
> **⚑ Sesión 35 (2026-09-02): Procesos (SOP) en Negocio.** Un SOP es un `knowledge_item` de tipo `PROCESS`, no una
> entidad nueva: el documento vive en **Notion**, sus anexos en **Drive** y CT gobierna estado y sector. Nueva vista
> **Negocio › Procesos (SOP)**. De paso, los enlaces externos de la biblioteca dejan de mentir (el badge decía
> «Notion» y el clic iba a Drive) y el enlace al origen sube por encima de «Contexto» en el panel.
>
> **⚑ Sesión 34 (2026-09-02): CT es sólo la máquina de estados de las oportunidades (ADR-008).** Ya no se crean
> desde CT (nacen en Twenty), lo único modificable es la **etapa**, el write-back empuja **sólo `stage`** y el tablero
> **pierde el arrastrar y soltar** (cada columna tiene varios estados, así que el gesto tenía que adivinar el
> destino). El auto-archivado sigue igual y **no toca Twenty**. **Abierto para la próxima**: tres columnas de
> `opportunities` no viajan a Twenty (`primary_contact_id`, `source`, `notes`) y están de solo lectura hasta que el
> owner decida si se mapean, se quedan como datos propios de CT o se retiran.
>
> **⚑ Sesión 33 (2026-09-02): el pipeline de oportunidades, realineado con Twenty (M39).** El owner reorganizó los
> stages **en Twenty** (13) y CT se había quedado con los suyos (10): el pull caía a `LEAD` lo que no conocía y el
> write-back mandaba a Twenty valores inexistentes → `400`. Ahora el enum de CT **es** el de Twenty, repartido en las
> 4 columnas que dictó el owner, y **`WON` deja de ser terminal** (vive en *Negociación*; el cierre ganado es
> `ONBOARDED`). Migración `0023_m39` con el reetiquetado de los datos. **Esto es el primer paso**: el owner anunció
> más cambios en el flujo de las oportunidades.
>
> **⚑ Sesión 32 (2026-09-02): F-28 hecho — fin de la tanda de cuatro.** Las listas ya **se ordenan por columna**
> (con `aria-sort`), **se filtran** y tienen **tope de 500 con aviso**. Implementado una vez sobre `RecordTable`.
> El tope es **opt-in desde las páginas** a propósito: las mismas consultas las usa el push a Notion y un
> `.limit()` ciego habría dejado de sincronizar en silencio.
>
> **⚑ Lo que queda ahora en cabeza:** **E-14** espera a que corras `scripts/measure-perf.sh` **en vibox** (la
> instrumentación ya está desplegada; el síntoma se midió nunca y la máquina ya no es la misma) · **E-15** notas por
> registro es el único hueco de producto que es una ausencia real · y **HAB-1** (bot de Telegram) sigue siendo el
> bloqueo grande: desatasca el bloque entero de automatizaciones y está parado por decisión tuya, no por trabajo
> pendiente.
>
> **⚑ Sesión 31 (2026-09-02): lote de seguridad.** La web **ya no arranca** sin `BETTER_AUTH_SECRET` (antes
> arrancaba y sólo fallaba al iniciar sesión, con un 500 opaco) · **F-27** cerrado con barrido amortizado y el
> `channelId` del webhook acotado · `parseId()` en **53 rutas**: un id mal formado daba `500` y ahora da `400` ·
> el deploy avisa de la contraseña de Postgres por defecto. **Siguiente y último de la tanda: F-28.**
>
> **⚑ Sesión 30 (2026-09-02): E-14 paso 1 y F-31.** Ya hay **instrumentación de consultas** (Server-Timing,
> aviso de consulta lenta, `scripts/measure-perf.sh` para la Pi) — E-14 sigue abierto a la espera de **correrlo
> en la Pi**. Y la Pi queda blindada: **techo de memoria medido y sin swap** en los tres servicios, e imagen del
> worker de **1,35 GB → 413 MB**. Ojo al hallazgo de paso: `tsx` estaba mal declarado como devDependency y con
> `--prod` el deploy se quedaba sin poder migrar. **Siguientes:** lote de seguridad de arranque y luego F-28.
>
> **⚑ Sesión 29 (2026-09-02): hechos F-33 y F-34.** «Por revisar» gana integridad —REVISADO es terminal y la
> purga sólo borra lo que ya está en la biblioteca— y el **buscador universal**, que ignoraba en silencio 4 de las
> 15 entidades indexadas (Por revisar, Aprendizaje, Recursos, Pagos), las cubre todas, excluye lo archivado y
> tiene un test que ata ambas listas. Sigue pendiente **F-28** como siguiente paso natural.
>
> **⚑ Sesión 28 (2026-09-01): hechos F-26, F-29 y F-32.** Pantallas propias de error/404 (`MessageScreen` + las
> cuatro rutas, en español, con salidas) · las 25 listas unificadas en `RecordTable`/`ListPage`/`FilterTabs`
> (19 vistas, 0 mapeos duplicados) · y el **e2e por journeys, que llevaba tiempo roto en silencio**, arreglado y
> en **59/59**. **Lo siguiente natural es F-28** (ordenación, filtro y `LIMIT` en las listas): F-29 se hizo antes
> justamente para que ahora se implemente en un sitio y no en veinticinco.
>
> **⚑ Revisión de producto (2026-09-01, sesión 27).** Se evaluó la app entera como producto a petición del owner
> (código · UI/UX · seguridad · qué falta) y lo NUEVO quedó en la **sección G** de `FINDINGS_AND_DEFERRED.md`:
> **F-26** (no hay `error.tsx`/`not-found.tsx` → 404 y errores con la pantalla por defecto de Next, en inglés) ·
> **F-27** (`sweepRateLimiter()` no lo llama nadie) · **F-28** (listas sin `LIMIT`/orden/filtro) · **F-29**
> (unificar las 25 páginas de lista, hacer ANTES que F-28) · **F-30** (claves de i18n auto-extraídas) · **F-31**
> (imagen del worker + sin límites de memoria en la Pi) · **E-15/E-16/E-17** (notas por registro · adjuntos ·
> exportar e informes). Todo verificado en ejecución: 76 unit + 157 integración en verde, 0 `any`/`ts-ignore`.
> **Ojo, dos falsos positivos ya descartados:** el **responsive** es decisión de alcance (solo escritorio) y
> **⌘K ya existe**.
>
> **Lo que queda, por orden de valor:**
> 1. **Automatizaciones** (`AUTOMATION_BACKLOG.md`) — el bloque grande sin empezar. **HAB-1 ya tiene canal elegido:
>    bot de Telegram** (owner, 2026-09-01), pero el owner lo aparcó a propósito: NO implementarlo sin que lo pida.
>    Detrás vienen HAB-2 y los quick wins (vencidas, sync en ERROR, briefing diario, flywheel al cerrar proyecto).
> 2. **Menores de UI/UX** — **F-26 (pantallas de error/404) es lo más barato y visible de todo lo abierto**;
>    después micro-confirmación al guardar, `EmptyState` que enseñe el siguiente paso, login sin primitivas,
>    jerarquía de encabezados (P2 del informe de UI/UX).
> 3. **Diferidos con dueño claro** — drag-reorder de FILAS de lista (E-12), Kanban de tareas (B-2), carga diferida por
>    pestaña, `<Card>` donde queda borde a mano.
> 4. **Multi-usuario** (A-7 unique de `external_identities`, E-11 workspaces) — sólo si entran colaboradores.
> 5. **Verificación en vivo pendiente**: F-18 (pull de tareas de Twenty; el owner debe crear una tarea de ejemplo allí)
>    y la revisión visual en el navegador de lo de esta sesión (foco de teclado, drag & drop, textos traducidos).

---

## 2026-09-02 — Sesión 36 · El techo de memoria de la Pi no estaba puesto (F-31 reabierto)

**Lo trajo el owner:** al levantar los contenedores en la Pi, web y worker avisan *«Your kernel does not support
memory limit capabilities or the cgroup is not mounted. Limitation discarded.»* — y preguntó si daba problemas o
simplemente se ignoraban los límites.

**Comprobado en la máquina** (por SSH, sólo lecturas), no deducido:

```
/proc/cmdline                     → … pci=pcie_bus_safe cgroup_disable=memory numa_policy=interleave …
/sys/fs/cgroup/cgroup.controllers → cpuset cpu io pids            (falta "memory")
docker stats                      → 0B / 0B en los 18 contenedores
CONFIG_MEMCG=y                    → el kernel lo soporta; sólo está apagado al arrancar
findmnt / + lsblk                 → raíz en /dev/sda2 (SSD 477 GB); swap = zram0 (2 GB, en RAM)
free -h                           → 4,3 GB de 7,9 usados y 1,0 GB de swap ya en uso
```

**Respuesta:** no rompe nada, pero **dos cosas que creíamos tener no existían**. (1) No había techo: la protección
entera de F-31 se estaba descartando, así que una fuga en el worker se lleva la Pi —y con ella Twenty, Zammad y el
resto de stacks—. (2) Tampoco había medición: sin cgroup de memoria `docker stats` no da datos por contenedor, así
que el consejo que dejamos escrito en el propio compose («mira `docker stats` antes de apretar el límite») no se
podía seguir, y las cifras de F-31 salieron de **local**, no de la Pi.

El `cgroup_disable=memory` **no está en `cmdline.txt`**: lo inyectan los device tree blobs de `/boot/firmware`
(Raspberry Pi OS lo desactiva por defecto). Como los parámetros de `cmdline.txt` se procesan después, se contrarresta
añadiendo ahí `cgroup_enable=memory cgroup_memory=1` y reiniciando — **acción del owner**, requiere root y reinicio.

**Lo hecho en el repo:**
- **Retirado `memswap_limit`** de los tres servicios en los dos compose de la Pi (prod y dev). Su justificación era
  falsa: se puso «sin swap porque en la Pi el swap va a la tarjeta SD», y resulta que la raíz está en un **SSD** y el
  swap es **zram** (comprimido, en RAM). Ahí swapear sale barato y hace de colchón ante un pico; prohibirlo sólo
  adelantaba el OOM. Sin `memswap_limit`, Docker admite hasta 2× `mem_limit` contando ese zram. **`mem_limit` se
  queda**: es el techo de verdad.
- **Documentado el requisito del kernel** donde se va a leer: los dos compose, `.env.example` y una sección nueva en
  `DEPLOYMENT.md` con el comando exacto y su comprobación.
- **Corregidas las cifras** «Medido: …» → «Medido **en local**», con la nota de que en la Pi aún no se ha podido medir.

**F-31 pasa a 🟡 REABIERTO** (la parte de la imagen del worker, 1,35 GB → 413 MB, sigue ✅). Para cerrarlo: activar el
cgroup, reiniciar y **medir entonces en la Pi** los tres servicios. Enlaza con **E-14**: hasta ahora no se podía saber
si la lentitud tenía que ver con memoria, porque no había forma de medirla por contenedor.

**Observado de paso:** en la Pi corre un **`control-tower-worker-dev`** junto al stack de prod —sin su web ni su base
de dev— levantado desde hace ~17 h. Si no es intencionado, está consumiendo memoria en una máquina que ya swapea.

**Verificado:** los dos compose parsean y `docker compose config` los valida; los tres servicios conservan `mem_limit`
y ninguno tiene ya `memswap_limit`. Sin cambios de código de la app.

## 2026-09-02 — Sesión 35 · Procesos (SOP) en Negocio y enlaces externos que dicen a dónde llevan

**Contexto:** el owner está redactando sus SOP (el primero, la gestión de oportunidades — de ahí las sesiones 33 y
34) y preguntó dónde meterlos: ¿sección nueva, o Documentos? Y si el enlace externo debía ir directo a Drive o pasar
por Notion.

**Decisión (owner, tras el análisis):** un SOP **no es una entidad nueva** — es un `knowledge_item` con
`knowledgeType = PROCESS`. Documentos no servía: es un índice de solo lectura de Drive, sin ciclo de vida, donde los
SOP quedarían entre cientos de facturas y exports; y un `documentType` que el sync de Drive ni siquiera rellena. Una
tabla propia habría duplicado lo que la biblioteca ya da (borrador → revisión → **aprobado**, sector, buscador,
auditoría, espejo bidireccional con Notion) — lo que faltaba era **sitio**, no modelo. El tipo `PROCESS` llevaba en el
enum desde el M02 sin usarse.

**Reparto de la información** (en `INFORMATION_ORGANIZATION.md`, que se contradecía consigo mismo: el árbol de Drive
listaba «procesos/SOPs» mientras el principio decía que Notion es dueño de la documentación):
el **documento** en Notion · los **anexos** (checklists, formularios) en Drive · el **registro gobernado** en CT.

**Lo hecho:**
- **Negocio › Procesos (SOP)** (`/business/processes`): la Biblioteca acotada a `PROCESS` desde el servidor
  (`listKnowledgeItems` acepta ahora `filter.knowledgeType`) + tarjeta con contador en el resumen de Negocio.
  `LibraryList` gana `lockedType`: oculta el desplegable de tipo (que ahí tendría una sola opción) y su columna.
- **`?set=<campo>:<valor>` en el panel**: lo que creas desde una lista ya filtrada nace **dentro** del filtro. Aquí,
  «＋ Nuevo» en Procesos abre el panel con Tipo = Proceso puesto. Es genérico, no un caso especial de esta vista.
- **Los enlaces externos ahora dicen a dónde van.** Estaban mal: la columna «Fuente» pintaba el badge del origen
  («Notion») pero el enlace iba a `sourceUrl` (Drive) — el badge prometía una cosa y el clic hacía otra. Y la ficha
  del ítem **no ofrecía** la página de Notion, aunque CT guarda su url desde que la importa. Ahora:
  - lista: «Fuente» = sólo procedencia · columna **«Enlace»** nueva = la url relacionada, con respaldo a Notion;
  - ficha: filas separadas para «URLs relacionadas» y «Página en Notion»;
  - panel: el enlace al origen sale del bloque «Contexto» y se pone **encima**, en su propia línea — contexto es
    donde se mira la procedencia, no donde se salta a leer el documento. Aplica a todas las entidades con origen.
- **`singleExternalUrl`** (`apps/web/lib/external-url.ts`, con test): «URLs relacionadas» es texto libre y admite
  **varias** a propósito (decisión del owner: los SOP tendrán una, pero otros recursos pueden tener varias). Un `href`
  admite una sola, así que la función decide si el texto es exactamente una url; si no, la lista cae al enlace de
  Notion, que siempre es único. Las urls completas se siguen viendo enteras en la ficha y en el panel.

**Nota dejada a propósito en la documentación** (petición del owner, «por si en un futuro da problemas»): el contrato
de Notion §4.1 documenta ahora que `Canonical URL` es **rich_text y no `url`**, que **la escribe CT** (el push recorre
todas las filas en cada sync, así que editarla en Notion se pierde), que la interfaz sólo puede enlazar una, y cuál
sería la salida limpia si algún día estorba: una columna `primary_url` aparte, sin convertir el campo.

**Verificado:** typecheck · lint · unit (88) · integración (167) · build · e2e-journeys.

**Docs:** `INFORMATION_ORGANIZATION.md` (sección nueva «SOPs / procesos» + corregido el árbol de Drive) ·
`NOTION_INFORMATION_ARCHITECTURE.md` (§4.1 y la nota) · `user-guide.md` (matriz + playbook + secciones) · `CLAUDE.md`.

## 2026-09-02 — Sesión 34 · Control Tower es sólo la máquina de estados de las oportunidades (ADR-008)

**Encargo del owner:** *«se ha decidido que Control Tower será solo una máquina de estado para las oportunidades:
no será más posible crear oportunidades desde CT, se trabajará solo con aquellas recibidas desde Twenty. Lo único
modificable será el estado… El comportamiento de drag and drop hay que quitarlo porque cada columna tiene más de un
estado, y se mantiene el hecho de que serán archivadas y quitadas del Kanban cuando lleguen a los estados finales;
ese comportamiento no afecta a Twenty.»*

**Por qué era el cambio correcto y no sólo un recorte:** con los dos sistemas escribiendo los mismos campos, lo único
que evitaba perder una edición hecha en CT era el guard de F-22 («no pisar un registro con push pendiente»), o sea una
ventana de tiempo. Y el write-back mandaba a Twenty **la copia de CT** de campos que CT no controla: si alguien
cambiaba el nombre en Twenty y en CT se movía la etapa antes del siguiente pull, el push devolvía el nombre viejo.

**Lo hecho** (recogido en **ADR-008**):

- **No se crean oportunidades en CT.** Fuera el `POST /api/v1/opportunities`, el botón «＋ Nuevo» de la lista y la
  creación contextual desde la ficha del cliente. `createOpportunity` sigue existiendo **para el sync** y rechaza a los
  actores USER con el error nuevo `OPPORTUNITY_EXTERNAL_ONLY` (`isSystemActor`, defensa en profundidad).
- **Sólo el `stage` es modificable.** Retirados el `PATCH /api/v1/opportunities/[id]`, el comando `updateOpportunity`
  y `updateOpportunitySchema`. Queda un único endpoint de escritura: `PATCH …/[id]/stage`.
- **El write-back empuja sólo `stage`.** `opportunityPatch` ya no construye `name`/`amount`/`closeDate`.
- **Fuera el arrastrar y soltar** (era E-12/B-1): como cada columna agrupa **más de un estado**, soltar obligaba a
  adivinar el destino («el primer stage alcanzable»), así que el gesto no expresaba la intención. El estado se cambia
  en el desplegable de la tarjeta —que ya era la ruta accesible por teclado— y el tablero pasa a ser un componente de
  **servidor**: deja de mandar JavaScript al navegador.
- **La ficha completa es de solo lectura**: el `InlineEditSection` de 8 campos editables pasa a `DescriptionList`, más
  el control de etapa con su aviso. En el panel lateral, los campos que posee Twenty se bloquean **por procedencia**
  (`FIELD_OWNERSHIP.opportunity`, mensaje «se edita en el origen»).
- **El archivado no cambia** y se documenta explícitamente que es **cosa de CT y no toca Twenty**.
- De paso: el panel ya no ofrece un botón «Crear» que no hacía nada en las entidades sin `createPath` (se pulsaba y no
  pasaba nada, que es la peor forma de decir que no se puede), y el aviso «Lo gestiona X; se edita en el origen» sale
  del diccionario en vez de estar escrito a mano en el componente.

**Datos de CT que NO viajan a Twenty — pendiente de decisión del owner.** Al alinear el modelo aparecieron tres
columnas sin contrapartida en el sync: `primary_contact_id` (Twenty tiene `pointOfContact`, pero el sync **no lo
mapea** en ninguna dirección), `source` y `notes` (Twenty no tiene campo equivalente: usa registros *Note*
relacionados). Las tres quedan **de solo lectura** y hoy están siempre vacías en las importadas. Hay que decidir si se
mapean al sync, se conservan como datos propios de CT con un endpoint acotado, o se retiran del modelo. Lo que sí es
CT-only y se queda como está: `closed_at`/`archived_at` y las **tareas de preventa**.

**Tests:** los que creaban oportunidades pasan a hacerlo con el contexto del **sync** (`{...ctx, userId: 'system'}`),
que es como lo hace el worker de verdad — antes pasaban un contexto de usuario a `syncTwenty`, cosa que en producción
no ocurre nunca. Test nuevo: un USER no puede crear y el sync sí.

**Verificado:** typecheck · lint · unit (85) · integración (166) · build · e2e-journeys.

**Docs:** **ADR-008** nuevo · `DECISIONS_FROZEN` (además, el registro de ADRs estaba parado en el 003: completado
hasta el 008) · `CLAUDE.md` · `user-guide.md` (matriz, playbook, congelados y la pregunta «no puedo editar una
oportunidad») · `FINDINGS_AND_DEFERRED` (E-1: campos del write-back) · `AUTOMATION_BACKLOG` + catálogo (ACT-12).

## 2026-09-02 — Sesión 33 · El pipeline de oportunidades vuelve a estar alineado con Twenty (13 stages, M39)

**Encargo del owner:** *«quiero cambiar el flujo que siguen las oportunidades… mira cuáles son las etiquetas actuales
en Twenty y cuáles las que existen en CT porque las he cambiado»*, con el reparto de columnas dictado por él.

**Lo que estaba pasando (consultado en vivo contra la API de Twenty):** Twenty tenía **13 stages** y CT **10**, con
sólo 6 en común. Como el mapeo pull/push es por identidad, la desalineación **no daba error, daba datos malos**:

- el **pull** caía a `LEAD` cualquier stage desconocido (`mapper.ts`) → la oportunidad que en Twenty estaba
  `ONBOARDED` habría vuelto al principio del embudo en CT en el siguiente sync;
- el **write-back** empujaba a Twenty `PROPOSAL`/`CANCELLED`/`CLOSED`, que allí ya no existen → `400` y el envío
  muerto en «Envíos fallidos» (exactamente el fallo que F-22 hizo visible en su día).

**Lo hecho — el enum de CT vuelve a ser el de Twenty, en su mismo orden** (`ADR-002`, addendum 2026-09-02):

- **Dominio** (`enums.ts` / `transitions.ts`): 13 stages; **`WON` deja de ser terminal** (vive en la columna
  *Negociación*, así que una ganada puede avanzar a `ONBOARDED` o volver atrás si el trato se cae) → desaparece la
  excepción `WON→CLOSED` y la regla queda plana: **terminales sólo `LOST` y `ONBOARDED`**. `deriveOpportunityStatus`:
  `WON`/`ONBOARDED` → WON, `LOST` → LOST, resto (incluido `ON_HOLD`, que es una pausa) → OPEN.
  `CLOSED_OPPORTUNITY_STAGES = ['LOST','ONBOARDED']` (la columna *Cerradas*, la que se auto-archiva a los 7 días).
- **Migración `0023_m39_opportunity_stages`**: CHECK nuevo + reetiquetado de lo que había (owner: en la Pi sólo hay
  dos oportunidades, una `CLOSED` y una `WON`) — `CLOSED→ONBOARDED`, `CANCELLED→LOST`, `PROPOSAL→PROPOSAL_SENT`,
  `CONTACTED→LEAD` —, recálculo de `status` y limpieza de `closed_at` en los stages que dejaron de ser terminales
  (la fecha en que se ganó sigue en `change_events`).
- **Kanban**: las 4 columnas salen del fichero nuevo `apps/web/lib/opportunity-columns.ts` con el reparto del owner
  (Calificación de leads · Propuesta · Negociación · Cerradas). Se sacó de la página **para poder testearlo**: un
  stage sin columna desaparecería del tablero sin dar ningún error, y ahora `opportunity-columns.test.ts` comprueba
  que los 13 están, que la última columna es la de cierre y que desde cualquier abierto hay destino válido en las 4
  (que es lo que necesita el drag & drop, porque al soltar elige el **primer** stage alcanzable de la columna).
- **i18n**: los 7 códigos nuevos con su etiqueta ES (`enum.RESEARCHING` «Investigando», `enum.PREPARING_PROP`
  «Preparando propuesta», `enum.ONBOARDED` «Incorporado»…) y las cabeceras de columna.
- **Fallback defensivo** en `mapTwentyStage`: los cuatro stages retirados siguen traduciéndose por si vuelve un valor
  viejo desde un backup o una instancia sin migrar (mejor traducir que caer a `LEAD`).
- **Sin tocar**: la automatización *ganar → crear proyecto* sigue disparándose en **`WON`** (decisión del owner);
  `ONBOARDED` sólo significa que la incorporación terminó.

**Verificado:** typecheck · lint · unit (85) · integración (165, con la migración aplicada en la base local) · build.

**Docs cerrados:** `ADR-002` (addendum), `DECISIONS_FROZEN` (10→13 estados), `IMPLEMENTATION_ROADMAP` (M05),
`AUTOMATION_BACKLOG` (AUT-03 apuntaba a `PROPOSAL`), `user-guide.md` (matriz + máquina de estados + congelados) y el
catálogo de automatizaciones (la descripción del barrido decía «cerradas sin ganar», que ya no describe la columna).

**Pendiente de la Pi:** al desplegar, el worker corre la migración; conviene un **Sync now** de Twenty después para
confirmar que la ida y vuelta de stages queda limpia.

**Añadido después (petición del owner):** el aviso «No se puede mover a «X»: la oportunidad ya está cerrada» del
tablero era un literal en el componente —el único texto visible del Kanban que se había quedado fuera del diccionario
de E-10—. Ahora es `crm.boardMoveClosed` con el nombre de la columna interpolado (`{column}`).

## 2026-09-02 — Sesión 32 · Ordenación, filtro y tope en las listas (F-28)

Último de los cuatro. Es el que F-29 desbloqueó, y se nota: **se implementó una vez y lo heredaron las 19 vistas**.

**`Column.value`** (nuevo, opcional) es la pieza que faltaba: el valor **plano** de la celda. Hace falta porque
`cell` devuelve un `ReactNode` que se prerenderiza en el servidor — el cliente recibe JSX ya pintado y no puede
mirar dentro para saber por qué ordenar o qué texto filtrar. Con `value`, el servidor manda también el dato en
crudo, y sirve para las dos cosas a la vez.

- **Ordenación por columna**: clic en la cabecera (asc → desc → sin orden), con `aria-sort` para que un lector de
  pantalla anuncie el estado. Las columnas sin `value` —acciones, controles— no son ordenables, que es lo correcto.
  Números como números y **fechas como instantes**: ordenar «10/03» y «9/03» por su texto está mal.
- **Filtro rápido** por texto sobre los valores planos de la fila, con contador de coincidencias.
- Ambos **en cliente a propósito**: no hay paginación, así que el servidor ya mandó todas las filas. Hacerlo por
  URL costaría un viaje de ida y vuelta por clic y en la Pi eso se nota.

**El tope es opt-in, y esa decisión es lo importante de este cambio.** `LIST_LIMIT = 500` lo pasa **quien pinta la
página**, nunca la consulta por su cuenta: `listReviewItems`, `listLearningItems` y `listAssets` **las usa también
el push a Notion** para saber qué empujar. Un `.limit()` ciego ahí habría dejado de sincronizar en silencio a
partir de la fila 500 — mucho peor que una lista larga. Y cuando una lista alcanza el tope, la tabla **lo dice en
pantalla**: recortar sin avisar sería mentir sobre lo que hay.

Detalle que costó un rato: `.limit(undefined)` **omite** la cláusula en runtime (comprobado con `toSQL()`) pero su
tipo no lo admite. En vez de repartir `as` por las consultas, el helper `rowCap()` documenta el porqué en un sitio.

**Verificado en vivo**, lista por lista contra el build standalone: Tareas 20 columnas ordenables, Proyectos 6,
Pagos 6, Contactos 5, Objetivos 5, Por revisar 5, Portafolio 4, y filtro en todas. **Ojo al medir**: una lista
vacía no pinta tabla, así que sale 0 hasta que tiene una fila — lo comprobé creando un pago y un recurso, porque
si no habría dado por rotas Pagos y Por revisar.

**No incluye paginación real.** Con tope de 500 y aviso en pantalla, paginar sería resolver un problema que hoy no
existe; si algún día se alcanza el tope de verdad, ese es el momento.

**Verificado:** typecheck · lint · **81 unit** · **165 integración** · build · **59/59 journeys e2e**.

## 2026-09-02 — Sesión 31 · Lote de seguridad de arranque (F-27 + 3 ítems del checklist)

Tercero de los cuatro. Cuatro cosas pequeñas, todas verificadas **en vivo** antes y después.

### La web arrancaba sin secreto de sesión ✅

Comprobado antes de tocar nada: sin `BETTER_AUTH_SECRET`, `/api/health` devolvía **200** y sólo fallaba al
iniciar sesión, con un `500 Error interno` que no dice nada. **Es el peor modo de fallo posible: parece que va.**

Ahora `webEnvSchema` lo exige (≥32 caracteres) y `apps/web/instrumentation.ts` valida el entorno **al bootstrap
del servidor** — un despliegue con la variable mal escrita **no arranca** y el log dice exactamente qué falta. Se
salta durante `next build`, siguiendo el mismo criterio que `requireDatabaseUrl()` en `@ct/db`. El deploy además
aborta antes de empezar si falta o es corto.

### F-27 · El barrido del rate limiter ✅

`sweepRateLimiter()` estaba escrito y **no lo llamaba nadie**. En vez de un `setInterval`, barrido **amortizado**
dentro de `rateLimit()` (1 de cada 500 llamadas): sin temporizador vivo, funciona tras cualquier reinicio y —lo
importante— **no depende de que alguien se acuerde de arrancarlo**, que es exactamente el fallo original.

Y el `channelId` del webhook del inbox se valida como UUID **antes** de tocar el limitador: ese endpoint no exige
sesión y la clave la elegía quien llamaba, así que se podían crear cubetas sin límite en el `Map`.

### Un id mal formado daba 500 ✅

Comprobado: `GET /api/v1/contacts/no-soy-un-uuid` → **`500 Error interno`**. El id llegaba crudo al `where id = $1`
de una columna `uuid` y Postgres lo rechazaba. Un id mal formado es error del cliente, no avería del servidor.

`parseId()` en `lib/api.ts`, aplicado a **53 rutas** (todas las `[id]`/`[assetId]`/`[channelId]`; `automations/[key]`
queda fuera porque su parámetro no es un UUID). Ahora → **400 VALIDATION**, sin gastar una consulta y sin ensuciar
el log de errores con ruido que no lo es. El 404 de un UUID válido pero inexistente sigue funcionando igual.

### Contraseña de Postgres 🟡 (acción del owner)

El `.env` es por-máquina y no está en el repo, así que desde aquí no se puede cambiar. Lo que sí se puede: el
deploy **avisa en cada despliegue** si sigue siendo la de por defecto e imprime el procedimiento de rotación.
**No aborta a propósito** — rotarla con la base ya creada exige un `ALTER USER` además de tocar el `.env`, y
abortar dejaría al owner sin poder desplegar hasta hacer una migración de credenciales a destiempo.

**Verificado:** typecheck · lint · **81 unit** (5 nuevos) · **165 integración** · build · **59/59 e2e**, más
comprobación en vivo: arranque sin secreto → falla con mensaje claro · con secreto → 200 · secreto corto →
rechazado · ids no-UUID → 400 en las cuatro rutas probadas · UUID inexistente → 404 · webhook con canal basura → 400.

## 2026-09-02 — Sesión 30 · Medir el rendimiento (E-14 paso 1) y blindar la Pi (F-31)

Los dos primeros de los cuatro que acordamos, en orden.

### E-14 · Ahora hay con qué medir ✅ (el ítem sigue abierto)

E-14 decía «medir primero, no suponer» y el proyecto **no tenía ninguna instrumentación**: no se podía ni
intentar. Ahora sí:

- **`packages/db/src/instrument.ts`** mide **toda** consulta —web y worker— envolviendo `unsafe()` del cliente de
  postgres.js, que es por donde Drizzle ejecuta todo. Detalle que costó comprobar antes de escribirlo: hay que
  **reemplazar** su `then`, no encadenar otro, porque encadenarlo **dispara la ejecución** de la Query perezosa y
  rompe el `.values()` que Drizzle llama después. Se verificó con una prueba aparte antes de tocar el código.
- Mide de **emisión a resultado**, con la espera por una conexión libre del pool dentro. A propósito: si el pool
  se queda corto, se ve, en vez de quedar invisible.
- **`Server-Timing`** (`db;dur` + `total;dur`) en todas las rutas `/api/v1/*`, visible en la pestaña Red.
- **Aviso `consulta lenta`** por encima de `DB_SLOW_QUERY_MS` (200 ms), y `DB_LOG_QUERIES=true` para registrarlas
  todas en una sesión de diagnóstico.
- **`scripts/measure-perf.sh`**, para correr **en la Pi**: tabla de tiempo de pared por página (fría/mejor/media)
  más el reparto `db`/`total`. Cómo leerlo, en `DEPLOYMENT.md § Medir el rendimiento`.

**El dato que cambia la hipótesis del propio E-14:** medido en el portátil con el build standalone y la app
caliente, las páginas tardan **12–27 ms**. El código no hace nada patológico, así que **contar consultas e índices
probablemente NO es la causa** de los varios segundos de la Pi. Quedan dos números altos para cuando toque
optimizar: `/api/v1/context/home` hace **28 consultas** y la búsqueda global **18** (una por entidad). La sospecha
principal pasa a ser **presión de memoria / swap contra la SD** — que es justo lo siguiente.

E-14 **sigue abierto**, recortado a lo que queda de verdad: correr el script en la Pi y mirar los números.

### F-31 · Techo de memoria y una imagen de worker que pesaba el triple que la web ✅

**Memoria:** `mem_limit` + `memswap_limit` en los tres servicios de los **dos** compose de la Pi, configurables
por `.env`. Los valores por defecto están **medidos, no inventados** (web 247→289 MB navegando, worker ~50 MB en
reposo, db 72 MB), con ~2x de holgura — porque **un límite corto convierte «va lento» en «lo mata el OOM»**, que
es peor que no tener límite. Y `memswap_limit = mem_limit` ⇒ **sin swap**: en la Pi el swap va a la tarjeta SD y
degradar ahí duele más que reiniciar y seguir. Si la lentitud de E-14 era swap, esto la convierte en un reinicio
visible en vez de una degradación silenciosa.

**Imagen del worker: 1,35 GB → 413 MB** (la web son 469 MB). Etapa `worker-deps` con
`pnpm install --prod --filter "@ct/worker..."`; la final copia sólo eso más `packages/` y `apps/worker/`. Se
**mantiene tsx** y el código como TypeScript: los paquetes exportan `./src/index.ts` sin compilación, es la
convención del repo y cambiarla afectaría también al `transpilePackages` de Next. Lo recortado son las
devDependencies (next, react, vitest, playwright, eslint, drizzle-kit…).

**La trampa, que sólo salió por probar la imagen y no por leer el Dockerfile:** con `--prod`,
`pnpm --filter @ct/db migrate` fallaba con `tsx: not found`. **El deploy corre las migraciones dentro del
worker**, y `tsx` estaba declarado como **devDependency** de `@ct/db` y de `@ct/worker` — una declaración
sencillamente falsa, porque producción ejecuta `migrate` y el propio worker con tsx en cada despliegue. Movido a
`dependencies` en ambos. Si esto se hubiera mergeado sin construir la imagen, el siguiente deploy habría abortado
en la migración.

**Verificado ejecutando la imagen**, no mirándola: el worker arranca, conecta, procesa jobs, corre los barridos y
escribe su heartbeat; `migrate` sale con **código 0** dentro del contenedor; la etapa `web` construye igual.

**Verificado (ambos):** typecheck · lint · **76 unit** · **165 integración** · build · **59/59 journeys e2e**.

## 2026-09-02 — Sesión 29 · Integridad de «Por revisar» (F-33) y el buscador que ignoraba 4 entidades (F-34)

Tres arreglos pedidos por el owner. Los dos primeros son la misma idea —no perder información— por dos caminos
distintos; el tercero resultó ser bastante más gordo de lo que parecía.

### F-33 · «Por revisar»: revisado es terminal, y la purga ya no se lleva lo que no está a salvo ✅

**Lo que pasaba.** Un recurso marcado como REVISADO se podía editar y devolver a la cola: `updateReviewItemStatus`
no validaba nada, así que volver a `TO_REVIEW` **borraba el `reviewed_at`** y dejaba en la cola algo que quizá ya
estaba en la biblioteca. Y la purga de retención borraba cualquier revisado fuera de plazo, procesado o no — un
revisado **sin procesar** es la única copia que queda de él (título, enlace, notas), así que eso era **perder
información**. El comentario del código daba por hecho que todo lo revisado ya estaba en la biblioteca; no es
cierto: procesar es un paso manual y explícito.

**Lo hecho.** Regla de dominio `isReviewItemFrozen` — REVISADO es terminal; `updateReviewItem` y
`updateReviewItemStatus` devuelven 409 `REVIEW_ITEM_REVIEWED`. La purga sólo borra `DISCARDED` y los `REVIEWED`
**con `knowledge_item_id`**.

**Un detalle que merece constar:** cerrar también REVIEWED → DISCARDED no es celo de más. Sin eso, la regla de la
purga tendría **puerta trasera**: bastaría descartar un revisado sin procesar para que el barrido se lo llevara.
Las dos reglas se sostienen juntas. El resto de estados sigue libre a propósito — la cola es una bandeja de
trabajo, no un flujo rígido.

En la UI, el `GET` devuelve `meta.readOnly` con el motivo (el panel se pinta bloqueado con 🔒 en vez de fallar
campo a campo al autoguardar) y la lista muestra **insignia en vez de desplegable**: ofrecer un selector que el
servidor va a rechazar es peor que no ofrecerlo. **Procesar sigue disponible** — no modifica el recurso, lo enlaza.

### F-34 · El buscador «universal» ignoraba 4 de las 15 entidades indexadas ✅

El owner buscó un ítem de «Por revisar» y no salía. La causa: `review_items` **tiene** su `search_vector` y su
índice GIN desde el principio —el coste ya se pagaba en cada escritura— pero **nadie la añadió a `TARGETS`**. Al
mirarlo aparecieron **cuatro** igual: `review_items`, `learning_items`, `resources` y `payments`. **15 tablas
indexadas, 11 buscables.**

Nadie lo detectó porque el índice se crea solo con el esquema y **una búsqueda sin resultados no parece un fallo,
parece que no hay nada**. No había ningún test que atara las dos listas; ahora lo hay, y está **comprobado que
muerde** (quitando `review_item` de `TARGETS`, falla).

Dos cosas más por el camino: la búsqueda **ya no devuelve lo archivado** (archivar oculta un registro de su lista,
así que el resultado llevaría a una vista donde no está), y los encabezados de grupo, que estaban **en inglés y
hardcodeados en la capa de aplicación** («Clients», «Knowledge»…), pasan al diccionario y los traduce la UI por
tipo. Cuenta contra F-30.

**Verificado en vivo** contra el build standalone, no sólo con tests: editar pendiente 200 · marcar revisado 200 ·
volver a la cola 409 · descartar 409 · editar 409 · reenviar REVISADO 200 (no-op) · `readOnly=true` con su motivo.
Purga con política real de 30 días: borró los dos revisados **ya procesados** y **conservó** el que no lo estaba.
Y buscar «Zentauro» devuelve el recurso de Por revisar con `href=/knowledge/review`.

**Ojo — dos tests existentes codificaban el comportamiento viejo** y hubo que reescribirlos: uno devolvía un
revisado a la cola y comprobaba que se limpiaba la fecha; otro esperaba que la purga se llevara un revisado sin
procesar. Un test verde sobre una regla equivocada no protege nada.

**Verificado:** typecheck · lint · **76 unit** · **165 integración** (8 nuevos) · build · **59/59 journeys e2e**.

## 2026-09-01 — Sesión 28 · Pantallas de error/404 (F-26) y unificación de las listas (F-29)

Los dos primeros de la revisión de producto de la sesión 27. Y, por el camino, un tercero que no estaba previsto.

### F-26 · Pantallas de error y 404 propias ✅

Cuatro pantallas sobre una primitiva común, **`components/ui/message-screen.tsx`** (misma forma para las cuatro,
para que un fallo no parezca de otra aplicación; el filete de arriba se tiñe de rojo sólo cuando es error, para no
confundirlo con un 404):

| Fichero | Cuándo se ve | Qué ofrece |
|---|---|---|
| `app/(app)/not-found.tsx` | `notFound()` de las 12 fichas | «Ir al inicio» + **«Ver archivados»** |
| `app/not-found.tsx` | URL que no casa con ninguna ruta | «Ir al inicio» |
| `app/(app)/error.tsx` | un Server Component lanza | `reset()` + el `digest` del fallo |
| `app/global-error.tsx` | falla el layout raíz | recargar (trae su propio `<html>` y su CSS) |

Dos decisiones que merecen constar. El atajo a **Archivados** no es relleno: si un enlace que antes funcionaba da
404, lo más probable es que el registro se archivara (se oculta de las listas, no se borra). Y el **`digest`** se
enseña a propósito: en producción Next oculta el mensaje real al cliente y ese hash es lo ÚNICO que permite cruzar
«lo que vi» con el fallo en `docker logs`.

**Lo que NO se pudo hacer, comprobado y no supuesto:** el 404 de las fichas se pinta **sin barra lateral**. Next no
aplica el layout del grupo `(app)` a un `not-found.tsx` aunque el fichero viva dentro. Intenté montar el `AppShell`
a mano leyendo la sesión: dentro de ese boundary `getCurrentContext()` devuelve null (Next no expone las cookies
ahí), así que quedaba igual y con una consulta de más → retirado. Por eso la pantalla lleva sus propias salidas.

Verificado en vivo contra el build standalone: ficha inexistente → 404 en español · URL inexistente → 404 · lista
real → 200 · **cero** rastro del «This page could not be found».

### F-29 · Las 25 listas eran la misma página ✅

**Tres** componentes, no el `<ListPage>` monolítico que se había esbozado. Partirlo fue deliberado: uno solo no
encajaba en las pestañas de Pagos/Revisión ni en las secciones de las fichas, y habría obligado a contorsionarlas.

- **`ui/record-table.tsx`** — la pieza que faltaba entre `Column<T>` y `DataTable`. Hace el mapeo `columns→rows`
  (que existía porque `DataTable` es de cliente y no puede recibir funciones `cell`) y absorbe el
  `length === 0 ? <EmptyState/> : <DataTable/>`. **Era el trozo más copiado: 19 veces → 1.**
- **`ui/list-page.tsx`** — migas, título con contador, acción y fila de filtros; el contenido entra como `children`.
- **`ui/filter-tabs.tsx`** — las pestañas por enlace, duplicadas literalmente en 4 vistas. Ganan `aria-current`.

19 vistas tocadas (14 listas + las 4 fichas con secciones de tabla + `resource-list`). **No queda ni un mapeo
`columns.map(({ header, className }) => …)` fuera de `record-table.tsx`**; el docstring de `DataTable`, que
enseñaba a hacerlo a mano, ahora remite a `RecordTable`.

**Esto desbloquea F-28** (ordenación, filtro y `LIMIT`): ahora se implementa en un sitio, que era el motivo de
hacerlo en este orden. De paso salieron al diccionario los literales de la cabecera de Tareas (contador y «zona
horaria»), el aviso de retención y el `CRM` a pelo del breadcrumb de Contactos — cuenta contra F-30, que sigue
abierto para el resto.

### F-32 · El e2e llevaba tiempo roto, y en silencio ✅ (no estaba previsto)

Al correr `scripts/e2e-journeys.sh` como verificación: **59 de 62 checks fallando**. Parecía una regresión gorda de
lo que acababa de tocar. **No lo era:** `git stash` y ejecutarlo contra el árbol limpio daba exactamente los mismos
fallos. Dos causas, ambas del script:

1. **La limpieza no mataba nada.** `pkill -f "standalone/apps/web/server.js"` no encuentra el proceso porque el
   server standalone de Next **se renombra** a `next-server (v15.5.23)` al arrancar. Un server de una ejecución
   anterior seguía ocupando el puerto y los `curl` hablaban con el VIEJO, que tenía otras variables → cascada de
   307/308. Ahora se mata **por puerto**.
2. **El alta devolvía 403.** El registro es bootstrap-only (protección contra takeover, añadida por seguridad) y la
   BD de dev ya tiene 14 usuarios. Nadie actualizó el script. Ahora arranca con `ALLOW_OPEN_REGISTRATION=true`, la
   vía de escape que el propio `lib/auth.ts` documenta, sobre un servidor efímero de pruebas.

Y **dos aserciones caducadas** que buscaban texto que la app ya no dice: `Projects (1)` (se tradujo, E-10 →
`Proyectos`) y `Activos (1)` en la ficha de proyecto (el vocabulario se renombró: esa pestaña es **`Recursos`**).

La lección, para no repetirla: **la verificación que nadie mira acaba mintiendo**. Si se toca auth, vocabulario
visible o el arranque, hay que correr este script — está en la lista de `CLAUDE.md` justamente por esto.

**Verificado:** typecheck · lint · **76 unit** · **157 integración** · build · **59/59 journeys e2e**, más humo
manual sobre las 19 rutas contrastando filas renderizadas contra la BD (contactos 6+cabecera=7, objetivos 1+1=2,
pagos 0 → estado vacío, Tareas conserva sus 4 tablas apiladas con `fixedLayout`).

## 2026-09-01 — Sesión 27 · Revisión de la app como producto (código · UI/UX · seguridad · qué falta)

**Encargo del owner:** evaluar la calidad de la aplicación **en el estado actual**, como producto, y
explícitamente **sin guiarse por lo ya anotado como pendiente**. Sin escribir código: sólo diagnóstico.

**Verificado en ejecución, no leído en la documentación:** `pnpm -r typecheck` ✓ · `pnpm lint` ✓ ·
`pnpm test` **76/76** ✓ · `pnpm test:integration` **157/157** ✓ (16 s, Postgres 18). Inventario: 26.700 líneas
propias de TS/TSX, 48 páginas, 95 endpoints, 40 tablas, 75 índices, 23 migraciones, 646 claves de i18n.
Y un dato que merece constar: **0 `any`, 0 `@ts-ignore`, 0 `eslint-disable`** en todo el código propio.

**Veredicto:** ingeniería claramente por encima de la media envuelta en un producto a medio terminar. El backend,
el modelo de datos y las integraciones están bien (capas respetadas de verdad —los route handlers son de 15 líneas
sin lógica—, propiedad por campo entre Twenty/Notion, Outbox transaccional, `t()` tipado). **No apareció ningún
fallo de corrección.** Lo que va por detrás es el acabado de producto.

**Anotado en `FINDINGS_AND_DEFERRED.md` → nueva sección G** (sólo lo que resultó NUEVO tras cotejarlo con el
registro, las dos auditorías y el checklist de seguridad):
- **F-26** no existen `error.tsx`/`not-found.tsx` → el 404 y los errores de servidor se ven con la pantalla por
  defecto de Next, en inglés y fuera del shell. El arreglo de mejor relación coste/beneficio de toda la revisión.
- **F-27** `sweepRateLimiter()` está escrito y **no lo llama nadie**; agravado porque la clave del webhook del
  inbox (`inbox:${channelId}`) la elige quien llama, sin autenticar.
- **F-28** ninguna lista lleva `LIMIT`, ni ordena, ni filtra (`listProjects` carga clientes y contactos enteros en
  memoria por petición). Enlazado desde **E-14**.
- **F-29** las 25 páginas de lista son la misma página copiada → hay que unificarlas **antes** de F-28.
- **F-30** 61 claves de i18n auto-extraídas del castellano y truncadas, con namespaces cruzados, + literales sueltos.
- **F-31** la imagen del worker lleva el proyecto entero (`tsx` en producción) y **ningún servicio tiene límite de
  memoria** → en la Pi, una fuga se lleva la máquina entera.
- **E-15** notas/comentarios por registro (el único hueco de producto que es una ausencia real) · **E-16** adjuntos
  (necesita decisión: choca con «sólo referencias») · **E-17** exportar datos de negocio e informes de evolución.

**También tocados:** `SECURITY_CHECKLIST.md` (límites de memoria e imagen del worker en §7; `sweepRateLimiter` como
ítem 9 de la tabla de prioridades; y **corregida la incoherencia** de que la tabla seguía pidiendo contenedores
no-root cuando §7 ya lo daba por descartado por el owner) y `AUDIT_UIUX_2026-08-30.md` (F-26 como P1 nuevo,
`confirm()` nativos y listas sin ordenación).

**Dos cosas que la revisión dio por malas y NO lo eran** — corregidas tras comprobarlas contra el código, y vale la
pena dejarlas escritas para no volver a "descubrirlas":
- **Responsive/móvil no es deuda:** es **decisión de alcance del owner (2026-08-30)**, la UI es sólo escritorio.
- **El atajo ⌘K ya existe** (`global-search.tsx:33`). No hacía falta ningún trabajo ahí.

**Nada de esto cambia el orden de lo pendiente:** el encargo vivo del owner sigue siendo **el rendimiento (E-14)**,
y F-28 le añade evidencia por el lado de las consultas de lista.

---

## 2026-09-01 — Sesión 26 · El esqueleto de carga: probado, retocado y ❌ retirado

**Pregunta del owner:** «¿es normal que me salga un esqueleto antes de abrir cualquier página? ¿O es que la app se ha
puesto más lenta?».

Era intencionado (`app/(app)/loading.tsx`, commit `73d99c8`, hallazgo nº 1 de `AUDIT_UIUX_2026-08-30.md`: navegar no
daba ninguna señal hasta que respondía el servidor). **No añadía latencia** —se pintaba durante un render que ya
ocurría—, pero sí la hacía visible: las 47 páginas de `(app)` son `force-dynamic`, así que cada navegación es un
render en el servidor con sus consultas, y en la Pi eso se nota.

**Intento 1 — retardo de 250 ms** (`.skeleton-delayed` en `globals.css`, `animation-fill-mode: both`, sin JS): el
owner seguía viéndolo asomar justo antes de la página. **Intento 2 — 450 ms:** peor, y ahí salió el fallo de fondo.

**❌ Retirado (decisión del owner).** El error de diseño era mío: durante el retardo el esqueleto está a `opacity: 0`
**pero la página anterior ya se ha desmontado** —Next sustituye la ruta por el `loading` en cuanto arranca la
navegación—, así que lo que quedaba era el lienzo **en blanco** varios segundos. Un hueco vacío da MÁS sensación de
lentitud que no mover nada. Borrados `loading.tsx` y su CSS: vuelve el comportamiento por defecto de Next, la página
anterior se queda visible hasta que la nueva está lista.

Hallazgo cerrado como **descartado** en `AUDIT_UIUX_2026-08-30.md` (no pendiente). Si algún día se retoma, la
alternativa que no tiene este problema es una **barra de progreso fina arriba**, que se superpone en vez de sustituir
el contenido. Y el arreglo de fondo, si las navegaciones molestan, es que las páginas respondan más rápido.

Verificado: typecheck · lint · unit (76) · build (comprobado que la clase ya no aparece en el CSS compilado).

---

## 2026-09-01 — Sesión 25 · «Recursos» vs «Reutilizables», tamaños que bailaban y la purga que no purgaba

1. **Vocabulario: se acabó el «Activos» que significaba tres cosas.** En la ficha de proyecto convivían tres pestañas
   parecidas y dos se llamaban casi igual. Renombrado sólo el **display** (ni datos, ni endpoints, ni migración):
   - **Entregables** (`deliverables`) — lo que te comprometes a entregar, con ciclo de vida y fecha. Sin cambios.
   - **Activos → Recursos** (`resources`) — infraestructura operativa del proyecto/cliente: accesos, hosting,
     dominios, con `credential_location` como **puntero**, nunca el secreto. Ahora se llama como su modelo.
   - **Activos (biblioteca) → Reutilizables** (`assets`) — piezas del catálogo (plantillas, repos) enlazadas N:M.
     La sección de Conocimiento y la pestaña del proyecto usan ya la MISMA palabra.
   De paso se separó una colisión de i18n: el filtro de estado de proyectos/clientes reutilizaba `resources.title`
   para decir «Activos» (adjetivo) → clave propia `filter.active`. Guía de uso y etiquetas de «Archivados» al día.

2. **Tamaños que cambiaban solos.**
   - `SearchableSelect` (relaciones y campos con sugerencias del panel) se dimensionaba **por el contenido**
     (`min-w-40` en línea) y desplegaba un panel fijo de `w-64`: el campo crecía al elegir un valor largo y el
     desplegable sobresalía del hueco. Ahora el contenedor fija el ancho (100 % en formulario vía `block`, `min-w-56`
     en línea), el botón lo ocupa entero y el desplegable es `w-full` → cae exactamente sobre el campo. De paso acepta
     `disabled` (antes un panel de solo lectura dejaba abrir el desplegable).
   - **Botones de purga:** los tres salen ahora de un único `PurgeButton` con la MISMA etiqueta («Purgar ahora»),
     tamaño y `w-36`. Antes cada uno llevaba su propio texto y quedaban desalineados; lo que distingue a cada uno es
     la política a la que acompaña (y el `aria-label`, para quien no ve esa relación visual).

3. **Faltaba el botón de purga de «Por revisar»** → añadido, con su ruta `POST /api/v1/maintenance/purge-reviewed`.

4. **🐞 La purga de archivados no purgaba (y no lo decía).** Encontrado al reproducirlo con un grafo completo de
   entidades archivadas contra Postgres real: de 19 entidades sólo borraba 14.
   - `payment` y `review_item` estaban en `ARCHIVABLE` pero **no en `PURGE_ORDER`** → se archivaban y no se borraban
     jamás. Nuevo `purgeOrderMissingEntities()` + test unitario que obliga a dar sitio en el orden a toda entidad
     archivable nueva.
   - El orden hijo→padre estaba **mal**: `document` y `review_item` iban DESPUÉS de sus padres, así que la FK
     bloqueaba a `project`, `client` y `knowledge_item` en cada barrido, para siempre. Orden rehecho desde las FKs
     reales del catálogo (`pg_constraint`).
   - Faltaba borrar las **hijas no archivables** que cuelgan del registro: `project_phases` (soltando antes
     `projects.current_phase_id`), `project_assets` y `service_capabilities`. Sin eso, un proyecto o un servicio
     archivado no se podía borrar nunca.
   - Ahora la purga hace **varias pasadas** (auto-referencias: subtarea→tarea, decisión superseded, objetivo padre) y
     para en cuanto una pasada no avanza.
   - Lo que un registro **vivo** aún usa se sigue conservando a propósito, pero ya **se reporta**: `blocked` por
     entidad en la respuesta, mensaje en el botón y `logger.warn` con el error real en el log del servidor. Antes el
     `catch {}` se lo tragaba entero y un bloqueo permanente era invisible.
   - `purgeCompletedTasks` protege cada borrado con su propio `try`: un fallo en UNA tarea ya no puede tumbar el
     barrido con un «Error interno».
   - `purgeReviewedItems` deja rastro en `audit_logs` como los demás barridos, y `updateReviewItemStatus` pasa por
     `mapDbError` (sin él, cualquier error de BD salía como 500 genérico).
   - Tests nuevos: `tests/integration/retention.test.ts` (5 casos, contra Postgres real: grafo completo purgado
     entero, bloqueo por registro vivo reportado sin lanzar, sin política no borra, purga de «Por revisar») y
     `packages/application/src/maintenance/archive.test.ts`.
   - **Sobre el «error de servidor» que vio el owner:** NO se ha podido reproducir con ninguno de los dos botones
     (ni contra un grafo completo ni con FKs bloqueadas: ambos devuelven resultado, no excepción). Queda el
     blindaje + el log con el motivo real, así que si vuelve a pasar el servidor dirá exactamente qué falló.

Verificado: typecheck · lint · unit (76) · integración (157, Postgres real) · build.

---

## 2026-09-01 — Sesión 24 · Actividad con nombre, contactos acotados al cliente y paneles sin saltos

1. **Pagos:** el recuadro de reserva dice ahora «Reservar (30 %)», sin la palabra «impuestos».
2. **Actividad reciente con sentido.** Decía «Actualizó proyecto» y poco más. Ahora resuelve el **nombre** de la
   entidad («Actualizó proyecto «Web corporativa Acme»») y, si el audit guardó estado/etapa/visibilidad, lo añade
   («→ Activo»). Nuevo `resolveEntityNames` sobre el mismo mapa que ya usa el archivado (una query por tipo con
   `inArray`, no una por fila); lo que no se resuelva —borrado, tipo sin mapa— cae a la etiqueta genérica de antes.
3. **Contactos acotados al cliente.** Nuevo `dependsOn` en los campos de relación del panel: elegido el cliente, el
   desplegable de contacto sólo ofrece los suyos (y todos si aún no hay cliente). Aplicado a proyecto, oportunidad y
   pago. La opción **ya guardada se conserva aunque no encaje**, para que un contacto asignado antes de cambiar de
   cliente no parezca borrado.
4. **Los paneles ya no mueven la página.** Abrir uno es un cambio de query, no una navegación, pero Next hacía scroll
   al inicio: desde una fila del final de la lista eran dos saltos por consulta. `scroll={false}` en los enlaces que
   abren panel (registros y automatizaciones) y en los `router.push` de cierre y de creación.

Tests de integración nuevos: la actividad trae nombre y detalle; los pagos retrasados avisan en «Requiere atención».

Verificado: typecheck · lint · unit (74) · integración (152, Postgres real) · build.

## 2026-09-01 — Sesión 23 · Reserva de impuestos en Pagos + **la guía de uso estaba caída (bucle infinito)**

**1) Pagos:** junto a «Pendiente de cobrar» aparece ahora un cuadro ámbar con el **30 % de esa cifra**, la reserva
para impuestos. Sólo acompaña a las entradas (a un gasto no hay que reservarle impuestos) y respeta la separación por
moneda. El porcentaje es una constante (`TAX_RESERVE_PCT`) con su porqué escrito: es una regla de bolsillo, no un
cálculo fiscal; si algún día depende del régimen, pasará a Ajustes.

**2) La página `Settings › Guía` no cargaba — y NO era la Raspberry Pi: era un bug que introduje yo.** Al añadir la
fila de «Por revisar» a la matriz de información (sesión 21b), el texto quedó **partido en tres líneas**. En Markdown
una fila de tabla ocupa una sola línea, así que la siguiente (`| **Learning Path** | …`) quedó como fila suelta: el
parser no la reconoce como tabla y tampoco la trata como párrafo (es "especial"), así que **no avanzaba el índice** →
bucle infinito. En la Pi eso es una petición que no responde y un contenedor comiéndose la memoria.
- **Arreglado el contenido** (la fila vuelve a ser una sola línea) y comprobado que no queda ninguna otra fila huérfana.
- **Arreglado el parser, que es lo importante:** el bloque de párrafo consume SIEMPRE la primera línea, así que un `.md`
  mal formado produce como mucho un párrafo feo, nunca una página colgada.
- **Test de regresión** (`markdown.test.tsx`): renderiza la guía ENTERA con el contenido real del repo — lo mismo que
  hace la página — más el caso de la fila suelta, el escapado de HTML y el saneado de enlaces. Ahora `pnpm test`
  incluye los tests de componentes (`apps/web/components/**/*.test.tsx`, JSX automático en la config de vitest).

Verificado: typecheck · lint · unit (74) · integración (150, Postgres real) · build.

## 2026-09-01 — Sesión 22 · Retención de «Por revisar», Pagos (vistas y color) y avisos en el Home

**1) Retención de la cola «Por revisar»**, como el resto de políticas. Nuevo ajuste
`settings.reviewRetentionDays` («Conservar siempre» o «Borrar tras N días») que purga lo ya **REVISADO/DESCARTADO**;
lo pendiente no se toca nunca, y lo que se pasó a la biblioteca sigue allí con su enlace, así que no se pierde nada.
Barrido diario del worker + entrada en el catálogo (`sweep.review_purge`, con «Ejecutar ahora» que avisa si no hay
política). Detalle: la comparación va entera en SQL (`coalesce(reviewed_at, updated_at) < …::timestamptz`) porque con
`lt()` sobre una expresión el driver recibía un `Date` sin tipo y petaba.

**2) «Más usados» abierto por defecto:** su razón de ser es que se vean.

**3) Pagos:**
- Etiquetas **«Entrada» / «Salida»**, sin el paréntesis explicativo.
- Dirección con convención contable: **entrada en verde, salida en rojo** (con el signo ↓/↑ acompañando, para que se
  lea también sin distinguir colores).
- Color de estado: **pendiente en ámbar, pagado en azul**. El azul es un **tono nuevo** (`--info-soft`), no un color
  suelto: se suma a `status-tone` con su icono propio (◆), así que sirve para cualquier estado «cerrado sin más que
  hacer» — de hecho lo hereda «Revisado» de la cola de revisión.
- **Sin flechitas** en los campos numéricos (regla global en `globals.css`: con teclado no aportan y en un importe
  estorban).
- Dos vistas nuevas al final: **Retrasados** (pendientes cuya fecha ya pasó) y **Todos**. La fecha vencida sale en rojo
  en cualquier vista.
- **Aviso en el Home:** los pagos retrasados aparecen en «Requiere atención» con severidad alta, enlazando
  directamente a su pestaña — para eso `Tabs` acepta ahora `defaultIndex` y la página lee `?ver=retrasados`.

Verificado: typecheck · lint · unit (70) · integración (150, Postgres real) · build.

## 2026-09-01 — Sesión 21b · «Por revisar»: enlace en su columna y pasar a la biblioteca

- **El enlace sale del título** y pasa a su **propia columna al final** de la tabla: es una acción («Abrir ↗»), no
  parte del nombre del recurso.
- **«Pasar a la biblioteca»** en el panel lateral de los recursos **ya revisados**: crea el elemento de conocimiento
  **APROBADO**, no borrador — llegar ahí significa que ya lo leíste y decidiste guardarlo, así que pasarlo otra vez por
  «borrador» sería repetir un trabajo hecho. Entra como **REFERENCIA** con su URL, su sector y las notas como resumen,
  y con `sourceType: REVIEW` (etiqueta «Por revisar» en el badge de fuente) para saber de dónde salió.
- **Sin duplicados y con trazabilidad:** nueva columna `review_items.knowledge_item_id` (migración 0022/m38) que enlaza
  el recurso con lo que se creó. Si ya se procesó, el panel enseña «Ya está en la biblioteca ↗» en lugar del botón, y
  el comando rechaza el segundo intento (`REVIEW_ITEM_ALREADY_PROMOTED`). Sólo se puede procesar desde `REVIEWED`
  (`REVIEW_ITEM_NOT_REVIEWED` si no).
- Test de integración de todo el recorrido: no revisado → rechaza; revisado → crea APROBADO con sus campos; segundo
  intento → rechaza y la biblioteca sigue con un solo elemento.

Verificado: typecheck · lint · unit (70) · integración (149, Postgres real) · build.

## 2026-09-01 — Sesión 21 · «Por revisar» en Conocimiento (con espejo a Notion) + retoques de Ajustes

**1) Ajustes:** fuera la miga de pan que sólo repetía «Ajustes» encima del título, y **separación real entre bloques**
(línea + aire): antes «Tu perfil» y «Organización» se leían como una sola lista.

**2) Conocimiento › «Por revisar» (migración 0020/m36).** Cola de lo que quieres leer o ver: artículos, vídeos, libros,
hilos… Es una **bandeja de consumo**, distinta de sus vecinas: `learning_items` es formación con progreso,
`knowledge_items` es lo ya destilado y `documents` son ficheros de Drive. Aquí sólo hay enlace, tipo y si ya lo viste.
- Tabla `review_items`: título, tipo (etiqueta libre con sugerencias), URL, estado
  (`TO_REVIEW`/`REVIEWING`/`REVIEWED`/`DISCARDED`), sector (mismo vocabulario que la biblioteca), notas y
  `reviewed_at`, que se sella al marcarlo revisado y se limpia si vuelve a la cola.
  *(Ajuste posterior del owner: el campo «Origen» se elimina —basta la URL, que es lo que lleva al recurso— y el
  `Sector` viaja a Notion como TEXTO, no como select. Migración 0021/m37.)*
- UI: `/knowledge/review` con pestañas **Pendientes** / **Revisados**, alta y edición por el panel lateral, estado
  editable desde la fila y enlace directo «Abrir ↗». Tarjeta en la portada de Conocimiento con **lo que queda por
  revisar** (la cifra accionable, no el total). Archivable como el resto.
- **Espejo BIDIRECCIONAL con Notion**: `reviewItemSpec` en `notion-specs.ts` con `importFromNotion`, registrada en el
  runner (`reviewItems`), en `PUSH_TARGETS` y en `NOTION_MIRRORED` — así el push en tiempo real funciona igual que en
  las otras 10 entidades. Contrato documentado en `NOTION_INFORMATION_ARCHITECTURE.md` **§4.11** con las propiedades
  exactas que debe tener la base de datos de Notion.
- Test de integración del ciclo de estado.

**Pendiente del owner** (sin esto la parte de Notion no hace nada, el resto de la sección sí funciona): crear la DB en
Notion con esas propiedades, compartirla con la integración y pegar su `database_id` en
Automatización › Integraciones › Notion → `configuration.databases.reviewItems`.

Verificado: typecheck · lint · unit (70) · integración (148, Postgres real) · build.

## 2026-09-01 — Sesión 20 · Sección **Pagos** + «Más usados» en la barra lateral

**1) Pagos (nuevo módulo, migración 0019/m35).** Registro de dinero pendiente de **entrar** (IN: te lo deben) o de
**salir** (OUT: lo debes tú). CT-nativo: no se refleja a Notion ni a Twenty.
- Tabla `payments`: concepto, dirección, estado (PENDING/PAID), importe `numeric(14,2)`, moneda (**EUR por defecto**),
  `client_id`/`contact_id` (sólo IN), `payee_label` (sólo OUT, texto libre), fecha prevista, `paid_at`, notas.
- **Coherencia por dirección, en el comando** (no en la tabla): un cobro apunta a cliente o contacto del CRM; un gasto
  lleva etiqueta libre —un proveedor o una suscripción no tienen por qué existir como cliente— y **al cambiar de
  dirección se limpia lo que deja de aplicar**, para no arrastrar datos de la dirección anterior.
- `paid_at` se sella al marcar pagado y se borra al volver a pendiente.
- UI: sección **Pagos** en la barra lateral (antes de Ajustes), con pestañas **Pendientes** / **Completados**, alta y
  edición por el panel lateral (los campos de cliente/contacto o etiqueta aparecen según la dirección), y el estado
  cambiable desde la propia fila. La dirección se lee de un vistazo por el signo ↓/↑ y el color.
- **Añadido no pedido, pero difícil de justificar omitir:** totales de lo pendiente, agrupados **por dirección y por
  moneda** («Pendiente de cobrar: 1.200,50 EUR (3)»). Agrupar por moneda porque sumar euros con dólares no significa
  nada. Se puede quitar si sobra.
- Archivable como el resto (entra en Ajustes › Archivados). Seis tests de integración.

**2) «Más usados» en la barra lateral.** Desplegable al pie del menú con hasta **4 accesos directos** a las páginas
profundas que más se visitan (la ficha de un proyecto, una lista concreta…), aprendidos del uso.
- Vive en `localStorage`, **no en la base de datos**: es una preferencia de navegación de ese navegador, no un dato de
  negocio, y evita escribir en Postgres en cada clic.
- La etiqueta sale del `<h1>` de la página visitada (así aparece «Web corporativa Acme» y no `/projects/<uuid>`), y se
  refresca en cada visita por si el registro se renombró.
- **Excluye las secciones que ya están en el menú** (repetirlas sería ruido) y sólo muestra rutas visitadas **más de
  una vez**, así que la sección no aparece hasta que hay costumbre real.

Verificado: typecheck · lint · unit (70) · integración (147, Postgres real) · build.

## 2026-09-01 — Sesión 19c · Cerrar envíos fallidos: «Descartar» además de «Reintentar»

Pregunta del owner: «los errores de envíos fallidos, ¿no están resueltos ya? ¿qué pasa si le doy a reintentar? ¿se
pueden quitar?». Respuesta corta: **no están resueltos** — un evento en `FAILED` agotó sus 5 intentos y **nadie lo
reintenta solo**, así que ese cambio sigue sin llegar al sistema externo. Y mientras siga ahí, el pull **no** actualiza
ese registro (F-22), o sea que además lo congela frente al origen.

Faltaba justamente la salida para el caso que describe (ya lo arreglé a mano en Twenty):
- **`DISCARDED`**, estado nuevo del outbox (migración 0018/m34, sólo amplía el CHECK): el envío se da por cerrado sin
  mandarlo. **No se borra** —queda el registro y su motivo— pero deja de avisar y **deja de bloquear el pull**
  (`pendingPushTargets` lo excluye).
- Botón **«Descartar»** junto a «Reintentar», con confirmación que explica el efecto.
- Texto en la sección aclarando la diferencia: **Reintentar** manda el valor que CT tiene AHORA (no el que falló en su
  día); **Descartar** lo cierra sin enviar.
- Test de integración: tras descartar, el aviso desaparece y el siguiente sync **sí** actualiza la oportunidad desde
  Twenty (antes se saltaba para no perder el cambio local).

Verificado: typecheck · lint · unit (70) · integración (141, Postgres real) · build.

## 2026-09-01 — Sesión 19b · El email vuelve a ser solo lectura (E-9a anotado)

Corrección de la sesión anterior a petición del owner: hacer el email editable en línea era un agujero — es la
credencial de acceso, y cambiarlo escribiendo otro (sin verificar que el buzón existe ni pedir la contraseña) convierte
una sesión robada en una cuenta robada.

- `updateProfileSchema` se queda **sólo con el nombre** y pasa a `.strict()`: mandar `email` en el cuerpo devuelve un
  error de validación en vez de ignorarse en silencio. El comando pierde la lógica de email y su guardia de duplicados.
- En Ajustes, el email se muestra como campo **de solo lectura** con la razón a la vista ("su cambio llegará con
  verificación por correo, junto al de la contraseña").
- Test de integración nuevo: intentar cambiar el email por esta vía falla y el valor en base de datos no se toca.
- Anotado como **E-9a** en `FINDINGS_AND_DEFERRED.md` (y en su cabecera de estado) con el flujo que tendrá que llevar:
  contraseña actual → verificación del email nuevo por correo → aviso al anterior → rotación de sesiones; y lo mismo
  para la contraseña. Apoyándose en las piezas de Better Auth, no escribiendo en `users` a mano. Depende de HAB-1
  (hace falta canal de correo).

Verificado: typecheck · lint · unit (70) · integración (140, Postgres real) · build.

## 2026-09-01 — Sesión 19 · Home en dos columnas continuas y limpieza de Ajustes

**1) Home sin huecos.** La página eran **tres rejillas de dos columnas apiladas**: cada una alineaba sus filas a la más
alta, así que la columna corta dejaba un vacío, y encima había `gap-8` entre rejillas. Ahora es **una sola rejilla con
dos columnas continuas** (`items-start`, cada columna un `flex-col`), así cada una fluye con el alto de su contenido:
- Izquierda: Requiere atención → Proyectos activos → Decisiones recientes → Estado del sistema.
- Derecha: Vencidas → Trabajo de hoy → Eventos de hoy → Actividad reciente.

**2) Ajustes: «Tu perfil» primero y editable.** Nombre y email se editan en línea como el resto (`PATCH /api/v1/profile`
→ `updateProfile`). El email es la credencial de acceso, así que el comando **comprueba que no lo tenga ya otra cuenta**
(`EMAIL_TAKEN`) antes de escribirlo: un choque con la unique de `users` dejaría el login roto. No lleva `requireCan`
porque siempre actúa sobre `ctx.userId` — nadie puede editar la cuenta de otro. Rol y slug siguen como datos de solo
lectura. Tests de integración (cambio correcto y email ocupado).

**3) Retenciones:** la opción sin valor del select pasa a llamarse **«Conservar siempre»** (antes un «—» que no decía
nada) y los plazos se leen «Borrar tras N días». Nuevo `emptyLabel` en `InlineEditSection`.

**4) Purga junto a su política.** Los botones «Purgar ahora» estaban al pie, tras dos párrafos largos que explicaban lo
que la etiqueta del campo ya dice. Ahora van **en la fila de su política** (nuevo `action` en los campos de
`InlineEditSection`) y los párrafos desaparecen. Fuera también la sección **Seguridad**: contaba que el registro está
cerrado, que es un problema ya resuelto (B-6) y no una tarea del usuario.

Verificado: typecheck · lint · unit (70) · integración (140, Postgres real) · build.

## 2026-09-01 — Sesión 18c · Automatización: botones sólidos y secciones plegables

Ajustes de UI pedidos por el owner en la sección de Automatización.

- **Los tres botones de las tarjetas** pasan de `secondary` (sólo borde, se leían como un enlace enmarcado dentro de
  una tarjeta del mismo color) a una variante nueva **`surface`**: fondo propio + borde + sombra suave, y tamaño `md`
  en vez de `sm`. Por token, así que en claro salen blancos y en oscuro con la superficie oscura — sin `dark:` a mano.
- **Secciones de lista plegables.** Nuevo `CollapsibleSection` con `<details>/<summary>` **nativos**: funciona sin
  JavaScript (estas páginas son Server Components), es accesible por teclado de serie y el navegador guarda el estado.
  Lleva el contador junto al título para saber si merece la pena abrir.
  - En **Estado del sistema**: Envíos fallidos, Integraciones, Procesos recientes y Archivos de log anteriores. Los
    contadores de arriba (base de datos, worker, procesos, bandeja) siguen a la vista.
  - En la **portada**: Errores recientes.
  - **Se abren solas cuando hay algo que atender** (envíos fallidos > 0, errores > 0); si no, quedan recogidas.

Verificado: typecheck · lint · unit (70) · integración (138, Postgres real) · build.

## 2026-09-01 — Sesión 18b · La bandeja de salida rota igual que los procesos

Extensión de F-24 a `outbox_events`, con la misma mecánica: al superar el umbral de filas ya terminadas se cierra un
lote comprimido y la tabla caliente vuelve a empezar.

- **Una sola tabla para los dos logs:** `job_log_archives` pasa a **`log_archives`** con un discriminador `kind`
  (JOBS/OUTBOX) y numeración de lote **independiente por tipo** (migración 0017/m33, que copia el contenido anterior
  antes de eliminar la tabla vieja). Así hay una tabla, **un** endpoint de descarga (`/api/v1/log-archives/[id]`) y una
  sección de UI, en vez de duplicar los tres.
- **Terminales del outbox:** `PROCESSED` (llegó a su destino) y `FAILED` (agotó los reintentos). Un `PENDING` o
  `PROCESSING` es un envío vivo y no se archiva nunca — mismo criterio que con los procesos.
- **UI:** la sección «Bandeja de salida» de Estado del sistema tiene ya su propio «Descargar CSV» (log activo), y cada
  lote de la lista de archivos anteriores indica de qué log es.
- Test de integración: con 1 procesado + 1 fallido + 1 pendiente, rota los dos primeros, deja el pendiente, y el CSV del
  lote contiene exactamente esas dos filas.

Verificado: typecheck · lint · unit (70) · integración (138, Postgres real) · build.

## 2026-09-01 — Sesión 18 · Rotación del log de procesos (F-24) + rotación de los logs de Docker

El owner quiere decidir qué hacer con el crecimiento de los logs. Aclarado primero el malentendido: el histórico de
procesos **no es un fichero**, vive en la tabla `jobs`; el fichero de log de verdad es el stdout que captura Docker.
Se atacan los dos, con las decisiones que tomó el owner.

**1) Histórico de procesos: rotación por tamaño, lotes comprimidos en la base de datos.**
- Tabla `job_log_archives` (migración 0016/m32): `seq` incremental por organización (el "nombre del fichero"), rango de
  fechas, nº de filas, tamaño y el CSV **gzip** en `bytea`. En la DB a propósito: el `pg_dump` de `backup.sh` ya lo
  respalda; en ficheros habría que ampliar el backup y lidiar con permisos del contenedor sobre el bind-mount.
- `rotateJobLog`: si los procesos TERMINADOS superan el umbral (5.000), se archivan todos en un lote y se borran de
  `jobs`. Lo **vivo** (PENDING/PROCESSING) no se toca nunca — es trabajo pendiente del worker, no log.
- Barrido diario del worker (`runJobLogRotationSweep`).
- UI: «Descargar CSV» baja el log activo; cuando hay lotes aparece **«Archivos de log anteriores»**, cada uno con su
  rango, nº de procesos y tamaño, descargable (se descomprime al vuelo). El formato CSV es el mismo en ambos casos
  (`jobsToCsv` compartido).
- Test de integración: por debajo del umbral no rota; al rotar, lo terminado se archiva y lo vivo se queda; el lote se
  lista, se descarga con el contenido correcto y el siguiente es el nº 2.

**2) Logs de Docker.** El compose **no configuraba `logging`**: el json-file de web/worker/db crecía sin límite en la
Pi (el worker escribe en cada tick). Los tres servicios llevan ya `max-size: 10m` + `max-file: 3` → 30 MB como techo
por servicio, rotando solos. Aplicado en los compose de prod y dev.

Verificado: typecheck · lint · unit (70) · integración (137, Postgres real) · build · YAML de los compose.

## 2026-09-01 — Sesión 17b · Descargar el histórico de procesos (CSV)

Pregunta del owner: la pantalla enseña los últimos procesos, ¿cómo se consultan TODOS? ¿hay log? ¿se puede descargar?

**Situación real:** la tabla `jobs` **no se purga nunca** (ni ella ni `outbox_events`), así que el histórico completo
está en la base de datos desde el primer día — lo que faltaba era una forma de verlo: la UI mostraba 20 filas y ya. El
log del **worker** (JSON por stdout, `docker logs`) es otra cosa y no es accesible desde la app.

- `listJobsForExport` — histórico completo de la organización **más los globales** (`organization_id` nulo: barridos y
  tareas de sistema, que son los mismos que ya salían en la lista), con tope de seguridad de 5.000 filas.
- `GET /api/v1/jobs/export` — CSV con `Content-Disposition: attachment`, nombre con la fecha y **BOM** para que Excel
  no rompa los acentos. Cada celda va entrecomillada y con las comillas dobladas, porque `last_error` trae comas y
  saltos de línea. Incluye el `payload` como JSON.
- Botón **«Descargar CSV»** en Estado del sistema › Procesos recientes, con la aclaración de que la pantalla enseña
  los 20 últimos y el CSV el histórico entero.
- Test de integración: el export incluye los jobs de la org y los globales, y un job que agota los intentos aparece en
  los errores recientes con su motivo.

**Anotado para el owner (no se toca sin que lo pida):** al no purgarse nunca, `jobs` y `outbox_events` crecen sin
límite. Hoy son unas pocas filas al día (5 syncs + los pushes), así que no es un problema; si algún día molesta, la
retención se añadiría como las otras — pero es una decisión suya (ver F-23: no dar por hecho que algo así es un olvido).

Verificado: typecheck · lint · unit (70) · integración (136, Postgres real) · build.

## 2026-09-01 — Sesión 17 · Portada de Automatización: tres tarjetas + errores recientes

Reorganizada la sección de Automatización a petición del owner.

- **Portada (`/automation`):** las tres secciones pasan de ser tres enlaces sueltos bajo el título a **tres tarjetas**
  con su descripción y un botón («Ver automatizaciones» / «Ver integraciones» / «Ver estado del sistema»).
- **Fuera los contadores duplicados:** los tiles de procesos y bandeja de salida ya estaban en Estado del sistema; se
  quedan sólo allí.
- **Intercambio de listas:** los **procesos recientes** (tabla de jobs) se mueven a Estado del sistema y los **errores
  recientes** suben a la portada. Así, al entrar en Automatización, lo primero que se ve es a dónde ir y si algo se ha
  roto. Nueva query `listRecentJobErrors` (jobs FAILED/PENDING **con** `last_error`, ordenados por fecha) en vez de
  reutilizar el `getSystemHealth` entero: la portada sólo necesita eso.

**Susto evitado, y salvaguarda nueva:** al limpiar las claves de i18n que se habían quedado sin uso, el barrido se
llevó las de **plural** — `tPlural('table.selected', n)` construye la clave en runtime, así que un grep literal no las
ve. Restauradas, y ahora hay un **test que comprueba que cada familia de plural tiene sus dos claves** (`.one`/`.other`)
para que una limpieza futura no las borre en silencio.

Verificado: typecheck · lint · unit (70) · integración (135, Postgres real) · build.

## 2026-09-01 — Sesión 16 · Cabeceras de lista, resumen del proyecto legible y F-23 (la bandeja se purgaba sin retención)

**1) Enlaces «ver todas las tareas» a la fila de filtros** (Proyectos y Oportunidades). El botón «Nuevo» se queda al
nivel del título y el enlace baja a la barra de filtros/pestañas, alineado a la derecha. Para las pestañas se añadió una
prop `actions` al componente `Tabs` (se pinta al final de la misma barra), en vez de duplicar la barra en cada página.

**2) Resumen del proyecto: un dato por línea.** Estaba encadenado con «·» (Tipo · Asociado; Fase actual · Fases ·
Tareas · Fecha objetivo) y salían líneas larguísimas. Ahora usa `DescriptionList`, como el resto de fichas.

**3) Resumen vacío en los conocimientos procesados (F-23).** Comprobado con dos tests de integración: el flujo actual
**sí** lleva el texto de la captura al Resumen del elemento, y también el texto EDITADO en el panel antes de procesar.
Ese comportamiento entró el 2026-08-17 (`c1a3185`), así que lo promovido antes quedó vacío y no se rellena solo (se
arregla a mano en el panel, el campo es editable).

**Corrección sobre la marcha:** en esa misma sesión añadí una retención configurable para la bandeja, creyendo que
purgar las capturas resueltas sin ventana era un descuido. **No lo era: es una decisión del owner** — una captura
procesada ya vive en la biblioteca y guardarla otra vez sería duplicar la información y llenar la bandeja. Se revirtió
entero (ajuste, validación, barrido, catálogo y tests) y el comando lleva ahora el comentario de por qué NO debe
llevar retención, para que no lo "arregle" una sesión futura.

De paso, más claves de i18n fusionadas por la deduplicación y separadas ahora: la etiqueta «Fecha objetivo» del campo
de un proyecto usaba la clave de la ENTIDAD *Objetivo*, y las dos claves con sufijo generado
(`field.targetDate_fecha_objetivo`, `field.personal_tarea_personal`) pasan a nombres legibles.

Verificado: typecheck · lint · unit (69) · integración (136, Postgres real) · build.

## 2026-09-01 — Sesión 15 · Cinco arreglos de uso real (fechas, inline edit, subtítulos, Home) + bug de propagación a Twenty

Lote pedido por el owner tras usar la app.

**1) Fechas en día/mes/año.** Salían `12/31/2026`: las vistas llamaban a `toLocaleDateString()` **sin locale**, así que
mandaba el idioma del navegador. Nuevo `lib/i18n/format.ts` con `formatDate` / `formatDateTime` / `formatTime` fijados
al locale de la app (`es-ES` → `31/12/2026`), migrados los 42 usos. Detalle que evita un bug clásico: una fecha de sólo
día (`'2026-01-01'`, tipo `date` de Postgres) **no se convierte a `Date`** —sería medianoche UTC y al oeste mostraría el
día anterior—, se reordena el literal. Con test.

**2) Home:** fuera el enlace «Bandeja de conocimiento: N por procesar» que colgaba de Decisiones recientes.

**3) Edición inline sin saltos.** El campo cambiaba de tamaño al entrar y salir de edición: en vista era texto suelto
con `px-1` y en edición un `input` con borde y `py-1.5`. Ahora ambos estados comparten la MISMA caja (`w-full rounded
border px-2 py-1.5 text-sm`) y en vista el borde es transparente: al hacer clic sólo cambian el borde y el fondo. El
textarea mantiene su alto mínimo también en vista, y la etiqueta lleva el mismo padding vertical para no descuadrarse.

**4) Subtítulos fuera.** Revisados los 30 párrafos de ayuda de la app y borrados los 15 que sólo describían lo que ya se
ve (Inicio, CRM, Negocio, Conocimiento, Ruta de aprendizaje, Documentos, Decisiones, Portafolio, Integraciones, Estado
del sistema, tareas de oportunidades, dos tarjetas de Ajustes…). **Se conservan** los de Automatizaciones (petición
explícita del owner) y los que enseñan una regla o dan una instrucción: qué incluye la pestaña Activos de un cliente,
cómo funcionan los canales de captura, que se puede arrastrar en el Kanban, que el panel autoguarda, por qué algo está
bloqueado, y los estados vacíos.

**5) Estados de oportunidad que "no se propagaban" (F-22, bug real).** Diagnóstico: el mecanismo SÍ existe
(`changeOpportunityStage` → audit → outbox `twenty.push` → `PATCH /rest/opportunities/{id}` con `stage`), pero si el
PATCH fallaba —ya pasó con CLOSED/CANCELLED antes de que el owner los añadiera en Twenty— el evento moría en `FAILED`
**sin ninguna señal en la app** y el siguiente pull reescribía la fila con el valor viejo. De ahí "hasta que no lo cambié
en Twenty me seguía saliendo el anterior". Arreglado por dos lados:
- el pull **no pisa** client/contact/opportunity con un `twenty.push` PENDING/PROCESSING/FAILED (`pendingPushTargets`),
  y lo cuenta en los saltados del run con el motivo. Las **tasks se quedan fuera del guard** a propósito: su push sólo
  empuja `dueDate`, que el pull nunca reescribe (propiedad por campo) — el título lo sigue trayendo Twenty;
- los fallos se **ven y se reintentan**: sección «Envíos fallidos a sistemas externos» en Automatización › Estado del
  sistema, con el motivo, el registro afectado y botón **Reintentar** (antes sólo había un contador "FAILED: N").

De paso se corrigieron varias claves de i18n que la deduplicación había fusionado por tener el mismo texto pero
distinto significado (el título «Inicio» del menú usaba la clave de la etiqueta del campo *Inicio* de un proyecto, y las
migas de Conocimiento la de la entidad `knowledge_item`).

Verificado: typecheck · lint · unit (69) · integración (132, Postgres real) · build.

## 2026-09-01 — Sesión 14c · Regla de cierre + lista de documentos vivos

Para que no vuelva a pasar lo de la sesión 14b (nueve ítems hechos y sin marcar, documentos describiendo cosas que ya
no eran ciertas), el owner pide dejarlo escrito como norma. En `CLAUDE.md`, sección **«⚑⚑ REGLA DE CIERRE»**:

- **Una tarea no está terminada hasta que su anotación dice que está terminada.** Cerrar la anotación es parte del
  trabajo, no un extra.
- Receta al cerrar: (1) buscar dónde estaba anotada —`grep -rn` en `docs/`, porque el mismo tema suele estar en dos
  sitios—; (2) cambiar el estado a ✅ **con la fecha y el CÓMO** (decisión, dónde vive, qué quedó fuera a propósito);
  (3) si sólo se resolvió una parte, recortar el enunciado a lo que queda; (4) si se descarta, ❌ con motivo y quién lo
  decidió; (5) entrada en el `BUILD_LOG` + encabezado "dónde nos quedamos".
- **Repaso periódico de estados contra el CÓDIGO**, no contra lo que dicen los documentos.
- **Tabla de documentos vivos** con qué es cada uno y cuándo hay que tocarlo (bitácora, backlog, las dos auditorías,
  checklist de seguridad, catálogo de automatizaciones, roadmap, guía de usuario, ADRs, contrato de Notion, deployment,
  tokens de diseño y el propio `CLAUDE.md`).
- Regla práctica: **si al terminar un trabajo no tocas ningún `.md`, sospecha.**

Queda también en la memoria del asistente como preferencia de proceso (aplica a cualquier proyecto con backlog en `.md`).

## 2026-09-01 — Sesión 14b · Repaso de estados: marcar lo que ya estaba hecho

El owner pidió revisar el backlog para que no quedaran tareas hechas sin marcar. Repaso **ítem por ítem contra el
código**, no contra la memoria del documento. Nueve estaban desactualizados:
- **B-4** «Open in CRM es placeholder» → hecho desde Bloque 2 · Fase 0A (lo decía F-1/F-14, pero B-4 se quedó sin tocar).
- **C-2** Home/dashboard → completo desde M09 (snapshot, atención, hoy, eventos, actividad, salud).
- **C-4** «Outbox sólo en changeProjectStatus» → resuelto en la práctica: `recordAudit` encola `notion.push`/`twenty.push`
  en la transacción de los 26 comandos reflejados, más `opportunity.won` (con handler) y `project.status_changed`
  (emitido, sin handler). Lo que queda es HAB-2 (generalizar por transición), que es otro ítem.
- **C-5** «Automations sin gestión» → hay inventario + activar/desactivar + «Ejecutar ahora» desde Fase 6; lo único que
  no se hace, y por diseño (ERRATA-009), es un constructor visual.
- **B-6** registro abierto → cerrado el 2026-08-31 (bootstrap-only). **E-5** → el espejo a Notion de `resources` existe.
- **E-7** → lo que faltaba era editar relaciones por nombre, hecho en Fase 5 (F-6). **F-17** GitHub sin paginar → hecho.
- Residuos dentro de otros ítems: E-4 (paginación), E-8 (ver ejecuciones: hecho para syncs vía F-16), E-9 (el registro ya
  está cerrado; falta el flujo de invitaciones), F-1 (formato de URL de Twenty ya verificado y corregido).

También se pusieron al día los **otros documentos**, que iban por detrás:
- `SECURITY_CHECKLIST.md`: registro abierto ✅, `href` del markdown ✅, CSP ✅ (conservadora), cobertura de auditoría ✅,
  backups+restore ✅ (M18), contenedores no-root ❌ (decisión del owner). Verificado que **siguen abiertos**: guarda de
  `BETTER_AUTH_SECRET`, UUID en params de ruta, redacción del logger, contraseña de Postgres por defecto.
- `IMPLEMENTATION_ROADMAP.md`: M12–M15 decían "pull real pendiente de creds" — los cuatro están **probados en vivo**.
- `AUTOMATION_BACKLOG.md`: la tabla de automatizaciones ACTIVAS no listaba cuatro barridos que ya corren (auto-archivado
  de oportunidades, purga de bandeja, purga de archivados, purga del historial de syncs) → ACT-12..15, y **AUT-24 pasa
  a hecho**. `SECURITY.md` (infra M18 cerrada), `DEPLOYMENT.md` (Drive/Calendar usan service account, no el token que
  caducaba) y el contrato de Notion (§8 completado) también corregidos.
- `AUDIT_2026-08-30.md`: el dirty-check del autoguardado **ya está hecho**; el único pendiente de ese punto es el aviso
  cuando falla el GET del panel (verificado: no hay `.catch`, se ve un formulario vacío sin explicación).
- `AUDIT_UIUX_2026-08-30.md`: precisados los menores con lo que se comprobó (16 de 42 `EmptyState` sin pista, el login
  sigue sin primitivas, y el riesgo del registro abierto está cerrado aunque el enlace «Regístrate» siga visible).

Y el propio `FINDINGS_AND_DEFERRED.md` estrena una **cabecera con lo que sigue realmente abierto**, agrupado por tipo,
para no tener que volver a auditar de cero.

## 2026-09-01 — Sesión 14 · Vaciado del backlog: modelo (A-1/A-2/A-3), auditoría (C-1/F-4), F-16, F-8, B-5, Kanban DnD e i18n

Tanda larga pedida por el owner. Cada bloque va en su propio commit, todos verificados con typecheck · lint · unit ·
integración (Postgres real, Docker levantado para la ocasión) · build.

**1) Gaps modelo↔dominio (migración 0014/m30 + ADR-005/006/007).**
- **A-1 `projects.type`** (INTERNAL/CLIENT/LAB) con CHECK y backfill. Invariante **duro** por decisión del owner:
  CLIENT exige cliente (`PROJECT_CLIENT_REQUIRED`), validado sobre el estado RESULTANTE del PATCH — tipo y cliente
  pueden cambiar en la misma petición. Personal → INTERNAL; el proyecto de una oportunidad ganada hereda CLIENT.
- **A-2 `decisions.supersedes_decision_id`**: la NUEVA apunta a la ANTIGUA y el inverso se resuelve por query (dos
  columnas simétricas se desincronizan). `supersedeDecision` hace estado + enlace en una transacción y rechaza el
  auto-reemplazo y el segundo reemplazo. Columna «Cadena» en la lista y campo «Reemplaza a» en el panel.
- **A-3 `project_assets` (N:M)**: un asset existe para REUTILIZARSE, así que tabla puente en vez de `assets.project_id`.
  Pestaña «Reutilizables» en la ficha del proyecto (enlazar/desenlazar/crear+enlazar). Desenlazar no borra el activo.

**2) C-1 + F-4 — auditoría completa e historial campo a campo.** Se cierra la cobertura que faltaba (deliverables,
capability/service status, link/unlink de capacidades, knowledge item/asset status, promote/discard de la bandeja y
**todo portfolio**, que no auditaba nada). Y nuevo `recordFieldChanges(before, changed)`: emite UN `change_event`
`FIELDS` con **sólo lo que cambia**, y **nada** si no cambia nada — importante porque el panel autoguarda por campo.
Con superficie: `GET /api/v1/history` + bloque **«Historial»** plegable al pie del panel lateral.

**3) F-16 — historial de syncs (migración 0015/m31).** La resiliencia por-registro ya generaba el detalle de lo
saltado, pero moría en los logs del worker. Ahora hay tabla `sync_runs` (una fila por ejecución), `toSyncOutcome`
normaliza el summary de cualquier sync, y en Integraciones se ve "N creados · M actualizados", el chip de saltados con
«Ver detalle» y el badge **«Con advertencias»**. Retención: 50 runs por proveedor.

**4) F-8** — el campo Proyecto del panel de tarea pasa a seleccionable (crear desde `/tasks` ya no deja la tarea
huérfana; en edición se puede reasignar). `project_id` **no** se hace obligatorio: rompería las tareas personales y las
de preventa. **5) B-5** — Portafolio sale de Conocimiento y es ítem propio de la barra lateral (única desviación de la
nav congelada del doc 6, anotada en el Sidebar). **6) B-1/E-12** — Kanban de oportunidades con **arrastrar y soltar**
usando eventos nativos de HTML5 (sin dnd-kit); al soltar se elige el primer stage válido de la columna
(`canChangeOpportunityStage`), y el `<select>` de cada card se conserva como ruta accesible.

**7) E-10 · i18n.** Alcance elegido por el owner: **un solo idioma (español) pero todo el texto de la app
externalizado** y la estructura lista para añadir otro. `lib/i18n/` con `es.ts` (≈580 claves), `t`/`tPlural`/
`tOptional`, y `enumLabel` leyendo `enum.<CODIGO>`. Migradas ~60 vistas y todos los componentes compartidos. Los datos
del usuario y lo importado de terceros **no** se traducen. Tres tests protegen la estructura: paridad de claves entre
diccionarios, ningún valor vacío y **cobertura de todos los códigos de enum del dominio** (se resuelven en runtime, así
que TypeScript no los protege; sin el test, perder una clave mostraría "ACTIVE" en vez de "Activo").

**Decisiones del owner en esta sesión:** HAB-1 → **bot de Telegram**, pero **NO se implementa todavía** (queda anotado
en `AUTOMATION_BACKLOG.md`). **Purga del historial de git de la clave de Google: descartada** — ya está revocada, así
que no aporta seguridad y reescribir el historial del monorepo rompería todos los clones y la Pi.

**Nota de verificación:** los tests de integración se corrieron con Postgres local (130 en verde, incluidas las dos
migraciones nuevas aplicadas de verdad). Falta la **revisión visual del owner** en el navegador.

## 2026-09-01 — Sesión 13 · a11y P1: foco de teclado visible en toda la UI (+ últimos colores crudos)

Único **P1 abierto** de `AUDIT_UIUX_2026-08-30.md`: **0 ocurrencias de `focus-visible`** en `apps/web` → quien navega
con teclado no veía dónde estaba. Arreglado desde el sistema de tema, no componente a componente:
- **Token `--ring`** (blue-600 claro / blue-400 oscuro) + **`--row-selected`**, ambos expuestos como utilidades
  (`outline-ring`, `bg-row-selected`) en el `@theme inline` de `globals.css`.
- **Red de seguridad global** en `globals.css`:
  `:where(a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])):focus-visible` →
  `outline: 2px solid var(--ring)` + `outline-offset: 2px`. En `:where()` (especificidad 0) para que cualquier
  componente pueda sobreescribirlo con una utilidad; **excluye `tabindex="-1"`** porque son los contenedores de
  diálogo (record-panel, Drawer, ⌘K) que reciben foco por programa al abrirse y no deben pintar anillo. Con una sola
  regla quedan cubiertos sidebar, tabs, filas `RecordLink`, checkboxes, el combobox, el login y todo lo futuro.
- **Primitivas explícitas**: `BASE` de `Button` y `fieldCls` de `Input/Textarea/Select` declaran además
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` (autodocumentado y a prueba de resets).
- **De paso, los 4 colores crudos** que quedaban fuera de tokens (observación menor del mismo informe): checkboxes de
  `data-table.tsx` y `record-panel.tsx` → `accent-primary`; fila seleccionada → `bg-row-selected`. `DESIGN_TOKENS.md`
  vuelve a ser cierto ("0 usos crudos") y documenta la regla de foco.

Verificado: typecheck · lint · unit (61) · build, **y el CSS generado** (`.next/static/css`) contiene de verdad la regla
`:focus-visible{outline:2px solid var(--ring)}` y las utilidades `.accent-primary` / `.bg-row-selected` /
`.focus-visible\:outline-ring` (Tailwind no falla si una clase no existe: había que comprobarlo). **Falta la revisión
visual del owner en el navegador** (que el anillo no quede recortado en la tabla con scroll horizontal).

## 2026-09-01 — Sesión 12b · Fix CI: `audit.test.ts` usaba `listEntityActivity` (que borré por error)

El GitHub Action falló: `TypeError: listEntityActivity is not a function` en `audit.test.ts:75`. Causa: en el barrido
de código muerto (sesión 11b) el escaneo **excluía `tests/`**, así que no vi que ese test integración usaba
`listEntityActivity` y lo eliminé. Como las vistas de "Actividad" ya no existen en el producto, `listEntityActivity`
**sí es código muerto de la app** → lo correcto es actualizar el test, no restaurar la función: el test ahora verifica
directamente que `changeProjectStatus` registra el `change_event` (PLANNED→ACTIVE, ya lo comprobaba) **y** el
`audit_logs` del proyecto (`CREATE` + `UPDATE`), sin pasar por el timeline. Ningún otro test referencia lo borrado
(re-verificado con `tests/` incluido). Verificado local: lint · unit (61) · build; la integración la valida el CI.

## 2026-09-01 — Sesión 12 · Feature: fases de proyecto (lista libre + fase actual)

El owner pidió completar la feature de **fases de proyecto** como **lista libre** que define por proyecto (antes el
modelo/backend existían pero faltaba UI → la línea "Fase actual" salía siempre vacía; `setCurrentPhase` era el
andamiaje que conservamos en la limpieza). Cableado end-to-end siguiendo el patrón del panel lateral:
- **Backend** (`projects/commands.ts`, `queries.ts`): `createProjectPhase` ahora **autoasigna `sortOrder`** (última+1)
  y registra audit; `setCurrentPhase` acepta **`phaseId` null** (quitar) + audit; nuevos `updateProjectPhase`,
  `deleteProjectPhase` (si borras la fase actual, desmarca `currentPhaseId` en una tx) y `getProjectPhase` (scoped por
  org vía su proyecto). Validación: `PROJECT_PHASE_STATUS` (PLANNED/ACTIVE/COMPLETED, varchar libre curado en UI),
  `updateProjectPhaseSchema`, `setCurrentPhaseSchema`.
- **Rutas**: `GET/PATCH/DELETE /api/v1/project-phases/[id]` y `PATCH /api/v1/projects/[id]/current-phase`.
- **UI**: `project_phase` en el registro del panel (crear/editar por panel, contextual desde el proyecto) + pestaña
  **Fases** en la ficha del proyecto (`ContextNewButton` + `DataTable` con `RecordLink` por fila) + control
  `PhaseActions` (marcar/quitar actual, borrar). La fase actual queda resaltada y rellena "Fase actual" en Resumen.
- Test de integración (crear autoasigna orden; fijar actual; borrar la actual la desmarca). Guía de usuario: nueva
  fila en la matriz de información. Verificado: typecheck · lint · unit (61) · build. `setCurrentPhase` deja de ser
  código muerto.

## 2026-09-01 — Sesión 11b · Barrido de código muerto

Revisión final de código muerto (el owner lo pidió). Eliminado lo que quedó sin uso tras los cambios de esta ronda:
- `DerivedValue` + la rama `derivedFrom` de la lista principal del `record-panel`: inalcanzable desde que el único
  campo derivado (opportunityId) es `context` y se filtra a "Contexto" (el `derived` state sigue vivo para ese bloque).
- `listEntityActivity` + su tipo `ActivityItem` + el helper `describeChange` (`audit/index.ts`): sin ningún uso desde
  que se retiraron todas las vistas de "Actividad" de las fichas (sesión 7b). Ajustado el import de drizzle.
- `assertOpportunityNotArchived` (`crm/commands.ts`) y `getOpportunityArchivedAt` (`crm/queries.ts`): **reemplazados**
  por `assertOpportunityNotFrozen` / `getOpportunityFreeze`; sin llamadores.
Verificado: typecheck · lint · unit (61) · build. (Escaneo con `tests/` incluido para no borrar lo que solo usan los
tests de integración: `supersedeDecision`/`syncNotionDecisions`/`completeTask` se conservan.)

**Decidido con el owner** (exportados SIN llamadores): se eliminan `getSystemHealthDefault` (wrapper huérfano) y
`assertKnowledgeInboxTransition` (+ su mapa `KNOWLEDGE_INBOX_TRANSITIONS`); se **conservan** `setCurrentPhase` y
`unlinkServiceCapability` como andamiaje de features a cablear (sus compañeras `createProjectPhase`/
`createServiceCapability` ya tienen ruta API).

## 2026-09-01 — Sesión 11 · 🟢 menores: seguridad (CSP/health/webhook/markdown) + accesibilidad de overlays

Ronda de 🟢 (el owner pidió cerrarlos). Verificado cada tanda: typecheck · lint · unit (61) · build.
- **Seguridad:** CSP conservadora en `next.config` (unsafe-inline; unsafe-eval/ws solo dev — revisar en navegador) ·
  `/api/health/db` deja de exponer el error crudo de Postgres (solo `{ok}`) · webhook del inbox compara el token con
  `timingSafeEqual` · `markdown.tsx` sanea el esquema del `href` (solo http(s)/relativo/anchor/mailto).
- **Accesibilidad de overlays:** `record-panel` y `Drawer` → `role="dialog"` + `aria-modal` + etiqueta, foco al abrir
  + restauración al cerrar + **focus-trap** de Tab, backdrop `aria-hidden`. `SearchableSelect` → combobox con
  `aria-haspopup`/`aria-expanded` + `role=listbox/option` + navegación por flechas (↑/↓/Enter/Escape).
- **UX:** dirty-check en el autoguardado del panel (no PATCH/refresh si el campo no cambió).
- **Se dejan (bajo impacto):** ESLint type-checked (el código ya usa `void`), proceso manual de migraciones
  (convención de esquema congelado), duplicación lista/detalle, carga diferida por pestaña, `GlobalSearch` con el
  mismo tratamiento a11y, skeletons/`loading.tsx` + micro-confirmación al guardar.

**Cierre (mismo día):** `GlobalSearch` (⌘K) también accesible (`role=dialog` + focus-trap + restaurar foco) y nuevo
`app/(app)/loading.tsx` (skeleton) para feedback inmediato al navegar. Verificado: typecheck·lint·unit(61)·build.

Con esto, la auditoría (`AUDIT_2026-08-30.md`) queda con los 🔴 y 🟡 completos y los 🟢 relevantes cerrados. Se dejan
explícitamente (bajo impacto): ESLint type-checked, proceso manual de migraciones, duplicación lista/detalle, carga
diferida por pestaña y micro-confirmación al guardar.

## 2026-09-01 — Sesión 10c · 🟡 healthcheck/watchdog del worker + paginación Twenty + Retry-After de Notion (429)

Decisiones del owner: healthcheck del worker **sí** (solo eso de la ronda Docker); Twenty/Notion pagination **sí**.
- **Worker liveness** (`apps/worker/src/index.ts` + compose prod): heartbeat por fichero al terminar cada tick +
  healthcheck en el compose (observabilidad) + **watchdog** interno (si el tick actual lleva >5 min colgado →
  `process.exit(1)` → `restart: unless-stopped` reinicia; Compose no reinicia solo por unhealthy). Umbral por
  `WORKER_STALL_MS`. (No-root y split de secretos: descartados por el owner.)
- **Twenty pagina por cursor** (`twenty/client.ts`): helper `getAllPages` (`pageInfo.hasNextPage`/`endCursor` +
  `?starting_after`), con **degradación grácil** (si no hay `pageInfo`, una página = comportamiento previo). Test unit.
- **Notion respeta `Retry-After` en 429** (`notion/client.ts`): método `req` que reintenta hasta 4× esperando lo que
  indique Notion (o backoff), en vez de martillear. Cableado en retrieveDatabase/queryDatabase/createPage/updatePage.
Verificado: typecheck · lint · unit (61) · build.

## 2026-09-01 — Sesión 10b · 🟡 deploy no traga fallos de migración

`deploy-control-tower.sh`: el paso de migración ya no usa `|| echo skipped` (que ocultaba fallos → schema drift
silencioso). Ahora reintenta 4× (por si worker/db se están calentando tras `up -d`) y, si persiste, **aborta el
deploy con `exit 1`**. Sintaxis verificada con `bash -n`. (Cambio operacional: el owner verá el fallo al desplegar.)

Pendiente OPERACIONAL (a confirmar con el owner, más delicado): healthcheck del worker (no tiene servidor HTTP →
requiere un heartbeat; menos urgente tras el timeout de fetch), contenedores no-root (riesgo de permisos), y separar
los secretos de integración para no inyectarlos también a `web` (hoy `.env` los comparte y `web` sí necesita
BETTER_AUTH_SECRET/POSTGRES_*).

## 2026-09-01 — Sesión 10 · 🟡 over-fetch en fichas, scheduler idempotente ante reinicios, paginación GitHub

Tanda de 🟡 código-puro (CI de integración ya en verde). Verificado cada uno: typecheck · lint · unit · build.
- **Over-fetch**: `listDecisions` acepta filtro `{ projectId }` → `projects/[id]` deja de traer todas las decisiones
  de la org y filtrar en JS; el detalle de cliente paraleliza sus 4 queries (`Promise.all`) en vez de encadenar `await`.
- **Scheduler idempotente ante reinicios**: `enqueueScheduledSyncs` deduplica ahora por PENDING **o** "job creado en
  las últimas 20h" (la tabla `jobs` es la persistencia; sin migración). Antes, al reiniciar el worker pasada la hora,
  el guard en memoria `lastDailySyncDate` se perdía y se re-encolaban todos los syncs del día. Test de integración
  añadido (reinicio same-day no re-encola; día siguiente sí).
- **Paginación GitHub** (F-17, en el commit anterior de la sesión 9): sigue `Link: rel="next"` hasta agotar.

Pendiente (código, bajo impacto): carga diferida por pestaña en las fichas; paginación de Twenty + `Retry-After` de
Notion (429). Pendiente (operacional, requiere coordinación con el owner): deploy que no trague fallos de migración;
healthcheck del worker + contenedores no-root + no inyectar secretos de integración a `web`.

## 2026-08-31 — Sesión 9d · 🟡 CI corre tests de integración (Postgres en el job) + decisión CSRF

Decisiones del owner (2026-08-31): **CSRF se deja como está** (usa la API con scripts sin Origin; exigir Origin los
rompería — la cookie SameSite de Better Auth sigue de defensa) y **CI: solo añadir integración** (sin gate por PR;
sigue el FF directo a prod).
- `.github/workflows/control-tower-ci.yml`: se añade un servicio **postgres:18** (user/pass/db = control_tower, con
  healthcheck) + `env.DATABASE_URL`, y dos pasos nuevos tras los unit: **Migrate** (`pnpm --filter @ct/db migrate`) e
  **Integration tests** (`pnpm test:integration`). Ahora el CI cubre los ~22 tests de integración (aislamiento
  multi-org, syncs, gobernanza, reaper, exclusión de tareas…), no solo los unit.
- El flujo de merge NO cambia (control-tower-mvp → dev → prod FF; el CI corre en el push a prod y en PRs).
  *(Nota 2026-09-24: la rama `dev` desapareció en algún momento posterior; hoy el flujo es `control-tower-mvp` → `prod`.)*
- **Nota:** Docker local apagado → no pude correr integración aquí; el **primer run de CI en prod** validará el
  workflow y los tests (incluidos los añadidos a ciegas: `reaper.test.ts` y el caso nuevo de exclusión en
  `projects.test.ts`). Si algo saliera rojo, se ajusta.

## 2026-08-31 — Sesión 9c · 🟡 robustez: autoguardado ante fallo de red + rate-limit no spoofeable

Dos 🟡 de bajo riesgo y alto alcance:
- **Autoguardado/acciones ante fallo de red** (`apps/web/lib/client.ts`): `request()` ya **nunca rechaza** — un
  `fetch` fallido (offline/DNS/servidor caído) devuelve `{ error }` en vez de lanzar. Así todos los llamadores
  (panel lateral, edición inline, botones de acción, tablas) resetean su estado `busy` y muestran el error, en vez
  de quedarse "guardando…" para siempre sin aviso.
- **Rate-limit no spoofeable** (`apps/web/lib/api.ts`): se usa el **último** valor de `X-Forwarded-For` (el que
  añade Caddy = IP real del cliente), no el primero (que controla el cliente y permitía evadir/envenenar el límite).
  Asume un proxy de confianza (Caddy); en acceso directo sin XFF cae a 'local'.
Verificado: typecheck · lint · unit (57) · build. (CSRF laxo — exigir Origin — queda pendiente por posible impacto en
clientes API/curl: decisión del owner.)

## 2026-08-31 — Sesión 9b · 🟡 exclusión mutua en createTask (bug de corrección)

`createTask` calculaba bien `personal` pero insertaba `projectId` Y `opportunityId` tal cual → si el cliente enviaba
ambos, la tarea quedaba ligada a proyecto Y oportunidad a la vez (`updateTask` sí lo forzaba). Ahora aplica la misma
precedencia **proyecto > oportunidad > personal**: fijar uno anula los otros. Test de integración añadido a
`projects.test.ts` (crear con proyecto + oportunidad → gana el proyecto, opportunityId nulo). El CHECK en la tabla
(`num_nonnulls(project_id, opportunity_id) <= 1`) queda como defensa-en-profundidad opcional (migración; sin DB local
para validarla ahora). Verificado: typecheck · lint · unit (57) · build.

## 2026-08-31 — Sesión 9 · 🟡 #5 dual-write atómico (audit+outbox en la misma transacción) + diagnóstico token Google

Arreglo del primer 🟡 importante de `AUDIT_2026-08-30.md`. `recordAudit(db,…)` encola el push a Notion/Twenty (outbox)
usando el mismo `db`; iba en statement separada del INSERT/UPDATE → ventana de fallo que dejaba la entidad cambiada sin
push encolado (deriva; el sync diario era la red de seguridad). Ahora los **26 comandos** que reflejan a Notion/Twenty
envuelven **mutación + `recordAudit` (+`recordChangeEvent` donde aplica) en `db.transaction`** → atómico:
- CRM (write-back Twenty): `updateClient/Contact/Opportunity` (+ `mapDbError` que faltaba en contact/opportunity).
- Projects (Notion + Twenty): `createProject`, `updateProject`, `updateTaskStatus`, `updateTask`.
- Governance (Notion): create/update de strategic_area, goal, capability, service (8).
- Knowledge (Notion): create/update de knowledge_item, decision (+status, con su change_event), asset (7).
- Resources/Learning (Notion): create/update de resource y learning_item (4).
Los audit-only (sin outbox: knowledge_inbox, document, integration, organization, DELETEs) se dejan igual. Verificado:
typecheck · lint · unit (57) · build. (Integración no corrida: Docker apagado; la cubren crm/projects/governance/
knowledge/notion-realtime-push/twenty-push en CI/Pi.)

**Aparte (soporte Drive):** el error `Google token → HTTP 400` del owner era el worker refrescando el token con la clave
**vieja** en memoria (un `restart` no relee el `env_file`; hay que recrear el contenedor). Se recreó y Drive volvió.
Además se mejoró el error de `google/token.ts` para incluir el cuerpo de Google (motivo real: invalid_grant, etc.).
El `twenty.push` con stage CLOSED/CANCELLED lo resolvió el owner añadiendo esos stages en Twenty (sin cambio de código).

## 2026-08-31 — Sesión 8d · #1 clave de Google fuera del repo + limpieza de código muerto

**Crítico #1 (RESUELTO por el owner + repo limpiado).** El owner revocó la clave filtrada en Google Cloud, creó una
nueva y la puso en `GOOGLE_SA_KEY_B64` del `.env` (Drive verificado ACTIVE). Por mi parte:
- `git rm ct-drive-integration.json` (fuera del árbol e índice) + patrones en `.gitignore` (`ct-drive-integration.json`,
  `*-integration.json`, `*service-account*.json`, `*.sa.json`) para que no vuelva a colarse.
- **Purge del historial de git: OPCIONAL y pendiente** — la clave ya está revocada (secreto muerto), así que aporta poco;
  requiere `git filter-repo` + `--force` a `prod` (rama remota que despliega la Pi) → a decisión del owner.
- **Con esto, los 4 críticos 🔴 de `AUDIT_2026-08-30.md` quedan resueltos.** Siguiente foco: los 🟡 (empezando por
  envolver `updateX`/`createX` en transacción para audit+outbox atómicos).

**Limpieza de código muerto (aprovechando):** eliminados dos componentes sin ningún importador:
- `components/ui/activity-timeline.tsx` — quedó muerto al retirar la vista "Actividad" de las fichas (sesión 7b); Home
  usa su propio `d.recentActivity`, no este componente.
- `components/ui/text-link.tsx` (`TextLink` + `linkCls`) — sin uso (las páginas usan la clase-token `text-link` directa).
Verificado: typecheck · lint · unit (57) · build.

## 2026-08-31 — Sesión 8c · Arreglo de críticos — #4 registro bootstrap-only (cierra el takeover de OWNER)

**Crítico #4 (RESUELTO).** Decisión del owner: **cerrar el registro tras el primer usuario**. Antes, `ensureUserOrganization`
metía a cualquier usuario nuevo en la primera organización como OWNER → un intruso que alcanzara la app tomaba el control
de los datos.
- Hook `databaseHooks.user.create.before` en `apps/web/lib/auth.ts`: si ya existe algún usuario, lanza
  `APIError('FORBIDDEN')` → alta cerrada. Sólo el **primer** registro (bootstrap del owner) pasa.
- **Escape hatch** `ALLOW_OPEN_REGISTRATION=true` (env, documentado en `.env.example`): reabre el alta puntualmente para
  añadir una cuenta antes de que existan invitaciones (E-11). Por defecto ausente/false → cerrado.
- UI: el aviso de *Ajustes › Seguridad* pasa de "registro abierto" (warning) a "registro cerrado" (nota informativa) con
  la instrucción del escape hatch. `SECURITY.md` y `docs/AUDIT_2026-08-30.md` actualizados.
- Verificado: typecheck · lint · unit (57) · build.
- **Quedan de los 🔴:** sólo #1 (rotar la clave de Google) — requiere tu acción; te dejo la guía paso a paso al terminar.

## 2026-08-31 — Sesión 8b · Arreglo de críticos — #3 reaper de jobs/outbox atascados en PROCESSING

**Crítico #3 (RESUELTO):** si el worker moría entre reclamar una fila (status PROCESSING) y completarla/fallarla,
quedaba atascada para siempre — `lockedAt`/`lockedBy` se escribían pero nadie los leía; el outbox ni siquiera tenía
marca temporal. Ahora:
- `reapStuckJobs` (`jobs/index.ts`): jobs en PROCESSING con `lockedAt` > `STUCK_STALE_MS` (10 min) → reencola
  (PENDING, disponible ya) o marca FAILED según `attempts` vs `maxAttempts` (no re-incrementa: el claim ya lo hizo).
- `reapStuckOutbox` (`outbox/index.ts`): el claim ahora marca `availableAt=now` (el outbox no tiene `lockedAt`), y
  el reaper reencola/rinde por antigüedad, incrementando `attempts` (los handlers son idempotentes → reprocesar es seguro).
- **Worker**: reaper cada ~60 s (y en el primer tick tras arrancar → recupera lo que dejó una instancia caída).
- Test de integración `tests/integration/reaper.test.ts` (reencola con intentos, FAILED al agotarlos, no toca los
  recientes; asserta estado por-fila, no conteos globales — el reaper es global). Verificado: typecheck·lint·unit(57)·build.
- Pendientes: #4 registro abierto→OWNER (decisión del owner); #1 rotar clave de Google (acción del owner, al final).

## 2026-08-31 — Sesión 8 · Arreglo de críticos de la auditoría — #2 timeout HTTP (worker no se congela)

Inicio del saneamiento de los 🔴 de `docs/AUDIT_2026-08-30.md`, uno a uno. **Crítico #2 (RESUELTO):** un `fetch`
saliente colgado bloqueaba el `await` del tick del worker (guard `ticking`) y con él TODOS los jobs/syncs/barridos.
- Helper `withTimeout(fetch, ms=30_000)` en `packages/integrations/src/http.ts`: inyecta `AbortSignal.timeout` en
  cada petición (combina con el signal del llamador si lo hubiera, vía `AbortSignal.any`). Preserva la firma de
  `fetch` → transparente para clientes y para los `fetchImpl` de fixture en tests.
- Envuelto en los 5 clientes HTTP (`twenty`/`notion`/`git`/`drive`/`gcalendar`: `this.f = withTimeout(config.fetchImpl ?? fetch)`)
  y en `makeGoogleTokenProvider` (`google/token.ts`). Ahora un endpoint colgado aborta a los 30 s y el flujo de
  error/reintento del job lo maneja, en vez de congelar el worker indefinidamente.
- Test unitario `http.test.ts` (inyecta signal + aborta si no responde). Verificado: typecheck · lint · unit (57) · build.
- Pendientes de críticos: #3 reaper de jobs/outbox atascados en PROCESSING; #4 registro abierto→OWNER (decisión del
  owner); #1 rotar la clave de Google (requiere acción del owner — se deja para el final con guía paso a paso).

## 2026-08-31 — Sesión 7e · Política de purga de ARCHIVADOS (retención configurable, default conservar siempre)

Petición del owner: hasta ahora los objetos archivados se conservaban **indefinidamente** (soft-delete
reversible; no había purga). Se añade una política de retención de archivados, espejando la de tareas completadas.
- **Ajuste** `archivedRetentionDays` en `organizations.settings` (validation + `updateOrganization`): null/0 =
  **conservar siempre** (default); N>0 = borrar definitivamente lo archivado hace > N días.
- **Command** `purgeArchivedRecords` (`maintenance/archive.ts`): recorre TODAS las entidades archivables en orden
  **hijo→padre** (`PURGE_ORDER`) para minimizar choques de FK; borra por registro con **try/catch** (lo aún
  referenciado se **salta** y se reintenta en el siguiente barrido) y deja **rastro en `audit_logs`** (DELETE,
  `metadata.reason='archived-retention'`). Devuelve `{ deleted, skipped }`.
- **Barrido** `runArchivedPurgeSweep` (`maintenance/retention.ts`) por org, con guarda de automatización;
  cableado en el bloque de mantenimiento diario del **worker**.
- **Catálogo** `sweep.archived_purge` (activable/pausable + «Ejecutar ahora» vía `runAutomationNow`); test del
  catálogo actualizado.
- **Ajustes UI**: selector "Retención de archivados" (display "Conservar siempre" / "Borrar tras N días") +
  botón **«Purgar archivados ahora»** (`POST /api/v1/maintenance/purge-archived`) con aviso de que es borrado
  definitivo (no restaurable) y deja rastro en logs.
- **Guía** actualizada (sección Retención). Verificado: typecheck · lint · unit (55) · build. Integración no
  corrida en local (Docker apagado). **Nota:** cambio de forma de `settings` jsonb (aditivo, sin migración).

## 2026-08-31 — Sesión 7d · /tasks Completadas: ocultar tareas de proyectos cerrados/archivados

Revisión pedida por el owner: que las tareas de proyectos completados/archivados no aparezcan en la lista
universal `/tasks`. Estado: el board de **Activas** (`listActiveTasks`) y **Vencidas** (`listOverdueTasks`) ya
excluían proyectos cerrados/archivados vía `notInClosedProject()` (status ∈ `CLOSED_PROJECT_STATUSES` = CLOSED/
ARCHIVED, o `archivedAt` no nulo; conserva tareas sin proyecto). **Faltaba** la pestaña **Completadas**
(`listCompletedTasks`, `projects/queries.ts`): se le añade el mismo `notInClosedProject()` → las tareas hechas/
canceladas de proyectos cerrados/archivados desaparecen también de esa vista (siguen en la ficha del proyecto y
en Archivados). Verificado: typecheck · lint · unit (55) · build. El test de integración existente sigue verde
(usa un proyecto activo). Integración no corrida en local (Docker apagado).

## 2026-08-31 — Sesión 7c · Tarea: Proyecto/Oportunidad como contexto solo-lectura; edición inline sin botón "Editar"

Tres cambios de UX del owner. Verificado: typecheck · lint · unit (55) · build (integración no corrida: Docker/DB apagados).

1. **En una tarea, Proyecto y Oportunidad son información HEREDADA de solo lectura → al bloque "Contexto"**
   (record-registry + record-panel): nueva prop de campo `context?: boolean`. Un campo `context` no se edita ni
   se envía; se muestra read-only en el bloque **Contexto** del panel (resolviendo su etiqueta de relación/derivada),
   solo si tiene valor. En `task`, `projectId` y `opportunityId` pasan a `context: true` (opportunityId conserva su
   `derivedFrom` del proyecto). Ya no aparecen como campos editables del panel.
2. **Edición inline por campo, sin botón "Editar"** (`components/ui/inline-edit.tsx`, usado por 13 fichas): se
   elimina el modo Editar/Guardar/Cancelar. Ahora cada campo editable se **edita al hacer clic** en su valor y se
   **guarda con Enter o al salir del campo** (blur); **Escape** cancela; PATCH de ese único campo. Los campos
   `readOnly` (procedencia externa/congelados) siguen **inmutables** (no clicables, con 🔒). API pública sin cambios
   → las 13 fichas no se tocan. `canEdit=false` (p. ej. Settings sin permiso) deja todo en solo lectura.
3. **Tareas de oportunidad: sin selector de Proyecto + se muestra a qué oportunidad pertenecen.** Consecuencia de
   (1): como `projectId` es `context` y solo se muestra si tiene valor, una tarea de preventa (sin proyecto) no
   ofrece Proyecto. Y la Oportunidad ahora se ve: en el panel (Contexto) y en la **ficha** `/tasks/[id]` (nueva fila
   "Oportunidad" en la `DescriptionList`, vía `getOpportunity`). La creación GLOBAL de tarea deja de fijar proyecto
   (se crea suelta o desde un proyecto/oportunidad); ajustado el texto de ayuda de `/tasks`.

## 2026-08-31 — Sesión 7b · Home (completar vencida), quitar "Actividad" de fichas, contadores en listas

Tres cambios de UX del owner. Verificado: typecheck · lint · unit (55) · build (integración no corrida: Docker/DB apagados).

1. **Dashboard · vencidas: "Pasar a hoy" → "Completar"** (`components/projects/forms.tsx` + `app/(app)/page.tsx`):
   nuevo `TaskCompleteButton` que marca la tarea como **DONE** vía `/api/v1/tasks/[id]/status` (sea cual sea su
   estado). Sustituye a `TaskDueTodayButton` en la lista de vencidas del Home (el resto de vencidas conserva
   "Reprogramar"). `TaskDueTodayButton` se conserva (lo usa `TaskPanelActions` en el panel lateral).
2. **Se quita la vista "Actividad" de TODAS las fichas de detalle** (15 páginas `[id]`): se elimina la pestaña
   `Actividad (N)` (projects/clients/opportunities) o la sección de timeline (resto), junto con su fetch
   `listEntityActivity` e imports. **Se conserva solo** la "Actividad reciente" del **Home** (usa su propio
   `d.recentActivity`, intacto). El componente `components/ui/activity-timeline.tsx` se deja por si se reutiliza.
3. **Contador `(N)` en las vistas de lista** (17 páginas): junto al nombre de cada vista.
   - Con pestañas/columnas/buckets → recuento por cada uno: **Proyectos** (Activos/En riesgo/Bloqueados/
     Completados/Todos), **Clientes** (Activos/Inactivos/Todos — ahora trae todos y filtra en JS para poder
     contar cada filtro), **Oportunidades** (columnas Kanban + tabs Activas/Archivadas), **Tareas de
     oportunidades** (Por hacer/Hechas/Todas), **/tasks** (Vencidas + cada bucket por fecha).
   - Listas simples → `(N)` en el `<h1>` con el total de filas: contacts, capabilities, goals, services,
     strategic-areas, library, decisions, assets, learning, documents, inbox, portfolio.
   - Formato unificado: `Nombre (N)` con el `(N)` en gris suave (`text-fg-subtle`).

## 2026-08-31 — Sesión 7 · Ajustes de UX del owner (filtros de proyectos, proyecto/tarea personal, estado por defecto)

Cuatro cambios pedidos por el owner tras usar la app. Verificado: typecheck · lint · unit · build (Docker/DB apagados
→ integración no ejecutada en local; se valida en la Pi contra `prod`).

1. **Filtros de la lista de proyectos reordenados** (`app/(app)/projects/page.tsx`): orden **Activos · En riesgo ·
   Bloqueados · Completados · Todos** (antes "Todos" abría primero). **Activos** es ahora la vista por defecto al
   entrar en `/projects` (sin query) y su pestaña enlaza a `/projects` limpio; el resto usa `?tab=`.
2. **Proyecto personal sin cliente/oportunidad/servicio** (record-registry + record-panel + `projects/commands.ts`):
   - La casilla **"Proyecto personal"** sube al inicio (tras el nombre). Nueva prop de campo `hidden(values)` en el
     registro: cliente/contacto/oportunidad/servicio se **ocultan** (y se excluyen de crear/autoguardar) cuando
     `personal` está marcada. El panel aplica `isHidden` en render, en el POST de creación y en el autoguardado.
   - **Refuerzo de dominio:** `createProject`/`updateProject` **anulan** clientId/contactId/opportunityId/serviceId
     cuando `personal` es true (consistente aunque llegue por API; al marcar personal en edición se limpian).
3. **Tareas de proyecto/oportunidad sin opción "personal"** (record-registry): el campo `personal` de tarea se
   **oculta** cuando la tarea tiene `projectId`/`opportunityId`/`parentTaskId` (hereda el tipo del padre). Solo se
   muestra en una tarea suelta (global, sin padre). El backend ya forzaba la exclusión mutua (`updateTask`/`createTask`).
4. **Estado por defecto "Por hacer" al crear tarea** (record-registry + record-panel): nueva prop `defaultValue` en
   el campo; `task.status` arranca en `TODO` en creación (el panel precarga los `defaultValue` en modo nuevo). El
   backend ya tenía `.default('TODO')`; el cambio es que el `select` lo **muestre** desde el inicio, editable.

Mecánica común (record-panel): `hidden?: (values) => boolean` y `defaultValue?: string` en `PanelField`; los
predicados `hidden` ven también la relación al padre fijada por creación contextual.

## 2026-08-29 — Sesión 6e · Pestañas en tareas de oportunidades (Por hacer / Hechas / Todas)

`apps/web/app/(app)/crm/opportunities/tasks/page.tsx`: la lista global de tareas de preventa pasa de lista plana a
**pestañas** (searchParam `?ver=`), en orden **Por hacer** (activas: TODO/IN_PROGRESS/BLOCKED, default) · **Hechas**
(DONE) · **Todas**, con contador por pestaña. Sin cambio de query (agrupa por `tasks.status` en la página vía
`isTaskActive`). Verificado: typecheck · lint · build.

**Filtrado de tareas de oportunidades cerradas (HECHO):** `listAllOpportunityTasks` (`projects/queries.ts`) oculta las
tareas de oportunidades **cerradas sin ganar** (status LOST = stages LOST/CANCELLED/CLOSED) y **archivadas**. Conserva
las de OPEN (en curso) y WON no archivadas (ganadas, traspaso al proyecto en marcha). Verificado: typecheck·lint·unit·build.

**Nota sobre el barrido de auto-archivado:** el owner pidió que también archive CANCELLED y CLOSED. **Ya lo hace**:
`archiveClosedOpportunities` (`crm/commands.ts:260`) filtra por `status = 'LOST'`, y los stages CANCELLED y CLOSED
derivan a status LOST → se archivan igual que LOST (a los 7 días). No hizo falta cambio.

**CLOSED = "cerrada GANADA" (decisión owner 2026-08-30, RESUELTO).** El owner aclara: mueve WON→CLOSED a mano cuando el
proyecto arranca; CLOSED es un estado final GANADO (no perdido). Cambios coordinados:
- **Dominio** (`transitions.ts`): `deriveOpportunityStatus`: **CLOSED → status WON** (antes LOST); CANCELLED/LOST siguen
  LOST. `assertOpportunityStageTransition`: se permite la única transición entre terminales **WON→CLOSED**. Nueva
  `CLOSED_OPPORTUNITY_STAGES = ['LOST','CANCELLED','CLOSED']` (columna "Cerradas") + `isOpportunityStageClosed`.
- **`changeOpportunityStage`**: `closedAt` se **reinicia** al entrar en un terminal distinto (WON→CLOSED) → los 7 días de
  auto-archivado cuentan desde el cierre. Moverla WON→CLOSED **no** re-dispara `opportunity.won` (status ya era WON).
- **Auto-archivado** (`archiveClosedOpportunities`): filtra por **stage ∈ columna "Cerradas"** (no por status LOST, que ya
  no aplica a CLOSED) → archiva CLOSED/LOST/CANCELLED a los 7 días; **WON activa nunca**. Ahora, en transacción, **archiva
  también las tareas** de esas oportunidades.
- **Lista de preventa** (`listAllOpportunityTasks`): oculta por **stage** de la columna "Cerradas" (+ archivadas); conserva
  OPEN y WON no archivadas.
- **Congelado de tareas**: guard `assertOpportunityNotFrozen` (antes `...NotArchived`) bloquea editar/crear tareas de
  oportunidades archivadas **o cerradas**. Nuevo error `opportunityClosed()` (`OPPORTUNITY_CLOSED`). Helper
  `getOpportunityFreeze` (archivada/cerrada) cableado en el GET de tarea y en la ficha (`tasks/[id]`) para el read-only.
- Tests: unit `transitions.test.ts` (CLOSED→WON, WON→CLOSED permitido); integración `crm.test.ts` (flujo completo:
  WON→CLOSED, status WON, congelado, oculto de preventa, auto-archivado con tareas). Verificado: typecheck·lint·unit·build.
- **Nota datos existentes:** las oportunidades que ya estén en stage CLOSED conservan su `status` almacenado (LOST) hasta
  que se les cambie el stage; el archivado y el ocultado ahora van por STAGE, así que se comportan bien igualmente.

## 2026-08-29 — Sesión 6d · Tareas de proyectos cerrados/archivados fuera de /tasks y Home

Feedback del owner: las tareas de proyectos "cerrados" no deben aparecer en la vista global `/tasks` ni en el
dashboard de Home. Matiz clave: un proyecto **CLOSED no puede tener tareas activas** (invariante de cierre), así que
filtrar solo CLOSED no cambiaría nada visible — las tareas que se ven de proyectos terminados vienen de estados que
sí admiten tareas activas. **Decisión del owner: excluir CLOSED + ARCHIVED** (y, por robustez, proyectos con
`archivedAt` no nulo, archivados vía el archivador en lote).

- Nueva constante de dominio `CLOSED_PROJECT_STATUSES = ['CLOSED','ARCHIVED']` (`packages/domain/src/transitions.ts`).
- `projects/queries.ts`: helper `notInClosedProject()` (`projectId NULL` — personales/preventa — o proyecto no
  cerrado/archivado) aplicado a `listActiveTasks` (board de `/tasks`) y `listOverdueTasks` (Vencidas de `/tasks`).
- `context/home.ts`: misma condición (vía `leftJoin` de projects) en "Trabajo de hoy", "Vencidas", y los contadores
  "Tareas abiertas" y de vencidas, para que todo cuadre.
- Las tareas personales o de oportunidad (sin proyecto) no se ven afectadas. La ficha del propio proyecto sigue
  mostrando sus tareas.
- Test de integración en `tests/integration/projects.test.ts` (proyecto ARCHIVED oculta sus tareas de `listActiveTasks`
  y `listOverdueTasks`; las personales permanecen). El caso CLOSED no es construíble por el invariante.

Verificado: typecheck · lint · unit (55) · build. Integración no corrida (sin Postgres en esta sesión).

## 2026-08-18 — Sesión 6c · Oportunidad heredada (solo lectura), subtareas fuera de listas, borrar tareas

Cuatro cambios (feedback del owner sobre la sesión 6b):

**1. Oportunidad de la tarea: solo lectura, heredada del proyecto (revisa la decisión de 6b).** En 6b se optó por
"autocompletar y guardar" la oportunidad en la tarea, pero eso la marcaba como preventa y la sacaba del tablero
`/tasks`. Ahora el campo "Oportunidad" del panel de tarea es **derivado y de solo lectura**: nuevo `PanelField.derivedFrom`
(`{ entity, idField, valueField }`) en `record-registry.ts`; el panel hace GET del padre EN VIVO y muestra el valor sin
guardarlo (`derivedFrom` se excluye de crear/guardar). Config: task.opportunityId → `derivedFrom project.opportunityId`.
Así la tarea **no** queda marcada como de oportunidad (sigue en `/tasks`), y si al proyecto se le asigna una oportunidad
después, al reabrir el panel se refleja (es en vivo). Fallback: si la tarea no tiene proyecto (preventa), muestra su
propia oportunidad. Se retiró el mecanismo `inherit` de 6b. `DerivedValue` (componente read-only) en `record-panel.tsx`.

**2. Subtareas fuera de las listas de tareas.** Las subtareas heredan el `projectId` del padre, así que aparecían en la
ficha del proyecto y (vencidas) en `/tasks`. Ahora se excluyen (`isNull(parentTaskId)`) de: la query inline de tareas de
`getProjectDetail` (ficha), `listProjectTasks` (API), `listOverdueTasks` (Vencidas de `/tasks`), `taskCountsByProject`
(progreso en la lista de proyectos) y "Trabajo de hoy" de Home. **Único sitio donde una subtarea asoma fuera de su tarea
madre: el bloque "Vencidas" de Home** (se mantiene, para notar que necesita atención). `listActiveTasks`/`listCompletedTasks`
ya las excluían. El progreso del proyecto pasa a contar solo tareas de nivel superior (coherente lista↔ficha).

**3. Borrar (definitivo) tareas/subtareas en las listas, en vez de archivar.** Nueva prop `remove={{entityType:'task'}}`
en `DataTable` (endpoint `POST /api/v1/delete`, confirmación de irreversible) reemplaza a `archive` en TODAS las listas de
tareas (global, ficha de proyecto, subtareas, preventa). Comando `deleteTasks` (projects/commands.ts) en **transacción**,
rol `delete` (ADMIN+): borra primero las **subtareas** (la FK `parentTaskId` no tiene cascade), limpia `external_identities`
(evita huérfano que esconde la tarea del sync) y `outbox_events` de la tarea, y registra `recordAudit(DELETE)` (sin push).
Test de integración en `tests/integration/projects.test.ts` (cascade + scope + limpieza de identity + auditoría).

**Sobre "¿hay problema de dependencias al borrar?"**: sí — la FK `tasks.parentTaskId → tasks.id` sin cascade (subtareas),
y punteros polimórficos sin FK (`external_identities`, `outbox_events`); `deleteTasks` los maneja todos en una tx.
`audit_logs`/`change_events` son histórico inmutable → no se tocan.

Verificado: typecheck · lint · unit (55) · build. Integración no corrida (sin Postgres en esta sesión) — el test de
`deleteTasks` se ejecutará con `pnpm test:integration` cuando haya DB.

## 2026-08-18 — Sesión 6b · Fixes de panel lateral: Sector combobox, cerrar-al-crear, herencia, checkbox

Cuatro arreglos sobre el panel lateral (`components/ui/record-panel.tsx`) y utilidades:

**1. Campo "Sector" — desplegable vacío + sin buscador.** El campo (texto libre con `suggest:
'/api/v1/knowledge/sectors'`) se renderizaba con un `<datalist>` nativo, que al hacer clic sin teclear no
muestra opciones. Ahora, cualquier campo de texto con `suggest` se renderiza con `SearchableSelect` en
modo **combobox de texto libre** (`allowCustom`): buscador + sugerencias del endpoint + poder teclear un
valor nuevo (Enter o fila «Usar «…»»). Afecta por igual al panel de la biblioteca (`knowledge_item`) y al
de la bandeja (`knowledge_inbox`), que comparten el mismo campo/endpoint. `SearchableSelect` extendido con
prop `allowCustom` (retrocompatible; las relaciones no la usan).

**2a. El panel no se cerraba al crear.** `create()` siempre pasaba a modo edición tras el POST. Ahora, en
**creación contextual** (`?in=ctxKey:parentId`, p. ej. "Nueva tarea" dentro de un proyecto) el panel se
**cierra** al crear (se vuelve al padre). En creación normal a nivel de lista se mantiene el paso a edición
(patrón Twenty, autoguardado). Genérico → aplica a todas las entidades creadas en contexto.

**2b. Autocompletar datos inferibles del padre.** Nuevo `contextCreate.<ctx>.inherit` (mapa
`{campoPanel: campoPadre}`) en `record-registry.ts`; en creación contextual el panel hace GET del padre y
precarga esos campos. Configurado: `task.contextCreate.project.inherit = { opportunityId: 'opportunityId' }`
→ al crear una tarea dentro de un proyecto, hereda la oportunidad del proyecto (decisión del owner). **Ojo
(consecuencia aceptada por el owner):** una tarea con `opportunityId` cuenta como preventa y `listActiveTasks`
la excluye → **deja de aparecer en el tablero `/tasks`** y pasa a la vista de la oportunidad. Reversible
cambiando a "ocultar" o "solo lectura" si se quiere. `createTaskSchema`/`createTask` ya aceptaban ambos.

**3. Checkbox "personal" con texto No/Sí confuso.** El `<span>` junto al checkbox alternaba "No"/"Sí".
Ahora muestra siempre "Sí" (el título del campo — "Tarea/Proyecto personal" — ya da el sentido; marcado =
personal). Afecta a los únicos campos `boolean` del registro (`project.personal`, `task.personal`).

Verificado: typecheck · lint · unit (55) · build. E2E no corrido (sin Docker/Postgres en esta sesión).

## 2026-08-18 — Sesión 6 · Fixes: purga de descartadas + vencidas en /tasks

Dos bugs reportados por el owner (probando en la Pi contra `prod`):

**1. Bandeja de conocimientos — las descartadas no se borraban.** El barrido diario `runInboxPurgeSweep`
(worker, 1×/día) → `purgeProcessedInbox` solo borraba las `PROCESSED`; las `DISCARDED` se quedaban en la
bandeja para siempre. Ahora el `WHERE` usa `inArray(status, ['PROCESSED','DISCARDED'])` → ambos estados
terminales se purgan con la misma frecuencia. Ficheros: `knowledge/commands.ts` (+`inArray`),
`maintenance/retention.ts` (JSDoc), `automations/catalog.ts` (textos de `sweep.inbox_purge`: "Purga de
bandeja resuelta", menciona descartadas). Nota: la descartada no tiene copia en la biblioteca → borrado
definitivo (es lo pedido).

**2. Vista global `/tasks` — no salían todas las vencidas.** La sección "Vencidas" ya existía y era
correcta, pero se alimentaba de `listActiveTasks`, que **excluye subtareas y tareas de oportunidad**
(`isNull(parentTaskId)/(opportunityId)`). El dashboard de **Home** (`getHomeDashboard`) sí las incluye →
por eso las vencidas del owner (subtareas / preventa) salían en Home pero no en `/tasks`. Fix: nueva query
`listOverdueTasks(db, ctx, today)` en `projects/queries.ts` (activas + `dueDate < today`, **sin** excluir
subtareas/oportunidad; join a projects/opportunities para el origen). En `app/(app)/tasks/page.tsx` la
sección "⚠ Vencidas" se pinta ahora desde `listOverdueTasks` (arriba del todo), el board (Hoy/Esta
semana/…) sigue con `listActiveTasks` saltándose el bucket OVERDUE (sin duplicar), y `assocCell` etiqueta
Proyecto/Oportunidad/Personal + «· subtarea». Caveat (igual que Home hoy): las tareas de oportunidad
archivada están congeladas y su edición de fecha/estado fallará en el back con `OPPORTUNITY_ARCHIVED`.

Verificado: typecheck · lint · unit (55) · build. Integración/e2e no corridos (sin Postgres en esta sesión).

## 2026-08-17 — Sesión 5 · Inventario de Automatizaciones (pestaña + panel lateral con activar/desactivar)

El owner tenía automatizaciones corriendo pero sin visibilidad ni control. Se añade una **pestaña "Automatizaciones"**
(`/automation/list`, junto a Integraciones y Estado del sistema) que lista **título · estado · frecuencia** y, al pulsar
una fila, abre un **panel lateral (sin ficha, `?auto=<key>`)** con todos los detalles y botones de acción.

- **Catálogo único** `packages/application/src/automations/catalog.ts` — 14 automatizaciones descritas en código
  (fuente de verdad; la tabla `automations` sigue sin usarse): 3 del **núcleo** (Outbox / cola de jobs / programador
  diario, solo lectura), 3 **por evento** (espejo Notion, write-back Twenty, proyecto al ganar oportunidad), 5 **syncs**
  (Twenty/Notion/GitHub/Drive/Calendar) y 3 **barridos** (retención, autoarchivado de oportunidades, purga de bandeja).
- **Enforcement real por organización**: el estado activada/pausada se persiste en `organizations.settings.automations`
  (jsonb; ausente ⇒ activada). `isAutomationEnabled` es la guarda que consultan **el worker** (handlers de outbox
  `event.*`, jobs `sync.*` vía `withIntegrationHealth`) y **los barridos** (`runRetentionSweep`/
  `runOpportunityArchiveSweep`/`runInboxPurgeSweep`, guarda por org). El **núcleo** no es toggleable (apagarlo
  congelaría la app) → se muestra con estado sintético `CORE` ("Núcleo · siempre activa").
- **«Ejecutar ahora»** (`runAutomationNow`): `sync.*` encola su job (idéntico a "Sincronizar ahora" de Integraciones);
  `sweep.*` corre el barrido inline acotado a la org y devuelve conteos. Acción manual explícita (se permite pausada).
- **API** `app/api/v1/automations`: `GET` (lista), `GET/PATCH [key]` (detalle / activar-pausar, sólo OWNER `manage_org`),
  `POST [key]/run` («Ejecutar ahora», permiso `write`).
- **UI**: `components/ui/drawer.tsx` (cascarón de panel reutilizable, extraído del patrón de `record-panel`),
  `components/automation/{automation-link,automation-panel}.tsx` (link `?auto=` + panel montado en `app-shell`),
  página `automation/list`. Etiquetas: `CORE`→"Núcleo · siempre activa" en `lib/labels.ts` + tono neutro.
- **Tests**: unitario `catalog.test.ts` (invariantes + conjunto canónico, evita drift) + integración
  `automations-state.test.ts` (default activada, pausar desactiva, núcleo no pausable, run sync encola / run sweep inline
  / retención sin política = skipped / evento no ejecutable). Verificado: typecheck · lint · unit (55) · integración (109) · build.
- **De paso**: arreglado un bug de limpieza pre-existente en `tests/integration/twenty-push.test.ts` (su `cleanupOrg`
  creaba una task pero no la borraba → violaba la FK al borrar la org; ahora borra tasks antes).

**Ajuste (mismo día):** los tres **barridos de mantenimiento** (retención de tareas, autoarchivado de oportunidades,
purga de bandeja) pasan a correr **una vez al día** (día local), unificados en un solo bloque diario del tick del worker
(antes retención + autoarchivado eran ~cada hora). La ventana de 7 días del autoarchivado la sigue imponiendo `closedAt`,
no la frecuencia. Además, nota aclaratoria en el panel de "Purga de tareas completadas": si la retención está en 0
("conservar siempre"), el barrido corre pero **no borra nada** (por eso Ajustes dice "se conservan siempre" y a la vez
la automatización figura activa — son coherentes).

**Ideas anotadas para el futuro** (el owner sólo pidió "Ejecutar ahora"): ver ejecuciones recientes por automatización,
editar cadencia/config inline (hora del sync diario, días de retención, ventana de autoarchivado), enlace directo a la
integración/origen desde cada sync/evento.

---

## 2026-08-17 — Sesión 4 · Proyecto "personal" (etiqueta)

El owner quería marcar proyectos que desarrolla para sí mismo. Se elige la **casilla** (patrón `task.personal`), no un
centinela en los desplegables de cliente/contacto.
- Migración aditiva `0013_m29_project_personal`: `projects.personal boolean NOT NULL DEFAULT false`.
- `create/updateProjectSchema` aceptan `personal` (opcional); `createProject`/`updateProject` lo persisten.
- Panel de proyecto: casilla **"Proyecto personal"** (`record-registry`, `type: 'boolean'`). No excluyente con
  cliente/contacto (es una etiqueta): un proyecto personal simplemente se deja sin cliente/contacto.
- Lista de proyectos: la columna "Asociado" muestra una **píldora "Personal"** cuando `personal` (en vez de
  cliente/contacto). `personal` ya viaja en `ProjectWithDerived` (via `ProjectRow`).
- Verificado: typecheck · lint · unit · build (migración se aplica en la Pi al desplegar).

---

## 2026-08-17 — Sesión 4 · Bandeja de conocimiento: mejoras (Fases 1–6 COMPLETAS)

Iniciativa "Mejoras a la Bandeja de Conocimiento" (9 puntos del owner, agrupados en 6 fases; plan aprobado).
Decisiones del owner: (1) borrado **real** de la copia en la bandeja tras procesar (auto diario + manual, sin estado
nuevo); (2) quitar "Contenido" de CT y volcar el texto capturado a "Resumen" (que sí se espeja a Notion); (3) el
`sourceUrl` del item pasa a **texto grande** ("URLs relacionadas", varios URLs como texto).

**Fase 6 (URLs relacionadas como texto grande):**
- El `sourceUrl` del `knowledge_item` deja de validarse como URL única: nueva regla `relatedUrls`
  (`z.string().trim().max(20000)`, texto libre) en `create/updateKnowledgeItemSchema`. `optionalUrl` se conserva
  para la captura (`captureKnowledgeSchema`, procedencia de canales). Columna DB `source_url` es `text` → sin migración.
- UI: campo `sourceUrl` relabelado a **"URLs relacionadas"** y a **textarea** en el panel (`record-registry`) y en la
  ficha (`library/[id]`). Se pueden pegar varios URLs como texto (estilo NotebookLM).
- Notion `knowledgeItemSpec`: propiedad `Canonical URL` de `kind: 'url'` → `kind: 'text'` (push) y el import pasa a
  `readRichText`. **El owner cambia la propiedad en la DB de Notion a texto plano.**
- Verificado: typecheck · lint · build.

**Fase 5 (sugerencias de sector dinámicas):**
- `listSectors(db, ctx)` (query): base fija `SECTOR_SUGGESTIONS` ∪ sectores ya usados por la org
  (`knowledge_items` + `learning_items` + `knowledge_inbox`), deduplicado y ordenado (es). Endpoint
  `GET /api/v1/knowledge/sectors`.
- Panel genérico: `PanelField.suggest?: string` (endpoint → `string[]`). El panel carga las sugerencias y, en
  campos de texto, pinta un `<datalist>`. Cableado en los campos `sector` de `knowledge_inbox`, `knowledge_item`
  y `learning` → `/api/v1/knowledge/sectors`. Al escribir un sector nuevo, la próxima vez aparece como sugerencia.
- Verificado: typecheck · lint · build.

**Fase 4 (procesar copia el texto + quitar "Contenido"):**
- `promoteInboxToItem`: el "Resumen" del elemento se rellena con el **texto capturado** (`summary = data.summary ??
  inbox.rawContent`) → al procesar, el texto ya aparece en la ficha de la biblioteca (y se espeja a Notion).
- Se quita el campo **"Contenido"** de la UI de CT (panel `record-registry` y ficha `library/[id]`). La columna DB
  `content` y su validación se conservan (no se tocan), solo se oculta: el cuerpo largo lo escribe el owner en Notion.

**Fix (feedback owner): DESCARTADO en anaranjado.** `status-tone.ts`: `DISCARDED` → `amber` (antes caía a neutro).
Exclusivo de `knowledge_inbox`.

**Fase 3 (automatización diaria de borrado + borrado manual):**
- `purgeProcessedInbox(db, ctx)` (comando): borra definitivo las capturas `PROCESSED` de una org (su conocimiento
  vive ya en la biblioteca; la copia sobra). `runInboxPurgeSweep(db)` (mantenimiento) lo aplica a todas las orgs.
- Worker: nuevo bloque en el `tick` con guarda `lastInboxPurgeDate` → corre **1×/día local** (y en el primer tick
  tras arrancar). Idempotente/restart-safe (borra por estado, sin temporizador). No acoplado al scheduler de sync.
- `deleteInboxItem(db, ctx, id)` (comando, `requireCan` + audit `DELETE`) + `DELETE /api/v1/knowledge-inbox/[id]`.
- Panel: `InboxPanelActions` gana **Eliminar** (con confirmación inline) — disponible **siempre**, también en las
  capturas procesadas/descartadas de solo lectura. Procesar/Descartar solo si no está resuelta.
- Verificado: typecheck · lint · build.

**Fase 2 · ajuste (feedback owner): metadatos en el panel + acciones directas.** El owner no quería que
"Revisar" desplegara un sub-form. Ahora todos los metadatos viven como campos del panel y los botones actúan directo:
- Migración aditiva `0012_m28_inbox_type_sector`: `knowledge_inbox` gana `knowledge_type` (CHECK KNOWLEDGE_TYPE,
  nullable) y `sector` (etiqueta libre). Se editan/autoguardan desde el panel antes de procesar.
- Panel `knowledge_inbox`: campos Título · Texto capturado · Fuente (solo lectura) · **Tipo** (desplegable) ·
  **Sector**. `updateInboxSchema` acepta `knowledgeType`/`sector`.
- `promoteInboxToItem`: body opcional (`promoteInboxSchema` todo opcional); lee título/tipo/sector de la fila con
  fallbacks (título → `rawContent` recortado; tipo → `NOTE`). El panel ya no muestra sub-form.
- `InboxPanelActions`: dos botones directos **Procesar → biblioteca** y **Descartar** (sin desplegar nada). Se retira
  el botón Abortar (ya no hay sub-form que abortar).
- Verificado: typecheck · lint · build (migración se aplica en la Pi al desplegar).

**Fase 2 (panel lateral para capturas + solo lectura + abortar):**
- `knowledge_inbox` entra al panel lateral como entidad **panel-only** (registro en `record-registry.ts`): campos
  Título, Texto capturado (textarea) y Fuente (solo lectura). Sin ficha completa ni `createPath` (se capturan con
  el formulario rápido).
- Backend: `getInboxItem` (query) + `updateInboxItem` (comando, solo edita si `NEW`; `AppError INBOX_NOT_EDITABLE`
  si no) + `updateInboxSchema`. Nueva ruta `GET/PATCH /api/v1/knowledge-inbox/[id]` con `meta.readOnly` cuando la
  captura está `PROCESSED`/`DISCARDED` (→ el panel la abre bloqueada).
- `InboxPanelActions` (en `components/knowledge/forms.tsx`, cableado en `record-panel.tsx` por
  `spec.entity === 'knowledge_inbox'`): **Revisar → procesar** (sub-form título/tipo/sector → promote),
  **Descartar**, y **Abortar** (cierra el sub-form sin cambiar de estado — punto 5). Solo se monta si la captura
  no está resuelta. Al procesar/descartar refresca y cierra el panel.
- La lista `inbox/page.tsx`: la fila abre el panel (`RecordLink`), se elimina la columna "Acciones" y el antiguo
  `InboxItemActions` inline (sustituido por el panel).
- Verificado: typecheck · lint · unit · build.

**Fase 1 (colores de estado + columnas en una línea):**
- `apps/web/components/ui/status-tone.ts`: `NEW` → **rojo** (nuevo sin procesar), `PROCESSED` → **verde** (ya en la
  biblioteca). `PROCESSING` sigue ámbar; `DISCARDED` neutro. Estos códigos son exclusivos de `knowledge_inbox`.
- `apps/web/app/(app)/knowledge/inbox/page.tsx`: columna "Captura" con `w-full` (absorbe ancho); Fuente/Estado/
  Acciones con `whitespace-nowrap` para que las etiquetas no se partan en dos líneas.
- Verificado: typecheck · lint · build.

---

## 2026-08-17 — Sesión 3 · Moneda con desplegable (campo cerrado que era texto libre)

Auditoría de campos "de valor cerrado pero editados como texto libre" (el usuario metía un valor inválido y saltaba
error de validación). **Único caso real: `currencyCode`** (`z.string().length(3).toUpperCase()` en `validation/crm`);
todos los enums (status/priority/stage/hosting/visibility/type/knowledgeType/maturity) YA eran `select`, y `type`/
`kind`/`sector` son **etiquetas libres a propósito** (no se tocan).

- Nueva fuente única `apps/web/lib/currencies.ts`: `CURRENCIES` (ISO 4217 curada: majors + LATAM/Europa) +
  `currencyOptions(current)` que **incluye siempre el valor actual** aunque no esté en la lista (no pierde una moneda
  importada de Twenty).
- `currencyCode` → **`select`** en: panel lateral (`record-registry`, oportunidad) y ficha de oportunidad
  (`InlineEditSection`, opciones con el valor actual inyectado). Ajustes ya usaba un select; ahora importa la misma
  constante (se elimina el duplicado inline).
- El panel ya maneja bien vacío→null (edición) y omite vacíos (creación), así que "—" limpia la moneda sin error.
- Verificado: typecheck · lint · build.

---

## 2026-08-16 — Sesión 3 · Oportunidades: ficha con tareas de preventa + vista global + archivadas de solo lectura

El owner necesita hacer tareas ANTES de ganar (fases previas). Ahora las oportunidades tienen **ficha completa** con
**tareas y subtareas** dentro, hay una **vista global** de todas las tareas de oportunidades, y las **archivadas son
de solo lectura**.

**Modelo — tareas de oportunidad:**
- `tasks.opportunity_id` (nullable, FK) + índice. Migración **`0011_m27_task_opportunity`** (aditiva). Una tarea
  pertenece a **proyecto XOR oportunidad XOR personal** (exclusión mutua garantizada en `createTask`/`updateTask`).
- `createTaskSchema`/`updateTaskSchema`: `opportunityId`. `createTask`: valida scope + rechaza si la oportunidad está
  archivada. Subtareas (`/tasks/[id]/subtasks`) **heredan** la oportunidad del padre. Queries nuevas:
  `listOpportunityTasks` (una opp) y `listAllOpportunityTasks` (todas, con nombre de opp; single flat list).
- Las tareas de oportunidad se **excluyen** de la vista de Proyectos (`listActiveTasks`/`listCompletedTasks` filtran
  `opportunityId IS NULL`) → cada vista queda limpia.

**Archivadas = congeladas (solo lectura):** `updateOpportunity`, `changeOpportunityStage` y crear/editar sus tareas
(`createTask`/`updateTask`/`updateTaskStatus`) rechazan con `OPPORTUNITY_ARCHIVED` (nuevo AppError). En la UI, el GET
de la oportunidad devuelve `meta.readOnly` (el panel la bloquea) y la ficha congela edición/stage/creación de tareas;
las tareas de una opp archivada también se muestran de solo lectura (task panel + `/tasks/[id]`). Nuevo getter
`getOpportunityArchivedAt`.

**UI:**
- `record-registry`: opportunity gana `detailPath` (→ "Abrir ficha completa ↗"); task gana `contextCreate.opportunity`
  (POST `/api/v1/opportunities/[id]/tasks`) + campo relación `opportunityId`.
- **Ficha** `/crm/opportunities/[id]` reescrita con **Tabs** (Resumen · Tareas · Actividad); pestaña Tareas con
  `ContextNewButton ctxKey="opportunity"` + `DataTable` (archivar). Congelable cuando la opp está archivada.
- **Vista global** `/crm/opportunities/tasks`: todas las tareas de preventa en **una sola lista** (sin separar por
  estado), con enlace a su oportunidad. Enlace "Ver tareas ↗" en la cabecera de Oportunidades.
- Ruta API nueva `/api/v1/opportunities/[id]/tasks` (GET+POST).
- Tests de integración añadidos (crear tarea en opp, listados, congelación de archivada). **NO ejecutados** aquí
  (Docker abajo); corren en el deploy/CI.
- user-guide.md actualizado. Verificado: typecheck · lint · unit (50/50) · build.

---

## 2026-08-16 — Sesión 3 · Oportunidades: vistas Activas/Archivadas + auto-archivado semanal de cerradas

Las oportunidades cerradas ensuciaban el Kanban junto a las activas. Ahora la página tiene **dos pestañas** (`Tabs`):

- **Activas** — el Kanban de 4 columnas (no archivadas). `listOpportunities` ya filtraba `archivedAt IS NULL`.
- **Archivadas** — **lista** (`DataTable`) de las cerradas y retiradas del tablero, con **Restaurar** (endpoint `/archive`
  genérico, `entityType: opportunity`, ya existente). Nueva query `listArchivedOpportunities` (archivadas, recientes 1º).

**Automatización — auto-archivado (owner 2026-08-16):**
- **Comando** `archiveClosedOpportunities(db, ctx, { olderThanDays, now })` (`crm/commands.ts`): archiva en lote las
  oportunidades cerradas **sin ganar** (`status = LOST` → stage LOST/CANCELLED/CLOSED) cuya `closedAt` es ≥ `olderThanDays`.
  Soft-delete vía `archivedAt`; audita `ARCHIVE` (`reason: auto-archive`). Idempotente (`isNull(archivedAt)`).
  **Las GANADAS (WON) NO se auto-archivan** (owner 2026-08-16: "Ganada no es un estado final"); se archivan a mano.
- **Barrido** `runOpportunityArchiveSweep(db, now)` (`maintenance/retention.ts`): recorre todas las orgs con contexto
  **SYSTEM** (→ no dispara push a Notion/Twenty) y aplica la ventana fija `OPPORTUNITY_ARCHIVE_AFTER_DAYS = 7`.
- **Worker**: se llama en el **barrido horario** existente (junto a la retención de tareas). **Decisión de diseño:** la
  ventana se basa en `closedAt` (edad), no en un temporizador → **restart-safe** y predecible: cada oportunidad se
  archiva ~1 semana tras cerrarse sin depender de cuándo arrancó el worker. (No literalmente "un cron semanal", que
  con timer en memoria re-dispararía en cada reinicio; el efecto es el mismo: cerrada → visible ~1 semana → archivada.)
- Tests de integración añadidos (`tests/integration/crm.test.ts`): archiva las cerradas ≥7d, deja las abiertas, es
  idempotente, y respeta la ventana (no archiva una recién cerrada). **NO ejecutados** aquí (Docker/Postgres abajo);
  corren en el deploy/CI.
- user-guide.md actualizado (fila Oportunidades).
- Verificado: typecheck · lint · unit (50/50) · build.

---

## 2026-08-16 — Sesión 3 · Oportunidades: Kanban a 4 columnas + 2 estados de cierre (CANCELLED/CLOSED)

El Kanban de oportunidades se salía de la pantalla (5 columnas de ancho fijo con scroll horizontal). Reagrupado a
**4 columnas** que llenan el ancho (grid responsive `1 → sm:2 → lg:4`, sin overflow):

| Columna | Stages |
|---|---|
| **Captación** | LEAD, CONTACTED, QUALIFIED |
| **Negociación** | MEETING, PROPOSAL, NEGOTIATION |
| **Ganadas** | WON |
| **Cerradas** | LOST, CANCELLED, CLOSED |

Dentro de cada columna, cada card muestra su **stage exacto como etiqueta** (`StatusBadge`, con `enumLabel` + tono),
así se diferencian aunque compartan columna.

**Dos estados nuevos (owner 2026-08-16; él los añade en Notion):** `CANCELLED` (Cancelada) y `CLOSED` (Cerrada).
- **Dominio** (`packages/domain`): `OPPORTUNITY_STAGE` pasa de 8 → **10**. Ambos **terminales** (como WON/LOST) vía
  `isOpportunityStageTerminal`; `deriveOpportunityStatus` los mapea a **LOST** (cierre sin ganar) → el enum de `status`
  sigue `OPEN|WON|LOST` (sin migración de status ni cambio en la automatización `opportunity.won`). Tests actualizados.
- **DB**: migración `0010_m26_opportunity_closed_cancelled` — recrea el CHECK `opportunities_stage_check` con los 10
  valores (DROP + ADD CONSTRAINT). Aditiva; se aplica en el deploy del worker (Pi). Snapshot/journal regenerados.
- **Labels** (`lib/labels.ts`): CANCELLED/CLOSED ya existían en el mapa plano (colisión con task/project, forma genérica
  masculina 'Cancelado'/'Cerrado') — se reutilizan por la convención del fichero; no se duplican claves.
- **Integraciones**: el mapper de Twenty deriva del enum (auto-acepta los nuevos en el pull). Nota: si se **empuja** a
  Twenty una oportunidad CANCELLED/CLOSED y Twenty no tiene esa opción, el PATCH de stage podría fallar — el owner
  alinea Twenty/Notion. Opportunity no está en el motor genérico de Notion (sin spec), así que no hay ciclo.
- ADR-002 addendum + DECISIONS_FROZEN actualizados (10 estados).
- Verificado: typecheck · lint · unit (50/50) · build. **Integración NO ejecutada** (Docker/Postgres no disponibles en
  esta sesión; la migración corre en el deploy de la Pi).

---

## 2026-08-16 — Sesión 3 · Menú de usuario (estilo cuenta Google) + selector de tema + foto de perfil

Sustituido el bloque suelto del header (email + botón "Cerrar sesión") por un **menú de usuario** al estilo de la
cuenta de Google.

- **`components/ui/avatar.tsx`** (nuevo): avatar circular reutilizable. Muestra la **foto** (data URL) o, si no hay,
  las **iniciales** derivadas del nombre (auto) sobre un color de fondo estable (hash del nombre). Tamaños sm/md/lg.
- **`components/user-menu.tsx`** (nuevo, cliente): botón **avatar + nombre** que despliega un menú (cierra con clic
  fuera / Esc) con: **selector de tema** (Claro/Oscuro/Sistema), enlace a **Ajustes** y **Cerrar sesión**.
  Reemplaza a `SignOutButton` en `app-shell.tsx` (borrado `sign-out-button.tsx`, sin más usos).
- **Tema (`lib/theme.ts`, nuevo):** `useTheme` persiste la preferencia en `localStorage` (`ct-theme`) y fija
  `data-theme` en `<html>`. Aprovecha los tokens **toggle-ready** ya existentes en `globals.css` (`data-theme="dark"|
  "light"`; sin atributo → sigue el SO). **Script anti-flash** (`themeScript`) inyectado en `<head>` de `app/layout.tsx`
  para aplicar el tema antes del primer paint.
- **Foto de perfil (`components/settings/profile-photo.tsx`, nuevo):** en Ajustes › Tu perfil, avatar (lg) con una
  **camarita** para subir imagen **desde el ordenador**. Se **redimensiona en cliente** (recorte cuadrado central, lado
  máx. 256px, JPEG q0.85) a un data URL y se guarda vía Better Auth `updateUser({ image })` (columna `users.image`, ya
  existente). Sin almacenamiento de ficheros: para single-user self-hosted, un data URL pequeño basta. Botón "Quitar".
  **MEJORA DIFERIDA anotada en el código:** captura por cámara (`getUserMedia`) — NO implementada aún.
- **Cableado:** `image` añadido a `CurrentContext.user` (`lib/auth-context.ts`, desde `session.user.image`) → `AppShell`
  → `UserMenu`/`ProfilePhoto`. `updateUser` exportado en `lib/auth-client.ts`.
- **Fix tema claro (mismo día):** en un SO en oscuro, forzar "Claro" dejaba el **fondo negro** (solo líneas/componentes
  con `bg-surface` se ponían blancos). Causa: `body` no tenía fondo propio, así que el lienzo seguía `color-scheme:
  light dark` de la UA → negro en un SO oscuro. Solución en `globals.css`: (1) `body` con `background-color: var(--surface)`
  + `color: var(--fg)` explícitos (el tema manda siempre, no la UA); (2) `color-scheme` alineado al tema forzado
  (`data-theme="light"`→`light`, `="dark"`→`dark`; en `@media dark` no forzado→`dark`) para controles/scrollbars.
- Verificado: typecheck · lint · build. En `control-tower-mvp` (no mergeado a `prod`; pendiente prueba del owner en el
  navegador).

---

## 2026-08-16 — Sesión 3 · Tema: opcionales — tipografía (next/font) + adopción de Card

- **Tipografía**: `next/font/google` (Inter, auto-hospedada, sin petición en runtime) expone `--font-sans`, que consume
  `body` en `globals.css` (system stack de fallback). Es el token de fuente; cambiarla = `app/layout.tsx`.
- **Card**: adoptado en tarjetas/tiles genuinas (`metric-card`, tiles de `automation/page` y el `Tile` de
  `automation/health`). `card.tsx` exporta `cardCls` (para `<Link>`/`<li>`). Los `<li>` de fila y wrappers de tabla/
  modales se dejan (Card es `<div>`).
- **Fix**: corregido un huérfano de opacidad de la migración anterior (`p-2/30` → `p-2` en crm/opportunities); escaneo
  confirma que era el único.
- Verificado: typecheck · lint · unit (50/50) · build. **Nota deploy**: el build ahora descarga Inter (build-time); la
  Pi tiene internet en el build, así que ok.

---

## 2026-08-16 — Sesión 3 · Tema: migración del color inline a tokens (Fases 1 y 2) — COMPLETA

Tras la fundación, se migró **todo el color inline** a tokens.
- **Fase 1 (páginas + chrome de componentes):** script de reemplazo `neutral-*`/`dark:` → tokens (border-line/-subtle/
  -strong, bg-surface/-muted, bg-neutral-soft, text-fg/-muted/-subtle), quitando los `dark:` redundantes. Invertidos a
  mano: pestaña/borde activos→`border-fg`, item de sidebar→`bg-primary`, progress→`bg-line`/`bg-fg`. De **~592 usos
  crudos a 2** (solo el bloque de código de markdown, oscuro a propósito) + overlays `bg-black/*`. Nuevo token `line-subtle`.
- **Fase 2 (rojos/ámbar):** `text-red-*`→`text-danger`, `text-amber-*`→`text-warning`; callouts de aviso a
  `border-danger-border`/`border-warning-border` + `bg-*-soft`. Nuevos tokens `danger-border`/`warning-border`. **0
  rojos/ámbar crudos.**
- Luz idéntica (tokens = valores originales); oscuro unificado (shifts de 1 tono imperceptibles). Verificado:
  typecheck·lint·unit(50/50)·build; utilidades emiten `var(--token)`. E-13 → 🟢 hecho (queda opcional: toggle, next/font).

---

## 2026-08-16 — Sesión 3 · Sistema de tema centralizado (tokens + primitivas) — fundación + adopción

Antes no había theming central: color hardcodeado inline (≈592 `neutral-*`), sin `Button`/`Input`, con constantes
`inputCls`/`submitBtn`/`ghostBtn`/`selCls` copiadas por fichero y deriva de estilos. Se implementó **la combinación de
tokens semánticos + primitivas** (decisión del owner), con oscuro automático **listo para toggle**.
- **Tokens** (`app/globals.css`): variables CSS conscientes del modo + `@theme inline` → utilidades `bg-surface`,
  `text-fg`, `border-line`, `bg-primary`, `text-primary-fg`, `text-link`, `text-danger`, `bg-*-soft`… **Valores idénticos
  a la paleta actual** → sin cambio visual. La misma clase vale claro/oscuro (sin `dark:`). Toggle-ready vía `data-theme`.
- **Primitivas** `components/ui/{button,input,card,text-link}.tsx` (componentes + cadenas `btnPrimary`/`fieldCls`/…).
- **Refactor semántica**: `status-tone.ts` usa pares "soft" por token; `health-badge` deja de duplicar (importa el tono);
  `source-badge` usa `neutral-soft`/`accent-soft`.
- **Adopción** (donde se copiaban clases): forms de crm/business/projects/portfolio/knowledge, `record-panel`,
  `inline-edit`, `data-table`, `searchable-select`, `global-search`, `sign-out`, `settings/actions`, `new/context-new
  buttons`, `external-source-link`, `inbox-channels`, `library/learning-list`, `login`. Verificado que el CSS compilado
  resuelve `var(--token)` → cambiar un token propaga a todos.
- **Pendiente (anotado)**: migrar el color inline del resto de páginas + chrome de componentes → `docs/DESIGN_TOKENS.md`
  (guía + checklist) y **E-13** en `FINDINGS_AND_DEFERRED.md`. Se completa poco a poco, con apariencia idéntica.
- Verificado: typecheck · lint · unit (50/50) · build.

---

## 2026-08-16 — Sesión 3 · Tareas/proyectos: marca Personal, fecha en ficha, congelar proyectos cerrados

Cinco ajustes del owner sobre tareas/proyectos.
- **#1 (asignar proyecto a task de Twenty): ya funcionaba** (projectId editable en el panel, no propagado a Twenty). Sin cambios.
- **#2 Personal:** nueva columna `tasks.personal boolean` (migración `0009_m25_task_personal`). En el panel, campo
  booleano "Tarea personal" (nuevo tipo de campo `boolean`/checkbox en `record-panel`). **Exclusión mutua** en
  `createTask`/`updateTask`: asignar proyecto quita personal; marcar personal desasocia el proyecto. Display en `/tasks`
  (helper `assocCell`): Proyecto·**Personal**·Sin proyecto. Queries `listActiveTasks`/`listCompletedTasks` traen `personal`.
- **#3 Fecha en la ficha de proyecto:** columna «Vencimiento» (solo lectura) en la lista de tareas del proyecto.
- **#4 (fecha opcional):** sin cambios; las sin fecha viven en la sección «Sin fecha» de /tasks (decisión del owner).
- **#5 Congelar proyectos cerrados (todo):**
  - Dominio: `PROJECT_TRANSITIONS.CLOSED = []` → un proyecto cerrado NO cambia de estado (ni a ARCHIVED). Para ocultarlo
    se **archiva** (soft-delete). UI: `projects/[id]` y `projects` list muestran `StatusBadge` en vez de `ProjectStatusControl` si CLOSED.
  - Tareas de proyecto cerrado = solo lectura: guard `assertProjectNotClosed` (error `PROJECT_CLOSED`) en `updateTask`,
    `updateTaskStatus` y `createTask`. UI: ficha de proyecto (estado→StatusBadge, «Nueva tarea» oculto), ficha de tarea
    (InlineEdit read-only, controles de fecha/estado ocultos, «Nueva subtarea» oculto), y el **panel** bloquea todos los
    campos vía `meta.readOnly` (nuevo `getProjectStatus` + el GET de task lo expone; `record-panel` respeta `meta.readOnly`).
- Tests de integración `projects.test.ts`: exclusión Personal↔Proyecto; proyecto CLOSED rechaza cambio de estado
  (INVALID_TRANSITION) y congela sus tareas (PROJECT_CLOSED). Verificado: typecheck·lint·unit·build.
- **Deploy:** el #2 lleva migración → el deploy en la Pi debe correr las migraciones (lo hace el worker).

---

## 2026-08-16 — Sesión 3 · Vista de tareas: pestaña "Completadas"

Faltaba dónde ver las tareas **completadas sin proyecto** (las de proyecto se ven —mezcladas— en la ficha del proyecto;
la vista `/tasks` solo mostraba activas). Decisión del owner: pestaña en `/tasks`, incluyendo hechas + canceladas.
- **`listCompletedTasks`** (`projects/queries.ts`): `status ∈ {DONE, CANCELLED}`, nivel superior, no archivadas,
  `leftJoin(projects)` para `projectName`, `completedAt` en el select, orden `desc(coalesce(completedAt, updatedAt))`
  (las canceladas no setean `completedAt`).
- **`/tasks`** ahora acepta `?view=completed` y muestra sub-nav «Activas | Completadas» (`TasksHeader`). Activas =
  buckets de siempre. Completadas = un único `DataTable` (fixedLayout, selección+archivar) con columnas Tarea · Proyecto ·
  Prioridad · Fuente · **Estado (StatusBadge, solo lectura)** · **Completada** (fecha o «—»). Aviso de que respeta la
  retención de Ajustes. La columna Proyecto deja ver de un vistazo las que no tienen proyecto.
- Test `projects.test.ts`: `listCompletedTasks` incluye hechas+canceladas (con y sin proyecto), excluye activas y
  subtareas; las canceladas no tienen `completedAt`.
- Verificado: typecheck · lint · unit (50/50) · build.

---

## 2026-08-16 — Sesión 3 · Vista de tareas: alineación entre secciones, "Vencidas" evidente, crear task desde CT

Petición del owner sobre `/tasks` (Todas las tareas):
1. **Columnas alineadas entre secciones.** Cada bucket (Vencidas/Hoy/Esta semana/…) es su propia `<table>`; con
   auto-layout las anchuras variaban entre secciones. Nuevo prop `fixedLayout` en `DataTable` (`table-fixed
   min-w-[880px]`, opt-in) + anchos fijos por columna (`w-44/w-24/w-28/w-40/w-40`, Tarea flexible) → todas las tablas
   comparten anchuras idénticas y quedan alineadas.
2. **Sección "Vencidas" evidente.** Ya existía el bucket `OVERDUE` (y va primero, arriba de "Esta semana"), pero era
   poco visible (solo texto rojo). Ahora se envuelve en una tarjeta con borde/fondo rojo + "⚠". (La lógica de
   `taskBoardBucket` era correcta: OVERDUE tiene precedencia sobre BLOCKED/fecha para tareas activas.)
3. **Crear task desde CT.** Nueva `POST /api/v1/tasks` (nativa de CT, `projectId` opcional; `createTask` ya valida el
   scope del proyecto). `task.createPath` + campo relación `projectId` en el registro → el botón "Nuevo" de `/tasks`
   abre el panel de creación con proyecto opcional. Además `projectId` se añadió a `updateTaskSchema`/`updateTask` (con
   `loadProject` para el scope) → se puede reasignar/desasociar el proyecto de una task por el panel. Tests de
   integración en `projects.test.ts` (crear sin proyecto, reasignar, y rechazo cross-org).
   - **¿Se sincronizan a Twenty?** NO (recomendado): una task creada en CT no tiene identidad externa → el write-back
     (`runTwentyEntityPush`) hace `skip`. CT es el hub; las tasks de CT son nativas. Si en el futuro se quisiera empujar
     una task concreta a Twenty, mejor una acción explícita "enviar a Twenty" (crear en Twenty + guardar identidad) que
     un push automático de todo. Nota: Twenty no tiene proyectos, así que una task-con-proyecto no tendría hogar claro allá.
- Verificado: typecheck · lint · unit (50/50) · build.

---

## 2026-08-16 — Sesión 3 · Campos inmutables por procedencia (registros importados de sistemas externos)

Problema (owner): metadatos que un sistema externo POSEE eran editables en CT y el sync los pisaba; p. ej. el
`repositoryUrl` de un asset importado de GitHub, si se editaba, rompía el enlace al repo (y peor, se empujaba a Notion
→ divergencia entre los 3 sistemas). Decisiones del owner: bloqueo **por procedencia** (solo si el registro concreto
vino de ese proveedor) y **solo los casos rotos** (asset-de-GitHub, task-de-Twenty). Los campos CRM de Twenty se dejan
editables (write-back E-1 intencional); slugs y documentos ya eran inmutables.

- **Fuente única** `packages/domain/src/ownership.ts`: `FIELD_OWNERSHIP` (entityType→provider→campos) + `ownedFields()`
  + `PROVIDER_LABEL`. Hoy: `asset/GITHUB → name,description,externalUrl,repositoryUrl` · `task/TWENTY → title`.
  (Ajuste posterior del owner: la **fecha** de una task de Twenty SÍ se edita —reprogramar en CT— y **CT es su dueño**:
  se quitó `dueDate` del bloqueo, se devolvieron los botones "Reprogramar/Pasar a hoy", y `sync-twenty` **dejó de
  reescribir `dueDate`** en tasks ya existentes —solo la toma en la creación inicial—. El `title` sí sigue siendo de
  Twenty. Test de regresión en `twenty-sync.test.ts`: un 2º sync no pisa la fecha reprogramada pero sí re-sincroniza el título.)
  **Write-back de la fecha (CT→Twenty):** al reprogramar una task sincronizada, la nueva fecha se **propaga a Twenty**
  (`task` añadido a `TWENTY_MIRRORED`; nuevo `taskPatch` en `twenty/mapper.ts` empuja `dueDate`→`dueAt`; target `task`
  en `push-twenty.ts`). Así la fecha es de CT pero se refleja en Twenty. Solo la fecha (el título lo posee Twenty). Test
  `twenty-push.test.ts`: reprogramar una task sincronizada encola `twenty.push` y manda `{dueAt}` a `tasks/EXT-T1`.
- **Guard de backend** (defensa en profundidad): `assertNotEditingOwnedFields` (`integrations/identity.ts`) +
  `fieldOwnedExternally` (AppError CONFLICT). Cableado en `updateAsset` y `updateTask`. El sync NO pasa por estos
  comandos (usa `.set` directo), así que solo afecta ediciones de usuario. Rechaza con mensaje claro.
- **Panel** (`record-panel.tsx`): campos con `ownedBy` (nuevo en `PanelField`) se muestran de solo lectura + 🔒 + pista
  cuando el registro cargado tiene `meta.source.provider` en esa lista. `asset`/`task` pasan a `source:true` y sus GET
  (`api/v1/{assets,tasks}/[id]`) devuelven `meta: sourceMeta(identity)`.
- **Fichas**: `InlineEditSection` admite `readOnly`/`readOnlyHint` por campo (no editable, no se envía en el PATCH). Las
  fichas de asset y task calculan los campos bloqueados con `getIdentityForInternal` + `ownedFields`. En la ficha de task
  se ocultan además los controles "Reprogramar/Pasar a hoy" si `dueDate` está bloqueado. **Bug corregido:** la ficha de
  asset mostraba `SourceBadge source="NATIVE"` hardcodeado → ahora muestra el proveedor real y su URL de origen.
- Test de integración `tests/integration/ownership.test.ts` (requiere Postgres): asset GitHub rechaza editar
  repositoryUrl/name, permite `version`; asset nativo permite repositoryUrl. Verificado: typecheck·lint·unit·build.

---

## 2026-08-14 — Sesión 2 (tarde) · Ver archivados + restaurar (cierre de E-12, parte archivados)

Completa la parte "ver archivados/restaurar" de E-12 (el drag-reorder sigue diferido).
- Backend (`maintenance/archive.ts` reestructurado): mapa `ARCHIVABLE` ahora lleva `{table, nameCol, label}` por
  entidad; `setArchived` unifica archivar/restaurar (`archivedAt = Date|null`); `restoreRecords` (público) + `listArchived`
  (agrupa lo archivado por entidad, solo grupos con ≥1). Ruta **`POST /api/v1/restore`**. Etiqueta `RESTORE`→"Restauró".
- UI: página **Ajustes › Archivados** (`/settings/archived`) — un `DataTable` por grupo de entidad (Nombre + fecha de
  archivado) con selección + **Restaurar** en lote. `DataTable` admite ahora modo `restore` (además de `archive`),
  sin tocar los ~15 call-sites existentes. Enlace nuevo en la página de Ajustes.
- Diseño: vista CENTRAL (una query genérica) en vez de un toggle "Archivados" por lista (habría exigido parametrizar
  ~15 queries). Verificado: typecheck · lint · unit (50/50) · build.

---

## 2026-08-14 — Sesión 2 (tarde) · Listas: componente `DataTable` (columnas alineadas + selección + archivar) — Fase 1

Iniciativa "fila de lista como componente". El owner pidió: (1) checkbox por fila + seleccionar-todo para operar en
lote, (2) reordenar arrastrando, (3) columnas alineadas. **Decisiones del owner:** reordenar → DIFERIDO (E-12);
"borrar" → **archivar** (soft-delete reversible vía `archivedAt`, que ya existía sin uso). Plan en 2 fases.

**Fase 1 (vertical slice, este commit):**
- **`components/ui/data-table.tsx`** (NUEVO, client): tabla alineada (como `EntityTable`) + selección opcional
  (checkbox por fila + seleccionar-todo con estado indeterminado) + barra de acciones en lote con **Archivar**.
  Nota RSC: al ser client, NO recibe funciones `cell` (no serializables); el server prerenderiza las celdas y pasa
  `rows:{id,cells:ReactNode[]}` + `columns:{header,className}`. En el call-site se mapea el `Column<T>` existente.
- **Backend archivar (genérico):** `packages/application/src/maintenance/archive.ts` → `archiveRecords(db, ctx, input)`
  con allowlist `ARCHIVABLE` (17 entidades→tabla; es la validación de seguridad), `requireCan('delete')` (ADMIN+),
  `update set archivedAt`, `recordAudit('ARCHIVE')`. Ruta **`POST /api/v1/archive`** `{entityType, ids}`. Etiqueta
  `ARCHIVE`→"Archivó" en `lib/labels.ts`.
- **Filtro archivados** añadido a las queries del slice: `listActiveTasks`, `listDecisions`, `listAssets`
  (`isNull(archivedAt)`).
- **Aplicado en:** `tasks/page` (los buckets flex → `DataTable`, arreglando el desalineado que reportó el owner),
  `knowledge/decisions/page`, `knowledge/assets/page` (EntityTable → DataTable con selección+archivar).
- Verificado: typecheck · lint · unit (50/50) · build. Smoke en la Pi (sin DB local). **Ojo:** aún no hay UI de
  "ver archivados/restaurar" (E-12) — si se archiva algo por error, se restaura en DB (`archived_at = null`).

**Fase 2 (HECHA):** roll-out completo.
- `DataTable` (selección+archivar) en las 9 páginas de lista de entidad restantes (projects, crm/clients, crm/contacts,
  business/{goals,capabilities,services,strategic-areas}, knowledge/documents, portfolio) y en las 4 tablas embebidas
  de fichas (project→tareas/entregables, cliente→contactos/oportunidades).
- Listas flex multi-columna migradas a tabla alineada: `resource-list` (fichas cliente/proyecto) y subtareas
  (`tasks/[id]`), ambas con selección+archivar.
- **`isNull(archivedAt)`** añadido a TODAS las queries de lista de entidades archivables (crm/governance/knowledge/
  projects/portfolio/resources/learning `queries.ts` + sub-listas de `getProjectDetail`/`getClientDetail` + listas del
  Home). Los contadores KPI del Home y `getBusinessOverview` NO se filtraron (un archivado en un número es despreciable).
- **NO se tocan** (intencional): `inbox`/`automation` (jobs/inbox no son archivables), el Kanban de oportunidades, y
  las sub-listas flex de 2 columnas (decisiones/documentos en ficha de proyecto, proyectos/documentos en ficha de
  cliente, objetivos en área) + widgets del Home — ya están alineadas visualmente y la selección ahí aporta poco.
- Verificado: typecheck · lint · unit (50/50) · build.

---

## 2026-08-14 — Sesión 2 (tarde) · Sync automático: 1×/día a las 7am (antes cada 15 min)

Decisión del owner: no hace falta sincronizar las integraciones cada 15 min; con **una vez al día** basta (los
cambios propios se sincronizan al momento a mano). Horario: **7am** en su zona horaria.
- El scheduler del worker pasa de **por intervalo** (`SYNC_INTERVAL_MINUTES`, def 15) a **anclado a la hora**:
  `SYNC_DAILY_HOUR` (0–23, def 7); fuera de rango = off. Se dispara en el primer tick tras cruzar esa hora cada día
  (dedup por fecha local `lastDailySyncDate`).
- **Zona horaria**: se usa la de la organización (`organizations.settings.timezone`, la que el owner puso en Ajustes)
  vía nuevo helper `getPrimaryOrgTimezone` + `Intl` (sin librería de fechas); cacheada y refrescada ≤cada 15 min.
  Override opcional `SYNC_DAILY_TZ` (IANA). No requiere tocar el `TZ` del contenedor.
- `.env.example` actualizado (`SYNC_DAILY_HOUR`/`SYNC_DAILY_TZ`); docs vivos (DEPLOYMENT/AUTOMATION_BACKLOG/FINDINGS)
  actualizados. Verificado: typecheck · lint · unit · build. Smoke real en la Pi (sin DB local).

---

## 2026-08-14 — Sesión 2 (tarde) · Subtareas por panel + subtarea panel-only

Jerarquía elegida por el owner: **Proyecto → Tarea (conserva su ficha con la lista de subtareas) → Subtarea (solo
panel, sin sub-subtareas)**. Cambios (todo en `apps/web`, sin backend nuevo):
- `record-registry.ts`: `task.contextCreate.task` = crear subtarea vía `POST /api/v1/tasks/[id]/subtasks` (el endpoint
  ya inyecta `parentTaskId` y hereda el proyecto del padre; `createTaskSchema` acepta los campos del panel).
- `tasks/[id]`: el `CreateSubtaskForm` inline → `ContextNewButton` ("＋ Nueva subtarea"); las filas de subtarea pasan a
  `RecordLink` (abren el panel, no la ficha).
- `record-panel.tsx`: oculta "Abrir ficha completa" cuando el registro tiene `parentTaskId` → una **subtarea es
  panel-only** (no ofrece ficha ni, por tanto, sub-subtareas). Se corta la recursión ahí.
- `projects/forms.tsx`: nuevo `TaskPanelActions` (Reprogramar + Pasar a hoy, "hoy" calculado en el navegador) montado
  al pie del panel de tarea/subtarea. `CreateSubtaskForm` borrado (código muerto).
- Verificado: typecheck · lint · build. El owner lo probó en la Pi: OK.
- **Afín aplicado (owner dio OK):** mismo criterio en los otros parents con ficha-lista-de-hijos.
  - **Área estratégica → Objetivos**: ya estaba completo de una fase previa (`ContextNewButton` + filas `RecordLink`
    al panel; el objetivo ya era panel-only). Sin cambios.
  - **Servicio → Capacidades**: las capacidades vinculadas ahora son clicables (`RecordLink` → panel de capacidad,
    que ya es panel-only). La capacidad es N:N compartida, así que hay **dos formas de añadir**: (a) `LinkCapabilityControl`
    (vincular una existente) y (b) **"＋ Nueva capacidad"** — nuevo: `ContextNewButton` + `capability.contextCreate.service`
    → `POST /api/v1/services/[id]/capabilities/new` → comando `createServiceCapability` (crea la capacidad y la vincula en
    una transacción; devuelve la capacidad para abrir su panel). Verificado typecheck·lint·build; smoke en la Pi (sin DB local).

---

## 2026-08-14 — Sesión 2 (tarde) · Limpieza de código muerto + traducción al español

### Limpieza de los `Create*Form` inline (✅ `75fff3b`)
- Tras la iniciativa del panel lateral, los formularios de creación inline dejaron de referenciarse. Borrados de
  `components/{crm,business,knowledge,projects,portfolio}/forms.tsx`; `learning/forms.tsx` y `resources/forms.tsx`
  quedaban vacíos → ficheros eliminados. **Conservados** `CreateSubtaskForm` (subtareas) y `CreateDocumentForm`
  (referencias externas), más todos los `*StatusControl`/helpers en uso. Imports/helpers huérfanos limpiados.
- Verificado: typecheck · lint · build.

### Pasada completa de traducción al español (✅ `ac0cbf5`)
- **Regla:** se traduce todo el chrome (navegación, títulos, subtítulos, pestañas, cabeceras, botones, estados vacíos)
  y los CÓDIGOS de enum mostrados; **NUNCA** los datos introducidos por el usuario ni lo importado de terceros.
- **`apps/web/lib/labels.ts`** — nueva capa de display: `enumLabel(code)` traduce un código de enum del dominio a
  español SOLO para pantalla (el `value`/DB/API sigue siendo el código). Mapa plano con *fallback* al propio valor →
  el texto libre y lo importado pasa intacto. Cubre status/stage/priority/visibility/maturity/role/tipo de portfolio/
  hosting/estados de job·outbox + vocabulario de auditoría (acciones/actor/entidad del feed de actividad).
- **Cableado central** (una edición cubre decenas de call-sites): `StatusBadge`, `StatusSelect`, `InlineEditSection`
  (vista + opciones) y el panel lateral genérico `record-panel` renderizan vía `enumLabel`. Los renders crudos directos
  restantes (prioridad, tipo, hosting, rol…) se envolvieron in situ.
- **Chrome** traducido en CRM, Negocio, Proyectos, Tareas, Conocimiento, Portafolio, Automatización, Ajustes y Home.
  Automatización: Jobs→Procesos, Outbox→Bandeja de salida, System Health→Estado del sistema (Worker se mantiene).
- **Claves lógicas NO traducidas:** el Kanban de oportunidades filtra por `col.stages` (códigos intactos) y las
  pestañas de Proyectos usan `?tab=<key>`; ambas traducen solo su etiqueta visible (`col.key` / `TAB_LABEL`).
- **Al añadir una entidad/enum nuevo:** si tiene un enum cerrado que se muestra, añade sus códigos→español en
  `lib/labels.ts`; el display ya pasa por `enumLabel` en los componentes centrales, no hay que tocar cada vista.
- Verificado: typecheck · lint · unit (50/50) · build.
- **Nota de proceso:** en esta sesión un subagente de edición ejecutó `git reset` y revirtió parte del trabajo en
  curso; se recuperó re-aplicando los cambios a mano. Lección: no dar a los subagentes libertad para correr comandos
  git sobre el árbol de trabajo compartido.

---

## 2026-08-10 — Sesión 1 · Análisis + arranque

### Paso 0 · Análisis de arquitectura (✅)
- Analizados los 9 documentos + `old_docs/`. Construido mapa de dependencias y precedencia.
- Identificadas las decisiones congeladas, el alcance MVP (28 tablas, 7 áreas de nav) y el plan de 18 milestones.
- **Contradicciones NO resueltas por la errata → resueltas por el owner:**
  - C-1 `opportunities.stage` → [ADR-002](./adr/ADR-002-opportunity-stages.md) (pipeline de 8 estados).
  - C-2 `portfolio_items` sin esquema congelado → [ADR-001](./adr/ADR-001-portfolio-items-schema.md).
- Confirmado despliegue: modelo-1 del monorepo, Postgres propio, puertos 4270/4272, Caddy `control-tower.noboolsheet.local`.
- Twenty ya self-hosted en `infrastructure/twenty/` → target del adapter M12.

### Paso 1 · Documentación persistente en el repo (✅)
- Rama de trabajo: `control-tower-mvp` (para no tocar `prod`).
- Creado `apps/control-tower/docs/`: `IMPLEMENTATION_ROADMAP.md`, `DECISIONS_FROZEN.md`, `BUILD_LOG.md`, `adr/ADR-001`, `adr/ADR-002`.

### M01 · Repository + tooling (✅ completado)
- [x] workspace pnpm (`pnpm-workspace.yaml`, `package.json` raíz, `tsconfig.base.json`, `.npmrc`, `pnpm-lock.yaml`)
- [x] `packages/shared` (logger JSON estructurado, taxonomía de errores `AppError`)
- [x] `packages/validation` (env con Zod + 3 tests unitarios)
- [x] `packages/db` (cliente Drizzle+postgres.js, `checkDbHealth`, `drizzle.config.ts`, runners `migrate`/`seed` stub, schema vacío para M02)
- [x] `apps/web` (Next.js 15 App Router, Tailwind v4) con `/api/health` (200) + `/api/health/db` (503 controlado si DB caída)
- [x] `apps/worker` (Node + tsx, heartbeat con chequeo de DB, apagado ordenado SIGTERM/SIGINT)
- [x] Docker: `Dockerfile` multi-stage (targets `web` standalone + `worker`, ARM64/x64), `compose.yml` dev (db+web+worker)
- [x] Deploy modelo-1: `control-tower.docker-compose.{dev,prod}.yml`, `deploy-control-tower.sh` (ejecutable), bloques en `envs/.env.{dev,prod}` (puertos 4270/4272), ruta Caddy `control-tower.noboolsheet.local`
- [x] CI: `.github/workflows/control-tower-ci.yml` (install→lint→typecheck→test→build, path-filtered)
- [x] ESLint 9 flat config + Prettier, `.env.example`, `.gitignore`, `README.md`

**Verificación (CI chain local, todo en verde):**
- `pnpm install` ✅ (374 deps, lockfile creado) · `pnpm lint` ✅ · `pnpm typecheck` ✅ (5 proyectos) · `pnpm test` ✅ (3/3) · `pnpm build` ✅ (web standalone, 4 rutas)
- **Runtime smoke** (servidor standalone real): `GET /` → 200 · `GET /api/health` → 200 `{status:ok}` · `GET /api/health/db` (DB caída) → 503 `{error:"ECONNREFUSED"}` (error controlado, sin crash).
- **Pendiente de verificar en la Pi:** `docker compose up` completo (el daemon de Docker no está activo en el entorno de desarrollo actual). El Dockerfile/compose están escritos según convención cv-creator/twenty; se validan al desplegar.

**Decisiones de implementación M01:**
- Los paquetes del workspace se consumen como **fuente TS** (via `transpilePackages` de Next / `tsx` en el worker), no como `dist` compilado → imports relativos sin extensión (resolución `bundler`); se quitaron los scripts `build` por-paquete (inútiles) y el `build` raíz sólo compila la web (el deployable).
- `next-env.d.ts` (generado) y `packages/db/drizzle/` excluidos de ESLint.
- Credenciales de Postgres + `BETTER_AUTH_SECRET` viven en `apps/control-tower/.env` (gitignored); `deploy-control-tower.sh` las carga al shell para la interpolación del compose (no van al `envs/` compartido).

### M01 · Verificación Docker en la Pi/local (owner) + fixes (✅)
- El owner levantó el stack con `docker compose up`: **db (healthy)**, web y worker creados y arrancados correctamente.
- **Fix pg18 (owner):** la imagen `postgres:18` cambió `PGDATA` a `/var/lib/postgresql/18/docker` y declara el `VOLUME` en `/var/lib/postgresql` (ya no `/data`). El owner corrigió el mount a `/var/lib/postgresql` en los 3 compose. **Verificado correcto:** los datos persisten en `/var/lib/postgresql/18/docker` bajo el volumen montado. El path antiguo `/data` no habría persistido nada.
- **Fix web healthcheck (bug real, corregido en Dockerfile):** Docker define `HOSTNAME=<container-id>` y el server standalone de Next se ataba solo a esa IP (eth0), no a loopback → el healthcheck a `127.0.0.1:3000` fallaba (contenedor `unhealthy`) aunque la app respondía 200 desde el host. Solución: `ENV HOSTNAME=0.0.0.0` en el stage `web` del Dockerfile. **Verificado** con la imagen cacheada: probe in-container a `127.0.0.1:3000` → 200 (exit 0), logs ahora `Network: http://0.0.0.0:3000`. Se aplica al reconstruir la imagen (`docker compose up -d --build web`).

---

## M02 · Database + migrations (✅ completado)

Fuente autoritativa: se releyó el Physical Data Model (doc 5) completo para no inventar columnas (IMP-002).

- **Schema Drizzle** en `packages/db/src/schema/` (28 tablas), organizado por bounded context:
  `enums.ts` (valores canónicos + ADR-001/002), `_shared.ts` (helpers pk/timestamps/inet/`inValues` CHECK),
  `organizations.ts`, `governance.ts`, `crm.ts`, `operations.ts`, `knowledge.ts`, `infrastructure.ts`, `index.ts` (barrel).
- **Migración** `drizzle/0000_m02_mvp_schema.sql` generada con drizzle-kit. La **FK circular** `projects.current_phase_id`
  ↔ `project_phases.project_id` la resuelve drizzle-kit creando las 28 tablas primero y luego las 50 FKs vía
  `ALTER TABLE ADD CONSTRAINT` (no hizo falta partir la migración manualmente).
- **Enums** como `VARCHAR + CHECK` (doc 5 §36); sólo se restringen los conjuntos definidos en doc 5/dominio/ADR;
  los abiertos (provider, action, priority, *_type libres) quedan VARCHAR sin CHECK.
- **Seed determinista** `seed.ts` (UUIDs fijos, `TRUNCATE ... RESTART IDENTITY CASCADE` → idempotente y reseteable):
  1 org, 1 user+membership, 1 area, 1 goal, 3 capabilities, 2 services (+2 service_capabilities), 2 clients, 1 contact,
  1 opportunity, 3 projects, 1 phase (+ enlazada como current_phase_id), 5 tasks, 1 deliverable, 2 decisions,
  3 knowledge items + 1 inbox, 2 assets, 2 portfolio items.
- **Tests de integración** `tests/integration/schema.test.ts` (nuevo `vitest.integration.config.ts` + script `test:integration`;
  aislados por transacción con rollback, no dejan residuos).

**Verificación (contra PostgreSQL 18 real — contenedor `control-tower-db-dev`):**
- `drizzle-kit generate` ✅ (28 tablas, 50 FKs) · `db:migrate` sobre DB vacía ✅ (28 tablas creadas)
- **Clean-DB reproducibility (IMP-008):** migración aplicada sobre una base nueva independiente (`ct_clean_test`) → 28 tablas ✅
- **Seed** ✅ (counts correctos; FK diferida `project1.current_phase_id` poblada; **idempotente** al re-ejecutar)
- **Integración (5/5 ✅):** aislamiento por `organization_id`; `external_identities` rechaza duplicados de
  `(provider, external_type, external_id)` y permite mismo external_id con distinto provider; CHECK rechaza `task.status` inválido;
  acepta `opportunity.stage` del pipeline ADR-002.
- **CI chain** (lint · typecheck · unit · build) ✅ tras M02.

**Decisiones/hallazgos M02:**
- `projects` **no** tiene columna `health`: `At Risk` es **derivado** (ERRATA-006 lo permite; se calcula en M06/M09), no una columna almacenada.
- El helper `inValues` inyecta los valores del CHECK como **literales SQL** (no bind params `$1`): un CHECK en DDL no admite parámetros.
- Se añadieron `@ct/db` (workspace) y `drizzle-orm` como devDeps del paquete raíz para que los tests de integración (en `tests/`) resuelvan los imports.
- `postgres:18`: PGDATA en `/var/lib/postgresql/18/docker`; el volumen se monta en `/var/lib/postgresql` (fix del owner, confirmado).

---

## M03 · Auth + organization boundary (✅ completado)

Decisión de diseño: [ADR-003](./adr/ADR-003-auth-and-org-boundary.md) — Better Auth `user` = tabla de dominio `users`;
sessions/accounts/verifications propias de Better Auth; `organizations`/`organization_members` siguen siendo de dominio;
el boundary de organización y la authz por rol viven en `packages/application/auth`. Sin organization plugin.

- **Schema:** `users` adaptada (+`email_verified`, `image`, `UNIQUE(email)`); nuevo `auth.ts` con `sessions`, `accounts`, `verifications`. Migración `0001_m03_auth.sql` (aplicada incrementalmente sobre la DB ya poblada).
- **Nuevo paquete `@ct/application`** (`packages/application`): `auth/policies.ts` (roles OWNER/ADMIN/MEMBER/VIEWER, `can/requireCan`), `auth/context.ts` (`getActiveOrgContext`/`requireOrgContext` desde `organization_members`), `auth/scoped.ts` (`orgEq`/`scopedWhere`/`assertSameOrg`).
- **Better Auth en `apps/web`:** `lib/auth.ts` (drizzleAdapter, email/password, `generateId:false` → UUID de la DB), `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts`, `lib/auth-context.ts` (sesión + contexto org).
- **Protección:** `middleware.ts` (chequeo optimista de cookie, edge-safe; excluye /login, /api/auth, /api/health, estáticos), `app/login/page.tsx` (sign in/up), `app/page.tsx` protegida (server component) + `components/sign-out-button.tsx`.
- **Build robusto:** `getDb()` usa una URL placeholder cuando `NEXT_PHASE=phase-production-build` → `next build` no necesita `DATABASE_URL` (no conecta); en runtime falla claro si falta.
- **Drizzle bump:** Better Auth 1.6 pide `drizzle-orm@^0.45`; subido a `^0.45.2` + `drizzle-kit@^0.31.4` en todo el workspace. `generate` no detecta drift (migraciones existentes intactas).

**Verificación:**
- typecheck (7 proyectos) ✅ · lint ✅ · unit **9/9** (env + policies) ✅ · build **sin `DATABASE_URL`** (guard NEXT_PHASE) ✅
- **Integración 9/9** ✅ (schema 5 + auth-org 4: resolución de contexto org, aislamiento scoped, `assertSameOrg` cross-org).
- **E2E auth real** (app standalone + pg18): sign-up → 200 con **id UUID** generado por la DB + cookie `better-auth.session_token`; `get-session` OK; `GET /` sin cookie → **307 → /login**, con cookie → **200**; filas `users` y `accounts` (`provider_id=credential`, hash presente) creadas.
- **Seed:** ALL_TABLES ahora incluye sessions/accounts/verifications → reset completo. Re-seed limpia y deja 1 user.

**Hallazgos/decisiones M03:**
- IDs UUID con Better Auth: `advanced.database.generateId:false` + columnas `uuid gen_random_uuid()` (verificado: el id devuelto por sign-up es un UUID).
- El middleware NO consulta la DB (edge): sólo presencia de cookie; la verificación real se hace en el server component (defensa en profundidad con `redirect('/login')`).

---

## M04 · Business module (Governance) (✅ completado)

Primera **vertical completa** (domain → application → API → UI). Estableció el patrón por capas que reusarán M05–M08.

- **Nuevo paquete `@ct/domain`** (puro, sin framework/ORM): `enums.ts` (valores canónicos — ahora fuente única),
  `transitions.ts` (máquinas de estado capability/service + `assertTransition`), `slug.ts` (`slugify`). **Refactor de dependencias:**
  `@ct/db/schema/enums.ts` ahora re-exporta desde `@ct/domain` → dirección correcta (persistencia conoce el dominio; el dominio no conoce el ORM). Sin drift de migraciones.
- **`@ct/validation`:** `governance.ts` (esquemas Zod de create/update usando enums de `@ct/domain`).
- **`@ct/application/governance`:** commands (`createStrategicArea/Goal/Capability/Service`, `updateCapabilityStatus/updateServiceStatus` con transición, `link/unlinkServiceCapability`) y queries (`list*`, `getServiceWithCapabilities`, `getBusinessOverview`). Cada uso: `requireCan(role, action)` + scope por org + `mapDbError` (23505→CONFLICT, 23503→VALIDATION, 23514→VALIDATION).
- **API `/api/v1`:** strategic-areas, goals, capabilities (+`[id]/status`), services (+`[id]`, `[id]/status`, `[id]/capabilities`). Helper `withContext` (sesión+org, mapeo de errores a HTTP, sin stack traces). Middleware ahora **excluye `/api`** → las rutas API se auto-protegen (401 JSON) en vez de redirigir.
- **UI:** componentes base (`AppShell`, `Sidebar` con nav congelada, `EntityTable`, `StatusBadge` icono+label, `EmptyState`); route group `(app)` con layout autenticado (AppShell + gate); páginas Business Overview + Services (list/detail con link de capabilities y control de estado) + Capabilities + Goals + Strategic Areas; forms cliente que postean a la API y `router.refresh()`.

**Verificación:**
- typecheck (8 proyectos) ✅ · lint ✅ · unit **14/14** (env + policies + transitions/slug) ✅ · build **23 rutas** (sin `DATABASE_URL`) ✅
- **Integración 15/15** ✅ (schema 5 + auth-org 4 + governance 6: OWNER crea/slug/scope, VIEWER 403, transición válida/ inválida, list scoped, N:M link, rechazo cross-org).
- **E2E vía HTTP (app + pg18):** unauth `POST /api/v1/services`→**401**; authed sin org→**403**; tras vincular a org→**201** (slug `e2e-diseno-web`); IDEA→DESIGNING→**200**; DESIGNING→ACTIVE→**400 INVALID_TRANSITION**; página `/business/services` authed→**200**; `/` sin cookie→**307 /login**.

**Decisiones/patrón M04:**
- **Dirección de dependencias** fijada: `@ct/domain` (puro) ← `@ct/db` ← `@ct/application` ← `apps/web`; `@ct/validation` ← `@ct/domain`.
- **Patrón de uso de caso:** `(db, ctx, input) → row`; autoriza, valida (Zod), aplica dominio, persiste scoped. Lecturas de UI van directas a las queries de aplicación (server components); escrituras vía API.
- **Audit/change events aún NO** (se cablean en M16, como en el roadmap). `priority` no está enumerado en doc 5 → convención LOW/MEDIUM/HIGH/URGENT en `@ct/domain`.

---

## M05 · CRM (✅ completado)

Reusó el patrón de M04 (domain → validation → application → API → UI).

- **Domain:** en `transitions.ts` — `assertOpportunityStageTransition` (pipeline flexible tipo Kanban: entre estados abiertos libre, cierre a WON/LOST, terminales no reabren) + `deriveOpportunityStatus` (stage→OPEN/WON/LOST) + `isOpportunityStageTerminal`. Tests unitarios añadidos.
- **Validation:** `crm.ts` (createClient/Contact/Opportunity + updateOpportunityStage; contact exige al menos nombre/apellido/email).
- **Application `crm/`:** commands (`createClient` con slug, `createContact`, `createOpportunity` con status derivado + closed_at, `changeOpportunityStage`) — validan pertenencia a la org de client/contact relacionados (`assertBelongs`). queries (`listClients/Contacts/Opportunities`, `getClientDetail` con contacts+opportunities).
- **API `/api/v1`:** clients (+`[id]`), contacts, opportunities (+`[id]/stage`).
- **UI:** base `Tabs`; sidebar CRM habilitado; CRM overview; Clients (list + detail con **Tabs** Overview/Contacts/Opportunities reales + Projects/Documents/Activity placeholder de M06/M07/M16); Contacts list; **Opportunities Kanban** (8 stages agrupados en 5 columnas Lead/Qualified/Proposal/Won/Lost, cada card con control de stage — sin drag&drop en MVP).

**Verificación:**
- typecheck (8) ✅ · lint ✅ · unit **17/17** (+opportunity) ✅ · build **33 rutas** ✅
- Integración **20/20** ✅ (crm 5: relaciones client↔contact↔opp, WON deriva status+closed_at, no reabrir cerrada, rechazo cross-org, list scoped).
- **E2E HTTP:** client (slug `acme-corp` de "Acme Córp") · contact 201 · opportunity OPEN · →WON (status derivado WON) · reabrir→**400 INVALID_TRANSITION** · detail relaciona contact+opp · páginas /crm, /crm/clients/[id], /crm/opportunities → **200**.

**Notas M05:**
- Kanban sin drag&drop (no hay lib de DnD en el stack): mover stage vía `<select>` por card. Es funcional; DnD queda como mejora futura.
- `Open in CRM` (Twenty) y las tabs Projects/Documents/Activity del client detail son placeholders hasta M12/M06/M07/M16.
- Reset de dev DB vía `pnpm --filter @ct/db seed` deja estado limpio conocido.

---

## M06 · Projects (núcleo operativo) (✅ completado)

Módulo más grande del MVP. Mismo patrón por capas.

- **Domain:** transiciones project/task/deliverable + `assert*Transition`; `deriveProjectHealth` (ON_TRACK/AT_RISK/BLOCKED, ERRATA-006 derivado, no columna), `computeProgress`, `isTaskActive`/`ACTIVE_TASK_STATUSES`. TODO→DONE permitido (checkbox de UI).
- **Validation:** `projects.ts` (project/phase/task/deliverable + status updates).
- **Application `projects/`:** commands (`createProject`, `changeProjectStatus` con **invariante "cerrado sin tasks activas"**, `createProjectPhase`, `setCurrentPhase`, `createTask` contextual, `updateTaskStatus`/`completeTask`, `createDeliverable`, `updateDeliverableStatus`); queries (`listProjects`/`getProjectDetail` con **health+progress derivados** vía conteo de tasks agrupado, `listProjectTasks`).
- **API `/api/v1`:** projects (+`[id]/status`, `[id]/tasks`, `[id]/deliverables`, `[id]/phases`), tasks/`[id]/status`, deliverables/`[id]/status`.
- **UI:** `ProgressBar`; sidebar Projects habilitado; Projects list con **tabs All/Active/At Risk/Blocked/Completed** (filtro por searchParams) + salud/progreso; Project Detail = workspace con **Tabs** (Overview con control de estado + Tasks + Deliverables reales; Decisions/Documents/Assets/Activity placeholder M07/M16).

**Verificación:**
- typecheck (8) ✅ · lint ✅ · unit **21/21** (+project transitions/health/progress) ✅ · build **42 rutas** ✅
- Integración **27/27** ✅ (projects 7: transiciones, task contextual + progreso derivado, invariante cerrar-con-activas, cerrar cuando DONE, health AT_RISK, rechazo cross-org, deliverables).
- **E2E loop operativo:** project PLANNED→ACTIVE · task contextual (projectId fijado) · cerrar con task activa→**409 PROJECT_HAS_ACTIVE_TASKS** · task→DONE · cerrar→**200 CLOSED** · **progress=100** derivado · páginas /projects, ?tab=Completed, /projects/[id] → **200**.

**Notas M06:**
- **project.type no existe** en el modelo físico → el invariante de dominio "CLIENT project requiere client" NO aplica en MVP (client opcional). No se inventó columna (IMP-002).
- El loop IMP-009 completo (Home→atención→…→Home) se cierra en **M09** (Home aún no existe); aquí se verificó la parte entidad→update.
- Bug corregido: TASK_TRANSITIONS permitía TODO→IN_PROGRESS pero no TODO→DONE; se añadió (marcar hecha directamente).

---

## M07 · Knowledge (✅ completado)

- **Domain:** transiciones knowledge_inbox / knowledge_item / decision / asset + `assert*Transition` (KNOWLEDGE_INBOX/ITEM/DECISION/ASSET_TRANSITIONS). Tipo `AssetStatus`/`KnowledgeType` añadidos.
- **Validation:** `knowledge.ts` (capture, promote, createKnowledgeItem, createDecision, createDocument, createAsset + status updates).
- **Application `knowledge/`:** `captureKnowledge` (inbox NEW), `promoteInboxToItem` (**en transacción**: crea KnowledgeItem DRAFT hereda source del inbox + marca inbox PROCESSED; rechaza si ya resuelto), `discardInboxItem`, `createKnowledgeItem`, `updateKnowledgeItemStatus` (reviewed_at/approved_at), `createDecision`/`updateDecisionStatus` (decided_at al aprobar), `supersedeDecision`, `createDocument`, `createAsset`/`updateAssetStatus`; queries (`listInbox/KnowledgeItems/Decisions/Assets`, `getDecision`, `listDocuments` filtrable por project/client).
- **API `/api/v1`:** knowledge-inbox (+`[id]/promote`, `[id]/discard`), knowledge-items (+`[id]/status`), decisions (+`[id]/status`), assets (+`[id]/status`), documents.
- **UI:** base `ExternalSourceLink`; sidebar Knowledge habilitado; Knowledge overview; Inbox (capture + tabla con acciones Review/Discard inline); Library; Decisions (list + create + status); Assets. **Rellenadas las tabs placeholder:** Project Detail → Decisions (project-scoped) + Documents reales; Client Detail → Documents reales. (Assets no tienen FK a project en el modelo físico → la tab Assets del proyecto remite a Knowledge → Assets.)

**Verificación:**
- typecheck (8) ✅ · lint ✅ · unit **21/21** ✅ · build **57 rutas** ✅
- Integración **35/35** ✅ (knowledge 8: capture→promote→PROCESSED, no promover resuelto, item lifecycle + timestamps, decision approve/supersede + transición inválida, asset lifecycle, document scoped, rechazo cross-org, list scoped).
- **E2E HTTP:** capture NEW → promote → item DRAFT → inbox **PROCESSED** → REVIEW→APPROVED · decision REVIEW→APPROVED→**SUPERSEDED** · nueva decision DRAFT→APPROVED → **400 INVALID_TRANSITION** · asset/document **201** · 5 páginas de Knowledge → **200**.

**Notas M07:**
- **decisions no tiene columna de enlace supersede** en el modelo físico → "supersede" en MVP es sólo el estado SUPERSEDED, no el vínculo "superseded_by" (no se inventó columna, IMP-002). El wireframe "supersedes/superseded by" queda para un futuro ADR+migración.
- **assets no tiene project_id** → no hay enlace directo proyecto→asset en MVP (assets son de organización).
- `promoteInboxToItem` usa transacción (savepoint cuando se llama dentro de otra tx en tests).

---

## M08 · Portfolio (✅ completado)

Módulo pequeño (catálogo, no CMS). Esquema ya migrado en M02 (ADR-001).

- **Domain:** `PORTFOLIO_ITEM_TRANSITIONS` + `assertPortfolioItemTransition` (NOT_ELIGIBLE→CANDIDATE→IN_PREPARATION→PUBLISHED→ARCHIVED).
- **Validation:** `portfolio.ts` (create + updateStatus + updateVisibility; `PORTFOLIO_ITEM_TYPE` Project/CaseStudy/Demo/Template/Product/Experiment).
- **Application `portfolio/`:** `createPortfolioItem` (assertBelongs project/asset a la org), `updatePortfolioItemStatus` (transición), `updatePortfolioItemVisibility`, `listPortfolioItems`, `getPortfolioItem`.
- **API `/api/v1/portfolio-items`** (+`[id]/status`, `[id]/visibility`).
- **UI:** Portfolio List + Detail (controles de estado y visibilidad, `ExternalSourceLink`). Punto de entrada: tarjeta **Portfolio** en la overview de Knowledge (ver hallazgo B-5: no es ítem de sidebar).

**Verificación:**
- typecheck (8) ✅ · lint ✅ · unit **21/21** ✅ · build **62 rutas** ✅
- Integración **40/40** ✅ (portfolio 5: defaults, máquina de estados, visibilidad, rechazo cross-org, list scoped).
- **E2E HTTP:** create CANDIDATE/INTERNAL → IN_PREPARATION → PUBLISHED · PUBLISHED→CANDIDATE → **400 INVALID_TRANSITION** · visibility→PUBLISHABLE · páginas /portfolio, /portfolio/[id], /knowledge → **200**.

**Nota M08 (→ FINDINGS B-5):** Portfolio no es módulo top-level (la IA congela 7 ítems); se ubica bajo Knowledge respetando ERRATA-003 (pantallas) + IA (nav).

---

## M09 · Home / Control Tower (✅ completado)

Proyección: **sin entidades ni migraciones nuevas**; todo derivado y con enlace a la fuente (doc 3 §3A.3 Context Service).

- **Application `context/home.ts`:** `getHomeDashboard` — en paralelo: snapshot (clients, active projects, open opps, open tasks, decisions), attention items (proyectos AT_RISK, tareas vencidas/hoy, deliverables en REVIEW, inbox pendiente, decisiones en REVIEW), active projects (con progress/health), today's work (tasks activas con dueDate ≤ hoy), recent decisions, inbox pending, system health (DB + jobs/outbox/integrations counts). Reusa `listProjects` (health derivado).
- **API:** `GET /api/v1/context/home` (base para el futuro agente; la UI usa la misma query server-side).
- **UI:** `MetricCard`; Home reescrita como dashboard — Executive Snapshot, ⚠ Attention Required (severidad, enlaces), Active Projects (ProgressBar), Today's Work, Recent Decisions + Knowledge Inbox, System Health compacto. Cada item enlaza a su entidad fuente (≤2 clics).

**Verificación:**
- typecheck (8) ✅ · lint ✅ · unit **21/21** ✅ · build **63 rutas** ✅
- Integración **44/44** ✅ (home 4: agregación derivada, attention con href a la fuente, today's work vencidas, aislamiento por org).
- **E2E (loop IMP-009 cerrado):** Home **200**; snapshot refleja el seed; attention `inbox_pending`; crear tarea vencida → aparece en Today's Work → completar (200) → **desaparece** del dashboard. `context/home` devuelve la proyección.

**Notas M09 (→ FINDINGS):** "Recent Activity" completa (change_events/audit) y la pantalla System Health completa llegan en **M16**; aquí System Health es compacto (DB + counts, con jobs/outbox de M11 e integraciones de M12 aún en 0). "Upcoming milestones" no se muestra por ahora (ERRATA-005: usaría `projects.target_date`; se añadirá si se pide).

---

## M10 · Global Search (✅ completado)

PostgreSQL FTS real (doc 5 §41), sin vector/RAG (ERRATA-011).

- **Schema/migración `0002_m10_search`:** columnas generadas `search_vector tsvector STORED` (`to_tsvector('simple', …)`) + **índice GIN** en las 11 tablas buscables (clients, contacts, opportunities, projects, tasks, decisions, knowledge_items, assets, services, capabilities, portfolio_items). Helpers `tsvector`/`searchVector(...cols)` en `_shared.ts`.
- **Application `search/`:** `globalSearch(db, ctx, q)` — por cada entidad, `search_vector @@ websearch_to_tsquery('simple', q)` OR ILIKE (subcadena), orden por `ts_rank`, límite 5/tipo, agrupado por tipo, aislado por org. Href por hit.
- **API:** `GET /api/v1/search?q=`.
- **UI:** `GlobalSearch` (⌘K/Ctrl+K) — command palette con debounce, resultados agrupados por entidad, navegación al pulsar. Montado en el header del AppShell.

**Verificación:**
- typecheck (8) ✅ · lint ✅ · unit **21/21** ✅ · build **64 rutas** ✅
- **Clean-DB reproducibility:** DB nueva → 31 tablas + **11 GIN search idx** ✅
- Integración **49/49** ✅ (search 5: FTS palabra completa agrupado, fallback ILIKE, búsqueda en cuerpo de decisión, aislamiento org, query vacía).
- **E2E HTTP:** `acme` → client + opportunity; `web` → capability/opportunity/portfolio/project/service; query vacía → total 0.

**Nota M10 (→ FINDINGS D-6):** config `'simple'` sin stemming (mitigado con ILIKE); mejorar a `'spanish'`/`unaccent` si se quiere stemming/acentos.

---

## M11 · Automation infrastructure (Outbox + Jobs + Worker) (✅ completado)

Tablas ya existían (M02); aquí la mecánica real del worker.

- **Application `jobs/`:** `enqueueJob`, `claimNextJob` (transaccional, **`FOR UPDATE SKIP LOCKED`**), `completeJob`, `failJob` (retryable→PENDING con **backoff exponencial** 2^attempts tope 5min; agota→FAILED), `processNextJob` (registry de handlers), `jobStatusCounts`/`listRecentJobs`. Contrato IMP-007: PENDING/PROCESSING/COMPLETED/FAILED con timestamps+error.
- **Application `outbox/`:** `emitOutbox` (inserta el evento en la **misma transacción** del cambio de dominio), `dispatchOutboxOnce` (claim batch SKIP LOCKED → handlers → PROCESSED/retry/FAILED), `outboxStatusCounts`. Nuevo tipo `DbOrTx` en `@ct/db`.
- **Wiring:** `changeProjectStatus` ahora emite `project.status_changed` atómicamente (demostración; ver FINDINGS C-4).
- **Worker (`apps/worker`):** loop cada 2s → `dispatchOutboxOnce` + drena jobs (hasta 25/tick); registries (`demo.echo`, outbox `*` logger); apagado ordenado.
- **UI:** sidebar Automation habilitado; página `/automation` con estado de jobs (por estado), outbox (por estado) y jobs recientes.

**Verificación:**
- typecheck (8) ✅ · lint ✅ · unit **21/21** ✅ · build **65 rutas** ✅
- Integración **55/55** ✅ (automation 6: job→COMPLETED, retry→backoff→FAILED, sin handler falla controlado, idle, outbox transaccional emit+dispatch→PROCESSED, emit dentro de tx).
- **E2E worker real (proceso tsx):** job `demo.echo` PENDING→**COMPLETED** y outbox PENDING→**PROCESSED** tras arrancar el worker.

**Notas M11 (→ FINDINGS C-4/C-5):** outbox emitido sólo en `changeProjectStatus` por ahora (se extiende en M12+/M16); `/automation` es sólo lectura de estado — sin constructor de automatizaciones (ERRATA-009, por diseño).

---

## M12 · Twenty adapter (✅ completado — verificado con fixtures; pull real pendiente de creds)

- **Nuevo paquete `@ct/integrations` (puro):** `IntegrationAdapter` (healthCheck/pull), DTOs normalizados; Twenty:
  `TwentyDataSource` (interfaz inyectable) + `HttpTwentyDataSource` (REST, apunta al Twenty self-hosted), `mapper`
  (company/person/opportunity + `mapTwentyStage`→ADR-002, extracción defensiva), `TwentyAdapter`. No importa DB (ERRATA-010).
- **Application `integrations/`:** `resolveInternalId`/`upsertIdentity` (idempotencia vía `external_identities`),
  **`syncTwenty`** (pull → por cada company/person/opp: si existe identidad → actualiza proyección, si no → createClient/
  Contact/Opportunity + upsert identidad; enlaza person/opp a client vía identidad), `listIntegrations`/`connectIntegration`/`setIntegrationHealth`.
- **Worker:** job handler `integration.twenty.sync` (construye el adapter desde `TWENTY_API_URL`/`TWENTY_API_KEY` en env, llama `syncTwenty`).
- **API:** `/api/v1/integrations` (GET/POST connect), `/api/v1/integrations/[id]/sync` (POST → encola job, 202).
- **UI:** `/automation/integrations` (lista con estado/health, "Conectar Twenty", "Sync now"); enlace desde `/automation`.

**Verificación:**
- typecheck (9) ✅ · lint ✅ · unit **25/25** (+mapper 4) ✅ · build **68 rutas** ✅
- Integración **58/58** ✅ (twenty-sync 3 con **DataSource fixture**: 1ª ejecución crea entidades+identidades y enlaza opp→client; **re-ejecución idempotente** (0 created, 2 updated, sin duplicados, proyección actualizada, 4 identidades); aislamiento por org).
- **E2E HTTP:** connect Twenty → CONFIGURED · sync now → **202** encola `integration.twenty.sync` (PENDING) · páginas 200.
- **Pendiente (con tu Twenty):** setear `TWENTY_API_URL`/`TWENTY_API_KEY`, levantar el contenedor, arrancar el worker → pull real. El wiring y la idempotencia ya están probados con fixtures.

**Notas M12 (→ FINDINGS A-7):** `external_identities` tiene UNIQUE global (sin `organization_id`) → colisión multi-org; irrelevante en MVP single-org, registrar para multi-org.

---

## M13 · Notion adapter (✅ completado — fixtures; pull real pendiente de creds)

- **`@ct/integrations/notion`:** `NotionDataSource` (inyectable) + `HttpNotionDataSource` (API Notion `/v1/search`), `mapNotionPage` (extrae título de la propiedad `title` + url, defensivo), `NotionAdapter` (nueva interfaz `KnowledgeSourceAdapter`: pull de `NormalizedKnowledgeRef`).
- **Application `syncNotion`:** cada página → `knowledge_item` con `source_type=NOTION` + `source_url` (**referencia, NO contenido** — ERRATA-010/014); idempotente vía `external_identities` (NOTION/page→knowledge_item).
- **Worker:** handler `integration.notion.sync` (adapter desde `NOTION_API_KEY`). **API/UI:** se reutiliza la ruta genérica `/api/v1/integrations/[id]/sync` (deriva el jobType del provider) + Notion añadido a los providers conocidos de `/automation/integrations`.

**Verificación:**
- typecheck (9) ✅ · lint ✅ · unit **27/27** (+notion mapper 2) ✅ · build **68 rutas** ✅
- Integración **60/60** ✅ (notion-sync 2: crea knowledge_items referencia con `content` NULL; **re-ejecución idempotente** actualiza título sin duplicar).
- **E2E HTTP:** connect Notion → CONFIGURED · sync now → **202** encola `integration.notion.sync` (PENDING).
- **Pendiente (con tu Notion):** setear `NOTION_API_KEY` + arrancar worker → pull real.

---

## M14 · Git adapter (✅ completado — fixtures; pull real pendiente de creds)

- **`@ct/integrations/git`:** `GitDataSource` (inyectable) + `HttpGitHubDataSource` (REST GitHub `/user/repos` o `/users/{owner}/repos`), `mapRepo` (id/name/description/url/repositoryUrl defensivo), `GitAdapter` (`CodeSourceAdapter`).
- **Application `syncGit`:** cada repo → `asset` (`asset_type=REPOSITORY`, status ACTIVE, external_url + repository_url); código canónico en Git, CT guarda referencia. Idempotente vía `external_identities` (GITHUB/repository→asset).
- **Worker:** handler `integration.github.sync` (`GITHUB_TOKEN` + opcional `GITHUB_OWNER`). Reutiliza la ruta genérica de sync; GitHub añadido a providers de `/automation/integrations`.

**Verificación:**
- typecheck (9) ✅ · lint ✅ · unit **29/29** (+git mapper 2) ✅ · build **68 rutas** ✅
- Integración **62/62** ✅ (git-sync 2: crea assets REPOSITORY con URLs; re-ejecución idempotente actualiza sin duplicar).
- **E2E HTTP:** connect GitHub → CONFIGURED · sync now → **202** encola `integration.github.sync`.
- **Pendiente (con tu GitHub):** `GITHUB_TOKEN`/`GITHUB_OWNER` + arrancar worker → pull real.

---

## M15 · Google Drive adapter (✅ completado — fixtures; pull real pendiente de creds)

- **`@ct/integrations/drive`:** `DriveDataSource` (inyectable) + `HttpDriveDataSource` (Drive v3 `files.list`), `mapDriveFile` (id/name/mimeType/webViewLink, defensivo), `DriveAdapter` (`DocumentSourceAdapter`).
- **Application `syncDrive`:** cada archivo → `document` (`external_provider=GDRIVE`, `external_url` + `mime_type`) — **metadata/referencia, sin file store** (doc 4 §30 / ERRATA-014). Idempotente vía `external_identities` (GDRIVE/file→document). `Open external` ya renderiza el enlace (M07).
- **Worker:** handler `integration.gdrive.sync` (`GOOGLE_DRIVE_TOKEN`). Reutiliza la ruta genérica; Google Drive añadido a providers de `/automation/integrations`.

**Verificación:**
- typecheck (9) ✅ · lint ✅ · unit **31/31** (+drive mapper 2) ✅ · build **68 rutas** ✅
- Integración **64/64** ✅ (drive-sync 2: crea documents referencia con external_provider GDRIVE; re-ejecución idempotente actualiza sin duplicar).
- **E2E HTTP:** connect Google Drive → CONFIGURED · sync now → **202** encola `integration.gdrive.sync`.
- **Pendiente (con tu Drive):** `GOOGLE_DRIVE_TOKEN` (OAuth) + arrancar worker → pull real.

**Framework de integraciones COMPLETO (M12–M15):** Twenty (CRM→clients/contacts/opps), Notion (páginas→knowledge_items),
GitHub (repos→assets), Google Drive (archivos→documents). Mismo patrón: DataSource inyectable + mapper defensivo +
adapter + syncX idempotente vía `external_identities`. Todos verificados con fixtures; el pull real sólo necesita creds + worker.

---

## M16 · Audit + System Health (✅ completado)

- **Application `audit/`:** `recordAudit` (quién hizo qué) + `recordChangeEvent` (diff estado, previous→new) — append-only, usables dentro de tx (`DbOrTx`); actor derivado del ctx (UUID→USER, si no →SYSTEM para jobs). `listEntityActivity` (timeline unificado audit+change por entidad), `listRecentAudit`. `context/system-health.ts` `getSystemHealth` (DB+latencia, jobs/outbox por estado, integraciones, worker heartbeat proxy, errores recientes).
- **Cableado (doc 5 §30):** createProject/changeProjectStatus (change_event STATUS + audit), createTask/updateTaskStatus (COMPLETE), createClient, changeOpportunityStage (change_event STAGE), captureKnowledge (CAPTURE), createDecision/updateDecisionStatus (APPROVE), connectIntegration (CONNECT). Cobertura parcial (→ FINDINGS C-1).
- **UI:** `ActivityTimeline`; tabs **Activity** reales en Project Detail y Client Detail; **Home Recent Activity**; página `/automation/health` (System Health completa) enlazada desde `/automation`.

**Verificación:**
- typecheck (9) ✅ · lint ✅ · unit **31/31** ✅ · build **69 rutas** ✅
- Integración **69/69** ✅ (audit 5: CREATE con actor USER, change_event from→to + timeline, COMPLETE/APPROVE, aislamiento org, getSystemHealth).
- **E2E HTTP:** crear proyecto + cambiar estado → `audit_logs`=CREATE,UPDATE · `change_events`=STATUS PLANNED→ACTIVE · Home Recent Activity presente · páginas /, /projects/[id] (tab Activity), /automation/health → **200**.

**Notas M16:** audit/change-events cableado en las **acciones clave** (no todos los commands aún; patrón listo para extender — FINDINGS C-1). Outbox sigue en `changeProjectStatus` (FINDINGS C-4). AuditLog ≠ ChangeEvent (ERRATA-013, no se fusionan).

---

## M17 · Security + testing hardening (✅ completado)

**Seguridad (código real, doc old_9 §26 / doc 4 §34):**
- **CSRF**: `withContext` rechaza mutaciones de navegador con `Origin` ≠ `Host` (403); peticiones sin Origin (curl/API) permitidas.
- **Rate limiting**: limiter en memoria por IP en `/api/v1` (429) + `rateLimit` de Better Auth en los endpoints de auth (30/min).
- **Cabeceras de seguridad** en `next.config` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) + `poweredByHeader:false`.
- **Cookies**: `useSecureCookies` en producción; `minPasswordLength:8`.
- **`docs/SECURITY.md`**: checklist del baseline (auth, authz, API, cabeceras, secretos, auditoría, infra).

**Testing:**
- **Playwright** (`playwright.config.ts` + `tests/e2e/critical-journeys.spec.ts`): artefacto de UI para los journeys (requiere `playwright install chromium`; no corrió aquí por falta de navegadores → FINDINGS D-7).
- **`scripts/e2e-journeys.sh`**: e2e HTTP runnable de los 5 journeys críticos (old_9 §25) — ejecutado y verde.

**Verificación:**
- typecheck (9) ✅ · lint ✅ · unit **31/31** ✅ · build **69 rutas** ✅ · integración **69/69** ✅
- **E2E journeys (HTTP, ✅ todos):** J1 login→Home · J2 Client→Project→Task→completar (progress=100) · J3 Capture→Review→Approve · J4 Decision Draft→Review→Approved · J5 Portfolio Item→Link Project.
- **Hardening (✅):** Origin ajeno → **403** · sin sesión → **401** · cabecera `x-content-type-options: nosniff` presente.

---

## M18 · Deployment (Raspberry Pi / self-hosted) (✅ completado)

- **Backups + restauración** (old_9 §28): `scripts/backup.sh` (pg_dump comprimido + rotación) y `scripts/restore.sh`
  (restaura a una base nueva por defecto, sin tocar prod). **Drill ejecutado y verde:** backup del dev DB (seed) → restore
  a base fresca → **31 tablas + datos** (clients=2) intactos. `backups/` gitignored.
- **`docs/DEPLOYMENT.md`**: runbook completo (gate IMP-010, primer deploy, bootstrap de org, backups/cron, DR, updates, observabilidad).
- **Prod compose validado** (`docker compose config`): db (postgres:18, volumen `/var/lib/postgresql`, restart), web
  (healthcheck 127.0.0.1:3000/api/health — funciona por el fix HOSTNAME, puerto 4272, restart), worker (restart). Ruta Caddy lista.
- **ARM64**: node:24-slim, postgres:18, caddy son multi-arch oficiales; el dominio es portable Pi→VPS→cloud (doc 4 §29).

**Verificación:**
- typecheck (9) ✅ · lint ✅ · unit **31/31** ✅ · build **69 rutas** ✅ · integración **69/69** ✅ · e2e journeys **5/5** ✅
- **Backup→restore**: 31 tablas + datos verificados tras el round-trip.
- **Pendiente (en tu Pi):** `docker compose up` real (build ARM + registry) siguiendo `DEPLOYMENT.md`; requiere red al registry (limitada en este entorno).

---

## Fix post-M18 · Registro en Docker (secret + cookies + org)

Primer arranque real en Docker: el registro daba "error de autenticación". Causas y arreglos:
- **`BETTER_AUTH_SECRET` vacío** en `compose.yml` → Better Auth lanzaba `BetterAuthError: default secret`. Fix: seteado en el compose dev (`BETTER_AUTH_URL` también); en prod va en `.env`.
- **Cookies `Secure` sobre http://localhost** (`useSecureCookies` según NODE_ENV=production) → sesión se descartaba. Fix: `useSecureCookies` según **HTTPS del baseURL**, no según NODE_ENV.
- **Usuario nuevo sin organización** (el seed `owner@example.com` no tiene contraseña). Fix: hook `databaseHooks.user.create.after` → `ensureUserOrganization` (une a la primera org como OWNER, o crea una); `getCurrentContext` auto-heal; `getActiveOrgContext` ordena por `created_at` (determinista).
- **Verificado:** registro fresco (sin SQL) → OWNER en org `noboolsheet` → `GET /` 200 → Home con datos del seed. typecheck/lint/build/journeys(5/5) verdes.
- **Nota de seguridad (→ FINDINGS B-6):** registro abierto → OWNER por defecto; cerrar antes de exponer público.

# 🎉 MVP COMPLETO (M01–M18)

**Criterio de salida (old_9 §35):** la dueña puede responder desde Control Tower sin reconstruir info a mano —
qué trabajo hoy (Home/Today's Work), proyectos activos/en riesgo (Projects + health derivado), clientes (CRM),
oportunidades abiertas (Kanban), servicios/capabilities (Business), decisiones (Knowledge), conocimiento pendiente
(Inbox), assets reutilizables, portfolio, y salud de integraciones/automatizaciones (Automation/System Health).

**Arquitectura entregada:** monorepo pnpm con 6 packages (`domain` puro → `db`/`validation` → `application` → `integrations`)
+ 2 apps (`web` Next.js, `worker`). 30 tablas (28 MVP + 3 auth − solapes), 3 migraciones, FTS con GIN, Transactional Outbox,
jobs con SKIP LOCKED, Better Auth, 4 adapters de integración idempotentes, audit/change-events, dashboard derivado, búsqueda global.

**Estado de pruebas:** unit 31, integración 69 (contra PostgreSQL real), e2e HTTP de los 5 journeys + hardening. Cada
milestone verificado y commiteado. Documentación viva en `docs/` (roadmap, build log, decisiones, ADRs 1–3, findings, security, deployment).

**Lo que necesita tus credenciales/infra para “encenderse” del todo:** pull real de Twenty/Notion/GitHub/Drive (creds + worker),
y el `docker compose up` de producción en la Pi (ver `DEPLOYMENT.md`). Todo lo demás está construido y verificado.

**Backlog para evaluar:** ver `FINDINGS_AND_DEFERRED.md` (gaps de modelo físico, cobertura de audit, DnD, multi-org, stemming, etc.).

---

## Fase 1 (post-MVP) · Detalle + edición inline de todas las entidades de lista

Tras el primer uso real, la dueña pidió **ver el detalle/descripción de todos los items que hoy solo viven en listas**
y **poder editarlos**, sin tocar credenciales ni pull externo. Plan aprobado: patrón reutilizable
`DescriptionList` + `InlineEditSection` (edición inline por secciones: botón *Editar* → formulario → `PATCH` →
`router.refresh()`), nivel "ficha + edición + fuente".

**Patrón aplicado por entidad** (una vez por cada una): `getX(db,ctx,id)` + `updateX(db,ctx,id,input)` en application
(scoped por org, `requireCan('write')`, `recordAudit` UPDATE) · `updateXSchema` en validation (campos `optional/nullish`) ·
ruta `GET`+`PATCH` en `api/v1/<x>/[id]/route.ts` (`withContext`) · página `<x>/[id]/page.tsx` (ficha editable + meta +
"Fuente de verdad" + timeline de actividad) · título de la lista convertido en enlace al detalle.

Entidades cubiertas:
- **Knowledge:** Decision (context/decision/rationale editables; form de creación enriquecido con context+rationale),
  Knowledge Item (título/tipo/summary/content/sourceUrl + "Abrir fuente"), Asset (nombre/tipo/versión/URLs + "Abrir fuente").
- **CRM:** Contact (nombre/email/teléfono/cargo/notas; meta con enlace a cliente), Opportunity (nombre/valor/moneda/cierre/
  origen/notas; stage vía control; enlaces a cliente y contacto).
- **Business:** Capability (nombre/desc/madurez/notas; estado vía control), Goal (nombre/desc/estado/prioridad/targetDate;
  enlace a área), Strategic Area (nombre/desc/estado/orden; **lista de sus Goals** con enlaces).
- **Projects:** Task (título/desc/prioridad/dueDate; estado vía control; enlace a proyecto), Deliverable (nombre/desc/dueDate/
  externalUrl + "Abrir fuente"). Además el **form de crear tarea** ahora captura descripción y fecha límite.

Notas de implementación:
- `updateOpportunity`/`updateTask`/`updateDeliverable` no hacen spread ciego: `estimatedValue`→`toFixed(2)` (numeric),
  fechas→`toISOString().slice(0,10)` (columnas date).
- Edición de **relaciones por nombre** (reasignar cliente de un contacto, área de un goal, cliente/contacto de una
  oportunidad) queda como lectura con enlace; el selector por nombre→id se aborda en Fase 5 (E-7 avanzada).

**Verificación:** typecheck (8 paquetes) ✓ · lint ✓ · unit 31 ✓ · build web ✓ · e2e HTTP `scripts/e2e-journeys.sh`
ampliado con **J6 (detalle+edición: PATCH persiste en decision/task/contact/capability; id inexistente → 404)** → 8/8 ✓.

---

## Fase 2 (post-MVP) · "Fuente de verdad" visible en todas partes

Objetivo: que la **procedencia** de cada dato (nativo de Control Tower vs sincronizado/enlazado de un
proveedor externo) se vea sin abrir el detalle, en todas las listas relevantes.

- **Componente `components/ui/source-badge.tsx`**: distingue nativo (`⌂ Control Tower`, tono neutro) de externo
  (`Twenty CRM`/`Notion`/`GitHub`/`Google Drive`, tono índigo + glifo), y adjunta "Open external" (reusa
  `ExternalSourceLink`) cuando hay URL. Nunca depende sólo del color (icono + etiqueta + `title`).
- **Listas con columna *Fuente***: Knowledge Library (sourceType + sourceUrl), Assets (nativo + externalUrl/repo),
  Portfolio (nativo + externalUrl), Clients (nativo, o proveedor si hay identidad externa).
- **Detalles**: Client (badge en cabecera + Overview con "Open in CRM" real/condicional), Knowledge Item y Asset
  (fila "Fuente de verdad" unificada), Documents (tab de Project y de Client) con proveedor + enlace.
- **"Open in CRM" real y sin pull** (`getIdentityForInternal`): si existe una `external_identity` de Twenty para el
  cliente, el detalle muestra proveedor + id externo y, si `metadata.url` está guardada, un enlace "Open in CRM";
  si no, un texto claro ("configura la URL de Twenty…"). Sin identidad → "Cliente nativo de Control Tower".
- **Sin N+1 en listas**: `listIdentitiesByInternalType(db,ctx,'client')` trae todas las identidades del tipo en una
  query y se cruza en memoria (Map internalId→provider).

**Verificación:** typecheck/lint/build ✓ · e2e ampliado con **J7** (páginas con Fuente renderizan 200; cliente sin
identidad externa → "nativo de Control Tower") → 9/9 ✓.

---

## Fase 3 (post-MVP) · Settings

Módulo de ajustes, habilitado en el sidebar (antes deshabilitado con "pronto").

- **Migración 0003 (aditiva)** `0003_m19_org_settings.sql`: `organizations.settings jsonb` (nullable, sin backfill; no toca
  el modelo congelado). Guarda `{ timezone, defaultCurrency }`. Timezone se usará en Fase 4 (Today's Work).
- **Application** (`packages/application/src/organization/`): `getOrganization(db,ctx)` (org activa + settings tipados) y
  `updateOrganization(db,ctx,input)` (sólo OWNER vía `requireCan('manage_org')`; fusiona timezone/currency en `settings`
  preservando otras claves; `recordAudit` UPDATE). **Validation** `updateOrganizationSchema` + tipo `OrganizationSettings`.
- **API** `GET/PATCH /api/v1/organization`.
- **UI** `/settings/page.tsx`:
  - **Organización** (editable con `InlineEditSection`, `canEdit` = OWNER): nombre, zona horaria (select IANA curado),
    moneda por defecto (select). Los no-OWNER ven la ficha en lectura con nota.
  - **Perfil** (lectura): nombre, email, rol, slug de la organización.
  - **Integraciones**: enlace a `/automation/integrations`.
  - **Seguridad**: aviso visible de que el **registro está abierto** (→ OWNER) y hay que cerrarlo antes de exponer público (B-6).

**Verificación:** typecheck/lint/build ✓ · migración aplicada y verificada en dev DB (columna `settings` presente) ·
e2e ampliado con **J8** (GET org; PATCH nombre+timezone+moneda persiste en settings/DB; `/settings` 200) → 10/10 ✓.

---

## Fase 4 (post-MVP) · Today's Work + vista global de tareas + retención

Decisiones del owner: la vista principal NO debe mostrar vencidas ni completadas; las vencidas necesitan
**reprogramación de fecha**; y una **configuración de retención** para las completadas (conservar / borrar cada N
días / conservar en logs). Confirmado además: las tareas tienen estados (TODO/IN_PROGRESS/BLOCKED/DONE/CANCELLED)
y `project_id` es opcional (ver F-8).

- **Dominio** `scheduling.ts` (+test): `taskDateBucket`/`taskBoardBucket` (OVERDUE→BLOCKED→fecha; fechas ISO comparadas
  lexicográficamente) y `priorityRank`.
- **Home** (`context/home.ts`): "Today's Work" ahora es `dueDate == hoy` (antes `≤ hoy`), calculado en la **zona horaria de la
  organización**; nuevo contador de **vencidas** que NO se listan, sólo generan un aviso (severidad alta) con enlace a `/tasks`.
- **Vista global `/tasks`**: `listActiveTasks` (join a proyecto para el nombre) → buckets Vencidas/Hoy/Esta semana/Próximas/
  Bloqueadas/Sin fecha; orden prioridad→fecha; cada fila con estado editable y **reprogramación rápida** (`TaskDueDateControl`,
  PATCH `dueDate`). Enlace "Ver todas las tareas" desde Projects. Muestra "Sin proyecto" cuando falta (F-8).
- **Retención de completadas**: `organizations.settings.completedTaskRetentionDays` (null/0 = conservar siempre). Command
  `purgeCompletedTasks` (borra DONE con `completed_at` < cutoff; **audita cada DELETE** → queda en logs; **no borra tareas
  padre** para no romper la self-FK). `runRetentionSweep` recorre orgs con política y purga; el **worker** lo ejecuta ~cada hora.
  API `POST /api/v1/maintenance/purge-completed-tasks` + botón "Purgar ahora" en Settings. Selector de política en Settings.

**Verificación:** typecheck/lint/build/worker ✓ · unit 36 (incl. scheduling) ✓ · e2e **J9** (crear vencida → aviso en Home →
`/tasks` muestra "Vencidas" → reprogramar persiste → política 30d + DONE de 60d → purga borra 1 y queda en audit_log) → 13/13 ✓.

---

## Fase 5 (post-MVP) · Profundidad de Business + cross-refs (última del plan)

Cierra el plan de mejoras. Además desbloquea el patrón "selector por nombre→id" (F-6) reutilizable.

- **`InlineEditSection` con opciones etiquetadas**: `options` ahora acepta `{ value, label }` además de `string[]`, para
  selects **nombre→id** en la edición inline. Base reutilizable para editar relaciones.
- **Área↔Goal navegable en ambos sentidos**: el detalle de Strategic Area ya listaba sus Goals (Fase 1); ahora el **form de
  crear Goal** y el **detalle de Goal** tienen selector de Área; la **lista de Goals** muestra su Área (enlace). `createGoal`
  valida que el área pertenece a la org (paridad con `updateGoal`).
- **CRM (extensión F-6)**: Contact→Cliente y Opportunity→Cliente/Contacto ahora **editables** desde el detalle (los commands ya
  validaban pertenencia). Las filas de "ver" pasan a etiqueta "Ver …" para no duplicar con el campo editable.
- **Client → tab Projects (B-3)**: `listProjects(db, ctx, { clientId })`; la pestaña Projects del cliente lista sus proyectos
  (estado + progreso + enlace) y muestra el contador en la etiqueta.

**Verificación:** typecheck/lint/build ✓ · unit 36 ✓ · e2e **J10** (goal con área vía selector; reasignar área persiste; el
detalle de Área lista su goal; área inexistente→404; cliente cuenta sus proyectos) → 18/18 ✓.

---

## 🎉 Plan de mejoras post-MVP completo (Fases 1–5)

Fase 1 (detalle+edición de todo), Fase 2 (fuente de verdad visible), Fase 3 (Settings), Fase 4 (Today's Work + tareas +
retención) y Fase 5 (Business + cross-refs) entregadas y verificadas. e2e HTTP: 10 journeys (J1–J10), todos verdes.
Pendientes documentados en `FINDINGS_AND_DEFERRED.md` (los que requieren credenciales/pull o decisiones de arquitectura:
E-1 push, E-4 scoping, E-5 activos por cliente, E-6 canales de inbox, E-8 automatizaciones/scheduler; y F-1 URL de "Open in CRM").

---

## Bloque 2 · Fase 0A — Preparación para integraciones (sin credenciales)

Antes de conectar apps externas, se arreglan los gaps que ensuciaban un pull/estado limpios (todo probado con fixtures):

- **0A-1 · Env/docs**: `.env.example` corregido — `GOOGLE_DRIVE_TOKEN` (antes `GOOGLE_DRIVE_CREDENTIALS`), documentado
  `GITHUB_OWNER` y añadido `TWENTY_CRM_URL`. `docs/DEPLOYMENT.md` gana la sección "Conectar integraciones" (qué env por
  proveedor, DNS interno vs Tailscale, flujo Connect→Sync now, salud).
- **0A-2 · Salud real** (arregla código muerto): el worker envuelve cada sync en `withIntegrationHealth` → marca la fila de
  `integrations` `ACTIVE` al terminar bien y `ERROR` si falla, con `lastHealthCheckAt`. La página `/automation/integrations`
  deja de mostrar "sin check". (`apps/worker/src/index.ts`, `setIntegrationHealth`).
- **0A-3 · F-1 "Open in CRM"**: `upsertIdentity` refresca `metadata` on-conflict; los `sync-*` guardan `metadata.url` en
  `external_identities`. Twenty deriva el deep-link de `TWENTY_CRM_URL` (URL del navegador) → `/objects/<plural>/<id>`;
  Notion/GitHub/Drive guardan la URL del registro. (`identity.ts`, `sync-twenty|notion|git|drive.ts`).
- **0A-4** (validar secretos al boot): descartado — el worker lee `process.env` directo y los secretos son opcionales.

**Además** se corrigió el test de integración de Home que aún asumía el comportamiento viejo (vencidas dentro de Today's Work);
ahora verifica el de Fase 4 (sólo hoy en la lista; vencidas → aviso `tasks_overdue`).

**Verificación:** typecheck · lint · build ✓ · unit 36 ✓ · **integración 71** (2 nuevos: metadata.url con/sin `crmBaseUrl`) ✓.

---

## Bloque 2 · Fase 0B — Robustez/UX para cuando lleguen datos externos

- **0B-5 · F-2 · Fuente en CRM**: `SourceBadge` en la lista de Contacts (columna) y en las tarjetas de Opportunities, y en sus
  detalles (cabecera + fila "Fuente de verdad" + "Open in CRM" cuando hay identidad Twenty). Reusa `listIdentitiesByInternalType`
  / `getIdentityForInternal`.
- **0B-7 · C-1 · Audit en destinos de sync**: `recordAudit(CREATE)` añadido a createContact/Opportunity/KnowledgeItem/Document/
  Asset, para que lo que traigan las integraciones aparezca en la actividad (Recent Activity + timeline). `actorType=SYSTEM` para
  los syncs.
- **F-11 · Bug de sync corregido**: `created_by_user_id: ctx.userId` rompía con `ctx.userId='system'` (no-UUID) → habría roto el
  sync de Notion en prod. Fix con helper `creatorId(ctx)` (null si no es UUID). Regresión en `notion-sync.test.ts`.
- **0B-6 · F-4** (change_events por campo en `updateX`): **diferido** — mayor y genérico, no bloquea integraciones.

**Verificación:** typecheck · lint · build ✓ · unit 36 ✓ · **integración 72** (nuevo: sync como SYSTEM) ✓ · e2e 10 journeys ✓.

---

## Bloque 2 · Fase 1 — Twenty CRM (pull) — PROBADO EN VIVO ✅

Primer pull real contra el Twenty self-hosted (Tailscale `100.119.105.1:3000`), org `noboolsheet`:
- **Probe de solo lectura** (script temporal) confirmó conectividad + auth + forma REST + mapeo antes de tocar la DB.
- **Bug real encontrado y arreglado (F-12):** `domainName` sin esquema (`alondrama.com`) rompía `createClient` (`url()`); el
  primer job quedó `ERROR` (la salud se marcó → 0A-2 verificado). Fix: `toUrl()` en el mapper + test.
- **Path real verificado:** `connectIntegration` + `enqueueJob` → worker ejecuta `integration.twenty.sync` → **COMPLETED**;
  integración **ACTIVE** + `lastHealthCheckAt`. Se creó el cliente "Alondra Music Academy" (`https://alondrama.com`), su contacto
  y la oportunidad "Crear pagina web…" (LEAD, €200) enlazada. `external_identities` (3) con **`metadata.url`** para "Open in CRM".
- **Idempotencia:** re-sync no duplicó (clients 3, identities 3).
- **Cableado local:** `compose.yml` worker ahora carga `./.env` (opcional) para tener los secretos en dev.

Pendiente de verificar por el owner en la UI: que "Open in CRM" abra el registro (F-14); refinar mapeo de stage/nombre si hace
falta. Recomendado: resiliencia por-registro (F-13).

---

## Bloque 2 · Fase 1 (A/B/C) — arreglo de "Open in CRM", resiliencia y util de sync

- **A · Open in CRM (F-14)**: el deep-link usaba `/objects/<plural>/<id>` (ruta de lista) → 404. Corregido a la ruta de
  detalle de Twenty `${TWENTY_CRM_URL}/object/<singular>/<id>`. Re-sync actualizó los `metadata.url` (client/contact/opportunity).
- **B · Resiliencia por-registro (F-13)**: los 4 syncs (twenty/notion/git/drive) envuelven cada registro en try/catch; los
  fallos se acumulan en `summary.skipped` (`{entity,externalId,error}`) y el worker los loguea, sin abortar el resto. Helper
  común `integrations/sync-common.ts`. Test: un company con industry inválido se salta y el resto entra.
- **C · Util de dev**: `apps/worker/scripts/dev-sync.ts` — `pnpm --filter @ct/worker exec tsx scripts/dev-sync.ts <PROVIDER> [orgId]`
  conecta la integración y encola su sync contra la DB local (para probar pulls sin navegador). Reemplaza los scripts temporales.

**Verificación:** typecheck · lint ✓ · unit 37 ✓ · integración 73 (nuevos: resiliencia; URL /object/) ✓ · re-sync en vivo
COMPLETED/ACTIVE con `metadata.url` corregido.

### Siguiente: Fase 2 — GitHub (acción del owner)
Añadir a `apps/control-tower/.env`: `GITHUB_TOKEN=<PAT lectura de repos>` y opcional `GITHUB_OWNER=<usuario/org>`. Recargar el
worker (`docker compose up -d worker`). Luego, o bien en la UI `/automation/integrations` (Connect GitHub → Sync now), o bien
`pnpm --filter @ct/worker exec tsx scripts/dev-sync.ts GITHUB`. Verifica repos→assets con SourceBadge "GitHub".

---

## Bloque 2 · Fase 2 — GitHub (pull) — PROBADO EN VIVO ✅

Sin cambios de código (el adapter/sync ya existían; heredan salud de 0A y resiliencia de 1B). Token PAT en `.env`.
- **Qué trae:** repos → `assets` (assetType REPOSITORY, status ACTIVE): nombre, descripción, `external_url` (html_url),
  `repository_url` (clone_url). Sólo metadata/referencia, NO el código.
- **Probe de solo lectura** mostró 3 repos (noboolsheet). Sync vía `dev-sync GITHUB` → job **COMPLETED**, integración **ACTIVE**;
  assets 2→5, 3 `external_identities` GITHUB con `metadata.url`. **Re-sync idempotente** (assets 5, identities 3).
- **Nota (F-17):** sin paginación (tope 100) y sin `GITHUB_OWNER` trae todo lo visible del token. Scoping fino → E-4.

Verás los repos en **Knowledge → Assets** con badge "GitHub" y enlace al repo.

---

## Bloque 2 · Fase 3 (Notion) — diseño previo: contrato de IA congelable

Antes de conectar, el owner pidió definir la estructura de Notion y **sincronización bidireccional**. Decisiones
tomadas: modelo **propiedad-por-campo** (CT posee la ficha estructurada y la empuja a Notion; Notion posee el cuerpo
de la página; sin edición libre a dos bandas → sin ciclos) y **congelar el contrato antes de construir**.
- Redactado `docs/NOTION_INFORMATION_ARCHITECTURE.md` (BORRADOR v1) a partir de *Consideraciones sobre notion.docx* +
  el modelo de CT: inventario de DBs en alcance (Knowledge Items, Decisions, Capabilities, Services, Strategic Areas,
  Goals, Projects, Assets), propiedades tipadas con owner por campo, relaciones, mapeo de enums, orden de sync,
  scoping vía `integrations.configuration`, y secuencia (contrato → pull tipado → push E-1 por slice vertical).
- Pendiente del owner: crear las DBs y pegar `database_id`, fijar opciones de select, decidir relaciones reales de
  Knowledge Items, y elegir el slice vertical del primer push (Knowledge Items o Decisions).
- Notas: el sync genérico actual (página→knowledge_item) se **reescribe** a pull tipado por DB; el push necesita el
  Outbox de escritura (E-1) + token de Notion con edición; Systems=dominio E-5 (diferido).

---

## Bloque 2 · Fase 3 — Notion, piloto Decisions (bidireccional) — PROBADO EN VIVO ✅

Contra la DB real `Decisions` (id en `integrations.configuration.databases.decisions`), modelo **propiedad-por-campo**.
- **Cliente Notion tipado** (`notion/client.ts`): `retrieveDatabase` (descubre la prop título — en tu DB se llama "Nome"),
  `queryDatabase` (paginado), `createPage`, `updatePage`. Helpers genéricos de propiedades (`notion/props.ts`:
  title/rich_text/select/date, lectura y escritura).
- **`syncNotionDecisions`** (application): **pull-import** (Notion→CT solo las que no existen en CT; CT no pisa las suyas)
  + **push-all** (CT→Notion upsert por `notion_page_id`). Identidad reversa `getExternalIdentityFor`. Resiliente por-fila.
- **Worker**: el job `integration.notion.sync` ahora es **tipado por DB** (lee `configuration.databases`), reemplaza el
  scraper genérico de páginas.
- **Verificado en vivo:** primer sync `imported:1, pushedCreated:2, pushedUpdated:1` → tu "No contar desde 0" entró en CT;
  las 2 decisiones nativas de CT ("Postgres como única DB", "Usar Next.js") se crearon como filas en Notion; integración
  **ACTIVE**, job COMPLETED. Re-sync **idempotente** (`imported:0, pushedCreated:0, pushedUpdated:3`; 3/3/3 sin duplicados).
- Test fixture `notion-decisions-sync.test.ts` (pull-import + push-create + idempotencia).
- Nota F-19: el push es sync-time (no aún por evento/Outbox).

**Siguiente:** replicar el patrón al resto de DBs en el orden de relaciones (Strategic Areas → Capabilities → Services →
Goals → Projects → Knowledge Items → Assets), añadiendo las relaciones cuando existan sus DBs destino.

---

## Bloque 2 · Fase 3 — Notion: 8 DBs bidireccionales (motor genérico) — PROBADO EN VIVO ✅

Replicado el piloto de Decisions a las 7 DBs restantes con un **motor genérico** (spec por entidad), evitando 8 archivos casi
iguales.
- **`sync-notion-entity.ts`** (application): motor `syncNotionEntity(db,ctx,ds,dbId,spec)` — pull-import (Notion→CT sin pisar
  las de CT) + push-all (CT→Notion upsert por `notion_page_id`), resiliente por-fila, título autodetectado. Kinds de campo:
  text/select/date/number/url (+ helpers `writeUrl/writeNumber/readUrl/readNumber` en integrations).
- **`notion-specs.ts`**: specs de las 8 entidades (Decisions/StrategicAreas/Capabilities/Services/Goals/Projects/
  KnowledgeItems/Assets) con los **nombres de propiedad reales** (§9) + `runNotionSync(databases)` que ejecuta cada DB
  configurada. `syncNotionDecisions` pasa a ser un wrapper del motor (tests siguen verdes).
- **Worker**: `integration.notion.sync` ejecuta `runNotionSync` sobre `integrations.configuration.databases` (las 8 ids).
- **Verificado en vivo (org noboolsheet):** 1er sync sin skips → push de CT a Notion (assets:5, knowledgeItems:4,
  capabilities:3, projects:3, services:2, goals:1, strategicAreas:1) + import de tu capability de ejemplo (imported:1);
  decisions ya estaban (pushedUpdated:3). 2º sync **idempotente**: todo `pushedUpdated`, 0 nuevas, 0 skips. NOTION **ACTIVE**.
- **Alcance:** solo **campos escalares**; relaciones y cuerpo de página quedan en Notion (F-20). Tests: `notion-entity-sync`
  (motor genérico con Assets: url/select/text) + `notion-decisions-sync`.

---

## Bloque 2 · Fase 4 — Google Drive: vista Documents + auth service-account (código listo)

- **F-3 · Vista de Documents** (app-interna, probada): `/knowledge/documents` lista + `/knowledge/documents/[id]` detalle,
  **solo lectura**, siempre redirige al archivo real en su origen (Drive/Notion) — CT nunca exporta el contenido. Card en
  Knowledge. e2e J11.
- **Auth por cuenta de servicio** (código listo, pendiente creds): `makeGoogleTokenProvider` (JWT-bearer, cachea token; test
  unitario de firma RS256). `HttpDriveDataSource` ahora acepta `getToken` + `folderId` (scoping E-4) + paginación. Worker:
  `GOOGLE_SA_KEY_B64` (base64 de la clave JSON) → proveedor de tokens; `folderId` desde `integrations.configuration`. Fallback
  dev `GOOGLE_DRIVE_TOKEN`. Drive es **pull-only** (referencia; CT no posee archivos → no hay push).
- **Pendiente del owner** para el smoke en vivo: crear la service account (Google Cloud), habilitar Drive API, compartir la
  carpeta con el email de la SA, y aportar `GOOGLE_SA_KEY_B64` + `folderId`.

Verificado: typecheck/lint/build ✓ · unit 38 (nuevo: google token) · e2e 11 journeys.

---

## Bloque 2 · Fase 4 — Google Drive PROBADO EN VIVO ✅ (los 4 integradores conectados)

- Auth por **service account** verificada: `makeGoogleTokenProvider` obtiene y cachea el access token (JWT-bearer); carpeta
  `13jj…` compartida con la SA `control-tower-drive@…` → sync trae 1 archivo ("Documento de prueba") como **document**
  (provider GDRIVE + enlace al Google Doc). Job COMPLETED, GDRIVE **ACTIVE**. Re-sync idempotente (created:0/updated:1).
- Se ve en **Knowledge → Documents** (F-3), solo lectura → redirige al archivo real en Drive.
- **Setup gotcha:** el `.env` tenía `GOOGLE_SA_KEY_B64` con el nombre de variable **duplicado** dentro del valor (copia manual);
  detectado validando que el base64 decodifica a JSON y corregido con sed. Regla: validar siempre el secreto antes del sync.
- **Estado del bloque de integraciones:** Twenty (pull) ✅ · GitHub (pull) ✅ · Notion (bidireccional 8 DBs) ✅ · Drive (pull) ✅.

---

## Bloque 2 · Fase 5 — Push a Notion en tiempo real (Outbox/E-1) — PROBADO EN VIVO ✅

- **Emit**: `queueNotionPush` (en `outbox/`) se dispara desde `recordAudit` **sólo para acciones de USUARIO** sobre las 8
  entidades reflejadas (el sync corre como SYSTEM → no re-emite → sin bucles). Un create/update en CT inserta un evento outbox
  `notion.push` en la misma conexión.
- **Push de una entidad**: `pushNotionEntityById` (extraído de `syncNotionEntity`) + `runNotionEntityPush` (mapa entityType→spec
  + dbId de `integrations.configuration`). El worker registra el handler outbox `notion.push`.
- Se completó de paso la **auditoría CREATE** de strategic_area/capability/service/goal (C-1), necesaria para que el hook cubra
  sus creates.
- **Verificado en vivo**: emitido un `notion.push` para una decisión real → el worker la empujó (`res: updated`) en ~2s.
- **Además (Home)**: el botón "Open Tasks" ahora lleva a `/tasks`; Today's Work enlaza al detalle de tarea. F-18 verificado en
  vivo (tarea de Twenty importada). Fase 6 scheduler + Client→Notion también hechos en este bloque.

**Estado del plan (Bloque 2):** Fase 0 ✓ · integradores (Twenty/GitHub/Notion/Drive) ✓ · Fase 5 push real-time ✓ · Fase 6
scheduler ✓ (falta automatizaciones por evento) · F-18 ✓ · Client→Notion ✓. **Pendiente:** Fase 7 (canales inbox), Fase 8
(activos por cliente), automatizaciones por evento.

---

## Extra · Subtareas (petición del owner) ✅

El modelo ya soportaba subtareas (`tasks.parent_task_id` + `createTask` acepta `parentTaskId`); sólo faltaba la UI.
- `listSubtasks(ctx, parentId)`; `listActiveTasks` filtra a nivel superior (`parent_task_id IS NULL`) → la vista global
  `/tasks` sólo muestra tareas raíz; las subtareas viven en el detalle de su tarea.
- `POST /api/v1/tasks/[id]/subtasks` (hereda el proyecto del padre; 100% CT, no se propaga a Twenty).
- Detalle de tarea: sección **Subtareas** con contador done/total, alta rápida (título/prioridad/fecha) y estado+fecha por
  subtarea. Una subtarea es una task normal (tiene su propio detalle, y a su vez subtareas si hiciera falta).
- e2e J12. typecheck/lint/build ✓.

---

## Bloque 2 · Fase 7 — Canales de captura del Inbox (webhook con token) — PROBADO ✅

Diseño elegido con el owner: **canales con nombre** (múltiples conexiones visibles), no un webhook único.
- **Migración 0004** `inbox_channels` (id, org, name, token_hash, status, last_used_at). Token generado, **guardado
  hasheado (SHA-256)** y mostrado una sola vez (al crear/regenerar).
- **Application** `inbox-channels/`: create/list/regenerate/setStatus/delete (sólo OWNER) + `captureViaChannel` (auth por
  `(channelId, token)` sin sesión → `captureKnowledge` con `source_type`=nombre del canal + `last_used_at`).
- **API**: `/api/v1/inbox-channels` (GET/POST), `/[id]` (PATCH/DELETE), `/[id]/regenerate` (POST) — con sesión; y el webhook
  público `POST /api/v1/inbox/webhook/[channelId]` (token, rate-limit, sin CSRF).
- **UI**: Knowledge → Inbox → "Canales de captura": lista con estado/última-vez/URL del webhook + añadir/activar/desactivar/
  regenerar/eliminar; el token se muestra una vez. Los captures del Inbox muestran su `SourceBadge` (canal de origen).
- **Verificado**: e2e J13 (token válido → 201; inválido/desactivado → 401; la nota aparece en el Inbox).

**Estado del plan (Bloque 2):** Fase 5 (push real-time) ✓ · Fase 6 scheduler ✓ · **Fase 7 canales inbox ✓** · subtareas ✓ ·
Client→Notion ✓ · F-18 ✓. **Pendiente:** Fase 8 (activos por cliente, E-5) + automatizaciones por evento (2ª parte Fase 6).

---

## Bloque 2 · Fase 8 — Activos por cliente/proyecto (`resources`, E-5) — CT-nativo PROBADO ✅

Decisión (ADR-004): fuente de verdad en CT; relación proyecto-o-cliente con **cliente denormalizado** del proyecto;
solo referencias, **nunca secretos**; espejo a Notion como paso siguiente.
- **Migración 0005** `resources` (name, **type = etiqueta libre sin CHECK**, status/hosting con CHECK, client_id/
  project_id nullable, url/provider/environment/**credential_location** [puntero, nunca el secreto]/notes).
- **Enums** `RESOURCE_STATUS`/`RESOURCE_HOSTING` (cerrados) + `RESOURCE_TYPE_SUGGESTIONS` (abierto).
- **Application** `resources/`: createResource (denormaliza cliente del proyecto), get/update/delete, listByClient,
  listByProject. **Validation** create/update (refine: cliente o proyecto obligatorio).
- **API** `/api/v1/resources` (POST) + `/[id]` (GET/PATCH/DELETE).
- **UI**: pestaña **"Activos"** en detalle de Cliente (todos: personales + de sus proyectos) y de Proyecto (los suyos),
  con alta rápida (tipo con datalist extensible) y detalle `/resources/[id]` (edición inline). Aviso "nunca el secreto".
- **Verificado**: e2e J14 (activo de proyecto denormaliza cliente → cliente muestra 2, proyecto 1; sin cliente/proyecto
  → 400). typecheck/lint/build ✓; migración aplicada.
### Espejo a Notion (`resources`) — PROBADO ✅
El owner creó la DB **"System Assets"** (`3bbbecf260de80269c33e634034ff8dc`). Espejo implementado:
- **`resourceSpec` push-only** en `notion-specs.ts` (`importFromNotion` omitido → CT es único dueño; nunca importa de
  Notion, sin ciclos). Para soportarlo hice `importFromNotion` **opcional** en `NotionEntitySpec` y guardé el bucle de
  pull en `sync-notion-entity.ts` (las entidades push-only saltan el pull).
- `resource` añadido a `RUNNERS`, `PUSH_TARGETS` (real-time) y al set `NOTION_MIRRORED` de `recordAudit`.
- Config `databases.resources` fijado vía `jsonb_set` (preservando las otras 8 ids).
- Mapa de campos: `Type/Status/Hosting`=select · `Client/Project/Provider/Environment/Credential location/Notes`=rich_text
  · `URL`=url · título "Nome". `listResources()` hace leftJoin a clients/projects para los nombres.
- **Verificado E2E** (worker rebuild + sync): `resources.pushedCreated:1` → re-sync `pushedUpdated:1` (idempotente, sin
  duplicados); `external_identities` con `page.id` + url; push en tiempo real (outbox `notion.push`) → `res: updated`.

**Estado del plan (Bloque 2):** Fase 5 ✓ · Fase 6 scheduler ✓ · Fase 7 ✓ · **Fase 8 (resources CT-nativo + espejo Notion) ✓**
· subtareas ✓ · Client→Notion ✓ · F-18 ✓. **Pendiente:** automatizaciones por evento (2ª parte Fase 6).

---

## Bloque 2 · Fase 6 (2ª parte) — Automatización por evento: Oportunidad GANADA → Proyecto (E-8) ✅

Primera automatización por evento sobre el Outbox transaccional ya construido (ERRATA-009: **sin constructor visual**,
son handlers de código).
- **Emisión atómica**: `changeOpportunityStage` ahora envuelve el update en transacción y, al pasar a **WON** (y sólo en
  la transición, `current.status !== 'WON'`), emite `opportunity.won` en el mismo `db.transaction` que el cambio de stage
  y la auditoría → no hay ventana de inconsistencia.
- **Handler** (`packages/application/src/automations/`): `createProjectFromWonOpportunity(db, ctx, opportunityId)` —
  carga la oportunidad (debe estar WON), **idempotente** (si ya hay proyecto con ese `opportunityId`, devuelve el suyo sin
  crear otro), y crea el proyecto heredando **cliente** y nombre, enlazado por `opportunityId`. Cableado en el worker en
  `outboxRegistry['opportunity.won']` (ctx SYSTEM).
- **Verificado**: 2 tests de integración nuevos (emite+crea+idempotente; no-emite en stage no ganador) → **81 integración**;
  smoke live (emitir `opportunity.won` de una oportunidad WON → el worker crea el proyecto; re-emit → sigue habiendo 1).

**Estado del plan (Bloque 2): COMPLETO** — Fase 5 ✓ · Fase 6 (scheduler + automatización por evento) ✓ · Fase 7 ✓ ·
Fase 8 ✓ · subtareas ✓ · Client→Notion ✓ · F-18 ✓. **Siguiente:** que el owner pruebe con datos reales → merge a `prod` +
deploy en la Pi.

---

## Write-back a Twenty (E-1) — bidireccional en campos gestionados ✅

Antes de implementar, se **sondeó Twenty en vivo** para fijar la forma exacta de escritura (los compuestos: person
`name`={firstName,lastName}, `emails`={primaryEmail}, `phones`={primaryPhoneNumber}; company `domainName`={primaryLinkUrl};
opportunity `amount`={amountMicros,currencyCode}). Decisión del owner: **alinear Twenty a CT** (creó los 8 stages y puso
`industry` como TEXT) → mapeo 1:1 sin pérdida. Notes/Dashboards/Workflows de Twenty se ignoran (se usan aparte).

- **Lectura 1:1:** `mapTwentyStage` pasa a identidad (validada contra el enum, con fallback legacy). Añadidos al pull:
  `phone` (person.phones), `currencyCode` y `expectedCloseDate` (opportunity) — el sync ya los escribe en CT.
- **Escritura:** reverse mappers `companyPatch`/`personPatch`/`opportunityPatch` (arman los compuestos exactos, omiten
  `undefined`, `PATCH` parcial). `HttpTwentyDataSource.update(resource,id,body)`. `runTwentyEntityPush` resuelve el id de
  Twenty por `external_identities` y hace el PATCH; **solo actualiza existentes** (sin identidad → skip).
- **Disparo:** `recordAudit` encola `twenty.push` (nuevo `TWENTY_MIRRORED={client,contact,opportunity}`) **solo en
  UPDATE de un USER** (no CREATE — no se crea en Twenty; no DELETE). Handler `twenty.push` en el worker. Sin bucles (sync
  es SYSTEM).
- **Verificado:** unit 42 (reverse mappers) · integración 84 (+3: emite en UPDATE/no en CREATE, skip sin identidad, SYSTEM
  no emite) · e2e 14 · **smoke en vivo** contra Twenty real (industry '' → TEST-WRITEBACK confirmado en Twenty → restaurado;
  name/domain intactos). Gotcha: al añadir un handler NUEVO al worker hizo falta `docker restart` (tsx watch no siempre
  repica imports nuevos). 

---

## Knowledge: sector (Library) + Learning Path (nuevo dominio) ✅

Dos mejoras pedidas por el owner sobre Knowledge:
- **Sector en la Library**: `knowledge_items.sector` (varchar, **etiqueta libre** extensible; sugerencias en
  `SECTOR_SUGGESTIONS`, compartidas con Learning). Se rellena en el promote y se edita en el detalle; la Library filtra
  por sector (y por tipo). Migración aditiva **0006_m22**. Reflejado en Notion (propiedad `Sector` en el espejo de
  Knowledge Items, bidireccional).
- **Learning Path** (`/knowledge/learning`): dominio CT-nativo nuevo, distinto de capabilities (esto es lo que **estás
  aprendiendo**, no lo que ya sabes hacer). Tabla `learning_items`: title, `kind` (Curso/Habilidad/Tema/Roadmap, etiqueta
  libre), `status` (PLANNED/IN_PROGRESS/COMPLETED/PAUSED), `sector`, `url` (link directo al recurso online), `progress`
  (0–100), notes. CRUD + lista con filtros (sector/tipo/estado) + detalle inline. **Espejo a Notion push-only** como los
  activos (`learningSpec` + RUNNERS/PUSH_TARGETS + `learning_item` en NOTION_MIRRORED); requiere que el owner cree la DB
  "Learning Path" en Notion y aporte su id (config `databases.learning`).
- Verificado: typecheck/lint · 40 unit · 81 integración · **e2e J15** (learning CRUD + progreso + sector en la Library) ·
  build OK. Migración aplicada al dev DB.
- **Pendiente del owner (Notion)**: crear la DB "Learning Path" (props: título + Kind/Status/Sector=select, URL=url,
  Progress=number, Notes=text) y añadir la propiedad **Sector** (select) a la DB de Knowledge Items existente.

### Espejo Notion de Learning Path — CONFIGURADO y verificado ✅
El owner creó la DB "Learning Path" (`3bbbecf260de80d09db4d6c84d67e3c1`). Config `databases.learning` fijada (jsonb_set,
preservando las otras 9). Revisadas las opciones de los selects: propiedades/tipos correctos (Kind/Status/Sector=select,
URL=url, Progress=number, Notes=text, título "Nome"); **Status alineado a los de CT** (PLANNED/IN_PROGRESS/COMPLETED/PAUSED,
lo pone el owner); **Kind pasado a inglés en CT** (`COURSE/SKILL/TOPIC/ROADMAP/SINGLE RESOURCE`) para coincidir con Notion;
Sector coincide (etiqueta libre). Verificado en vivo: item de prueba → `learning.pushedCreated:1`, aparece en Notion con
todos los campos correctos; luego limpiado (página archivada + item borrado).

---

## 2026-08-13 — Integración Google Calendar → "Today's Events" en el Home ✅

Mejora pedida por el owner: ver **los eventos de HOY** (solo el día en curso) en el dashboard, debajo de "Today's Work".
Nuevo proveedor de integración `GCALENDAR` (pull-only), espejo del patrón de Drive, **reutilizando el service-account de
Google** (`makeGoogleTokenProvider`, scope `calendar.readonly`).

- **Schema (migración aditiva 0007_m23):** tabla `calendar_events` (`schema/calendar.ts`) — entidad externa read-only
  propia (no mapea a otra entidad CT, por eso NO usa `external_identities`): `UNIQUE(organization_id, external_id)`,
  eventos con hora (`start_at`/`end_at`) o de día completo (`is_all_day` + `start_date`), `html_link`, `status`, `raw`.
- **Integrations (`packages/integrations/src/gcalendar/`):** `HttpCalendarDataSource` (Calendar v3 `events.list`,
  `singleEvents=true`, `orderBy=startTime`, paginado; auth `getToken`/`accessToken` como Drive), `mapCalendarEvent`
  (dateTime→con hora / date→día completo), `CalendarAdapter`. DTOs `NormalizedCalendarEvent`/`CalendarPullResult` en
  `types.ts`.
- **Application (`sync-calendar.ts`):** `syncCalendar` upsert on-conflict + **reconciliación del día** (borra los que ya
  no vinieron → cancelados/movidos/ayer desaparecen). Helpers `zonedDayRange`/`resolveOrgTodayRange` (rango del día en el
  timezone de la org, sin librería de fechas: offset vía `Intl`).
- **Worker:** handler `integration.gcalendar.sync` (lee `GCAL_CALENDAR_ID` — admite **varios calendarios separados por
  coma**, se agregan todos; calcula el rango de hoy en tz de la org, construye el token desde `GOOGLE_SA_KEY_B64`;
  fallback dev `GOOGLE_CALENDAR_TOKEN`). Scheduler y `POST .../sync` ya funcionan por convención de nombre — sin cambios.
  Multi-calendario: `HttpCalendarDataSource` recorre cada calendario y marca el origen; el `external_id` almacenado se
  namespacea `calendarId::eventId` para que el mismo id en dos calendarios no colisione.
- **UI:** `GCALENDAR` en `KNOWN` (`/automation/integrations` + `dev-sync`). `getHomeDashboard` añade `todaysEvents` (solo
  hoy en tz de la org; hora formateada / "Todo el día"); nueva sección **"Today's Events"** en el Home bajo Today's Work.
- **Config del owner (no es código):** compartir el/los calendario(s) con el email de la SA ("Ver todos los detalles"),
  habilitar la Google Calendar API en el proyecto GCP, y poner `GCAL_CALENDAR_ID` en el `.env` (uno o **varios IDs
  separados por coma**). La misma `GOOGLE_SA_KEY_B64` de Drive sirve.
- **Verificado:** typecheck (8 proyectos) · lint · **48 unit** (+8: `mapCalendarEvent` con hora/día-completo/fallback +
  origen multi-calendario; `zonedDayRange` UTC/EDT/PDT-rollover/null) · build (web standalone) · migración aplicada al
  dev DB (tabla + índices confirmados). **Sync en vivo contra Postgres con adapter fixture**: upsert idempotente (título
  actualizado), reconciliación (evento no devuelto → borrado; pull vacío → caché limpia). **Multi-calendario en vivo**:
  dos calendarios agregados, mismo `event id` en ambos → guardados sin colisión (`cal::id`), recorriendo el fetch real.
  **Home query en vivo**: `todaysEvents` ordena timed por hora + all-day al final, formatea hora/"Todo el día", filtra a
  hoy. Filas de prueba limpiadas.
- **Pendiente del owner:** compartir calendario + `GCAL_CALENDAR_ID`, luego "Connect" + "Sync now" y ver el Home con datos
  reales.

---

## 2026-08-13 — Desconectar integraciones · Drive recursivo · organización de la info ✅

Tres mejoras pedidas por el owner en la misma sesión:

- **Desconectar integraciones** (antes solo se podían conectar/sincronizar). `disconnectIntegration(db, ctx, id)` en
  application (borra la fila → deja de sincronizarse y vuelve a "Disponibles"; `requireCan('write')`, scoping por org,
  `notFound`, `recordAudit('DISCONNECT')`); para **GCALENDAR** limpia además la caché `calendar_events` (sin otro dueño en
  CT); NO borra `external_identities` (reconnect + re-sync re-vincula). API `DELETE /api/v1/integrations/[id]`
  (`withContext` mapea `notFound`→404). UI: `DisconnectButton` (rojo, con confirmación) en `controls.tsx` + fila.
- **Sync de Drive RECURSIVO** (antes `'<folderId> in parents'` = solo hijos directos → los ficheros en subcarpetas no se
  indexaban y las carpetas se colaban como "documentos"). `HttpDriveDataSource.files()` recorre el árbol (BFS) desde
  `folderId`, salta las carpetas e indexa ficheros a cualquier profundidad, protegido contra ciclos (Set de visitados).
  Limpiadas 8 carpetas basura que el sync viejo había metido como documentos.
- **Organización de la info**: nuevo `docs/INFORMATION_ORGANIZATION.md` con la estructura de carpetas de Drive acordada
  (01 Business … 99 Archive, convenciones) + nota de Notion (se deja como está; mover DBs no cambia el `database_id`).
- **Layout del Home** (petición previa): rejilla 2 columnas — izq Attention Required → Active Projects, der Today's Work →
  Today's Events.
- **Verificado:** typecheck (8 proyectos) · lint · **50 unit** (+2: Drive recursivo recorre subcarpetas / no cicla) ·
  imagen web reconstruida. **Disconnect en vivo** (transacción revertida): borra integración + limpia `calendar_events` +
  audit `DISCONNECT` + `notFound` para id inexistente; datos reales intactos. **Drive recursivo en vivo** contra el Drive
  real: tras el fix `created:0` (antes creaba 8 carpetas), solo ficheros reales.
- **Gotcha (Mac + Docker):** `tsx watch` dentro del contenedor no siempre detecta cambios del volumen montado (eventos fs
  vía gRPC-FUSE) → tras cambiar código del worker/integrations hay que `docker compose restart worker` para recargarlo.

## 2026-08-14 — Panel lateral (Fase 3: creación contextual en secciones) ✅
El botón "Nuevo" dentro de la sección de un padre abre el panel con la **relación al padre fijada y oculta**.
- **Mecanismo**: URL `?rec=<e>:new&in=<ctxKey>:<parentId>`; `contextCreate` en el registro por entidad
  (`presetField` + `createPath` opcional para rutas anidadas). El panel oculta el campo padre, y en creación usa el
  endpoint anidado (task/deliverable → `/projects/[id]/…`, que fuerza el `projectId`) o inyecta la relación en el body
  (resto → POST raíz). Nuevo `components/ui/context-new-button.tsx`; `RecordLink` acepta `context`.
- **Nuevo spec**: **deliverable** (panel-only; editar vía `/api/v1/deliverables/[id]`, estado por `/status`).
- **Fichas cableadas**:
  - **Proyecto**: Tareas, Entregables, Decisiones, Activos → "Nuevo …" contextual; filas (task/deliverable/decision/
    resource) abren el panel. (Documents se mantiene igual: referencias read-only.)
  - **Cliente**: Contactos, Oportunidades, Proyectos, Activos → "Nuevo …" contextual; filas abren el panel.
  - **Área estratégica**: Objetivos → "Nuevo objetivo" contextual; filas abren el panel.
- Se retiran los `Create*Form` inline de esas secciones (se conserva `CreateDocumentForm`, que enlaza referencias externas).
- Verificado: typecheck · lint · build · web healthy. (Los POST anidados ya estaban probados por los tests de integración.)

## 2026-08-14 — Panel lateral (Fase 2: resto de familias) ✅
Se extiende el patrón a todas las entidades, con el criterio del owner: **solo metadatos → panel**;
**con secciones internas → ficha completa** (enlace "Abrir ficha completa").
- **Backend nuevo (3 huecos)**: `updateProjectSchema`/`updateProject`, `updateServiceSchema`/`updateService`,
  `updatePortfolioItemSchema`/`updatePortfolioItem` (validación + comando con `requireCan`/org-scoping/refs/`mapDbError`);
  rutas `PATCH` en `projects/[id]` (nueva, +GET), `services/[id]` (+PATCH), `portfolio-items/[id]` (nueva, +GET).
- **Registro** (`record-registry.ts`) + **listas cableadas**:
  - **Ficha completa** (secciones internas): **project** (fases/tareas/deliverables), **task** (subtareas),
    **strategic_area** (objetivos), **service** (capacidades).
  - **Panel-only**: **goal, capability, knowledge_item, decision, asset, learning, portfolio_item** (+ **resource**).
  - Estado por sub-endpoint `/status` (y `/visibility` en portfolio) cuando no está en el `update*` schema.
- **Excepciones**: **task** y **resource** se editan por panel pero **no** tienen botón "Nuevo" a nivel de lista
  (se crean dentro de un proyecto/cliente). **document** queda como **referencia de solo lectura** (sin cambios).
- Se retiran los formularios de creación inline de todas las listas (se conservan los contextuales del detalle).
  Títulos/breadcrumbs traducidos al español. Filtros (`?tab=` en projects, filtros cliente en library/learning) intactos.
- Verificado: typecheck (8) · lint · **unit 50** · **integración 84** (con 3 tests nuevos: updateProject con fecha +
  limpiar ref, updateService, updatePortfolioItem con validación de refs) · build · web reconstruida y healthy.

## 2026-08-14 — Panel lateral: iteración con feedback del owner (CRM) ✅
Revisión del piloto CRM antes de extender al resto:
- **Contacto y Oportunidad son panel-only** (no tienen secciones internas): se retira "Abrir ficha completa" para
  ellos (`detailPath` ahora opcional en el registro; solo Cliente lo conserva). El panel es su ficha completa.
- **Bloque "Contexto" (solo lectura)** en el panel en modo edición: **Fuente** (origen Twenty/Notion + "Abrir en el
  origen"), **Creado** y **Actualizado**. Las rutas GET `/api/v1/{clients,contacts,opportunities}/[id]` añaden
  `meta.source` (vía `getIdentityForInternal` + helper `lib/source-meta.ts`).
- **Actividad**: retirada de los objetos panel-only (queda el audit log del sistema); decisión del owner.
- **Filtro `?status=` preservado** al abrir/cerrar el panel: nuevo `components/ui/record-link.tsx` (cliente) que
  conserva la query al añadir `?rec=`; el panel cierra/navega con la query intacta (`withoutRec`/`withRec`).
- Verificado: typecheck · lint · build · web healthy.

## 2026-08-14 — Panel lateral estilo Twenty (Fase 1: infraestructura + CRM) 🚧 (petición del owner)
Cambio grande de UI/UX: inserción/edición de objetos por **panel lateral** (como Twenty), ejecutado por fases.
Decisiones del owner: **crear al guardar** · clic en fila → **abre el panel** (con "Abrir ficha completa" para las
secciones) · aplicar a todas las entidades (por familias).
- **Infraestructura (nueva)**: `lib/record-registry.ts` (spec por entidad: campos editables + endpoints + relaciones,
  derivados de los schemas `update*`); `components/ui/record-panel.tsx` (drawer global montado en el AppShell,
  controlado por `?rec=<entidad>:<id|new>`; **crear** = POST de todos los campos → pasa a edición; **editar** =
  autoguardado por campo con endpoint por-campo si aplica —p. ej. stage→`/stage`—; carga relaciones de los GET de
  lista; cierra con X/Escape/backdrop); `components/ui/new-record-button.tsx` (botón "＋ Nuevo" arriba-derecha).
- **Familia CRM cableada**: Clientes, Contactos, Oportunidades → botón "Nuevo" + clic en fila abre el panel; retirados
  sus formularios inline de la lista (se conservan los contextuales del detalle de Cliente). Rutas GET/PATCH ya
  existían.
- **Nota futura**: FINDINGS **E-11** (espacios de trabajo + colaboradores con jerarquía de permisos).
- Verificado: typecheck (8) · lint · build (sin problemas de Suspense/useSearchParams) · web reconstruida y healthy.
- **Pendiente (siguientes fases)**: Projects/Tasks/Deliverables (+ update schemas nuevos de Project/Service/Portfolio),
  Knowledge, Business, Portfolio, Resources, Learning; entidades solo-referencia en modo lectura; preservar el filtro
  `?status=` al abrir/cerrar el panel.

## 2026-08-14 — UI/UX: Home en español, salud del proyecto, desplegables con filtro ✅ (petición del owner)
Bloque "general + Home":
- **1. Idioma → español**: traducidos la **navegación** (Inicio/Negocio/CRM/Proyectos/Conocimiento/Automatización/
  Ajustes) y toda la **Home** (títulos, métricas, secciones). El resto de vistas se traducen al revisarlas una por
  una. Anotada la mejora futura **i18n / multiidioma** en FINDINGS (E-10).
- **2. Desplegables con FILTRO**: nuevo `components/ui/searchable-select.tsx` (disparador + campo de filtro + lista
  con scroll `max-h`). Aplicado a los selectores de entidad que crecen: cliente/contacto de un proyecto, y cliente en
  los formularios de contacto y oportunidad. (Los enums pequeños —prioridad/estado— siguen nativos.)
- **3. Salud del proyecto**: nuevo `HealthBadge` con etiquetas propias en español — **Saludable / En riesgo /
  Bloqueado** (antes reutilizaba etiquetas de estado y mostraba "ACTIVE", confuso). Es un indicador **derivado por el
  sistema, no editable** (BLOCKED si estado BLOCKED/WAITING · En riesgo si abierto y fecha objetivo vencida · Saludable
  el resto). Aplicado en lista y detalle de Projects y en la Home.
- Verificado: typecheck (8) · lint · build · web reconstruida y healthy (páginas sin 500).

## 2026-08-14 — Proyecto asociable a un contacto (además de a un cliente) ✅ (petición del owner)
Un proyecto puede asociarse a un **cliente** (empresa) O a un **contacto** (persona, p. ej. privados), en una
lista unificada sin diferenciarlos.
- Migración aditiva **0008_m24**: `projects.contact_id` (FK nullable → contacts) + índice. Aplicada al dev DB.
- Dominio/validación/comando: `createProjectSchema.contactId`; `createProject` valida el contacto en la org
  (`assertRefInOrg`) e inserta `contact_id`. Query: `ProjectWithDerived.contactName` resuelto en `listProjects`
  y `getProjectDetail`.
- UI: `CreateProjectForm` con **dropdown fusionado** (clientes + contactos, ordenados por nombre; el valor
  codifica `client:`/`contact:` y se envía `clientId` o `contactId`). La lista de Projects muestra "Asociado"
  (cliente o contacto) y el detalle añade la línea "Asociado".
- Verificado: typecheck (8) · lint · build · **en vivo (tx revertida)**: proyecto con `contactId` → contactName
  resuelto en la lista. Web reconstruida.

## 2026-08-14 — UI de estados editables + filtros de clientes ✅ (petición del owner)
Mejoras de UI/UX de estados y navegación:
- **Estado editable inline con color (estilo Notion)**: consolidados los dos `StatusSelect` locales (cajas planas)
  en un único `components/ui/status-select.tsx` rediseñado — píldora con el color del estado + flecha ▾, con un
  `<select>` nativo invisible por encima (accesible, sin recorte en tablas, se clica la píldora entera). Colores
  extraídos a `components/ui/status-tone.ts`, compartidos con `StatusBadge`. Como todos los controles
  (Task/Project/Deliverable/Decision/KnowledgeItem/Asset/Service/Capability/Opportunity/Client) delegan en él,
  **listas y detalles se actualizan a la vez**; migrados a él los que aún usaban `<select>` crudo (Opportunity/
  Client/Service/Capability).
- **Estado editable en listas antes solo-lectura**: Clients y Projects ahora permiten cambiar el estado desde la
  propia lista (además del detalle, como antes).
- **Filtros de Clients** reordenados a **Active / Inactive / All**, con **Active por defecto**; el atajo "Clients"
  del Home lleva directo a `?status=ACTIVE`.
- Verificado: typecheck (8) · lint · build · web reconstruida y healthy (páginas sin 500).

## 2026-08-14 — Estado del cliente ACTIVE/INACTIVE (solo CT) ✅ (petición del owner)
Poder marcar clientes como **INACTIVE** en CT (los que ya no se trabajan), **sin llevarlo a Twenty**.
- Nuevo enum `CLIENT_STATUS=['ACTIVE','INACTIVE']` (dominio); las validaciones de client create/update pasan de
  `LIFECYCLE_STATUS` a `CLIENT_STATUS`. La columna `clients.status` es varchar libre → **sin migración**.
- **Estado 100% de CT**: el reverse mapper de Twenty (`companyPatch`) no incluye status → el write-back no lo
  empuja; y el pull de Twenty actualiza name/industry/website pero **no toca status** → el sync no lo pisa.
- UI: `ClientStatusControl` (select ACTIVE/INACTIVE) en el detalle del cliente, reutilizando el `updateClient`
  existente (`PATCH /api/v1/clients/[id]`). `StatusBadge` mapea INACTIVE a neutro. Sin comando/endpoint nuevos.
- Verificado: typecheck (8) · lint · 50 unit · build · **en vivo (tx revertida)**: cliente→INACTIVE sobrevive a un
  sync de Twenty (name se actualiza desde Twenty, status se mantiene INACTIVE).
- **Filtro en la lista de clientes** (Todos / Activos / Inactivos) por query-param `?status=`, como los tabs de
  Projects; `listClients` acepta un `status` opcional (sin filtro = todos; los demás llamadores no se ven afectados).
  Verificado en vivo (Todos=2, Activos/Inactivos filtran correctamente).

## 2026-08-14 — Backlog de automatizaciones ✅ (petición del owner)
Nuevo `docs/AUTOMATION_BACKLOG.md`: catálogo de ~37 automatizaciones propuestas (IDs `AUT-*` + habilitadores
`HAB-*`), internas por evento y con apps conectadas, ancladas a la infraestructura real (Outbox transaccional +
handlers del worker, scheduler del tick, hooks de sync, webhooks del Inbox). Incluye guardarraíles (idempotencia,
sin bucles USER/SYSTEM, propiedad por campo, sin secretos, ERRATA-009 = handlers de código) y una secuencia
priorizada. **Hallazgo clave**: no existe canal de notificación de salida (email/Telegram/push) → es el
prerequisito nº1 (HAB-1) de casi todo "avísame/recuérdame/resume". Incluye §1 con las **automatizaciones ya
ACTIVAS** (`ACT-1..11`: opportunity.won→proyecto, push Notion/Twenty en tiempo real, sync programado, retención,
los 5 syncs de integración, captura del Inbox) para no re-proponerlas. Añadido al índice `README.md`.

## 2026-08-14 — Endurecer DATABASE_URL en prod (fail-fast) 🛡️✅
Tras el primer deploy en la Pi, un `docker compose up --force-recreate` manual (sin cargar `apps/control-tower/.env`)
dejó `DATABASE_URL` con usuario vacío → postgres.js cayó al usuario del SO ("root") → `password authentication
failed for user "root"` al registrarse. Causa: la URL se interpola de `POSTGRES_*`, que solo el deploy script carga
al shell. **Fix**: guardas `:?` en todas las interpolaciones de `POSTGRES_*` del compose de prod (web/worker/db) →
`docker compose` **aborta con un error claro** ("falta POSTGRES_USER — despliega con ./deploy-control-tower.sh prod")
en vez de generar una URL rota en silencio; también protege la DB de recrearse con credenciales vacías. Verificado
con `docker compose config`: sin las vars → error claro; con ellas → `postgres://control_tower:…@control-tower-db.prod:5432/…`.
Documentada la regla "usa siempre el deploy script" en `DEPLOYMENT.md`. (Dev no se ve afectado: hardcodea la URL.)

## 2026-08-13 — Fix build de Docker en prod (deps del workspace) 🐛✅
El deploy en el Pi falló: `next build` → "Can't resolve '@ct/domain'". Causa: el stage `deps` del `Dockerfile`
**no copiaba** los `package.json` de `domain`, `application` ni `integrations` antes de `pnpm install`, así que no
se enlazaban. Localmente quedaba enmascarado porque **no había `.dockerignore`** y `COPY . .` arrastraba el
`node_modules` local (que sí los tenía). En el Pi (checkout limpio, sin node_modules) se veía el fallo real.
- **Fix 1**: copiar el `package.json` de **todos** los paquetes del workspace en `deps` (añadidos domain,
  application, integrations).
- **Fix 2**: nuevo **`.dockerignore`** (excluye node_modules, .next, .git, .env, dist…) → contexto limpio, builds
  representativos (ya no se enmascara), y evita meter binarios de otra arquitectura en la imagen ARM del Pi.
- **Verificado**: build limpio local de **web** (ya sin node_modules en el contexto) y **worker** → ambos OK;
  contenedores recreados, web healthy y worker "worker started" sin errores de módulo.

## 2026-08-13 — UI para configurar integraciones (Drive/Notion) ✅ (petición del owner)
Resuelve el gap operativo de la revisión previa: ya **no** hace falta tocar la DB ni depender de migrarla para
poner `folderId` (Drive) / `databases` (Notion) en una DB fresca del Pi.
- `updateIntegrationConfiguration(db, ctx, id, configuration)` (application; `requireCan('write')`, org-scoped,
  `notFound`, audit). Los secretos NUNCA aquí.
- `PATCH /api/v1/integrations/[id]` (valida `configuration` como objeto con Zod `z.record`).
- UI: `IntegrationConfigForm` (editor JSON con validación + hint por proveedor) desplegable en la fila de cada
  integración **configurable** (GDRIVE/NOTION); Twenty/GitHub/Calendar no lo muestran (solo `.env`).
- Verificado: typecheck (8) · lint · build · en vivo (tx revertida): actualiza la config anidada, `notFound` para
  id inexistente, config real intacta. Docs actualizados (DEPLOYMENT, guía de usuario). Imagen web reconstruida.

## 2026-08-13 — Revisión de preparación para prod (Tailscale + integraciones) ✅
Revisión previa al deploy en la Pi:
- **Integraciones OK en prod**: el sync corre en el **worker** (mismo código que dev), que recibe los secretos por
  `env_file: ./.env` en el compose de prod; el scheduler encola cada `SYNC_INTERVAL_MINUTES`. El `dev-sync` es solo
  script de dev + `displayName` cosmético. El deploy corre migraciones (`worker … db migrate`) → DB del Pi al día.
- **Gap operativo (documentado)**: `integrations.configuration` (folderId de Drive, databases de Notion) no tiene UI.
  En DB fresca del Pi: migrar la DB local (pg_dump/restore trae todo) o fijar la config por SQL (ver DEPLOYMENT).
  Twenty/GitHub/Calendar se configuran solo por `.env`.
- **Acceso por IP de Tailscale**: `BETTER_AUTH_URL`/`APP_URL` deben coincidir con el origen exacto
  (`http://<IP-TS>:4272`). Añadido soporte opcional `BETTER_AUTH_TRUSTED_ORIGINS` (coma-separado, aditivo, sin efecto
  si no se define) para acceder por varias URLs a la vez (IP de Tailscale + hostname de Caddy). Documentado en
  `.env.example` y `DEPLOYMENT.md`.
- Verificado: typecheck (8) · lint · unit · **build** (web) verdes.

## 2026-08-13 — Gestión de tareas: vencidas en el Home + reprogramar ✅ (petición del owner)
- **Home lista las tareas VENCIDAS** (`dueDate < hoy`, activas, la más antigua primero) en una sección propia
  "Vencidas" en la columna derecha (encima de Today's Work), en vez de solo el contador. `getHomeDashboard`
  añade la lista `overdue` (mantiene el contador exacto para el aviso de Attention) y devuelve `today` (tz org).
- **Reprogramación reutilizando lo existente**: en cada fila (Home) y en el detalle de la tarea, botón nuevo
  **"Pasar a hoy"** (`TaskDueTodayButton` en `components/projects/forms.tsx` — PATCH `dueDate=today`) + el
  **selector de fecha** ya existente (`TaskDueDateControl`). Ambos usan el mismo `PATCH /api/v1/tasks/[id]` →
  `updateTask`. El `today` en tz de la org viene del servidor (Home via dashboard; detalle via
  `resolveOrgTodayRange`). No se creó componente nuevo redundante.
- **Verificado**: typecheck (8 proyectos) · lint · en vivo (transacción revertida): tarea con fecha de ayer
  aparece en `overdue` y no en `todaysWork`; tras "Pasar a hoy" se mueve a `todaysWork` y sale de `overdue`.
  Imagen web reconstruida.

### Checklist de lanzamiento público + patrón de desarrollo ✅ (petición del owner)
Dos documentos nuevos para el conocimiento de la empresa:
- **`SECURITY_CHECKLIST.md` — Parte II**: gate de seguridad para **lanzamiento público en internet**, por dominios
  (borde/WAF/DDoS/TLS-ACME/HSTS · identidad/MFA/registro · app/CSP/CSRF/CORS · datos/RGPD/KMS/backups offsite ·
  observabilidad/SIEM/respuesta a incidentes · infra/escaneo de imágenes/segmentación · cadena de suministro ·
  cumplimiento/pentest · operación/DR). Todos ⬜ pendientes (no urgen en self-hosted).
- **`DEVELOPMENT_PATTERN.md`**: el método con el que se construyó CT, generalizado como **patrón reutilizable**
  (Fase 0 los 9 docs de diseño + revisiones 8/9 como gates · congelar decisiones + precedencia + regla de oro ·
  plan por milestones con DoD · construcción por capas/slice vertical con BUILD_LOG+FINDINGS+ADR/ERRATA ·
  verificación por sub-fase · seguridad y despliegue como gates · mejora continua). Incluye inventario de
  artefactos, formatos (ADR/FINDINGS/ERRATA), roles humano↔IA y plantilla de arranque. Añadidos al índice `README.md`.

### Análisis de seguridad + checklist ✅ (petición del owner)
Revisión de seguridad completa (auth/authz/sesión/CSRF · inyección/secretos/XSS/SSRF · cabeceras/infra/deps) →
nuevo **`docs/SECURITY_CHECKLIST.md`**: checklist exhaustivo por dominios que toda versión debe pasar, con veredicto
por control y sección de controles diferidos para app pública/multiusuario. Cross-ref desde `SECURITY.md`.
**Resumen:** la base es sólida (aislamiento por org en todas las queries, RBAC, Zod en el boundary, sin SQLi/XSS/SSRF,
secretos fuera de la DB, tokens hasheados, errores sin fuga). **Gaps a corregir ahora** (self-hosted): password de
Postgres por defecto · contenedores como root · puerto 4272 en `0.0.0.0` HTTP plano (salta Caddy) · sin guarda de
`BETTER_AUTH_SECRET` · `folderId`/params UUID sin validar · logger sin redacción · backups (M18). **Alto pero solo si
se expone:** registro abierto → OWNER de la org existente (cerrar/invitaciones antes de público). `pnpm audit`: 11
vulns casi todas de tooling dev/build (no desplegado); solo `sharp` (Next) llega al runtime.

### Drive: reconciliación de borrados ✅ (petición del owner)
`syncDrive` ahora **reconcilia borrados** (como Calendar): tras el pull, los documentos de origen GDRIVE cuyo `external_id`
ya no aparece (borrados/movidos fuera de la carpeta o subcarpetas) se eliminan (documento + `external_identity`). "Vistos" =
todos los ficheros del pull (no solo los upsertados con éxito → un fichero que falla transitoriamente no se borra). Los
documentos nativos de CT o de otros proveedores no se tocan. **Verificado**: unit/typecheck/lint (50) · reconciliación en
vivo en transacción revertida (`gone` borrado, `keep` conservado, `deleted:1`) · **validación real**: al mover el owner el
documento de prueba fuera de la carpeta, el sync lo quitó (`deleted:1`) y la recursión recorrió las 8 subcarpetas reales
(vacías → 0 ficheros). Doc `INFORMATION_ORGANIZATION.md` actualizado (ya no es "limitación").
