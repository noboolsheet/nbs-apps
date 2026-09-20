# ADR-007 — Enlace proyecto ↔ activo reutilizable: tabla puente `project_assets` (A-3)

- **Estado:** Aceptada e implementada
- **Fecha:** 2026-09-01
- **Decisor:** owner (noboolsheet)
- **Resuelve:** hallazgo **A-3** de `FINDINGS_AND_DEFERRED.md`

## Contexto

El dominio relaciona Project → Asset y el wireframe tiene "Project Assets", pero `assets` (doc 5 §24) es una tabla
de **organización sin `project_id`**, así que la pestaña "Assets" del proyecto se limitaba a remitir a
Knowledge → Assets. Faltaba decidir la **cardinalidad**.

> Ojo con la homonimia: `assets` = activos **reutilizables** (plantillas, repos, componentes). Los activos
> operativos por cliente/proyecto (accesos, apps hosteadas, dominios) son `resources` — ver [ADR-004](./ADR-004-resources.md).
> Este ADR es sólo sobre `assets`.

## Decisión

**N:M mediante tabla puente `project_assets`** (migración aditiva 0014 / `m30`): `id`, `project_id`, `asset_id`,
`created_at`, con `UNIQUE(project_id, asset_id)` e índices por ambos lados.

**Por qué N:M y no `assets.project_id`:** la razón de ser de un asset es la **reutilización** — una plantilla de
propuesta o un repo base se usan en varios proyectos. Con 1:N habría que duplicar el asset por proyecto, que es
exactamente lo que el dominio quiere evitar. El coste (una tabla más) es menor que el de duplicar catálogo.

**Sin `organization_id`:** igual que `project_phases`, el scoping se hereda de los dos extremos; los comandos
verifican que proyecto y asset pertenecen a la organización del contexto antes de enlazar.

**Semántica del enlace:** es una **referencia**, no propiedad. Desenlazar un asset de un proyecto **no** lo borra
(sigue en el catálogo de la organización); borrar/archivar un asset no borra proyectos. Enlazar dos veces el mismo
par es idempotente (lo corta la UNIQUE, el comando lo trata como éxito).

## Consecuencias

- Ficha de proyecto → pestaña **Activos**: lista de los enlazados, "Enlazar activo" (selector sobre el catálogo) y
  "Desenlazar". La creación contextual de un asset desde el proyecto lo crea **y** lo enlaza en el mismo paso.
- Ficha/panel de un asset: en qué proyectos se usa (rollup inverso, gratis por el índice).
