# ADR-004 — Dominio de `resources` (activos por cliente/proyecto, E-5)

- **Estado:** Aceptada e **implementada** (CT-nativo + espejo a Notion verificado end-to-end contra la DB "System Assets")
- **Fecha:** 2026-08-13
- **Decisor:** owner (noboolsheet)
- **Fase afectada:** Bloque 2 · Fase 8 (E-5)

## Contexto

El owner quiere ver, por cada **cliente** o **proyecto**, un inventario de sus **activos**: accesos a
cuentas/canales, apps hosteadas (en su infra o la del cliente), infraestructura, dominios, etc. — siempre como
**referencias, NUNCA el secreto** (regla dura #2). Decisión de "dónde vive la verdad" tomada con el owner:

- **Fuente de verdad = Control Tower (nativo).** CT ya es dueño de `projects` y conoce los `clients` (sync de
  Twenty), así que puede hacer el *rollup* "activos por cliente/proyecto" nativamente. Twenty (CRM) duplicaría
  proyectos; Notion (docs) sería espejo-de-espejo. → dominio nuevo en CT.
- **Relación:** un activo cuelga de un **proyecto** (y su cliente se **deriva/denormaliza** del proyecto) **o**
  directamente de un **cliente** (personal, sin proyecto).
- **Espejo a Notion:** además de vivir en CT, se **empuja** a una DB de Notion (como las otras 8 entidades).

> Nota: el `assets` existente es otro concepto (activos **reutilizables**: plantillas, repos de GitHub). Este es un
> dominio **distinto** → tabla nueva `resources`.

## Decisión (esquema propuesto)

Tabla **`resources`** (migración aditiva 0005):

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID FK → organizations | NOT NULL, org boundary |
| `name` | VARCHAR | NOT NULL |
| `type` | VARCHAR CHECK | `ACCESS`, `ACCOUNT`, `HOSTED_APP`, `INFRASTRUCTURE`, `DOMAIN`, `OTHER` |
| `status` | VARCHAR CHECK | `ACTIVE`, `IN_PROGRESS`, `PAUSED`, `RETIRED` |
| `client_id` | UUID FK → clients | NULL — **denormalizado**: si hay proyecto, se copia su cliente |
| `project_id` | UUID FK → projects | NULL — si el activo pertenece a un proyecto |
| `url` | TEXT | NULL — dónde vive / se accede |
| `provider` | VARCHAR | NULL — proveedor/hosting (p. ej. "Vercel", "Raspberry Pi propia", "Google") |
| `environment` | VARCHAR | NULL — p. ej. prod/staging |
| `hosting` | VARCHAR CHECK | `OWN` (tu infra) / `CLIENT` (infra del cliente) / `THIRD_PARTY` (SaaS) |
| `credential_location` | TEXT | NULL — **puntero** al secreto (p. ej. "1Password → Clientes"). **NUNCA el secreto.** |
| `notes` | TEXT | NULL |
| `created_at`,`updated_at`,`archived_at` | timestamptz | |

**Invariantes / reglas:**
- Al menos uno de `client_id` / `project_id` (un activo siempre pertenece a un cliente o a un proyecto).
- Si se crea con `project_id`, `client_id` se **rellena desde el cliente del proyecto** (denormalización) → así
  `activos por cliente X` = `where client_id = X` (incluye los de sus proyectos) y `activos por proyecto Y` =
  `where project_id = Y`. Ambos rollups son triviales.
- **Cero secretos**: `credential_location`/`url`/`provider` son referencias; el secreto vive en el gestor.

**Enums** en `@ct/domain`: `RESOURCE_TYPE`, `RESOURCE_STATUS`, `RESOURCE_HOSTING`.

## UI
- **Detalle de Cliente → pestaña "Activos"**: todos sus activos (personales + de sus proyectos), con alta rápida.
- **Detalle de Proyecto → pestaña "Activos"**: los del proyecto, con alta rápida (hereda cliente).
- Cada activo: tipo, estado, proveedor/hosting, enlace "Abrir" (url), y el puntero de credencial (texto).

## Espejo a Notion (implementado)
- `resourceSpec` en `notion-specs.ts` es **push-only** (`importFromNotion` omitido): CT es el único dueño, nunca se
  importan filas desde Notion (evita ciclos y duplicados). Clave de config `databases.resources` →
  `3bbbecf260de80269c33e634034ff8dc` (DB "System Assets"). `resource` añadido a `PUSH_TARGETS` (real-time) y al set
  `NOTION_MIRRORED` de `recordAudit` (push al editar por un USER). Mapa de campos: `Type/Status/Hosting`=select,
  `Client/Project/Provider/Environment/Credential location/Notes`=rich_text, `URL`=url, título="Nome".
- **Verificado E2E**: sync inicial `pushedCreated:1`; re-sync idempotente `pushedUpdated:1` (sin duplicados);
  `external_identities` guarda el `page.id` + url; push en tiempo real vía outbox `notion.push` → `res: updated`.

## Consecuencias
- **+**: CT responde nativamente "qué tengo por cliente/proyecto"; referencias sin secretos; navegable también en Notion.
- **−**: nueva tabla + enums + UI + spec Notion. Migración aditiva (no toca el modelo congelado).
- **Pendiente del owner**: confirmar tipos/estados/campos (abajo) y crear la DB de Notion para el espejo.
