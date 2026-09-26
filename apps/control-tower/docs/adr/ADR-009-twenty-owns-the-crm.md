# ADR-009 — Twenty es el dueño del CRM: Control Tower **no escribe** en Twenty (salvo el `stage`)

- **Estado:** Aceptada
- **Fecha:** 2026-09-26
- **Decisor:** owner (noboolsheet)
- **Relacionada:** [ADR-008](./ADR-008-opportunity-state-machine.md) (del que esto es la generalización),
  [ADR-002](./ADR-002-opportunity-stages.md), E-1 (write-back), F-22 (pull que no pisa un push pendiente), F-18

## Contexto

ADR-008 hizo con la **oportunidad** lo que hacía falta: Twenty la posee, CT sólo mueve su etapa. Pero clientes,
contactos y tareas se quedaron con el modelo anterior: **write-back bidireccional**. Editar en CT un cliente o un
contacto ya sincronizado empujaba a Twenty `name`/`domainName`/`industry` y `name`/`emails`/`phones`/`jobTitle`, y
reprogramar una task importada empujaba su `dueAt`.

Ese esquema tiene el mismo problema que ADR-008 describe, y por los mismos motivos:

- **Dos sistemas escribiendo el mismo campo** necesitan un arbitraje. El único que había era el guard de F-22 («el
  pull no pisa un registro con push pendiente»), que es una ventana de tiempo, no una regla de propiedad.
- **El push manda la copia que CT tiene**, que entre dos syncs puede estar vieja: un cambio hecho en Twenty se podía
  machacar con el valor anterior sólo porque en CT se tocó otro campo del mismo registro.
- Un enum o un campo que se separen no dan error: el pull cae a un valor por defecto y el push devuelve `400`
  (pasó de verdad, ADR-002 addendum 2026-09-02).

Y hay un motivo de producto por encima del técnico: **el CRM es Twenty**. Control Tower es el puesto de mando que
agrega y gobierna el proceso; no es un editor de CRM.

## Decisión

**Todo lo que llega de Twenty es propiedad de Twenty y se edita en Twenty. Lo único que Control Tower escribe en
Twenty es el `stage` de una oportunidad.**

1. **Se retira el write-back de cliente, contacto y task.** `companyPatch`, `personPatch` y `taskPatch` desaparecen
   de `twenty/mapper.ts`; `push-twenty.ts` se queda con un único destino (`opportunity`) y un único campo (`stage`).
2. **`TWENTY_MIRRORED` = `{ opportunity }`.** `recordAudit` ya no encola `twenty.push` para client/contact/task.
3. **Los campos que rellena el pull pasan a `FIELD_OWNERSHIP`** (propiedad por procedencia): client
   `name`/`industry`/`websiteUrl`; contact `firstName`/`lastName`/`email`/`phone`/`jobTitle`/`clientId`; task
   `title` **y `dueDate`**. Se bloquean en el panel (🔒 «se edita en el origen») **y** en el comando
   (`assertNotEditingOwnedFields` en `updateClient`/`updateContact`, ya presente en `updateTask`), así que tampoco
   se puede por API.
4. **La fecha de una task de Twenty deja de ser de CT.** Era la excepción que quedaba (reprogramar en CT y empujar);
   sin write-back, dejarla editable guardaría en CT una fecha que Twenty no conoce. El pull ahora la reescribe.
5. **Lo que NO cambia:** `status` y `notes` de un cliente y `notes` de un contacto son **columnas propias de CT**,
   que Twenty no conoce ni pisa, y siguen editables. Un cliente o contacto **creado en CT** (sin identidad de
   Twenty) sigue siendo editable entero: el bloqueo es **por procedencia**, no por entidad.
6. **El guard de F-22 se acota a la oportunidad.** Para client/contact un `twenty.push` pendiente sólo puede ser un
   residuo de antes de esta decisión, y mantener el guard dejaría ese registro congelado sin que CT pueda ya
   resolver el envío. Los residuos se drenan solos (el push devuelve `skip`) y se ven en Automatización › Envíos
   fallidos.

## Consecuencias

- **Se pierde** poder corregir un nombre, un email o un cargo desde CT. A cambio se gana que **lo que se ve en CT es
  lo que hay en Twenty**, sin ventanas de tiempo ni arbitrajes: antes, una edición en CT podía desaparecer en el
  siguiente sync o machacar en Twenty un dato más nuevo, las dos cosas en silencio.
- **El único camino de escritura que queda hacia Twenty es el `stage`**, que es justo el trozo del proceso que CT
  gobierna (ADR-008). Eso hace el sistema mucho más fácil de razonar: una sola dirección, un solo campo.
- **Crear clientes y contactos en CT sigue siendo posible** y los deja como CT-nativos, que no viajan a Twenty. Si
  se quisiera cerrar también eso (que el CRM sólo se alimente desde Twenty, como las oportunidades), es otra
  decisión: haría falta el patrón de ADR-008 (`createClient`/`createContact` rechazando actores USER) y decidir qué
  hacer con los CT-nativos que ya existan.
- **No hace falta migración.** Nada cambia en el modelo de datos: sólo dejan de escribirse cosas.

## Alternativas descartadas

- **Mantener el write-back con arbitraje por campo y marca de tiempo** (last-write-wins con reloj): exige guardar la
  marca de cada campo en los dos sistemas. Mucha maquinaria para un CRM de un solo usuario en el que la fuente de
  verdad ya estaba decidida.
- **Bloquear también `status`/`notes`:** son datos que Twenty no tiene. Bloquearlos no protegería nada y quitaría
  a CT lo único propio que tiene de un cliente.
