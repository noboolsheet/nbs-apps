# ADR-006 — Enlace de reemplazo entre decisiones (`supersedes_decision_id`) (A-2)

- **Estado:** Aceptada e implementada
- **Fecha:** 2026-09-01
- **Decisor:** owner (noboolsheet)
- **Resuelve:** hallazgo **A-2** de `FINDINGS_AND_DEFERRED.md`

## Contexto

El wireframe de *Decision Detail* (doc 7) muestra "supersedes / superseded by": la cadena de qué decisión reemplaza
a cuál. El modelo físico (doc 5 §20) sólo tiene el **estado** `SUPERSEDED`, así que hasta ahora se sabía que una
decisión había quedado obsoleta pero **no por cuál** — justo la información que da valor al registro de decisiones.

## Decisión

**Migración aditiva 0014** (`m30`): `decisions.supersedes_decision_id UUID NULL REFERENCES decisions(id)`
+ índice. **Dirección: la decisión NUEVA apunta a la ANTIGUA** (igual que el "supersedes" del wireframe). El inverso
("superseded by") se resuelve por query, no se duplica en una segunda columna: dos columnas simétricas se
desincronizan y no aportan nada que un índice no dé.

`supersedeDecision(db, ctx, oldId, byNewId)` pasa a hacer las dos cosas en **una transacción**: marca la antigua
`SUPERSEDED` (respetando `assertDecisionTransition`) y escribe el enlace en la nueva, con `recordChangeEvent` +
`recordAudit`. Reglas: ambas decisiones deben ser de la organización del contexto, no puede apuntarse a sí misma,
y la decisión antigua no puede estar ya reemplazada por otra distinta (se detecta y se rechaza con
`DECISION_ALREADY_SUPERSEDED`).

**No se refleja a Notion**: el contrato del espejo (§ `NOTION_INFORMATION_ARCHITECTURE.md`) es de campos escalares;
las relaciones entre páginas se gestionan en Notion a mano (F-20, decisión del owner).

## Consecuencias

- El panel/ficha de una decisión muestra "Reemplaza a ↗" y "Reemplazada por ↗" (ambos enlaces al registro).
- Se puede reconstruir la cadena histórica de una decisión sin leer el texto.
