# Control Tower — Baseline de seguridad (M17)

Checklist operativo (doc old_9 §26, doc 4 §34). Estado del MVP self-hosted single-usuario.

> **Ver también:** [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md) — checklist exhaustivo por dominios que
> **toda versión debe pasar**, con el veredicto actual por control y los controles diferidos para cuando la app
> sea pública/multiusuario. Re-evaluar en cada release.

## Autenticación / sesión
- ✅ **Better Auth** email/password; hashing de contraseñas gestionado por Better Auth (nunca en la DB de dominio).
- ✅ `BETTER_AUTH_SECRET` **obligatorio** (Better Auth falla sin él): en dev va en el compose; en prod en `.env`.
- ✅ Sesiones con cookie **HttpOnly**; `useSecureCookies` sólo sobre **HTTPS** (baseURL https; por http://localhost se sirven no-Secure para que el login funcione en dev).
- ✅ `minPasswordLength: 8`.
- ✅ **Rate limiting** de Better Auth en los endpoints de auth (30/min).
- ✅ **Registro BOOTSTRAP-ONLY** (crítico #4 auditoría, 2026-08-31): sólo se permite crear la **primera** cuenta (el owner);
  después el alta queda **cerrada** (hook `create.before` en `auth.ts` → `APIError('FORBIDDEN')`). Escape hatch
  `ALLOW_OPEN_REGISTRATION=true` para añadir una cuenta antes de que existan invitaciones (FINDINGS B-6 / E-11 · Fase 2).
- ☐ Verificación de email / 2FA / OAuth → Fase 2 (FINDINGS D-4).

## Autorización
- ✅ Toda ruta `/api/v1` pasa por `withContext` → exige sesión + membresía de organización (401/403).
- ✅ Escrituras exigen rol vía `requireCan(role, action)` (OWNER/ADMIN/MEMBER/VIEWER).
- ✅ **Aislamiento por organización** en cada query (`orgEq`/`scopedWhere`); probado en integración (un usuario no ve datos de otra org).

## API / entrada
- ✅ **Validación Zod** en todos los boundaries de escritura (create/update schemas).
- ✅ **CSRF**: chequeo de `Origin` vs `Host` en mutaciones de navegador (peticiones sin Origin — curl/API — permitidas).
- ✅ **Rate limiting** por IP en `/api/v1` (ventana fija en memoria; suficiente single-instance).
- ✅ Errores estructurados sin stack traces al cliente (`toClientError`).

## Cabeceras / salida
- ✅ Cabeceras de seguridad en `next.config` (X-Content-Type-Options, X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy) + `poweredByHeader:false`. Caddy añade las suyas en prod.
- ✅ Salida escapada por React (sin `dangerouslySetInnerHTML`).

## Secretos
- ✅ `BETTER_AUTH_SECRET`, `POSTGRES_*`, claves de integración (`TWENTY_API_KEY`, `NOTION_API_KEY`, `GITHUB_TOKEN`, `GOOGLE_DRIVE_TOKEN`) viven en `apps/control-tower/.env` (**gitignored**).
- ✅ `.env.example` versionado **sin** secretos reales.
- ✅ Secretos de integración NUNCA en la DB (`integrations.configuration` sólo config no sensible).
- ⚠️ **Producción:** definir `BETTER_AUTH_SECRET` (cadena aleatoria larga) antes de `deploy-control-tower.sh prod`.

## Datos / auditoría
- ✅ **AuditLog** (quién hizo qué) en acciones clave; append-only, sin borrado destructivo.
- ✅ **ChangeEvent** (diffs de estado) separado del audit (ERRATA-013).
- ✅ Soft-delete/archive por defecto (`archived_at`); sin cascadas destructivas sobre historial.

## Infra (M18) ✅ cerrado
- ✅ HTTPS (Caddy `tls internal`), **backups PostgreSQL + simulacro de restauración verificado**, healthchecks y
  `restart: unless-stopped` — cerrados en **M18**. Añadido después (2026-09-01): **heartbeat + watchdog** del worker
  (si un tick se cuelga >5 min, el proceso sale y Docker lo reinicia).

## Pendiente / revaluar
- Rate limiter en memoria (no compartido en multi-instancia) → Redis/Postgres si se escala.
- ~~Cobertura de audit parcial (FINDINGS C-1)~~ → ✅ completa desde 2026-09-01 (+ diff campo a campo, F-4).
- Multi-org: unique de `external_identities` (FINDINGS A-7) — sigue abierto, sólo aplica si entran más organizaciones.
