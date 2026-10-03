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

## Addendum (2026-09-27, mismo día) — tres consecuencias de que el CRM sea de Twenty

1. **`clients.industry` guarda el «Organization Type» de Twenty** (Empresa, Centro educativo, Organismo público,
   Asociación, Autónomo…), no el viejo campo «industry» del CRM —que el contrato nuevo no incluye y que probablemente
   ya no exista allí—. Se guarda el **código** del enum `ORGANIZATION_TYPE` y la interfaz lo traduce con `enumLabel`;
   una etiqueta propia de ese Twenty se conserva tal cual, porque mostrarla informa más que descartarla. La columna
   de la base de datos **no se renombra** (el modelo es aditivo), pero la etiqueta visible pasa a ser «Tipo de
   organización»: llamarla «Industria» cuando dice «Autónomo» sería mentir. El nombre del campo en la API es
   configuración (`configuration.fields.companyOrganizationType`, por defecto `organizationType`) y, si no viene en el
   pull, **no se pisa** lo que hubiera: borrar un dato por no encontrar un campo es peor que no actualizarlo.
2. **La columna «Fuente» de la lista de clientes se sustituye por un enlace «Abrir en el CRM»**. Con todo el CRM
   viniendo de Twenty, saber que un cliente viene de Twenty no informa de nada; poder abrirlo allí, sí. La procedencia
   sigue visible en la ficha (donde un cliente nativo de CT se distingue) y la columna nueva muestra «—» cuando no hay
   registro externo.
3. **No hay botones para crear clientes, contactos ni oportunidades.** Nacen en Twenty y llegan con el sync, así que
   un «＋ Nuevo» aquí sólo podía producir un registro que el CRM no conoce. Se retiran el botón de las dos listas y el
   «Nuevo contacto» de la ficha del cliente, y los `RecordSpec` de `client`/`contact` pierden su `createPath` (el panel
   dice «Este registro no se crea desde Control Tower» si alguien llega por URL), igual que ya hacía `opportunity`.
   **Los comandos `createClient`/`createContact` siguen existiendo**: los usa el sync y son la vía para importar. A
   diferencia de `createOpportunity` (ADR-008) **no rechazan a un actor USER**, porque el e2e crea sus fixtures por
   HTTP; si se quiere cerrar también a nivel de API, hay que reescribir esas pruebas primero.


## Addendum (2026-10-02) — el juego de roles, y qué pasa con una etiqueta que no está en él

Integrando Twenty de verdad, el sync avisó: *«config CONTACT: Roles de relación que Twenty trae y Control Tower no
conoce: se han ignorado al clasificar»*. El aviso funcionó —dice el nombre de la etiqueta en el campo del id— y
señalaba un agujero real: **`CONTACT` no estaba en `PERSON_RELATIONSHIP_ROLE`**, aunque es el rol más común de todos
y el owner lo había descrito desde el principio («si la persona es sólo un contacto de una empresa (CONTACT)»). El
handoff listaba los otros cinco y ése se quedó fuera, así que **cada sincronización marcaba el run «con
advertencias» por el caso normal**, y el ruido tapaba los avisos que sí importan.

**Los roles de persona que CT reconoce** (`PERSON_RELATIONSHIP_ROLE`) son: `INDIVIDUAL_CLIENT` · **`CONTACT`** ·
`PARTNER` · `SUPPLIER` · `COLLABORATOR` · `REFERRAL_SOURCE` · `OTHER`. La comparación es **tolerante**: se normaliza
mayúsculas, espacios y guiones («Individual Client», `individual-client` y `INDIVIDUAL_CLIENT` son el mismo rol). La
regla de clasificación no cambia: sólo `INDIVIDUAL_CLIENT` convierte a una persona en cliente de CT; con los dos roles
a la vez, manda `INDIVIDUAL_CLIENT` (es a quien se factura).

**Qué hace CT con un valor que no conoce, por campo** — y la respuesta no es la misma, a propósito:

| Campo de Twenty | Si la etiqueta no está en el contrato |
|---|---|
| **People › Relationship Roles** | se **ignora** ese rol (los demás del registro sí cuentan) y el sync lo informa con su nombre. Nadie se reclasifica por un rol que no se entiende. |
| **Companies › Organization Type** | se **guarda tal cual**. Es una etiqueta descriptiva: mostrar «Cooperativa» sin traducir informa más que descartarla, y se ve en pantalla sin necesidad de aviso. |
| **Opportunity › Stage** | cae a `LEAD` **y ahora se avisa** (antes era silencioso). Es el caso más delicado: el stage es lo único que CT escribe de vuelta, así que una etapa nueva en Twenty aparecía aquí como «Prospecto» sin que nada lo dijera. |

**Lo que CT NO lee de esos tres objetos**, aunque tenga el enum declarado: `COMPANY_RELATIONSHIP_ROLE` (los roles de
la **empresa**) y los campos del handoff que aún no se tiran — idioma y canal preferidos, tipo de servicio, origen del
lead, motivo de pérdida. Están en el dominio y traducidos porque se usarán, pero hoy el pull no los pide: no es que no
los reconozca, es que no los mira. Decidir cuáles merecen viajar es parte de E-18.

### Verificación contra el Twenty real (2026-10-03)

Pedidos 4 registros de cada entidad a la instancia del owner, los valores en uso son:

| Objeto · campo | Valores en uso | ¿En el contrato? |
|---|---|---|
| `people.relationshipRoles` | `CONTACT` · `INDIVIDUAL_CLIENT` | sí, **tras añadir `CONTACT`** |
| `people.preferredLanguage` | `ES` · `IT` | sí (pero CT no lee el campo) |
| `companies.organizationType` | `BUSINESS` · `SCHOOL_EDUCATION` | sí |
| `companies.relationshipRoles` | `COMMERCIAL_ACCOUNT` · `SUPPLIER` · `COLLABORATOR` | sí (pero CT no lee el campo) |
| `opportunities.stage` | — (0 oportunidades) | sin verificar: no hay registros |

Ningún enum se queda corto con los datos que hay. **Las etapas quedan sin verificar** porque la tabla está vacía: los
valores de un select no se pueden deducir de los registros cuando no hay registros. Como el stage desconocido ya avisa,
la primera oportunidad que llegue con una etapa fuera del contrato lo dirá en el historial del sync — y si se quiere
comprobar antes, hay que preguntarle las opciones a la **API de metadatos** de Twenty, no a los registros.

Lo que esa misma verificación destapó —los campos del contrato que Twenty ya tiene y el pull no pide— es **E-19**.
