# ADR-002 — Enum de `opportunities.stage`

- **Estado:** Aceptada
- **Fecha:** 2026-08-10
- **Decisor:** owner (noboolsheet)
- **Milestone afectado:** M02 (esquema), M05 (UI CRM / Kanban)

## Contexto

El valor canónico de `opportunities.stage` no estaba congelado:

- **Domain Model / Spec:** pipeline de 8 estados `LEAD → CONTACTED → QUALIFIED → MEETING → PROPOSAL → NEGOTIATION → WON → LOST`.
- **Wireframes (doc 7 §10):** Kanban de 4 columnas `Lead | Qualified | Proposal | Won`.
- **Physical Data Model (doc 5):** `opportunities.stage VARCHAR NOT NULL`, **sin enumerar valores**.

La errata no cubre esta contradicción → requería decisión explícita.

## Decisión

Se congela el **pipeline de dominio de 8 estados** como enum almacenado:

```
stage: LEAD → CONTACTED → QUALIFIED → MEETING → PROPOSAL → NEGOTIATION → WON → LOST
```

Complementado con un campo derivado/explícito `status: OPEN | WON | LOST` para consultas rápidas
(WON/LOST son terminales; el resto son OPEN).

El **Kanban de la UI agrupa** stages en columnas visuales (p. ej. `Lead`, `Qualified`, `Proposal`, `Won`),
amparado por `ERRATA-015` (los labels de UI no tienen que ser idénticos al enum interno).

## Consecuencias

- Máxima fidelidad al Domain Model congelado y al futuro sync con Twenty (que maneja un pipeline granular).
- Validación VARCHAR + CHECK a nivel de aplicación (patrón doc 5 §36).
- El mapeo stage→columna del Kanban vive en la capa de UI (M05), no en el esquema.

## Addendum (2026-08-16) — 2 estados de cierre añadidos (owner)

Se amplía el enum a **10 estados**: `+ CANCELLED, CLOSED` (migración `0010_m26`), para diferenciar cierres.
Ambos son **terminales** (como WON/LOST) y su `status` derivado es **LOST** (cierre sin ganar); el enum de `status`
sigue siendo `OPEN | WON | LOST` (sin cambio). El Kanban de la UI pasa a **4 columnas** (Captación / Negociación /
Ganadas / Cerradas); dentro de cada columna, cada card muestra su stage exacto como etiqueta. El owner añade las
opciones equivalentes en Notion.

## Addendum (2026-09-02) — realineado con Twenty: 13 estados (owner)

El owner reorganizó el pipeline **en Twenty** y CT se quedó desalineado (10 estados propios contra 13 ajenos). Como
el mapeo pull/push es por **identidad** (`mapTwentyStage`), la desalineación no daba error: el pull **caía a `LEAD`**
cualquier stage que CT no conociera (una oportunidad `ONBOARDED` en Twenty volvía al principio del embudo en CT) y el
write-back empujaba a Twenty valores ya inexistentes allí (`PROPOSAL`, `CANCELLED`, `CLOSED`) → `400` y el envío
acababa en «Envíos fallidos».

**Decisión:** `opportunities.stage` vuelve a ser **exactamente el enum de Twenty**, en su mismo orden — 13 estados
(migración `0023_m39`):

```
LEAD · QUALIFIED · RESEARCHING · MEETING · EVALUATING · PREPARING_PROP · PROPOSAL_SENT
NEGOTIATION · CONTRACTING · WON · LOST · ON_HOLD · ONBOARDED
```

Fuera: `CONTACTED`, `PROPOSAL`, `CANCELLED`, `CLOSED`. Reparto en las 4 columnas del Kanban (owner):

| Columna | Stages |
|---|---|
| Calificación de leads | `LEAD`, `QUALIFIED` |
| Propuesta | `RESEARCHING`, `MEETING`, `EVALUATING`, `PREPARING_PROP`, `PROPOSAL_SENT` |
| Negociación | `NEGOTIATION`, `CONTRACTING`, `ON_HOLD`, `WON` |
| Cerradas | `LOST`, `ONBOARDED` |

**Consecuencias en las reglas del dominio:**

- **`WON` deja de ser terminal.** Vive en la columna *Negociación*, así que una ganada se puede mover: avanzar a
  `ONBOARDED` (el cierre ganado, sucesor de `CLOSED`) o volver al embudo si el trato se cae. Desaparece la excepción
  «único movimiento entre terminales `WON→CLOSED`»: ahora la regla es plana — **terminales sólo `LOST` y `ONBOARDED`**,
  y desde un abierto se puede ir a cualquier sitio.
- **`closed_at` sólo se sella en un stage terminal**, así que una `WON` ya no lleva marca de cierre (el momento en que
  se ganó sigue en `change_events`). El migration limpia las que había.
- **`status` derivado:** `WON`/`ONBOARDED` → `WON`; `LOST` → `LOST`; el resto → `OPEN`. `ON_HOLD` es una **pausa dentro
  de la negociación, no un cierre** → sigue `OPEN` y no se auto-archiva.
- **Auto-archivado (7 días):** toda la columna *Cerradas* (`LOST`, `ONBOARDED`). Las `WON` siguen sin archivarse solas.
- **La automatización «crear proyecto» sigue disparándose en `WON`** (decisión del owner), no en `ONBOARDED`: el
  proyecto arranca al ganar; `ONBOARDED` significa que la incorporación ya terminó.

**Datos existentes** (migración `0023_m39`, con el reetiquetado que pidió el owner): `CLOSED → ONBOARDED`,
`CANCELLED → LOST`, `PROPOSAL → PROPOSAL_SENT`, `CONTACTED → LEAD`. `mapTwentyStage` mantiene esas cuatro
equivalencias como fallback por si vuelve un valor viejo desde un backup o una instancia sin migrar.
