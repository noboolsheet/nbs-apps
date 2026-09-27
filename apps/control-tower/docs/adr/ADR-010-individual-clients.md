# ADR-010 — Una Person de Twenty con `INDIVIDUAL_CLIENT` es un **cliente** de Control Tower

- **Estado:** Aceptada
- **Fecha:** 2026-09-27
- **Decisor:** owner (noboolsheet)
- **Relacionada:** [ADR-009](./ADR-009-twenty-owns-the-crm.md) (Twenty es el dueño del CRM),
  [ADR-002](./ADR-002-opportunity-stages.md), `packages/domain/src/crm-classification.ts` (§2.2 del handoff)

## Contexto

El sync de Twenty proyectaba **companies → clients** y **people → contacts**, punto. Pero en Twenty cada Person lleva
un multi-select **`Relationship Roles`** que dice qué tipo de relación comercial existe: contacto de una empresa,
colaborador, proveedor, prescriptor… o **`INDIVIDUAL_CLIENT`**, que es alguien para quien trabajas y a quien facturas
directamente, sin empresa detrás.

Con el mapeo anterior, un cliente particular aparecía en Control Tower como un **contacto**: no se le podía asignar un
proyecto (`projects.client_id` apunta a `clients`), ni un pago de cliente, ni recursos, y no salía en «Clientes». O sea:
la mitad de la aplicación no servía para la mitad de los clientes.

El dominio ya tenía media decisión tomada: `classifyBillingSubject` (§2.2 del handoff) usa **ese mismo rol** para
decidir que el sujeto de facturación es la persona y no una empresa, y el handoff **prohíbe crear una Company de
relleno** para un particular. Faltaba aplicar la misma idea a qué entidad de CT lo representa.

## Decisión

**Una Person con `INDIVIDUAL_CLIENT` entre sus roles se sincroniza como `clients`; el resto, como `contacts`.**

1. **La regla vive en el dominio** (`person-roles.ts`: `parsePersonRoles` + `crmTargetForPerson`), pura y probada. El
   parseo es defensivo porque la forma del multi-select no la controlamos: array o cadena con comas, etiquetas con
   espacios, guiones o minúsculas («Individual Client» → `INDIVIDUAL_CLIENT`).
2. **Empresa o particular se DERIVA, no se guarda.** Se sabe por el `external_type` de su identidad: `company` ⇒
   empresa, `person` ⇒ particular. Guardarlo en una columna crearía un tercer valor que podría quedarse viejo respecto
   a Twenty, que es su dueño, y que CT no puede corregir (ADR-009). La lista de Clientes lo muestra como columna
   **Tipo** (con faceta) y la ficha con una insignia «Particular».
3. **Si una persona cambia de rol, su registro se MUEVE**: se crea en la familia nueva, el viejo se **archiva** —nunca
   se borra, porque un proyecto, una oportunidad o un pago pueden estar apuntándolo— y la identidad se re-apunta.
4. **El nombre del campo de roles es configuración, no adivinanza**:
   `integrations.configuration.fields.personRelationshipRoles`, con `relationshipRoles` por defecto. El handoff
   prohíbe inferir identificadores de API en silencio, así que **si el campo no viene en el pull, no se reclasifica a
   nadie** y el run queda «con advertencias» explicando qué configurar. Mantener a la gente donde está es reversible;
   moverla por una suposición, no.
5. **Un cliente-particular no lleva empresa**: su `clients.name` es el nombre de la persona, y `industry`/`websiteUrl`
   quedan vacíos. Su **email y teléfono siguen en Twenty** (la ficha enlaza), porque `clients` no tiene esas columnas y
   no se inventan datos aquí.

## Consecuencias

- Un cliente particular ya **funciona como cliente**: proyectos, pagos, recursos, documentos y su ficha.
- **Deja de estar en Contactos.** Si tenía relaciones como contacto (era el contacto de un proyecto o el POC de una
  oportunidad), esas relaciones siguen apuntando a la fila archivada: se conservan, pero conviene rehacerlas. La
  auditoría deja rastro de la reclasificación (CREATE del cliente + ARCHIVE del contacto).
- **Una Person es una cosa o la otra, nunca las dos.** `external_identities` tiene `UNIQUE(provider, external_type,
  external_id)`: un registro externo mapea a **una** fila de CT. Por eso no se puede tener a la vez el cliente y su
  contacto espejo.
- La reconciliación de borrados (M40) pasa a ser **por tipo interno**: las personas se reconcilian dos veces, una
  contra `contacts` y otra contra `clients`. Sin eso, la identidad de una persona-cliente se habría visto como huérfana
  al reconciliar «person» contra `contacts`, se habría borrado el puntero y el sync siguiente habría creado un
  duplicado — exactamente la trampa de M40, en otra tabla.
- **Bug arreglado por el camino:** `upsertIdentity` actualizaba `internal_id` pero **no `internal_type`** en el
  conflicto. Sin ese arreglo, mover a una persona de contacto a cliente dejaba el puntero diciendo `contact` mientras
  apuntaba a un `client`, con la misma consecuencia del párrafo anterior.

## Alternativas descartadas

- **Dejarlo como contacto y sólo mostrarlo en la lista de Clientes.** Es una mentira de interfaz: seguiría sin poder
  tener proyectos ni pagos, que es el motivo real del cambio.
- **Duplicar: crear el cliente y mantener el contacto.** Lo impide el `UNIQUE` de `external_identities`, y además
  significaría dos filas de CT para una persona, con dos estados que se pueden contradecir.
- **Añadir `email`/`phone` a `clients`.** Se valoró para no perder el contacto del particular, pero dejaría dos campos
  vacíos y bloqueados en el panel de todos los clientes-empresa. Si en el uso real molesta consultarlo en Twenty, es
  una migración aditiva de dos columnas y se hace entonces.
