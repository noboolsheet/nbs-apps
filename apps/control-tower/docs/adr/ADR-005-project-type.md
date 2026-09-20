# ADR-005 — `projects.type` (INTERNAL / CLIENT / LAB) y el invariante "CLIENT requiere cliente" (A-1)

- **Estado:** Aceptada e implementada
- **Fecha:** 2026-09-01
- **Decisor:** owner (noboolsheet)
- **Resuelve:** hallazgo **A-1** de `FINDINGS_AND_DEFERRED.md`

## Contexto

El **dominio** (doc 2) define `Project.type` con valores INTERNAL / CLIENT / LAB y el invariante *"un proyecto
CLIENT debe tener cliente"*. El **modelo físico congelado** (doc 5 §16) **no tiene** la columna: `client_id` es
opcional y el invariante quedó sin aplicar (registrado como A-1). Con el uso real, "tiene o no cliente" no basta:
un proyecto puede tener cliente y ser un experimento propio, y los proyectos LAB no se distinguen de los internos.

## Decisión

**Migración aditiva 0014** (`m30`): `projects.type VARCHAR NOT NULL DEFAULT 'INTERNAL'` con
`CHECK (type IN ('INTERNAL','CLIENT','LAB'))`. Enum `PROJECT_TYPE` en `@ct/domain` (fuente única, como el resto).

**Backfill:** los proyectos existentes con `client_id` y no personales pasan a `CLIENT`; el resto queda `INTERNAL`.
`LAB` se marca a mano (no hay señal de la que inferirlo).

**Invariante DURO (decisión del owner, 2026-09-01):** crear un proyecto `CLIENT` sin `client_id`, o pasar a
`CLIENT` un proyecto sin cliente, o quitarle el cliente a uno `CLIENT`, devuelve error de validación
`PROJECT_CLIENT_REQUIRED` (`kind: VALIDATION`). Se aplica en `createProject`/`updateProject` (capa application),
**no** como CHECK en la tabla: `client_id` debe seguir siendo nullable porque INTERNAL/LAB no lo llevan, y un CHECK
condicional a nivel de fila complicaría los backfills futuros sin ganar nada (todas las escrituras pasan por el
comando).

**Interacción con `personal`:** un proyecto personal (del owner para sí mismo) no lleva cliente → al marcarlo
personal el tipo se fuerza a `INTERNAL`. Un proyecto creado automáticamente desde una oportunidad ganada
(`createProjectFromWonOpportunity`) nace `CLIENT` si la oportunidad tiene cliente, `INTERNAL` si no.

## Consecuencias

- La ficha y el panel del proyecto muestran y editan el tipo (`enumLabel` lo traduce para display).
- Filtro por tipo en la lista de proyectos.
- Coste: quien cree un proyecto CLIENT tiene que elegir cliente en el mismo paso. Es intencionado: es exactamente
  el dato que hacía falta para que los rollups por cliente sean fiables.
