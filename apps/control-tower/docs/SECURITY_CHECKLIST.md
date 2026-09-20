# Control Tower — Checklist de seguridad

> **Propósito.** Checklist reutilizable que **toda versión de la app debe pasar** antes de exponerse o
> desplegarse. Complementa a [`SECURITY.md`](./SECURITY.md) (baseline M17) con una revisión exhaustiva por
> dominios y el veredicto actual. Re-evaluar en cada release y antes de cada cambio de exposición de red.
>
> **Contexto actual:** self-hosted en la Raspberry Pi, acceso por LAN + Tailscale, **un solo usuario (owner)**.
> Los controles marcados 🔵 **solo aplican cuando la app sea pública / multiusuario**; se dejan anotados para
> ser conscientes de ellos, no son deuda urgente hoy.
>
> **Última revisión:** 2026-09-01 (repaso de estados contra el código; la evaluación original es del 2026-08-13).
> Los ítems que se han resuelto desde entonces llevan **✅ RESUELTO** con su fecha.

**Leyenda:** ✅ cumple · ⚠️ parcial / conviene endurecer · 🔴 gap a corregir · 🔵 futuro (público/multiusuario) ·
⬜ N/A ahora.

---

## 1. Autenticación y sesiones
- ✅ **Hashing de contraseñas** gestionado por Better Auth (scrypt + salt); nunca en la DB de dominio. (`apps/web/lib/auth.ts`, `schema/auth.ts`)
- ✅ **`BETTER_AUTH_SECRET`** sin fallback inseguro en el código de la app (`auth.ts`). El único hardcode es dev-only (`compose.yml`, `playwright.config.ts`).
- ✅ **Cookies de sesión HttpOnly**, `SameSite=Lax`, expiración 7 días (sliding 1 día).
- ⚠️ **Flag `Secure` de la cookie** depende de que `BETTER_AUTH_URL`/`APP_URL` empiecen por `https://`. Con la plantilla actual (`http://localhost:4270`) la cookie sale **no-Secure**. → Verificar que en prod la URL sea `https://control-tower.noboolsheet.local`.
- ⚠️ **Política de contraseñas** mínima (`minPasswordLength: 8`, sin complejidad ni chequeo de brechas).
- ⚠️ **Anti-fuerza-bruta:** rate-limit global de Better Auth (30/min en endpoints de auth), **sin bloqueo por cuenta**. Suficiente single-user; endurecer si se abre.
- ⬜/🔵 **Verificación de email / 2FA / OAuth**: desactivado (MVP). Requerido antes de abrir a público.
- ✅ **RESUELTO (2026-09-02) — guarda de `BETTER_AUTH_SECRET`.** `webEnvSchema` (en `packages/validation/src/env.ts`) lo exige y valida ≥32 caracteres; `apps/web/instrumentation.ts` corre `loadWebEnv()` **al bootstrap del servidor**, así que un despliegue sin la variable **no arranca** y el log dice qué falta. Se salta durante `next build` (mismo criterio que `requireDatabaseUrl()`).
  *Modo de fallo anterior, comprobado en vivo: la web **arrancaba igual** (`/api/health` = 200) y sólo reventaba al iniciar sesión, con un `500 Error interno`. El peor caso: parece que va.* Además `deploy-control-tower.sh` aborta antes de desplegar si falta o es corto.

## 2. Autorización y aislamiento multi-tenant
- ✅ **RBAC por rango** (`requireCan(role, action)`, OWNER>ADMIN>MEMBER>VIEWER) en todas las escrituras. (`packages/application/src/auth/policies.ts`)
- ✅ **Aislamiento por organización** (`orgEq`/`scopedWhere`) en **todas** las lecturas y escrituras, incluidos los detalles por-id (`and(eq(table.id,id), orgEq(...))`). Verificado en todos los `*/queries.ts` y `*/commands.ts`.
- ✅ **Rol no falsificable desde el cliente**: `OrgContext` se deriva en el servidor de `organization_members` con el `session.user.id`. (`auth/context.ts`)
- ✅ **Cobertura de `requireCan`** en create/update/delete/status (los pocos sin él son delegadores internos o solo-worker, no alcanzables por ruta).
- ✅ **RESUELTO (2026-08-31)** — **registro bootstrap-only**: el hook `databaseHooks.user.create.before` de `auth.ts`
  sólo permite crear el PRIMER usuario; a partir de ahí devuelve `FORBIDDEN`. Escape hatch documentado
  (`ALLOW_OPEN_REGISTRATION=true`) para añadir una cuenta a mano mientras no haya invitaciones. Lo que queda para
  público sigue siendo el **flujo de invitaciones** (Parte II.B / E-11). *(Era: cualquiera que alcanzara `/api/auth/sign-up`
  se unía a la primera org como OWNER.)*
- ⚠️ **Contadores de infra sin scope de org** (jobs/outbox PENDING en Home/System Health): solo exponen agregados de la cola, sin datos de tenant. Negligible en single-tenant; revisar al hacer multi-org.

## 3. Validación de entrada e inyección
- ✅ **Validación Zod** en el boundary de aplicación (create/update schemas `.parse()`); errores → HTTP 400. (`packages/validation`, `*/commands.ts`)
- ✅ **SQL injection: sin riesgo.** Drizzle + postgres.js parametrizan todo. `sql.raw` solo en DDL/constantes (`_shared.ts inValues/searchVector`); la búsqueda full-text usa bind params y escapa wildcards en ILIKE (`search/index.ts`).
- ✅ **SSRF: sin riesgo.** Todas las URLs base de integraciones son fijas por env/hardcode (Twenty/Notion/GitHub/Drive/Calendar); solo IDs de ruta vienen de config admin, nunca de entrada de usuario. (`apps/worker/src/index.ts`, `integrations/*/client.ts`)
- ⚠️ **Params de ruta UUID sin validar**: `{id}`/`{channelId}` van crudos a Drizzle `eq` (seguro de SQLi por parametrización), pero un id no-UUID da 500 en vez de 404/400. → Validar con `z.string().uuid()` en las rutas.
- ⚠️ **Drive `q` interpola `folderId` sin escapar** (`drive/client.ts`): inyección en la *query de Drive* (no SQL), origen admin, host fijo. → Validar `folderId` con `^[A-Za-z0-9_-]+$`.
- ⚠️ **Notion interpola `databaseId`/`pageId` sin `encodeURIComponent`** en la ruta (`notion/client.ts`): host fijo, valores admin. Bajo; encodear por higiene.

## 4. Salida / XSS
- ✅ **Sin `dangerouslySetInnerHTML`** en el código de la app (grep = 0).
- ✅ **Escape por React** en todo. El renderer de markdown propio (`components/markdown.tsx`) construye nodos React (auto-escapados); su fuente es la guía **estática compilada** (`content/user-guide.md`), no entrada de usuario.
- ✅ **RESUELTO (2026-09-01)** — `markdown.tsx` **sanea el esquema del `href`**: sólo `http(s)`, relativo, ancla o
  `mailto:`; cualquier otro (p. ej. `javascript:`) cae a `#`.

## 5. Secretos y credenciales
- ✅ **Sin secretos hardcodeados** (scan = 0); todo desde `process.env` o `integrations.configuration`.
- ✅ **`.env` gitignored y no trackeado**; `.env.example` sin secretos reales.
- ✅ **Secretos de integración NUNCA en la DB** (`integrations.configuration` solo config no sensible).
- ✅ **Tokens de canales del Inbox hasheados** (SHA-256; el texto plano se muestra una sola vez). (`inbox-channels/index.ts`)
- ✅ **`credential_location` es un puntero**, nunca el secreto (columna comentada + `max(300)`). (`schema/operations.ts`, `validation/resources.ts`)
- ⚠️ **Logger sin redacción**: `packages/shared/src/logger.ts` serializa cualquier campo tal cual (la regla "no loguear secretos" es convención, no está forzada). **Sin infractores actuales** (se loguean ids/resúmenes). → Añadir redacción por lista de claves sensibles (token/password/secret/authorization/…).

## 6. Transporte, cabeceras y cookies
- ✅ **Cabeceras de seguridad** en `next.config.mjs`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`. Caddy añade un subconjunto.
- ✅ **CSRF**: chequeo `Origin` vs `Host` en `withContext` + `SameSite=Lax` de backstop.
- ⚠️ **CSRF sin token** y **peticiones sin `Origin` permitidas** (para curl/API): defensa same-origin, no token. Aceptable (un cliente sin Origin tampoco lleva cookie de sesión). Considerar double-submit token si se abre.
- ✅ **TLS terminado en Caddy** (`tls internal`, LAN). Worker y DB no se exponen por Caddy.
- 🔴 **HSTS ausente**: correcto con `tls internal` (cert propio); 🔵 **obligatorio si se usa un dominio/cert público real.**
- ✅/⚠️ **CSP añadida (2026-09-01)** en `next.config.mjs`: política **conservadora** (con `unsafe-inline`, y `unsafe-eval`/`ws:`
  sólo en dev) que ya cubre `frame-ancestors`. Endurecerla con `nonce`/`hash` sigue en la Parte II.C para el lanzamiento
  público.

## 7. Infraestructura y despliegue
- 🟡 **Contraseña de Postgres por defecto** (`control_tower`/`control_tower`) en el `.env`. La red Docker aísla el 5432 en prod, pero es un endurecimiento trivial. **Es acción del owner en la Pi** (el `.env` es por-máquina y no está en el repo): desde el 2026-09-02 `deploy-control-tower.sh` **avisa en cada despliegue** si sigue siendo la de por defecto e imprime el procedimiento. No aborta a propósito: rotarla con la base ya creada exige un `ALTER USER` además de tocar el `.env`, y abortar dejaría al owner sin poder desplegar.
  **Para rotarla:** `ALTER USER control_tower WITH PASSWORD '<nueva>';` → actualiza `POSTGRES_PASSWORD` en `apps/control-tower/.env` → vuelve a desplegar.
- ❌ **Contenedores como root — NO se cambia (decisión del owner, 2026-09-01).** Web y worker corren como root; se acepta
  para un despliegue single-user tras Tailscale porque el cambio arriesga problemas de permisos en los bind-mounts de la
  Pi. Reabrir si la app se expone públicamente (Parte II).
- 🔴 **App publicada en `0.0.0.0:4272` en HTTP plano**, saltándose Caddy (TLS + cabeceras). En LAN de confianza es el patrón documentado, pero expone cookies de sesión en claro por ese puerto. → Bindear a loopback/bridge y forzar el tráfico por Caddy (o aceptarlo como decisión consciente en LAN).
- ✅ **Imágenes horneadas/inmutables** en prod; el bind-mount de `src` es solo `compose.override.yml` (nunca en la Pi).
- ✅ **Postgres NO expuesto al host** en el deploy de la Pi (solo red interna); el `5432:5432` es solo del compose local de dev.
- ✅ **Sin secretos horneados** en la imagen (van por `env_file`/`environment` en runtime).
- 🟡 **Validación de env parcial** (acotado el 2026-09-02): `BETTER_AUTH_SECRET` ✅ ya se valida y la web ✅ ya hace fail-fast al arrancar (`instrumentation.ts`). **Queda**: los secretos de integración (`NOTION_API_KEY`, `TWENTY_API_KEY`, `GOOGLE_SA_KEY_B64`…) siguen sin validarse — hoy fallan en el job del sync, con su error visible en «Envíos fallidos», que es un modo de fallo aceptable.
- 🟡 **PARCIAL (2026-09-02)** — hay `mem_limit` en los tres servicios, configurable por `.env` y con valores medidos (`memswap_limit` se retiró: el swap de la Pi es zram, en RAM). **Pero en la Pi no se aplicaba**: el kernel trae el cgroup de memoria desactivado y Docker descarta el límite con un aviso. Falta activar `cgroup_enable=memory` en `/boot/firmware/cmdline.txt` y reiniciar — ver **F-31**. Enunciado original: **Ningún servicio tenía límite de memoria ni de CPU**: `control-tower.docker-compose.prod.yml` no declara `deploy.resources.limits` ni `mem_limit` en web/worker/db. En una Raspberry Pi eso significa que un proceso con una fuga se lleva por delante **la máquina entera**, no sólo su contenedor. Los logs sí están acotados (`max-size 10m`, `max-file 3`). → Poner `mem_limit` en los tres, con el margen más generoso para la base de datos. Ver **F-31** en `FINDINGS_AND_DEFERRED.md`.
- ✅ **RESUELTO (2026-09-02)** — **1,35 GB → 413 MB** con una etapa `--prod --filter "@ct/worker..."`. Enunciado original: **La imagen del worker llevaba el proyecto entero**: el target `worker` del `Dockerfile` parte de la etapa `deps` — código fuente completo, `devDependencies` incluidas, y ejecuta TypeScript con `tsx` en producción. La web sí es `standalone` y mínima. Más superficie de la necesaria justo en el servicio que habla con **todas** las APIs externas. → Compilar en una etapa aparte y copiar sólo el resultado + dependencias de producción. Ver **F-31**.

## 8. Logging, auditoría y manejo de errores
- ✅ **AuditLog** (quién hizo qué) append-only; **ChangeEvent** (diffs) separado. Soft-delete/archive por defecto, sin cascadas destructivas.
- ✅ **Errores sin fuga de internals** al cliente: ZodError → detalles saneados; AppError → `toClientError`; resto → genérico `INTERNAL` sin stack ni `cause`. Los cuerpos de error de integraciones quedan en logs de servidor, no en la respuesta.
- ✅ **RESUELTO (2026-09-01)** — cobertura de auditoría **completa** (FINDINGS C-1) y, además, **diff campo a campo** en
  las ediciones (`recordFieldChanges`, F-4), visible en el bloque «Historial» del panel lateral.

## 9. Dependencias y cadena de suministro
- ✅ **Lockfile** (`pnpm-lock.yaml`) versionado; imágenes reproducibles.
- ⚠️ **`pnpm audit`: 11 vulnerabilidades** (1 crítica, 4 altas, 6 moderadas) — **casi todas en herramientas de dev/build que no se despliegan**: `vitest` (crítica, solo con `--ui`), `vite`/`esbuild`/`launch-editor` (dev server), `postcss` (build, vía Next). La única que llega al runtime es **`sharp`** (optimización de imágenes de Next; la app no procesa imágenes de usuario). → Actualizar Next cuando haya release parcheada; re-correr `pnpm audit` cada release. Riesgo real hoy: bajo.
- 🔵 Automatizar `pnpm audit` (o Dependabot/Renovate) en CI antes de exponer público.

## 10. Protección de datos y backups
- ✅ **RESUELTO en M18** — `scripts/backup.sh` + `scripts/restore.sh` con **simulacro de restauración verificado**
  (ver el tracker de `IMPLEMENTATION_ROADMAP.md` y `DEPLOYMENT.md`). Queda como tarea **operativa** del owner: comprobar
  cada cierto tiempo que el backup de la Pi sigue corriendo y se puede restaurar.
- ⚠️ **Cifrado en reposo**: los datos viven en el volumen/bind-mount de la Pi; no hay cifrado a nivel app. Considerar cifrado de disco en la Pi si el hardware es físicamente accesible.
- ✅ **Retención**: barridos diarios de tareas completadas, **archivados**, **bandeja procesada** e **historial de syncs**;
  el historial de auditoría se conserva.
- 🔵 **RGPD / borrado de datos de usuario** (export + delete): aplica al ser multiusuario/público.

---

# Parte II — Checklist para LANZAMIENTO PÚBLICO en internet

> Todo lo anterior (Parte I) es el baseline self-hosted. Cuando la app pase de la LAN/Tailscale a estar
> **expuesta en internet y usada por varias personas**, hay que cumplir además **todo lo de abajo**. Nada de
> esto urge hoy (single-user tras Tailscale); se documenta para abordarlo **antes de abrir la app**. Todos los
> ítems arrancan ⬜ (pendiente). Tratar esta Parte II como el **gate de salida a producción pública**.

## II.A — Exposición y borde (edge)
- ⬜ **TLS público real** (ACME/Let's Encrypt en Caddy), solo **TLS 1.2+/1.3**, cifrados modernos; renovación automática.
- ⬜ **HSTS** (`max-age` largo + `includeSubDomains`; `preload` solo cuando estés seguro). (Parte I §6)
- ⬜ **WAF** (reglas OWASP Core Rule Set) delante de la app — Cloudflare/Caddy+coraza/otro.
- ⬜ **Protección DDoS / anti-abuso a nivel edge** (CDN + rate-limit distribuido; challenge/CAPTCHA ante picos).
- ⬜ **CDN** para estáticos + caché; reduce superficie y coste.
- ⬜ **Cerrar el acceso directo**: solo el borde (Caddy/CDN) expuesto; app/worker/DB en red privada (hoy el puerto 4272 se publica en `0.0.0.0`). (Parte I §7)
- ⬜ **Gestión de bots** (bloqueo de scrapers/credential-stuffing; robots, rate-limit por IP/ASN).
- ⬜ **Allow/deny lists + geobloqueo** si el negocio lo permite (reduce ruido de ataque).

## II.B — Identidad y acceso
- ⬜ **Cerrar el registro abierto** → invitaciones/aprobación; **nunca** auto-asignar OWNER de una org existente. (Parte I §2)
- ⬜ **Verificación de email** obligatoria en el alta.
- ⬜ **2FA/MFA** (TOTP/passkeys) y/o **SSO/OAuth** (Google/Microsoft).
- ⬜ **Política de contraseñas fuerte** + comprobación contra brechas (HIBP/k-anonymity).
- ⬜ **Bloqueo por cuenta / backoff** ante intentos fallidos; **CAPTCHA** en login/registro/reset.
- ⬜ **Anti-enumeración de cuentas** (respuestas y tiempos uniformes en login/registro/reset).
- ⬜ **Gestión de sesiones**: revocación, listado de dispositivos, expiración/rotación, invalidar al cambiar contraseña.
- ⬜ **Flujo de reset de contraseña** seguro (token de un solo uso, caducidad corta, sin filtrar existencia).
- ⬜ **Principio de mínimo privilegio** por rol; revisar que VIEWER/MEMBER no escalen; auditoría de cambios de rol.

## II.C — Aplicación (defensa en profundidad)
- ⬜ **CSP estricta** con `nonce`/`hash` (sin `unsafe-inline`), `frame-ancestors 'none'`, `base-uri`, `form-action`. (Parte I §6)
- ⬜ **CSRF con token** (double-submit / synchronizer) además del check de Origin. (Parte I §6)
- ⬜ **CORS restrictivo** (allowlist de orígenes; sin `*` con credenciales).
- ⬜ **Cookies con prefijo `__Host-`** + `Secure` + `SameSite` adecuado; sin datos sensibles en cookies.
- ⬜ **Cabeceras completas**: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/COEP si aplica.
- ⬜ **SRI** en cualquier recurso de terceros; minimizar terceros en el cliente.
- ⬜ **Sin secretos en el bundle de cliente** (revisar variables `NEXT_PUBLIC_*`).
- ⬜ **Validación/encodeado** de todo ID interpolado en rutas de terceros (folderId, Notion IDs, etc.). (Parte I §3)
- ⬜ **Endurecer webhooks públicos**: rate-limit por IP, **firma/HMAC** del emisor, replay-protection (nonce/timestamp).

## II.D — Datos y privacidad
- ⬜ **Cifrado en reposo** (disco/volumen y/o a nivel DB) + **en tránsito** en toda la cadena (edge→app→DB).
- ⬜ **Gestor de secretos / KMS** (Vault, SOPS, cloud KMS) con **rotación programada**; dejar de usar `.env` planos.
- ⬜ **Usuarios de DB con mínimo privilegio** (app ≠ superuser; sin DDL en runtime); contraseñas fuertes rotadas.
- ⬜ **Minimización de PII**; cifrado a nivel campo para datos especialmente sensibles.
- ⬜ **RGPD/LOPD**: export y **borrado** de datos por usuario, base legal, registro de tratamiento, retención definida.
- ⬜ **Backups cifrados y offsite** + **pruebas de restauración** periódicas (define **RTO/RPO**). (Parte I §10)
- ⬜ **Anonimización/pseudonimización** en entornos no productivos; nunca datos reales en dev/staging.

## II.E — Observabilidad y respuesta a incidentes
- ⬜ **Logging centralizado** (SIEM/agregador) con retención adecuada; alertas sobre eventos de seguridad.
- ⬜ **Redacción de secretos en logs** forzada (no solo por convención). (Parte I §5)
- ⬜ **Error/exception tracking** (Sentry u similar) sin filtrar PII/secretos.
- ⬜ **Métricas + alerting** (latencia, 5xx, saturación) y **detección de anomalías** (picos de login/errores).
- ⬜ **Trazabilidad de auditoría** conservada y protegida (append-only; acceso restringido).
- ⬜ **Plan de respuesta a incidentes** + runbook (detección → contención → erradicación → recuperación → post-mortem) y **on-call**.
- ⬜ **Status page** / comunicación a usuarios ante incidentes.

## II.F — Infraestructura y despliegue
- ⬜ **Contenedores no-root + read-only FS + capabilities mínimas**; `no-new-privileges`. (Parte I §7)
- ⬜ **Escaneo de imágenes** (Trivy/Grype) + **SBOM**; imágenes base actualizadas.
- ⬜ **Segmentación de red** (app/worker/DB en subredes privadas; solo el borde público).
- ⬜ **IAM de mínimo privilegio** en la nube/host; sin credenciales de larga vida embebidas.
- ⬜ **Infra como código** + entornos **staging≈prod**; despliegues **inmutables** con rollback (blue-green/canary).
- ⬜ **CI/CD seguro**: ramas protegidas, revisión obligatoria, **secretos fuera de logs**, artefactos firmados, `pnpm audit`/SAST/DAST como gate.
- ⬜ **Hardening del host** (SSH con llaves, firewall, actualizaciones automáticas, fail2ban).

## II.G — Cadena de suministro (dependencias)
- ⬜ **`pnpm audit` / Dependabot / Renovate en CI** como gate; parcheo priorizado por severidad. (Parte I §9)
- ⬜ **Lockfile íntegro** + versiones fijadas; revisar dependencias transitivas nuevas.
- ⬜ **SAST/DAST** en el pipeline; escaneo de secretos en el repo (gitleaks/trufflehog).
- ⬜ Revisión de licencias y de mantenimiento de dependencias críticas.

## II.H — Cumplimiento y gobierno
- ⬜ **Política de privacidad + Términos de servicio** publicados; **consentimiento de cookies** si aplica.
- ⬜ **DPA** con cada procesador (Twenty, Notion, Google, hosting…); registro de subencargados.
- ⬜ **Política de divulgación de vulnerabilidades** (`security.txt`) y canal de contacto.
- ⬜ **Pentest** (interno o externo) **antes del lanzamiento** público; considerar bug bounty después.
- ⬜ **Revisión de seguridad periódica**: re-ejecutar este checklist cada release y ante cambios de exposición.

## II.I — Operación continua
- ⬜ **SLO/SLA** definidos; capacidad y **autoscaling** dimensionados.
- ⬜ **Plan de recuperación ante desastres (DR)** con RTO/RPO probados.
- ⬜ **Cadencia de parcheo** (SO, base de datos, dependencias, imágenes) y **rotación de secretos** calendarizadas.
- ⬜ **Gestión de rate-limit distribuido** (Redis/Postgres) para multi-instancia. (Parte I §1, §6)

---

## Remediación prioritaria AHORA (self-hosted)
Endurecimientos baratos y de alto valor antes del deploy con datos reales:

| # | Ítem | Dónde |
|---|---|---|
| ~~1~~ | ~~Validar `BETTER_AUTH_SECRET` y llamar `loadEnv()` en la web~~ ✅ **HECHO (2026-09-02)** — la web no arranca sin él | `env.ts`, `apps/web/instrumentation.ts` |
| 2 | Cambiar la **contraseña por defecto de Postgres** — acción del owner en la Pi; el deploy ya **avisa** en cada despliegue | `.env` |
| ~~3~~ | ~~Contenedores **no-root**~~ — ❌ **descartado (owner, 2026-09-01)**: se acepta root en single-user tras Tailscale (riesgo de permisos en los bind-mounts de la Pi). Reabrir solo si se expone público. Ver §7 | `Dockerfile` |
| ~~3~~ | ~~**Límite de memoria** en web/worker/db~~ — ✅ **HECHO (2026-09-02)**, valores medidos y sin swap | prod/dev compose |
| 4 | Confirmar `BETTER_AUTH_URL=https://…` en prod (cookie **Secure**) | `envs/.env.prod`, `auth.ts` |
| 5 | Decidir exposición: bindear `4272` a loopback/bridge y forzar Caddy, o aceptar HTTP-en-LAN conscientemente | `envs/.env.prod`, prod compose |
| 6 | ~~Validar params UUID de ruta~~ ✅ **HECHO (2026-09-02)**: `parseId()` en `lib/api.ts`, aplicado a **53 rutas** (antes un id mal formado daba `500 Error interno`; ahora `400 VALIDATION`). **Queda** `folderId` de Drive (`^[A-Za-z0-9_-]+$`) | `drive/client.ts` |
| ~~9~~ | ~~`sweepRateLimiter()` + clave del webhook~~ ✅ **HECHO (2026-09-02)**: barrido **amortizado** dentro de `rateLimit()` (1 de cada 500 llamadas; sin temporizador que alguien deba arrancar) y `channelId` validado como UUID **antes** de tocar el limitador, lo que acota su cardinalidad. Ver **F-27** | `lib/rate-limit.ts`, webhook |
| 7 | Redacción de claves sensibles en el logger | `packages/shared/src/logger.ts` |
| 8 | Backups de Postgres + prueba de restore (M18) | `DEPLOYMENT.md` |

> Referencias: [`SECURITY.md`](./SECURITY.md) (baseline), [`FINDINGS_AND_DEFERRED.md`](./FINDINGS_AND_DEFERRED.md)
> (B-6 registro/OWNER, C-1 auditoría, A-7 multi-org), [`DEPLOYMENT.md`](./DEPLOYMENT.md) (gate pre-prod).
