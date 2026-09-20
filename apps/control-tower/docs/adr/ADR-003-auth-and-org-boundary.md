# ADR-003 — Better Auth y el boundary de organización

- **Estado:** Aceptada
- **Fecha:** 2026-08-11
- **Milestone:** M03

## Contexto

El Stack Decision congela **Better Auth** (email/password + sesiones). El modelo físico (doc 5 §6)
dice que la tabla `users` "podrá adaptarse al esquema requerido por Better Auth", y §51 marca "esquema
exacto de Better Auth" como decisión a tomar antes de implementar. Además existen `organizations` y
`organization_members` como tablas de dominio, y Better Auth ofrece un *organization plugin* con SU
propio esquema.

## Decisión

1. **Better Auth `user` = tabla de dominio `users`.** Se añaden a `users` las columnas que Better Auth
   necesita: `email_verified BOOLEAN NOT NULL DEFAULT false`, `image TEXT NULL`, y `UNIQUE(email)`.
   No se crea una segunda tabla de usuarios.
2. **Better Auth posee** las tablas `sessions`, `accounts`, `verifications` (esquema core de Better Auth,
   nombres en plural mapeados vía el drizzle adapter).
3. **IDs UUID:** `advanced.database.generateId: false` → los ids los genera la DB (`gen_random_uuid()`,
   columnas `uuid`). Better Auth los lee de vuelta vía `RETURNING`.
4. **NO se usa el organization plugin de Better Auth.** `organizations` y `organization_members` siguen
   siendo tablas de dominio (doc 5). El contexto de organización y la autorización por rol
   (`OWNER/ADMIN/MEMBER/VIEWER`) se resuelven en `packages/application/auth`:
   - `getActiveOrgContext(userId)` → `{ organizationId, role }` desde `organization_members`.
   - `requireOrgContext` para route handlers / server components.
   - `getOrgScopedDb(orgId)` / helpers que fuerzan el filtro `organization_id` en cada query.
   - políticas `can(role, action)` con jerarquía de roles.
5. **Aislamiento:** app + constraints + tests de integración (doc 5 §38). Sin RLS en MVP. Sin admin
   multi-tenant / billing (ERRATA-012).

## Consecuencias

- Un único concepto de usuario, coherente con `organization_members.user_id → users.id`.
- El boundary de organización vive en la capa de aplicación, no en Better Auth → portable y simple.
- Si en el futuro se quiere el organization plugin o multi-org real, será un nuevo ADR + migración.
