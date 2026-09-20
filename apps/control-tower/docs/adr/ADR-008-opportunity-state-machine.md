# ADR-008 — Control Tower es sólo la **máquina de estados** de las oportunidades

- **Estado:** Aceptada
- **Fecha:** 2026-09-02
- **Decisor:** owner (noboolsheet)
- **Relacionada:** [ADR-002](./ADR-002-opportunity-stages.md) (enum de `stage`), E-1 (write-back a Twenty), F-22

## Contexto

Hasta ahora una oportunidad se podía **crear y editar entera** en Control Tower: alta desde la lista y desde la
ficha del cliente, y todos sus campos editables en el panel y en la ficha, con write-back a Twenty de
`name`/`stage`/`amount`/`closeDate`.

Dos sistemas escribiendo los mismos campos obliga a un arbitraje que nunca fue realmente cierto: el pull de Twenty
reescribe la oportunidad en cada sync, y lo único que evitaba perder una edición hecha en CT era el guard de F-22
(«no pisar un registro con push pendiente»), es decir, una ventana de tiempo. Además el write-back mandaba a Twenty
la copia de CT de campos que CT no controla: si alguien cambiaba el nombre en Twenty y en CT se movía la etapa antes
del siguiente pull, el push devolvía el nombre viejo.

## Decisión

**Twenty es el dueño de la oportunidad. Control Tower es su máquina de estados y nada más.**

1. **No se crean oportunidades en CT.** No hay `POST /api/v1/opportunities`, ni botón «＋ Nuevo» en la lista, ni
   creación contextual desde la ficha del cliente. El comando `createOpportunity` sigue existiendo **para el sync** y
   rechaza a los actores USER con `OPPORTUNITY_EXTERNAL_ONLY` (defensa en profundidad).
2. **Lo único modificable es el `stage`**, por `PATCH /api/v1/opportunities/[id]/stage`. Se retiran el
   `PATCH /api/v1/opportunities/[id]`, el comando `updateOpportunity` y `updateOpportunitySchema`.
3. **El write-back a Twenty empuja sólo `stage`.** `opportunityPatch` deja de construir `name`/`amount`/`closeDate`.
4. **El tablero pierde el arrastrar y soltar.** Cada columna agrupa **más de un estado**, así que soltar obligaba a
   adivinar el destino («el primer stage alcanzable de la columna») y el gesto no expresaba la intención. El estado se
   cambia en el desplegable de la tarjeta, que además ya era la ruta accesible por teclado. El tablero pasa a ser un
   componente de servidor.
5. **El archivado sigue siendo cosa de CT y no toca Twenty.** Al llegar a la columna «Cerradas» (`LOST`/`ONBOARDED`),
   a los 7 días la oportunidad sale del Kanban a la pestaña *Archivadas* (restaurable). En Twenty no cambia nada.

## Consecuencias

- Desaparece la clase entera de conflictos «lo edité en CT y el sync me lo pisó»: en CT no hay nada que pisar salvo
  la etapa, que es justo lo que CT empuja.
- La ficha de la oportunidad pasa a ser una **lista de solo lectura** + el control de etapa. El panel bloquea los
  campos que posee Twenty por procedencia (`FIELD_OWNERSHIP.opportunity`, mensaje «se edita en el origen»).
- Si CT vuelve a necesitar guardar algo propio de una oportunidad, habrá que reabrir un endpoint de edición
  **acotado a los campos CT-only** — no reinstaurar el `updateOpportunity` general.

## Datos de CT que **no** viajan a Twenty (pendiente de decisión del owner)

Al alinear el modelo aparecieron tres columnas de `opportunities` sin contrapartida en el sync:

| Campo CT | ¿Existe en Twenty? | Situación hoy |
|---|---|---|
| `primary_contact_id` | Sí (`pointOfContact`), pero **el sync no lo mapea** ni en el pull ni en el push | Siempre vacío en las importadas |
| `source` | No | Sin uso: el pull no lo rellena |
| `notes` | No como campo (Twenty usa registros *Note* relacionados) | Sin uso: el pull no lo rellena |

Quedan **de solo lectura** hasta que el owner decida: mapearlos al sync, conservarlos como datos propios de CT con un
endpoint acotado, o retirarlos del modelo. Lo que **sí** es CT-only y se queda como está: `closed_at`/`archived_at`
(contabilidad de la máquina de estados) y las **tareas de preventa** (`tasks.opportunity_id`), que nunca van a Twenty.
