# ADR-001 — Esquema de `portfolio_items`

- **Estado:** Aceptada
- **Fecha:** 2026-08-10
- **Decisor:** owner (noboolsheet)
- **Milestone afectado:** M02 (creación de tabla), M08 (módulo Portfolio)

## Contexto

`ERRATA-003` (doc 8) ordena que Portfolio entre en el MVP y que se cree la tabla `portfolio_items`,
indicando que "los campos exactos siguen el Physical Data Model". Sin embargo, el Physical Data Model
(doc 5) fue redactado **antes** de la errata y **no contiene** la tabla `portfolio_items`. No existe,
por tanto, un esquema físico congelado para ella. Por `IMP-002`/`IMP-004`, definir sus columnas es un
cambio de esquema que debe registrarse como decisión de arquitectura.

## Decisión

Se ratifica el siguiente esquema para `portfolio_items`, basado en los campos mínimos del
Implementation Plan (§17) y la máquina de estados del Domain Model (§5.32):

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `organization_id` | UUID FK → organizations | NOT NULL, org boundary |
| `name` | VARCHAR | NOT NULL |
| `description` | TEXT | NULL |
| `type` | VARCHAR | NOT NULL — Project / CaseStudy / Demo / Template / Product / Experiment |
| `status` | VARCHAR | NOT NULL — máquina de estados abajo |
| `project_id` | UUID FK → projects | NULL (relación mínima Project → PortfolioItem) |
| `asset_id` | UUID FK → assets | NULL |
| `visibility` | VARCHAR | NOT NULL — INTERNAL / PRIVATE / PUBLISHABLE |
| `external_url` | TEXT | NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |
| `archived_at` | TIMESTAMPTZ | NULL |

**Máquina de estados (`status`):**
`NOT_ELIGIBLE → CANDIDATE → IN_PREPARATION → PUBLISHED → ARCHIVED`

Índices: `portfolio_items(organization_id)`, `portfolio_items(project_id)`, `portfolio_items(status)`.

## Consecuencias

- Portfolio es un **catálogo/capa de gobierno simple**, NO un CMS ni un constructor de web pública (ERRATA-003).
- El `type` y `visibility` se validan a nivel de aplicación (VARCHAR + CHECK, patrón del doc 5 §36).
- Si en el futuro se necesita más (p. ej. publicación web real), será un nuevo ADR + migración.
