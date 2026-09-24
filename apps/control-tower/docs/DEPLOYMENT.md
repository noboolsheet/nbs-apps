# Control Tower — Deployment (Raspberry Pi / self-hosted)

Runbook de despliegue (modelo-1 del monorepo). Target: Linux **ARM64**/x64 con Docker + Compose + Caddy.
Puertos **4270 (dev) / 4272 (prod)**; ruta Caddy `control-tower.noboolsheet.local`.

## Compatibilidad ARM64
Todas las imágenes son oficiales multi-arch (funcionan en la Pi):
- `node:24-slim` (web + worker) · `postgres:18` (db) · `caddy` (reverse proxy, ya desplegado en `infrastructure/caddy`).
El **dominio es portable** (doc 4 §29): Pi → VPS → cloud sin cambiar el código.

## Gate previo a producción (IMP-010)
```
[ ] Imágenes ARM64 (node:24-slim, postgres:18, caddy) — OK
[ ] apps/control-tower/.env con POSTGRES_* + BETTER_AUTH_SECRET (aleatorio largo) + claves de integración
[ ] CONTROL_TOWER_DATA_DIR definido en envs/.env.prod (bind-mount persistente)
[ ] Migraciones reproducibles desde cero (verificado en cada milestone)
[ ] Backups + prueba de restauración (scripts/backup.sh + restore.sh) — verificado
[ ] Healthchecks (web /api/health; db pg_isready) — en el compose
[ ] Restart policy (unless-stopped) — en el compose
[ ] HTTPS vía Caddy (tls internal o dominio)
[ ] Reverse proxy: bloque en infrastructure/caddy/CaddyFile — añadido
```

## Primer despliegue (en la Pi)
```sh
# 1. Secretos de la app (gitignored). Genera un secret fuerte:
cd apps/control-tower
cp .env.example .env
#   edita .env: POSTGRES_PASSWORD, BETTER_AUTH_SECRET=$(openssl rand -hex 32), TWENTY_API_KEY, ...

# 2. Deploy (crea la red, el dir de datos, levanta web+worker+db y aplica migraciones)
./deploy-control-tower.sh prod

# 3. Reverse proxy (una vez; primero en el orden)
../../infrastructure/caddy/deploy.sh

# 4. Verifica salud
curl -s http://<IP-Pi>:4272/api/health        # {"status":"ok"}
curl -s http://<IP-Pi>:4272/api/health/db      # {"status":"ok"} cuando la db responde
```
`deploy-control-tower.sh` carga `envs/.env.prod` + `apps/control-tower/.env`, crea `CONTROL_TOWER_DATA_DIR`
(bind-mount de PostgreSQL), levanta el stack y ejecuta `pnpm --filter @ct/db migrate` en el worker.

> ⚠️ **Usa SIEMPRE el script para desplegar/recrear**, nunca `docker compose …` a pelo. El `DATABASE_URL` de
> prod se construye de `POSTGRES_USER/PASSWORD/DB`, que viven en `apps/control-tower/.env` y **solo el script
> los carga al shell** para la interpolación. Un `docker compose` manual sin cargarlos generaría una URL con
> usuario vacío (→ fallo `password authentication failed for user "root"`). El compose ahora tiene guardas `:?`
> que **abortan con un error claro** si faltan esas variables, en vez de romperse en silencio. Si de verdad
> necesitas un compose manual: `set -a; source apps/control-tower/.env; source ../../envs/.env.prod; set +a` antes.

## Bootstrap del primer usuario/organización
El registro crea el usuario (Better Auth) pero la **membresía de organización** se siembra una vez:
```sh
# opción A: seed de desarrollo (crea org + owner de ejemplo)
docker compose --env-file ../../envs/.env.prod -f control-tower.docker-compose.prod.yml exec worker pnpm --filter @ct/db seed
# opción B: registra tu usuario en /login y enlázalo a una org por SQL (una sola vez).
```

## Conectar integraciones (Twenty / Notion / GitHub / Google Drive)
Los secretos van en `apps/control-tower/.env` (gitignored) y los **lee el worker** al ejecutar un job de sync
(ver plantilla en `.env.example`):
- **Twenty** (self-hosted): `TWENTY_API_URL=http://twenty.app.prod:3000` (DNS interno de Docker),
  `TWENTY_API_KEY` (créala en Twenty → Settings → APIs & Webhooks), y `TWENTY_CRM_URL=http://<TWENTY_TS_IP>:3000`
  (URL del navegador vía Tailscale) para el enlace "Open in CRM". Desde una máquina de dev que no resuelve
  `twenty.app.prod`, apunta `TWENTY_API_URL` a la IP de Tailscale.
- **Notion**: `NOTION_API_KEY` (integración interna; comparte con ella las páginas/DB).
- **GitHub**: `GITHUB_TOKEN` (PAT lectura de repos) + opcional `GITHUB_OWNER`.
- **Google Drive y Google Calendar**: `GOOGLE_SA_KEY_B64` = clave JSON de una **cuenta de servicio** en base64 (el
  token se renueva solo; comparte con su email la carpeta de Drive y los calendarios). Scoping de Drive por
  `integrations.configuration.folderId`; calendarios en `GCAL_CALENDAR_ID` (admite varios por coma).
  `GOOGLE_DRIVE_TOKEN`/`GOOGLE_CALENDAR_TOKEN` quedan sólo como **fallback de desarrollo** (access token estático que
  caduca ~1h). Valida siempre que el base64 decodifica a JSON válido antes de sincronizar.

Tras editar `.env`, recarga el worker (`./deploy-control-tower.sh <env>` o reinicia el contenedor worker).
Luego en la UI `/automation/integrations`: **Connect** el proveedor → **Sync now**. El estado (ACTIVE/ERROR) y
`lastHealthCheckAt` se actualizan al terminar el sync; el detalle en `/automation/health`.

> **`dev-sync` es solo de desarrollo.** El script `apps/worker/scripts/dev-sync.ts` sirve para conectar+encolar
> un sync desde la CLI en local; **en prod NO se usa**. En prod las integraciones funcionan igual porque el sync lo
> ejecuta el **worker** (mismo código) con los secretos del `.env` (via `env_file`), y el **scheduler** las encola
> **una vez al día** a `SYNC_DAILY_HOUR` (7am por defecto) en la zona horaria de la org. Si conectaste en local con `dev-sync`, el `displayName` queda como
> "PROVIDER (dev-sync)" — es **cosmético**; en prod conecta por la UI y saldrá el nombre correcto.

## Acceso por IP de Tailscale (prod)
Para acceder a CT por la **IP de Tailscale** del Pi (puerto de prod **4272**), en `apps/control-tower/.env`:
```sh
APP_URL=http://<IP-TAILSCALE>:4272
BETTER_AUTH_URL=http://<IP-TAILSCALE>:4272   # DEBE coincidir con el origen exacto o el login falla
```
- El origen (`Origin`/`Host`) debe coincidir con `BETTER_AUTH_URL`; si accedes por **varias** URLs a la vez
  (IP de Tailscale **y** el hostname de Caddy `https://control-tower.noboolsheet.local`), lista ambas en
  `BETTER_AUTH_TRUSTED_ORIGINS` (separadas por coma).
- Por HTTP (IP directa) la cookie de sesión **no** es Secure (aceptable dentro de la red cifrada de Tailscale).
  Para cookies Secure, accede por Caddy con HTTPS y pon `BETTER_AUTH_URL=https://control-tower.noboolsheet.local`.

## Configuración de integraciones en la DB del Pi (Drive/Notion)
Twenty, GitHub y Calendar se configuran **solo con `.env`** (no usan `integrations.configuration`). **Drive**
(`folderId`) y **Notion** (`databases`) guardan su config en la fila de `integrations` (jsonb no sensible).

**Desde la UI (recomendado, sin tocar la DB):** `/automation/integrations` → **Connect** el proveedor → abre
**"Configuración"** en su fila y pega el JSON:
- Drive: `{ "folderId": "<ID de la carpeta compartida con la service account>" }`
- Notion: `{ "databases": { "decisions": "<id>", "projects": "<id>", … } }` (los 10 IDs; ver
  [`NOTION_INFORMATION_ARCHITECTURE.md`](./NOTION_INFORMATION_ARCHITECTURE.md) §9). Guarda → **Sync now**.

Los **secretos** (API keys, tokens, `GOOGLE_SA_KEY_B64`, `GCAL_CALENDAR_ID`) siguen en `.env`, **nunca** en la
configuración. Alternativa: migrar la DB local con `pg_dump`/`restore` (trae integraciones + configuration + datos).

## ⚠ Mover Control Tower a otro servidor: `pg_dump` completo, NO repoblar desde los orígenes

**La única forma correcta de migrar CT es restaurar el backup entero**, con la tabla `external_identities`
incluida. Levantar CT con la base vacía y «volver a sincronizar» **duplica los datos por diseño**, y pasó de
verdad en la migración Raspberry Pi → vibox (2026-09-24).

Por qué: la idempotencia de los syncs vive en `external_identities`, que mapea
`(proveedor, tipo, id externo) → id interno`. Es una tabla **local de CT**: Notion, GitHub y Twenty no saben
nada de ella. Con esa tabla vacía y los orígenes llenos, el import de Notion crea un registro por página y el
sync de GitHub crea **otro** por repo, sin que nada los cruce; y el push de vuelta crea páginas nuevas en
Notion. Una copia más de todo por cada arranque en vacío.

```sh
# EN EL SERVIDOR VIEJO
DB_CONTAINER=nbs-db.prod DB_EXEC_USER=postgres POSTGRES_USER=postgres \
  POSTGRES_DB=control_tower BACKUP_DIR=/ruta ./scripts/backup.sh

# EN EL NUEVO: primero nbs-db, luego el restore, y SÓLO DESPUÉS levantar CT y sincronizar
nbs-infra/postgres/deploy-postgres.sh prod
DB_CONTAINER=nbs-db.prod DB_EXEC_USER=postgres POSTGRES_USER=postgres \
  TARGET_DB=control_tower ./scripts/restore.sh <backup.sql.gz>
./deploy-control-tower.sh prod
```

Desde M40 el daño está acotado aunque se haga mal —GitHub **adopta** el asset que ya existe con su misma URL en
vez de duplicarlo, y la reconciliación archiva lo que ya no está en el origen— pero eso es una red de seguridad,
no el procedimiento. Si te encuentras la base ya duplicada, el arreglo es el script de limpieza:

```sh
# Informe, no escribe nada. Cuatro fases: identidades huérfanas · duplicados en CT · repos muertos · Notion.
docker compose exec worker pnpm --filter @ct/worker exec tsx src/scripts/cleanup-duplicates.ts
# …repásalo y entonces:
docker compose exec worker pnpm --filter @ct/worker exec tsx src/scripts/cleanup-duplicates.ts --apply
```

**Haz un backup antes del `--apply`.** Lo que archiva se recupera desde Ajustes › Archivados; lo que borra son
punteros de sync, que se regeneran en el siguiente sync.

**Y nunca `pnpm --filter @ct/db seed` en un CT con datos reales:** hace `TRUNCATE` de todas las tablas,
`external_identities` incluida — es decir, deja la base en el estado exacto que provoca el duplicado. El deploy
sólo lo ejecuta en el perfil `demo`.

## Backups y restauración (old_9 §28 — "un backup nunca restaurado no cuenta")
En el servidor **la base ya no es de control-tower**: la database `control_tower`
vive en `nbs-db`, el único cluster Postgres del servidor (repo `nbs-infra`,
carpeta `postgres/`). El backup diario de TODAS las databases lo hace
`nbs-infra/scripts/backup.sh`; lo de aquí es para copias puntuales.

```sh
# Backup manual (prod), contra el cluster compartido:
DB_CONTAINER=nbs-db.prod DB_EXEC_USER=postgres POSTGRES_USER=postgres \
  POSTGRES_DB=control_tower BACKUP_DIR=/opt/noboolsheet/control-tower-backups \
  ./scripts/backup.sh

# Prueba de restauración (a una base NUEVA, sin tocar prod) — hazla periódicamente.
# Crear una database exige el superusuario: el rol `control_tower` sólo es
# propietario de la suya.
DB_CONTAINER=nbs-db.prod DB_EXEC_USER=postgres POSTGRES_USER=postgres \
  ./scripts/restore.sh <backup.sql.gz>
```
El backup incluye `--clean --if-exists`; el restore por defecto crea `control_tower_restore` para no pisar prod.
**Regla:** guarda una copia de los backups fuera del servidor.

## Recuperación ante desastre
Reconstruible desde: **Git (código) + apps/control-tower/.env (config) + último backup de PostgreSQL**.
```
git clone → cp .env → deploy-control-tower.sh prod → restore.sh <backup> (TARGET_DB=<db real>)
```

## Actualizaciones
```sh
git pull && ./deploy-control-tower.sh prod   # rebuild + up -d + migrate (idempotente)
```

## Observabilidad
Logs estructurados (JSON) a stdout de web/worker (`docker logs`). Estado operativo en la UI:
`/automation` (jobs/outbox) y `/automation/health` (System Health). Métricas/tracing avanzados = Fase 2.

### Medir el rendimiento (E-14)

Toda consulta a Postgres va **instrumentada** (`packages/db/src/instrument.ts`), en web y en worker. Dos salidas:

- **Cabecera `Server-Timing`** en todas las rutas `/api/v1/*`: `db;dur=<ms>;desc="suma de N consultas"` y
  `total;dur=<ms>`. Se ve en la pestaña **Red** del navegador sin instalar nada.
  `db` es la **suma** de la latencia de las consultas (emisión → resultado, con la espera por una conexión libre
  dentro), **no** tiempo de pared: con consultas paralelas puede superar a `total`, y eso es buena señal.
- **Aviso de consulta lenta** en el log: cualquier consulta que pase de `DB_SLOW_QUERY_MS` (por defecto **200 ms**)
  sale como `warn` con su SQL recortado y sin parámetros.

```sh
# Ver las lentas mientras usas la app
docker logs -f control-tower-app.prod 2>&1 | grep 'consulta lenta'

# Sesión de diagnóstico: registrar TODAS las consultas (no dejarlo puesto)
#   añade DB_LOG_QUERIES=true y LOG_LEVEL=debug al .env y recrea el contenedor
docker compose -f control-tower.docker-compose.prod.yml up -d --force-recreate --no-deps web
```

**Medición completa, desde la propia Pi:**

```sh
CT_EMAIL=tu@correo CT_PASSWORD=tuclave ./scripts/measure-perf.sh http://localhost:4272 3
```

Imprime el tiempo de pared por página (1ª pasada en frío, mejor y media) y el reparto `db`/`total` de las rutas de
API. **Cómo interpretarlo:**

| Lo que ves | Qué significa |
|---|---|
| Páginas lentas y `db` **alto** | Es la base de datos: consultas o índices |
| Páginas lentas y `db` **bajo** | **No** es la base de datos → render, Node, E/S o memoria. Mira `free -h` y `docker stats` (ojo: si `docker stats` da `0B`, ver la nota del cgroup de memoria más abajo) |
| 1ª pasada lenta, 2ª rápida | Arranque en frío, no un problema de estado estacionario |

> Referencia medida en el portátil (Postgres local, pocos datos): páginas **12–27 ms**, `/api/v1/context/home`
> **28 consultas**. Si en la Pi el mismo endpoint da un `db` parecido pero la página tarda segundos, el problema
> **no** está en las consultas.

### ⚠ Techo de memoria: hay que activar el cgroup en la Pi (F-31)

Los tres servicios llevan `mem_limit` en los compose de la Pi, pero **Raspberry Pi OS trae el cgroup de memoria
desactivado** desde el device tree (`cgroup_disable=memory` en `/proc/cmdline`). Con eso, al levantar los
contenedores Docker avisa —*«Your kernel does not support memory limit capabilities or the cgroup is not mounted.
Limitation discarded.»*— **descarta el límite** y arranca igual. Nada falla, pero no hay techo: una fuga se lleva la
Pi entera. Y `docker stats` devuelve `0B` para todo, así que tampoco se puede medir por contenedor.

Se activa una sola vez, y requiere reinicio:

```sh
sudo cp /boot/firmware/cmdline.txt /boot/firmware/cmdline.txt.bak
sudo sed -i '1 s/$/ cgroup_enable=memory cgroup_memory=1/' /boot/firmware/cmdline.txt
cat /boot/firmware/cmdline.txt          # debe seguir siendo UNA sola línea
sudo reboot
```

Comprobación tras el reinicio: `memory` debe aparecer en `/sys/fs/cgroup/cgroup.controllers`, y `docker stats` debe
mostrar uso y límite reales en vez de `0B / 0B`.

> Nota: los contenedores **sí pueden usar swap** (no se pone `memswap_limit`). En esta Pi el swap es **zram**
> —comprimido y en RAM— y la raíz está en un SSD, no en la tarjeta SD: swapear sale barato y hace de colchón ante un
> pico, mientras que prohibirlo sólo adelantaría el OOM.
