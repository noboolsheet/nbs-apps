# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en **Control Tower**. Léela entera antes de tocar nada.

## Qué es

App web **self-hosted** de gobernanza / puesto de mando que unifica y controla varios sistemas externos sobre un
modelo propio: **Twenty CRM**, **Notion**, **GitHub** y **Google Drive**. Monorepo **pnpm workspaces**. El objetivo
final es desplegarla en la Raspberry Pi del owner (noboolsheet).

## ⚑ Para retomar una sesión: dónde está el estado

- **`docs/BUILD_LOG.md`** = **fuente de verdad del progreso** (bitácora cronológica, lo más reciente arriba). Léelo
  primero para saber "en qué punto nos quedamos". Estado (2026-09-01): **roadmap M01–M18 completo**, **Bloque 2
  completo** (integraciones + automatización por evento), **panel lateral estilo Twenty terminado y probado por el
  owner**, **auditorías técnica y de UI/UX cerradas** y el **grueso del backlog de hallazgos vaciado** (sesión 14).
  **Lo grande que queda son las automatizaciones**, bloqueadas por HAB-1 (canal de notificación: el owner ya eligió
  **bot de Telegram**, pero pidió NO implementarlo todavía).
- **`docs/AUDIT_2026-08-30.md`** (técnica) y **`docs/AUDIT_UIUX_2026-08-30.md`** (UI/UX) = fotos críticas con el estado
  de cada hallazgo. **`docs/AUTOMATION_BACKLOG.md`** = catálogo de automatizaciones (HAB-1/HAB-2 son los habilitadores
  que bloquean el resto; hoy **no existe canal de notificación al humano**).
- **Secciones de la app:** Inicio · Negocio · CRM · Proyectos · Conocimiento · Portafolio · **Pagos** · Automatización ·
  Ajustes. **Negocio › Procesos (SOP)** (2026-09-02) es la Biblioteca acotada a `knowledgeType = PROCESS`: un SOP **no
  es una entidad**, es un `knowledge_item` de tipo proceso (el documento vive en Notion y sus anexos en Drive; ver
  `docs/INFORMATION_ORGANIZATION.md`). Antes de proponer una tabla nueva para algo documental, mira si encaja aquí. Pagos (migración 0019/m35) es CT-nativo: cobros (IN, con cliente/contacto) y gastos (OUT, con etiqueta
  libre), con estado pendiente/pagado y totales por moneda.
- **`docs/FINDINGS_AND_DEFERRED.md`** = backlog vivo (hallazgos `F-*` y diferidos `E-*`, con estado 🔴/🟡/🟢).
- **`docs/adr/`** + **`docs/DECISIONS_FROZEN.md`** = decisiones de arquitectura (por qué es como es). Hay **ADR-001..008**
  (005 tipo de proyecto · 006 cadena de decisiones · 007 activos reutilizables por proyecto · **008 CT es sólo la
  máquina de estados de las oportunidades**).
- **`docs/NOTION_INFORMATION_ARCHITECTURE.md`** = contrato del espejo a Notion (propiedad por campo, IDs de las DBs).
- `docs/IMPLEMENTATION_ROADMAP.md` (plan de 18 milestones), `docs/DEPLOYMENT.md`, `docs/SECURITY.md`.
- **`apps/web/content/user-guide.md`** = guía de uso para el usuario final + **matriz de información** (dueño/origen/
  dirección de cada dato). Legible desde la app en **Settings › Guía** (`/settings/guide`), que la inlinea vía la regla
  `asset/source` de `next.config.mjs` y la pinta con `components/markdown.tsx` (renderer propio, sin dependencias). Es la
  MISMA fuente para repo y app: al cambiar datos de propiedad/flujo, actualiza también este fichero.

**Rama de trabajo: `control-tower-mvp`.** Documentar cada paso en `BUILD_LOG.md` y marcar el backlog en
`FINDINGS_AND_DEFERRED.md` (feedback del owner: en proyectos largos, plan + progreso en `.md` dentro del repo).

## ⚑⚑ REGLA DE CIERRE (owner, 2026-09-01): lo que se termina, se marca

**Una tarea no está terminada hasta que su anotación dice que está terminada.** Si algo estaba escrito como pendiente
en cualquier documento y lo resuelves, **cerrarlo forma parte del trabajo**, no es un extra: sin eso el backlog miente
y no sabemos por dónde vamos de verdad. Pasó (sesión 14b): nueve ítems llevaban semanas hechos y seguían abiertos,
más media docena de documentos que hablaban de cosas que ya no eran ciertas.

**Al cerrar cualquier tarea, antes de commitear:**
1. **Busca dónde estaba anotada** — normalmente `FINDINGS_AND_DEFERRED.md` (`A-*`/`B-*`/`C-*`/`E-*`/`F-*`), pero
   revisa también los otros documentos vivos de la tabla de abajo: el mismo tema suele estar anotado en dos sitios
   (p. ej. la paginación de GitHub estaba en F-17 **y** dentro de E-4, y en la auditoría técnica).
   `grep -rn "<palabra clave>" docs/` antes de dar nada por cerrado.
2. **Cámbiale el estado** (🟡/🔴/⬜ → ✅ con la fecha) y **escribe CÓMO se resolvió**, no solo que se hizo: la decisión
   tomada, el fichero/tabla donde vive y lo que quedó fuera a propósito. Un "✅ hecho" sin contexto no sirve dentro de
   dos meses.
3. **Si sólo se resolvió una parte**, deja el ítem abierto pero recorta el enunciado a lo que queda de verdad.
4. **Si se descarta**, márcalo ❌ con el motivo y quién lo decidió — cerrado, no pendiente eterno.
5. **Añade la entrada al `BUILD_LOG.md`** (arriba del todo) y actualiza su encabezado "⚑ DÓNDE NOS QUEDAMOS".

**Cada cierto tiempo (o cuando el owner lo pida), repaso de estados:** revisar el backlog **contra el código**, no
contra lo que dice el documento — verificar con `grep`/lectura que lo anotado como pendiente sigue siéndolo. La
cabecera de `FINDINGS_AND_DEFERRED.md` mantiene la lista agrupada de lo que sigue REALMENTE abierto; actualízala.

### Documentos vivos: qué mantener al día y cuándo

| Documento | Qué es | Cuándo se toca |
|---|---|---|
| **`docs/BUILD_LOG.md`** | Bitácora + estado autoritativo ("dónde nos quedamos") | **Siempre**, al cerrar cualquier trabajo |
| **`docs/FINDINGS_AND_DEFERRED.md`** | Backlog vivo de hallazgos y diferidos | **Siempre** que se resuelva, se acote o se descarte algo anotado |
| **`docs/AUDIT_2026-08-30.md`** · **`docs/AUDIT_UIUX_2026-08-30.md`** | Auditorías técnica y de UI/UX con el estado de cada hallazgo | Al resolver un hallazgo suyo (ojo: repiten temas del backlog) |
| **`docs/SECURITY_CHECKLIST.md`** | Checklist de seguridad (Parte I self-hosted · Parte II público) | Al tocar auth, cabeceras, secretos, infra o dependencias |
| **`docs/AUTOMATION_BACKLOG.md`** | Catálogo de automatizaciones (ACT-* activas · AUT-* propuestas · HAB-* habilitadores) | Al activar una automatización o un barrido nuevo → pasa a la tabla **ACT** |
| **`docs/IMPLEMENTATION_ROADMAP.md`** | Plan de 18 milestones + tracker | Al cerrar un milestone o cuando una salvedad del tracker deja de ser cierta |
| **`apps/web/content/user-guide.md`** | Guía del usuario final + **matriz de información** | Al añadir/cambiar un dato visible, su dueño o su dirección de sync |
| **`docs/adr/`** + **`DECISIONS_FROZEN.md`** | Decisiones de arquitectura | Al tomar una decisión estructural o desviarse de lo congelado |
| **`docs/NOTION_INFORMATION_ARCHITECTURE.md`** | Contrato del espejo a Notion | Al cambiar campos, propiedad o DBs del sync |
| **`docs/DEPLOYMENT.md`** · **`docs/SECURITY.md`** | Despliegue y postura de seguridad | Al cambiar variables de entorno, compose, puertos o el modelo de secretos |
| **`docs/DESIGN_TOKENS.md`** | Tema, tokens y primitivas | Al tocar color, tipografía, foco o primitivas de UI |
| **`CLAUDE.md`** (este fichero) | Cómo trabajar en el repo | Cuando cambia una convención, un flujo o el estado general |

**Regla práctica:** si al terminar un trabajo NO tocas ningún `.md`, sospecha — o el trabajo era trivial, o te dejaste
una anotación sin cerrar.

**⚑ FLUJO DE ENTREGA (feedback owner 2026-08-16 — el owner prueba desde la Raspberry Pi):** al terminar CADA cambio
(verificado: typecheck·lint·build), commitea en `control-tower-mvp` y **SIEMPRE** haz merge **FF `control-tower-mvp` →
`dev` → `prod`** y `git push origin prod`. Solo `prod` tiene rama remota; `control-tower-mvp` y `dev` se quedan en local
(no se pushean). No esperes visto bueno para mergear: el owner valida en la Pi contra `prod` ya desplegado. Receta:
```sh
git checkout dev  && git merge --ff-only control-tower-mvp
git checkout prod && git merge --ff-only control-tower-mvp && git push origin prod
git checkout control-tower-mvp
```

## ⚑ Patrón de creación/edición: panel lateral estilo Twenty (TERMINADO)

**Qué es:** la inserción/edición de objetos está unificada al patrón de Twenty. En cada lista hay un botón **"＋ Nuevo"**
arriba a la derecha; al pulsarlo o al hacer **clic en una fila** se abre un **panel lateral** con los metadatos. **Crear
al guardar** (POST al pulsar "Crear" → pasa a edición) y luego **autoguardado por campo**. Las entidades con **secciones
internas** conservan su **ficha completa** (enlace "Abrir ficha completa ↗"); las de **solo metadatos** viven solo en el
panel. **Iniciativa terminada y validada por el owner con datos reales** — esto es ya el patrón vigente, no trabajo en curso.

**Arquitectura (todo en `apps/web`):**
- `lib/record-registry.ts` — **fuente única**: un `RecordSpec` por entidad (campos editables + endpoints + relaciones +
  `detailPath?` + `contextCreate?`). Para añadir/editar una entidad en el panel, se toca **aquí**.
- `components/ui/record-panel.tsx` — el drawer global (montado en `app-shell.tsx`), controlado por `?rec=<entidad>:<id|new>`
  (+ `&in=<ctxKey>:<parentId>` para creación contextual). Autoguarda por campo (con dirty-check); estado por sub-endpoint
  (`/status`, `/visibility`) si no está en el `update*` schema. Bloque "Contexto" (Fuente/Creado/Actualizado) en edición.
- `components/ui/{new-record-button,context-new-button,record-link}.tsx` — botones/enlaces que abren el panel
  preservando la query (p. ej. `?status=`). `lib/source-meta.ts` — `meta.source` de los GET.

**Cobertura:** todas las familias. Ficha completa: project, task, strategic_area, service, opportunity. Panel-only:
goal, capability, knowledge_item, decision, asset, learning, portfolio_item, resource, deliverable, project_phase y
**subtarea** (el panel oculta "Abrir ficha completa" si hay `parentTaskId` → corta la recursión). Jerarquía elegida por
el owner: Proyecto → Tarea (ficha con su lista de subtareas) → Subtarea (solo panel).
**Creación contextual** en secciones: Proyecto (tareas/entregables/decisiones/activos/fases), Cliente (contactos/
proyectos/activos), Área estratégica (objetivos), Tarea (subtareas), Oportunidad (tareas de preventa).
**`opportunity` es un caso aparte (ADR-008):** NO se crea desde CT (sin `createPath` ni creación contextual) y su
**único campo editable es `stage`**; el resto va bloqueado (`ownedBy: ['TWENTY']` o `readOnly`).

**Decisiones cerradas:** `document` **NO** tendrá panel (queda como referencia de solo lectura). `decision` desde
`service`: la config `contextCreate.service` está en el registro pero la sección **no se añade** hasta que aparezca el
caso de uso real.

**Al añadir una entidad al panel** (receta): 1) asegúrate de que existan `GET`/`PATCH` en `api/v1/<recurso>/[id]` y un
`update*Schema`+comando (créalos espejando `updateStrategicArea`); 2) añade el `RecordSpec` en `record-registry.ts`
(status por `commitPath` si no está en el `update*`); 3) en la lista, botón `NewRecordButton` + fila con `RecordLink`;
4) si se crea dentro de un padre, `contextCreate` + `ContextNewButton` en la sección. Verifica typecheck·lint·build.

**Traducción al español:** capa de etiquetas de enums `apps/web/lib/labels.ts` (`enumLabel`, código→español **solo
display**; el value/DB/API no se toca), cableada en `StatusBadge`/`StatusSelect`/`InlineEditSection`/`record-panel`.
**Al añadir un enum cerrado nuevo que se muestre → añade sus códigos→español en `lib/labels.ts`.** Los datos del
usuario o importados de terceros **nunca** se traducen.

## Estructura (capas)

```
apps/web       Next.js 15 App Router (standalone). Server Components leen queries de @ct/application directamente;
               los forms cliente usan postJson/patchJson/deleteJson de @/lib/client. API en app/api/v1/**.
apps/worker    Node + tsx. Tick de 2s: procesa jobs (FOR UPDATE SKIP LOCKED), despacha el Outbox, scheduler de sync,
               barrido de retención.
packages/domain        Enums + transiciones + reglas PURAS (sin IO).
packages/validation    Esquemas Zod (create*/update*) + env (loadEnv).
packages/db            Drizzle + postgres.js. schema/, migraciones en drizzle/, runners migrate/seed.
packages/application   Casos de uso. AQUÍ vive la lógica de negocio.
packages/integrations  Adapters + DataSources (Http* con fetch real) + mappers, por proveedor (twenty/notion/git/drive).
packages/shared        Logger JSON + taxonomía de errores AppError.
```

**Patrón por entidad (respétalo al añadir features):** `domain` (enum/transición) → `validation` (Zod) → `application`
(comando/query con `requireCan(ctx.role, action)`, `orgEq`/scoping por organización, `recordAudit`, `mapDbError`,
`notFound`) → `api` (`withContext` de `@/lib/api`: CSRF-origin + rate-limit + sesión) → `ui`. Toda tabla lleva
`organization_id` y se filtra por él.

## Comandos (ejecutar desde `apps/control-tower/`)

```sh
pnpm dev                 # web en http://localhost:4270 (dev de Next)
pnpm -r typecheck        # typecheck de todos los paquetes
pnpm lint                # eslint
pnpm test                # unit (vitest, SIN base de datos)
pnpm test:integration    # integración: REQUIERE Postgres. DATABASE_URL='postgres://control_tower:control_tower@localhost:5432/control_tower'
bash scripts/e2e-journeys.sh   # e2e por journeys (J1..J14). Requiere web levantada + DATABASE_URL
pnpm build               # build (web standalone). El warning de BETTER_AUTH_SECRET en dev es esperado
pnpm --filter @ct/db generate|migrate|seed
```

Los tests de integración usan `inRollback` (transacción revertida) o limpian sus filas; es seguro correrlos contra la
DB de dev. Añade `DATABASE_URL=...` delante del comando.

## Docker / datos

- **Local** (`compose.yml`, `docker compose up`): `control-tower-{web,worker,db}-dev`. web → `localhost:4270`,
  Postgres → `127.0.0.1:5432` (user/pass/db = `control_tower`, imagen `postgres:18.3`). Es el **único** Postgres que
  queda fuera de `nbs-db`, a propósito: existe para levantar la app entera sin depender del repo `nbs-infra`, y los
  tests de integración apuntan a `localhost:5432`. **No corre en el servidor.** Los **datos persisten** en el volumen nombrado
  `ct_pgdata_dev` (Postgres 18: `PGDATA=/var/lib/postgresql/18/docker`, dentro del montaje). Sólo se borran con
  `docker compose down -v`.
- **Servidor** (`control-tower.docker-compose.{dev,prod,demo}.yml` + `deploy-control-tower.sh <dev|prod|demo>`):
  **control-tower ya NO lleva Postgres propio**. Su database `control_tower` vive en **`nbs-db`**, el único cluster
  del servidor (repo `nbs-infra`, carpeta `postgres/`, Postgres 18.3 + pgvector), con el rol `control_tower` como
  propietario y sin acceso a las databases de n8n/Twenty/Zammad. El compose sólo levanta `web` + `worker`, en la red
  `noboolsheet_db_<perfil>` además de `noboolsheet_network`. `nbs-db` se despliega **antes**
  (`nbs-infra/postgres/deploy-postgres.sh <perfil>`) y `deploy-control-tower.sh` aborta si no está healthy —
  `depends_on` no cruza proyectos de Compose. El deploy sigue corriendo las migraciones en el worker.
  Puertos 4270/4272/4274, ruta Caddy `control-tower.noboolsheet.local`. Migrar local→servidor = `pg_dump` +
  restore dentro de la database `control_tower` de `nbs-db`.

### Imágenes horneadas y hot-reload local
Las imágenes son **horneadas** (self-contained, inmutables) — correcto y **obligatorio en la Pi**. En **local**,
`compose.override.yml` (que `docker compose` fusiona automáticamente; la Pi NO lo usa) monta los `src/` del **worker**
y corre `tsx watch` → **el código del worker/application/integrations recarga en caliente al guardar**, sin rebuild.
- **`web`** sigue horneada: para iterar la UI usa `pnpm dev` (Next dev en :4270) en el host, o reconstruye la imagen web.
- **Cambio de dependencias** (`package.json`) o **cambio de `web`** sí requieren rebuild:
  ```sh
  docker compose build worker && docker compose up -d --force-recreate --no-deps worker
  ```
- **Cambio en `.env` / `env_file`:** `docker compose restart <servicio>` **NO** relee el `env_file` — reinicia el mismo
  contenedor con su entorno ya inyectado (creado). Para que las variables nuevas/cambiadas del `.env` entren hay que
  **recrear** el contenedor: `docker compose up -d --force-recreate --no-deps <servicio>`. (`docker restart` a secas
  tampoco relee `.env`; solo reinicia el proceso, útil para reforzar imports nuevos del worker con `tsx watch`.)

## Integraciones

Conectar en la UI `/automation/integrations` → **Sync now** encola `integration.<provider>.sync` → el worker corre
`adapter.pull()` (+ push). Idempotencia vía tabla `external_identities` (`UNIQUE(provider, external_type, external_id)`,
guarda `metadata.url` para "Open external"). Config por integración en `integrations.configuration` (jsonb): p. ej. los
IDs de las DBs de Notion en `configuration.databases.<key>` y el `folderId` de Drive.

- **Twenty**: pull (company→client, person→contact, opportunity→opportunity, task) + **write-back** (E-1): al editar un
  cliente/contacto **o task** ya sincronizado, o al mover el **stage** de una oportunidad (acción UPDATE de un USER),
  `recordAudit` encola `twenty.push` →
  `runTwentyEntityPush` → `PATCH /rest/{objeto}/{id}` con los campos gestionados (reverse mappers en `twenty/mapper.ts`;
  compuestos name/emails/phones/domainName/amount con su forma exacta). Solo actualiza existentes (id por
  `external_identities`); Twenty está alineado 1:1 con CT (**13 stages**, industry TEXT) — si los enums se separan
  no salta ningún error: el pull cae a `LEAD` y el push devuelve `400` (pasó, ver ADR-002 addendum 2026-09-02). **Propiedad por campo en task:** el
  **título** lo posee Twenty (inmutable en CT, se re-pisa en el pull); la **fecha** la posee CT (el pull NO la pisa y el
  write-back `taskPatch` empuja `dueDate`→`dueAt` a Twenty). **Opportunity (ADR-008):** CT es **sólo su máquina de
  estados** — no se crean en CT (`createOpportunity` rechaza actores USER), no hay `PATCH` del registro, y
  `opportunityPatch` empuja **únicamente `stage`**. Ver "inmutabilidad por procedencia" (`@ct/domain/ownership`).
- **Notion**: bidireccional con **propiedad por campo** — CT es dueño de las propiedades estructuradas (push CT→Notion),
  Notion es dueño del cuerpo de la página. Motor genérico `syncNotionEntity` + `notion-specs.ts` (una spec por entidad).
  Specs **push-only** (sin `importFromNotion`, p. ej. `resources`): CT único dueño, nunca importa → sin ciclos.
- **Si un write-back falla** (F-22), el pull **no sobrescribe** ese registro (client/contact/opportunity con un
  `twenty.push` PENDING/PROCESSING/FAILED se saltan) y el fallo se ve y se reintenta en **Automatización › Estado del
  sistema › Envíos fallidos**. Así un cambio hecho en CT no desaparece en el siguiente sync.
- **Logs internos (F-24):** `jobs` y `outbox_events` son los logs **activos**; el barrido diario los **rota por
  tamaño** (5.000 filas terminadas → un lote comprimido en **`log_archives`**, con `kind` JOBS/OUTBOX y `seq` por tipo,
  y la tabla caliente vuelve a empezar). Lo PENDING/PROCESSING **no se archiva nunca** (es trabajo vivo). Todo
  descargable en CSV desde Estado del sistema (activo y lotes anteriores). Los logs de **Docker** rotan por compose
  (`max-size 10m`, `max-file 3`).
- **Historial de syncs (F-16):** cada ejecución escribe una fila en **`sync_runs`** (contadores + registros saltados
  con su motivo + error). Se ve en `/automation/integrations` ("última sync…", chip de saltados, badge «Con
  advertencias»). Un barrido diario conserva los 50 runs más recientes por proveedor.
- **GitHub / Drive**: sólo pull (referencias; nunca contenido de ficheros). Drive con service-account (`GOOGLE_SA_KEY_B64`);
  el listado es **recursivo** con `configuration.folderId` (recorre subcarpetas, salta las carpetas, indexa ficheros a
  cualquier profundidad).
- **Google Calendar**: sólo pull, eventos de hoy → caché `calendar_events` (reconcilia borrados). `GCAL_CALENDAR_ID`
  admite varios calendarios por coma. Ver `docs/INFORMATION_ORGANIZATION.md` para la organización de Drive/Notion.

**Push en tiempo real (Fase 5):** `recordAudit` encola `notion.push` en el Outbox **sólo** para actores `USER` (no
SYSTEM/sync → no hay bucles) y sólo para entidades del set `NOTION_MIRRORED` (`packages/application/src/audit/index.ts`).

**Automatizaciones por evento (Fase 6, sin constructor visual — ERRATA-009):** handlers de código sobre el **Outbox
transaccional** (`emitOutbox` en la misma tx que el cambio). Ejemplo implementado: `opportunity.won` → crear proyecto
(`createProjectFromWonOpportunity`, idempotente). Registrados en `outboxRegistry` del worker.

## Reglas duras de seguridad (NO negociables)

- **SÓLO referencias, NUNCA secretos.** `credential_location` es un **puntero** al gestor de secretos (p. ej.
  "1Password → Clientes"), jamás el secreto. Las credenciales NO van en la DB ni en Notion.
- Secretos de integración en **`apps/control-tower/.env`** (gitignored; `.env.*` ignorado salvo `.env.example`),
  inyectados al **worker** vía `env_file`.
- Tokens de canales del Inbox: se guardan **hasheados** (SHA-256); el texto plano se muestra una sola vez al crear/regenerar.

## Convenciones

- Alias de import entre paquetes: `@ct/domain`, `@ct/db`, `@ct/db/schema`, `@ct/validation`, `@ct/application`, etc.
- **Entidad archivable nueva** ⇒ además de `ARCHIVABLE` (en `packages/application/src/maintenance/archive.ts`) hay
  que darle su sitio en `PURGE_ORDER` (hijo→padre, según las FKs reales) y, si tiene hijas NO archivables con FK hacia
  ella, borrarlas en `deleteDependents`. Si no, se archiva y **no se purga nunca**, sin error. Lo vigila
  `archive.test.ts` (`purgeOrderMissingEntities()` debe devolver `[]`).
- **Vocabulario (2026-09-01):** `resources` = **«Recursos»** (infraestructura operativa de proyecto/cliente) y
  `assets` = **«Reutilizables»** (catálogo de plantillas/repos). No volver a llamar «Activos» a ninguno de los dos: la
  palabra significaba las dos cosas y además el filtro de estado (`filter.active`). `deliverables` = «Entregables».
- **Migraciones aditivas** (el modelo base está congelado): `pnpm --filter @ct/db generate`, luego renombra el `.sql`
  con tag `NNNN_mXX_...` y edita `drizzle/meta/_journal.json`. `status`/enums nuevos con CHECK salvo que se quiera etiqueta libre.
- **Tema y foco:** el color vive en los tokens de `apps/web/app/globals.css` (ver `docs/DESIGN_TOKENS.md`) — nada de
  `neutral-*`/`dark:` a mano. El **foco de teclado** está resuelto globalmente (`:where(...):focus-visible` con
  `--ring`), así que un control nuevo no necesita nada; **nunca pongas `outline-none` sin dar una alternativa visible**.
- **Fechas:** siempre con `formatDate`/`formatDateTime`/`formatTime` de `lib/i18n/format.ts` (día/mes/año). **Nunca
  `toLocaleDateString()` a pelo**: sin locale usa el del navegador y salía `12/31/2026`.
- **⚑ i18n (E-10): TODO el texto de la interfaz va en `apps/web/lib/i18n/es.ts`** y se usa con `t('clave')` (o
  `tPlural('base', n)` para plurales). **Nunca escribas un literal visible en una vista.** Lo que **no** se traduce:
  los datos del usuario y lo importado de terceros (nombres de clientes, títulos de tareas, texto de Notion/Twenty).
  Los códigos de enum se muestran con `enumLabel` (lee `enum.<CODIGO>` del diccionario) → **al añadir un enum cerrado
  nuevo, añade sus códigos ahí**; hay un test que falla si falta alguno. Para añadir un idioma: copiar `es.ts`,
  traducir los valores y hacer que `resolveLocale()` devuelva la preferencia real (ninguna vista cambia).
- **Auditoría:** todo comando de escritura registra `recordAudit`; los cambios de estado añaden `recordChangeEvent`
  (`STATUS`) y las ediciones de metadatos `recordFieldChanges` (diff campo a campo, F-4). Se ve en el bloque
  «Historial» del panel lateral (`GET /api/v1/history`).
- Verificación antes de commit: **typecheck · lint · unit · (integración si aplica) · build · e2e-journeys**. Un commit por sub-fase.
- **Cerrar lo anotado** (ver «⚑⚑ REGLA DE CIERRE» arriba): antes de commitear, marca en los `.md` lo que acabas de
  resolver — con la fecha y el cómo — y añade la entrada al `BUILD_LOG.md`.
- Documentación en español (como el resto de `docs/`). Mensajes de commit terminan con la línea `Co-Authored-By:` habitual.
