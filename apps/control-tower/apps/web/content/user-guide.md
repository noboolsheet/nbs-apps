# Guía de uso de Control Tower

Control Tower (CT) es tu **puesto de mando self-hosted**: unifica en un solo sitio tu CRM, tus proyectos, tu
conocimiento y tus recursos, integrando la información de sistemas externos (Twenty, Notion, GitHub, Google Drive)
**sin duplicar la autoridad** de cada dato. Esta guía explica qué hace cada parte, **quién es el dueño de cada
dato** y **qué hacer para añadir información nueva**.

## Principio clave: cada dato tiene un solo dueño

CT no es una copia de tus otros sistemas: es un panel que los integra respetando una regla de oro — **cada tipo de
información tiene UNA fuente de verdad**. Según el dato, la relación es una de estas tres:

- **Referencia (pull):** el dueño es un sistema externo; CT **importa** y muestra una copia. Los repos (GitHub) y
  documentos (Drive) son solo-lectura en CT. **CRM (Twenty)** es un caso especial: Twenty es el dueño y donde se
  **crean** los registros, pero CT puede **editar sus campos gestionados** (nombre, web, email, teléfono, importe,
  stage…) y los **empuja de vuelta** a Twenty (write-back). El resto de campos de Twenty no se tocan.
- **Propiedad por campo (bidireccional con Notion):** CT es dueño de las **propiedades estructuradas** (las empuja a
  Notion) y Notion es dueño del **cuerpo de la página** (texto libre). Nunca se editan los mismos campos en los dos
  lados, así que no hay bucles.
- **Nativo de CT:** CT es el único dueño (proyectos, tareas, recursos, etc.). Puede espejarse a Notion para consultarlo
  allí, pero se crea y edita **en CT**.

> Regla de seguridad innegociable: en CT viven **SÓLO referencias, NUNCA secretos**. El campo "credential location"
> es un **puntero** al gestor de contraseñas (p. ej. "1Password → Clientes"), jamás la contraseña. Las credenciales
> no van en CT ni en Notion.

## Las secciones de la app

- **Home** — resumen del día: trabajo pendiente, tareas abiertas y actividad reciente.
- **Business** — gobernanza: áreas estratégicas, capacidades, servicios, objetivos (goals) y **Procesos (SOP)**.
- **CRM** — clientes, contactos y oportunidades (pipeline de ventas). Se alimenta de Twenty.
- **Projects** — proyectos y sus tareas. La vista global **Tasks** (`/tasks`) lista TODAS las tareas de todos los
  proyectos, indicando a cuál pertenece cada una. Dentro de una tarea puedes añadir **subtareas** (solo de CT).
- **Knowledge** — **Por revisar** (artículos, vídeos y libros que quieres leer/ver, con su enlace), Library (notas de conocimiento, con **sector** para filtrar por área: Programación, IA, Marketing…),
  **Learning Path** (cursos/habilidades/temas/roadmaps que estás estudiando, con el link directo), Decisions, Assets
  (repos/plantillas), Documents (ficheros de Drive) e **Inbox** (captura rápida + canales de entrada por webhook).
- **Portafolio** — elementos de portfolio (trabajo mostrable). Es una sección propia de la barra lateral.
- **Pagos** — dinero pendiente de **cobrar** (te lo deben) o de **pagar** (lo debes tú), con vistas de pendientes y
  completados.
- **Automation** — **Automatizaciones** (inventario de todo lo que la app hace sola, con activar/desactivar y "Ejecutar ahora"), Integraciones (conectar y sincronizar Twenty/Notion/GitHub/Drive/Google Calendar) y Health (estado de jobs y syncs).
- **Ajustes** — tu perfil, organización, retención (tareas completadas, archivados y «Por revisar»), integraciones y esta guía.

Los **Recursos** (resources) no tienen sección propia en el menú: se ven y se crean desde la pestaña **"Recursos"** de
cada **Cliente** o **Proyecto**.

> **Buscar en todo (⌘K / Ctrl+K).** La barra de arriba abre una búsqueda que mira **todas** las secciones a la vez:
> clientes, contactos, oportunidades, proyectos, tareas, decisiones, biblioteca, reutilizables, servicios,
> capacidades, portafolio, **Por revisar**, **aprendizaje**, **recursos** y **pagos**. Los resultados salen agrupados
> por tipo y te llevan directamente a la ficha. Busca por palabras completas o por trozos de palabra; también mira
> dentro de las notas y descripciones, no sólo del título. **No devuelve lo archivado** (está oculto de sus listas,
> y el resultado te llevaría a una vista donde ya no aparece): para eso, *Ajustes › Archivados*.

> **Más usados.** Al pie del menú aparece un desplegable con accesos directos a las páginas que más visitas (una ficha
> de proyecto concreta, una lista…). Se aprende solo del uso y se guarda en **este navegador**, así que no se comparte
> entre equipos ni entra en las copias de seguridad.

> **Idioma.** La interfaz está en español. Todo su texto vive en un único diccionario, así que añadir otro idioma en el
> futuro no exige rehacer pantallas. **Lo que tú escribes no se traduce nunca**: nombres, títulos y notas se muestran
> tal y como los guardaste, igual que lo que llega de Twenty, Notion, GitHub o Drive.

## Matriz de la información

Qué información maneja CT, quién es su dueño, de dónde viene y qué hacer para añadirla o editarla.

| Información | Dónde en CT | Dueño (fuente de verdad) | De dónde viene y dirección | Cómo añadir o editar |
| --- | --- | --- | --- | --- |
| **Clientes** | CRM › Clients | **Twenty CRM** | company de Twenty → **pull + write-back** de campos gestionados | Créalo **en Twenty**; edítalo en Twenty **o en CT** (nombre, web, industria) y CT lo empuja a Twenty. Los registros nuevos se crean en Twenty. |
| **Contactos** | CRM › Contacts | **Twenty CRM** | person de Twenty → **pull + write-back** | En Twenty o en CT (nombre, email, teléfono, cargo); CT empuja los cambios a Twenty. |
| **Oportunidades** | CRM › Opportunities | **Twenty CRM** | opportunity de Twenty → **pull + write-back** | **Se crean y se editan SIEMPRE en Twenty.** En Control Tower lo único que se toca es la **etapa** (ADR-008): CT es la máquina de estados del embudo, nada más. Los 13 stages son los mismos que en Twenty. Al pasar a **WON**, CT crea su proyecto automáticamente. El tablero **Activas** (Kanban de 4 columnas: *Calificación de leads · Propuesta · Negociación · Cerradas*) muestra las abiertas, las ganadas y las recién cerradas; se cambia de etapa con el **desplegable de cada tarjeta** (no se arrastra). Las de la columna **Cerradas** (`LOST`/`ONBOARDED`) pasan solas a la pestaña **Archivadas** (lista, restaurables) ~1 semana después — eso ocurre **solo en CT, no cambia nada en Twenty**. Las **ganadas (WON) NO se archivan solas**: siguen en Negociación hasta que las mueves a `ONBOARDED`. |
| **Tareas importadas** | Projects › Tasks | **Twenty** (las de origen Twenty) | task de Twenty → pull (marcadas como origen Twenty) | **No se usa: no se crean tareas en Twenty** (decisión del 2026-09-26). Las tareas son de CT. El camino de importación existe y funciona, pero mientras no haya tareas en Twenty no trae nada. Si alguna vez las hubiera: conviven con las de CT sin mezclarse, el **título** lo manda Twenty y la **fecha** la manda CT (al reprogramar en CT, la fecha se empuja a Twenty). |
| **Proyectos** | Projects | **Control Tower** | nativo (o creado auto desde una oportunidad WON) → espejo a Notion (push) | Créalo **en CT**. Se refleja en Notion. Cada proyecto tiene un **tipo**: *Interno*, *Cliente* o *Laboratorio*; el de tipo **Cliente exige tener cliente asignado** (si no, no deja guardar). Un proyecto **personal** es siempre Interno. |
| **Fases de proyecto** | Projects › detalle › pestaña **Fases** | **Control Tower** | nativo (lista libre que defines) → NO se sincroniza | Divide el proyecto en etapas propias, ordénalas y marca la **fase actual** (aparece en el Resumen). Solo en CT. |
| **Tareas de CT y subtareas** | Projects › Tasks, detalle de tarea | **Control Tower** | nativo → NO se envían a Twenty | Créalas **en CT**. Las subtareas se añaden dentro de una tarea. |
| **Tareas de oportunidad** | CRM › Opportunities › ficha › Tareas (y vista «Tareas» en Oportunidades) | **Control Tower** | nativo → NO se envían a Twenty | Trabajo de **preventa** (antes de ganar). Créalas dentro de la ficha de la oportunidad; admiten subtareas. «Ver tareas ↗» muestra todas juntas en una lista. No se mezclan con las tareas de proyectos. Si la oportunidad se archiva, sus tareas quedan de solo lectura. |
| **Procesos (SOP)** | Negocio › Procesos (SOP) | **Notion** (el documento) + **Control Tower** (el registro) | `knowledge_item` con tipo *Proceso* ↔ Notion (bidireccional) | Un SOP **no es una entidad aparte**: es un ítem de la biblioteca de tipo **Proceso**. El **documento** se escribe en la base *Knowledge Items* de **Notion**; en CT gobiernas su **estado** (Borrador → En revisión → Aprobado) y su **sector**. Los **anexos** (checklists, formularios, plantillas) viven en **Drive**, y el enlace a su carpeta se pone en **«URLs relacionadas»** — **edítalo siempre en CT**, porque el sync empuja ese campo a Notion y sobreescribiría lo que escribas allí. |
| **Áreas estratégicas, Capacidades, Servicios, Goals** | Business | **Control Tower** | nativo ↔ Notion (propiedad por campo) | Créalos/edítalos **en CT**; se espejan a Notion (el cuerpo de la página lo gestionas en Notion). |
| **Decisiones** | Knowledge › Decisions | **Control Tower** ↔ Notion | nativo, o importado de la DB de Notion → bidireccional (por campo) | Créala en CT, o créala en Notion y se importa. Para **reemplazar** una decisión aprobada: crea la nueva y rellena su campo «Reemplaza a» → la antigua pasa sola a *Sustituida* y la lista muestra la cadena en los dos sentidos. El enlace vive solo en CT (no viaja a Notion). |
| **Knowledge items (Library)** | Knowledge › Library | **Control Tower** ↔ Notion | nativo, o page de Notion → bidireccional (por campo) | Créalo en CT (con **sector** para clasificar/filtrar), o en Notion y se importa. |
| **Por revisar** | Knowledge › Por revisar | **Control Tower** ↔ Notion | nativo, o página de Notion → bidireccional (por campo) | Guarda ahí lo que quieras leer o ver luego: título, enlace, tipo (artículo/vídeo/libro…) y sector. El **sector** es un desplegable que se rellena solo con los que ya usas en Conocimiento; si escribes uno nuevo, queda disponible para la próxima. Marca **Por revisar → Revisando → Revisado** desde la propia lista. **Ojo: «Revisado» no tiene marcha atrás** — es una afirmación sobre lo que ya hiciste, así que deshacerla borraría la fecha de revisión y devolvería a la cola algo que quizá ya está en la biblioteca. Una vez revisado, el recurso queda de **solo lectura** (ni se edita ni se descarta); lo que sí puedes seguir haciendo es **procesarlo**. Cuando algo está **revisado**, su panel ofrece **«Pasar a la biblioteca»**: lo guarda como conocimiento **aprobado** (con su enlace, su sector y tus notas como resumen) y deja el enlace a lo creado, para que no lo guardes dos veces. Lo revisado y **no** procesado se conserva siempre; lo procesado se puede limpiar con la retención de **Ajustes › Retención de «Por revisar»**. Si conectas su base de datos de Notion, puedes añadir enlaces desde el móvil y aparecen aquí. |
| **Learning Path** | Knowledge › Learning Path | **Control Tower** | nativo → espejo a Notion (solo push) | Créalo **en CT**: título, tipo (curso/habilidad/tema/roadmap), estado, sector, link directo y progreso. |
| **Reutilizables (repos/plantillas)** | Conocimiento › Reutilizables, y pestaña **Reutilizables** de cada proyecto | **GitHub** (los repos) / CT (plantillas) | repo de GitHub → pull; además espejo a Notion | Los repos se importan de GitHub (referencia + enlace, nunca el código). Un mismo reutilizable puede **enlazarse a varios proyectos** desde la pestaña «Reutilizables»: es una referencia al catálogo, así que **desenlazarlo no lo borra**. No confundir con la pestaña «Recursos», que son los accesos/apps del proyecto (*resources*). |
| **Documents** | Knowledge › Documents | **Google Drive** | file de Drive → pull (recursivo) | Sube el fichero a la carpeta de Drive configurada **o a cualquier subcarpeta**; se importa (las carpetas no, solo los ficheros). CT guarda referencia + enlace; "Abrir" siempre redirige a Drive. |
| **Eventos de hoy** | Home › Today's Events | **Google Calendar** | eventos del día → pull (referencia read-only) | Créalos/edítalos **en Google Calendar**; el Home muestra los de **hoy** (hora o "Todo el día") con enlace al evento, **agregando todos los calendarios configurados**. La lista avanza sola cada día. |
| **Recursos (resources)** | pestaña Recursos de Cliente/Proyecto | **Control Tower** | nativo → espejo a Notion (solo push) | Créalo **en CT** desde la pestaña Recursos. SÓLO referencias; "credential location" es un puntero, nunca el secreto. |
| **Pagos** | Pagos | **Control Tower** | nativo (no se sincroniza) | Créalos en CT con «＋ Nuevo». Marca si es **Entrada** (te lo deben: eliges cliente o contacto) o **Salida** (lo debes tú: escribes a quién en texto libre). Importe y moneda (**euros por defecto**), fecha prevista y estado **pendiente/pagado** —que puedes cambiar desde la propia lista—. Arriba se ven los totales pendientes por moneda —con la **reserva del 30 % para impuestos** junto a lo que te deben—, y hay vistas de **Pendientes**, **Completados**, **Retrasados** (los que ya pasaron de fecha, que además avisan en el Home) y **Todos**. |
| **Portfolio items** | **Portafolio** (barra lateral) | **Control Tower** | nativo | Créalos en CT. Desde 2026-09-01 el Portafolio es una sección propia de la barra lateral (antes colgaba de Conocimiento). |
| **Inbox (capturas)** | Knowledge › Inbox | **Control Tower** | captura manual o **canal webhook** con token → entrada a CT | Captura manual, o envía a un canal (p. ej. desde n8n). Luego se promueve a conocimiento. |
| **Canales de Inbox** | Knowledge › Inbox | **Control Tower** | nativo (token hasheado) | Crea un canal para recibir capturas externas; el token se muestra una sola vez. |
| **Capturas ya procesadas** | — (se borran) | **Control Tower** | nativo | Al procesar una captura, su texto pasa al **Resumen** del elemento de la biblioteca y la captura **se borra** en el barrido diario: la información vive en un solo sitio y la bandeja no se llena. Las descartadas, igual. |
| **Historial de cambios** | Panel lateral de cualquier registro › **Historial** | **Control Tower** | derivado (se escribe solo al editar) | No se rellena a mano: cada edición guarda qué campo cambió y desde qué valor. Despliega «Historial» al pie del panel para verlo. |
| **Envíos fallidos** | Automatización › Estado del sistema | **Control Tower** | derivado | Cambios hechos en CT que no llegaron a Twenty/Notion. **No se resuelven solos**: o **«Reintentar»** (manda el valor que CT tiene ahora) o **«Descartar»** (lo cierras sin enviar, p. ej. si ya lo corregiste a mano allí). Mientras estén ahí, el sync no sobrescribe ese registro. |
| **Resultado de los syncs** | Automatización › Integraciones | **Control Tower** | derivado (lo escribe el worker en cada sync) | No se toca: cada sincronización deja "N creados · M actualizados" y, si algún registro no se pudo traer, un aviso **«Con advertencias»** con el motivo de cada fallo. |
| **Histórico de procesos** | Automatización › Estado del sistema | **Control Tower** | derivado (lo escribe el worker) | No se toca. La pantalla enseña los 20 últimos y **«Descargar CSV»** baja el log activo entero. Cuando el activo llega a 5.000 filas terminadas se **cierra un lote** y empieza uno nuevo: los anteriores quedan en **«Archivos de log anteriores»**, comprimidos y descargables. Lo que aún está pendiente nunca se archiva. Lo mismo vale para la **bandeja de salida** (envíos a Notion/Twenty), que tiene su propia descarga y sus propios lotes. |

Direcciones: **pull** = el sistema externo manda y CT importa · **push** = CT manda y refleja en Notion ·
**bidireccional (por campo)** = CT dueño de las propiedades, Notion dueño del cuerpo.

## Cómo añadir información nueva (playbook)

- **Cliente o contacto** → **créalo en Twenty** (es el dueño de los registros nuevos); aparecerá en CT tras el sync
  (o pulsa "Sync now"). Una vez sincronizado, puedes **editar sus campos gestionados en CT o en Twenty**: CT empuja
  los cambios a Twenty automáticamente.
- **Oportunidad** → **créala y edítala en Twenty**. En CT no hay botón para crearlas y sus datos son de solo lectura:
  lo único que se cambia aquí es **la etapa** del Kanban (y eso sí se empuja a Twenty). Ver ADR-008.
- **Proyecto** → en CT, sección **Projects**. Si viene de una venta, muévela a **WON** en Twenty y CT crea el proyecto solo.
- **Tarea o subtarea** → en CT, dentro del proyecto o desde la vista **Tasks**. Son de CT; no van a Twenty.
- **Decisión o nota de conocimiento** → en CT (Knowledge › Decisions / Library), o créala en su DB de Notion y se importa.
- **Proceso / SOP** → escribe el documento en la base *Knowledge Items* de **Notion** (tipo *Proceso*) y llegará a **Negocio › Procesos (SOP)** con el sync; o créalo en CT desde ahí con «Nuevo» —nace ya como Proceso— y el sync crea la página en Notion. Los checklists y formularios, en su carpeta de **Drive**, enlazada desde «URLs relacionadas».
- **Recurso** (acceso, app hosteada, infraestructura, dominio…) → en la pestaña **Recursos** del cliente o proyecto.
  Guarda **el puntero** a la credencial, nunca la credencial.
- **Documento** → súbelo a la **carpeta de Google Drive** configurada (o a cualquier **subcarpeta** dentro de ella; el
  sync es recursivo); se importa como referencia en el próximo sync. Ver la estructura de carpetas sugerida en
  `docs/INFORMATION_ORGANIZATION.md`.
- **Repositorio** → créalo en **GitHub**; se importa como asset (referencia + enlace).
- **Evento / reunión** → créalo en **Google Calendar**; los de **hoy** aparecen en el Home (**Today's Events**) tras el
  sync. Es solo lectura: para cambiarlos, edítalos en Google Calendar.
- **Elemento de gobernanza** (área estratégica, capacidad, servicio, goal) → en CT, sección **Business**.
- **Conectar o revisar una integración** → Automation › **Integraciones** (Connect / Sync now) y **Health** para el estado.
  Para **Drive** y **Notion**, abre **"Configuración"** en su fila y pega el JSON (carpeta de Drive / IDs de bases de
  Notion). Los secretos (API keys, tokens) van en el `.env`, nunca en esa configuración.
- **Ver o controlar las automatizaciones** → Automation › **Automatizaciones**: lista todo lo que la app hace sola
  (sincronizaciones, barridos de mantenimiento, acciones por evento y el motor). Pulsa una para ver el detalle y, si
  procede, **activarla/desactivarla** (efecto real: pausada no se ejecuta) o **Ejecutarla ahora**. El motor central
  (cola de eventos y de trabajos) siempre está activo. El estado se guarda por organización.
- **Nueva automatización por evento** → hoy se implementan como **código** (no hay constructor visual). Pídelo y se añade.
- **Un tipo de recurso que no existe** → el campo "tipo" de los recursos es de **etiqueta libre**: escribe una nueva y queda disponible.

## Cómo funciona la sincronización

Cada integración se conecta en **Automation › Integraciones**. Desde ahí, **Sync now** lanza una importación; además
el sistema sincroniza **periódicamente** por su cuenta. Todo sync es **idempotente**: volver a sincronizar no duplica
nada (CT recuerda la correspondencia entre cada registro externo y el suyo). El estado de cada integración y de los
trabajos se ve en **Automation › Health**.

Los cambios que haces en CT se **empujan al instante** a su sistema dueño (a **Notion** las entidades reflejadas; a
**Twenty** los campos gestionados de clientes/contactos/oportunidades), sin esperar al sync. Los cambios que hace la
propia sincronización no se re-empujan (así se evitan los bucles).

### Qué pasa cuando borras algo en el sistema de origen

Las listas de Control Tower **siguen** a sus orígenes en las dos direcciones. Si borras un repositorio en GitHub, una
oportunidad en Twenty, un fichero de la carpeta de Drive o una página en Notion, en la siguiente sincronización ese
registro **se archiva** en CT: desaparece de las listas y se queda en **Ajustes › Archivados**, por si lo necesitas.

Se archiva y no se borra a propósito: puede tener trabajo tuyo colgando (tareas, entregables, enlaces a proyectos) y
esa información no debe evaporarse porque alguien borrara la ficha en el otro sistema. Si lo quieres fuera del todo,
archivado + la política de retención de Ajustes acaba borrándolo definitivamente.

**Y si vuelve a aparecer en el origen, se restaura solo.** Un repo que recuperas en GitHub o un fichero que devuelves
a la carpeta de Drive vuelven a su sitio en la siguiente sincronización, sin que tengas que tocar nada. Lo que hayas
archivado **tú** a mano se respeta: el sync no te lo vuelve a archivar aunque siga sin estar en el origen.

Dos salvaguardas que conviene conocer, porque explican por qué a veces *no* se archiva nada:

- Si una sincronización no devuelve **ningún** registro (token caducado, permiso retirado), CT **no archiva nada**.
  Una lista vacía casi siempre significa «no he podido mirar», no «ya no queda nada».
- En **Notion**, CT sólo archiva registros cuyo único origen es Notion. Un reutilizable que viene de GitHub no
  desaparece porque se borre su página espejo: de ese registro responde GitHub.

Cada ejecución te dice lo que hizo en **Automation › Integraciones**: creados, actualizados y **archivados**.

## Integridad de los datos: qué se puede y qué no

Control Tower protege la coherencia de tus datos con **reglas duras** que se aplican **en el servidor** (no sólo en la
pantalla): aunque alguien intente forzar un cambio saltándose la interfaz, el sistema lo rechaza. Estas reglas viven en
capas independientes que se refuerzan entre sí:

1. **Permisos por rol** — quién puede hacer qué.
2. **Máquinas de estado** — de qué estado se puede pasar a cuál (y cuáles son finales).
3. **Congelado de objetos cerrados/archivados** — lo terminado deja de ser modificable.
4. **Reglas de cierre y de pertenencia** — invariantes entre objetos relacionados.
5. **Propiedad del dato** — lo que gestiona un sistema externo no se edita aquí.
6. **Aislamiento, auditoría, retención y seguridad del borde** — cada dato en su organización, todo cambio registrado.

Cuando una acción se rechaza, la app devuelve un mensaje claro con su causa (p. ej. *"La oportunidad está archivada y no
admite cambios"* o *"Transición no permitida"*). No es un error tuyo: es la barrera que impide dejar los datos en un
estado incoherente.

### 1. Permisos por rol (quién puede hacer qué)

Cada persona tiene un rol dentro de la organización, con permisos **acumulativos** (cada rol incluye lo del inferior):

| Rol | Puede | No puede |
| --- | --- | --- |
| **VIEWER** | Leer / consultar todo | Crear, editar ni borrar nada |
| **MEMBER** | Leer + **crear y editar** (tareas, proyectos, conocimiento…) | Borrar registros; administrar la organización |
| **ADMIN** | Lo anterior + **borrar** registros | Administrar la organización |
| **OWNER** | Todo, incluida la **administración de la organización** (ajustes, retención, miembros) | — |

Si tu rol no alcanza para una acción, el servidor la rechaza con **FORBIDDEN** (*"El rol X no permite la acción Y"*).
Leer requiere VIEWER; crear/editar requiere MEMBER; borrar requiere ADMIN; administrar la organización, OWNER.

### 2. Máquinas de estado: transiciones permitidas

Cada tipo de objeto tiene un **ciclo de vida**: sólo se permite pasar de un estado a otro si la flecha existe. Un salto
no contemplado se rechaza con **"Transición no permitida"** (`INVALID_TRANSITION`). **Quedarse en el mismo estado siempre
vale** (no es un cambio). Los estados marcados **(final)** no tienen salida: desde ellos no se puede volver atrás.

- **Proyecto:**
  - `PLANNED` (planificado) → `ACTIVE`, `ARCHIVED`
  - `ACTIVE` (activo) → `BLOCKED`, `WAITING`, `REVIEW`, `CLOSED`, `ARCHIVED`
  - `BLOCKED` (bloqueado) → `ACTIVE`, `WAITING`, `CLOSED`, `ARCHIVED`
  - `WAITING` (en espera) → `ACTIVE`, `BLOCKED`, `CLOSED`, `ARCHIVED`
  - `REVIEW` (en revisión) → `ACTIVE`, `DELIVERED`, `CLOSED`, `ARCHIVED`
  - `DELIVERED` (entregado) → `CLOSED`, `ARCHIVED`
  - `CLOSED` (cerrado) **(final)** · `ARCHIVED` (archivado) **(final)**
  - No existe el salto directo `PLANNED → DELIVERED` (hay que pasar por el flujo). Un proyecto cerrado **no** vuelve a
    abrirse: si necesitas retomar el trabajo, se crea un proyecto nuevo.
- **Tarea:**
  - `TODO` (por hacer) → `IN_PROGRESS`, `BLOCKED`, `DONE`, `CANCELLED`
  - `IN_PROGRESS` (en curso) → `TODO`, `BLOCKED`, `DONE`, `CANCELLED`
  - `BLOCKED` (bloqueada) → `TODO`, `IN_PROGRESS`, `CANCELLED`
  - `DONE` (hecha) → `IN_PROGRESS` (única salida: **reabrir**)
  - `CANCELLED` (cancelada) → `TODO` (única salida: **retomar**)
  - Una tarea hecha o cancelada no salta a cualquier estado: sólo puede **reabrirse/retomarse** por el camino indicado.
- **Oportunidad (pipeline de ventas):** 13 estados repartidos en las 4 columnas del tablero, **los mismos que Twenty**:
  - *Calificación de leads:* `LEAD` (prospecto), `QUALIFIED` (cualificado)
  - *Propuesta:* `RESEARCHING` (investigando), `MEETING` (reunión), `EVALUATING` (evaluando), `PREPARING_PROP`
    (preparando propuesta), `PROPOSAL_SENT` (propuesta enviada)
  - *Negociación:* `NEGOTIATION` (negociación), `CONTRACTING` (contratación), `ON_HOLD` (en pausa), `WON` (ganada)
  - *Cerradas:* `LOST` (perdida), `ONBOARDED` (incorporado)

  Entre todos los estados **abiertos** puedes moverte **libremente** (tablero tipo Kanban), y desde cualquiera de ellos
  **cerrar** a `LOST` u `ONBOARDED`. **Sólo esos dos son finales: una oportunidad cerrada NO se puede reabrir**
  (*"La oportunidad ya está cerrada; no se puede mover a…"*). `WON` **no** es final: una ganada sigue en el tablero (en
  la columna *Negociación*) y puede avanzar a `ONBOARDED` cuando termina la incorporación del cliente, o volver atrás si
  el trato se cae. Al pasar a `WON`, CT crea su proyecto automáticamente.
- **Entregable (deliverable):** `PLANNED` → `IN_PROGRESS` → `REVIEW` → `APPROVED` → `DELIVERED`; se puede retroceder un
  paso (p. ej. `REVIEW → IN_PROGRESS`) y **archivar** desde cualquier estado. `ARCHIVED` es **(final)**.
- **Servicio:** `IDEA` → `DESIGNING` → `READY` → `ACTIVE` ⇄ `PAUSED`; **retirar** (`RETIRED`) desde cualquiera. `RETIRED`
  puede **reactivarse** volviendo a `IDEA`. No hay saltos (p. ej. `IDEA → ACTIVE` se rechaza).
- **Capacidad (capability):** `PLANNED` → `DEVELOPING` → `AVAILABLE`, con retrocesos; **retirar** (`RETIRED`) desde
  cualquiera y `RETIRED` reactivable a `DEVELOPING`.
- **Ítem de conocimiento (Library):** `INBOX` → `DRAFT` → `REVIEW` → `APPROVED`, con retroceso `REVIEW → DRAFT` y
  `APPROVED → REVIEW`; **archivar** desde cualquiera. `ARCHIVED` es **(final)**.
- **Decisión:** editorial `DRAFT` → `REVIEW` → `APPROVED`; histórico `APPROVED` → `SUPERSEDED` (sustituida) →
  `ARCHIVED`. **Archivar** desde cualquiera; `ARCHIVED` es **(final)**. Una decisión aprobada no se "edita para atrás":
  se **sustituye** (queda el histórico).
- **Asset:** `DRAFT` → `ACTIVE` → `DEPRECATED` (y `DEPRECATED` puede volver a `ACTIVE`); **archivar** desde cualquiera.
  `ARCHIVED` es **(final)**.
- **Ítem de portfolio:** `NOT_ELIGIBLE` → `CANDIDATE` → `IN_PREPARATION` → `PUBLISHED`, con retrocesos; **archivar**
  desde cualquiera. `ARCHIVED` es **(final)**.
- **Bandeja de conocimiento (Inbox):** una captura sólo se puede **editar mientras está en `NEW`**; en cuanto se
  **resuelve** (se promueve a la Library → `PROCESSED`, o se **descarta** → `DISCARDED`) queda de **solo lectura**
  (`INBOX_NOT_EDITABLE`), y no se puede promover dos veces la misma captura (`INBOX_ALREADY_RESOLVED`).

> Además, el **valor** de estado se valida en la base de datos: sólo se aceptan los códigos de cada lista. Los campos de
> **etiqueta libre** (el *tipo* de un recurso, el *sector* de conocimiento, el *tipo* de ítem de aprendizaje) sí admiten
> texto nuevo a propósito: no son estados, son clasificaciones abiertas.

### 3. Objetos cerrados o archivados = congelados (solo lectura)

Lo que se da por terminado deja de ser modificable, para que el historial no cambie bajo tus pies:

- **Proyecto `CLOSED`:** no cambia de estado **ni admite editar sus tareas**. Al intentar tocar una tarea de un proyecto
  cerrado se rechaza con **PROJECT_CLOSED** (*"El proyecto está cerrado y no admite cambios. Crea un proyecto nuevo si
  necesitas modificar algo"*).
- **Oportunidad:** en CT sólo se cambia su **etapa**; el resto de sus datos se editan en Twenty (los que Twenty posee
  salen con un 🔒 y la nota "se edita en el origen"). Crearlas desde CT tampoco es posible: se rechaza con
  **OPPORTUNITY_EXTERNAL_ONLY** (*"Las oportunidades se crean en Twenty…"*).
- **Oportunidad archivada:** queda **congelada** por completo — ni siquiera se le cambia la etapa, ni se le añaden o
  modifican tareas de preventa. Se rechaza con **OPPORTUNITY_ARCHIVED** (*"…Restáurala para volver a editarla"*). Para
  volver a trabajarla hay que **restaurarla** primero. Las oportunidades de la columna *Cerradas* (`LOST` u
  `ONBOARDED`) se archivan solas ~1 semana después; las **ganadas (`WON`) no** se archivan solas.
- **Subtarea:** una subtarea es **solo panel** y **no puede tener sub-subtareas** (la jerarquía se corta en dos niveles:
  Tarea → Subtarea).

### 4. Reglas de cierre y de pertenencia (invariantes entre objetos)

- **Un proyecto no se puede cerrar si tiene tareas activas.** Antes de pasar a `CLOSED`, CT cuenta las tareas en
  `TODO`, `IN_PROGRESS` o `BLOCKED`; si hay alguna, rechaza con **PROJECT_HAS_ACTIVE_TASKS** (*"No se puede cerrar: el
  proyecto tiene N tarea(s) activa(s)"*). Primero termina o cancela esas tareas.
- **Una tarea pertenece a UN solo contexto.** O es de un **proyecto**, o es de una **oportunidad** (trabajo de preventa),
  o es **personal** — **nunca a varios a la vez**. El sistema fuerza la exclusión: si la asignas a un proyecto o a una
  oportunidad, deja de ser personal automáticamente.
- **No se crean tareas dentro de padres congelados.** No puedes añadir una tarea a un **proyecto cerrado** ni a una
  **oportunidad archivada** (mismos rechazos `PROJECT_CLOSED` / `OPPORTUNITY_ARCHIVED`).
- **Referencias válidas y dentro de tu organización.** Al enlazar un objeto con otro (tarea↔proyecto, recurso↔cliente…),
  el destino debe existir y pertenecer a tu organización; si no, se rechaza (`NOT_FOUND` / `FK_VIOLATION`).

### 5. Propiedad del dato: lo que gestiona un sistema externo no se edita aquí

Cada dato tiene **un solo dueño** (ver "Matriz de la información"). Los campos que posee un sistema externo están
**bloqueados por procedencia**: si un registro se importó de ese proveedor, sus campos propios no se pueden cambiar en CT
(se editarían en vano, porque el próximo sync los volvería a pisar). Se rechaza con **FIELD_OWNED_EXTERNALLY** (*"El
campo «…» lo gestiona <proveedor> y no puede editarse aquí; se edita en el origen"*). Casos actuales:

- **Tarea importada de Twenty:** el **título** lo posee Twenty (inmutable en CT). La **fecha**, en cambio, la posee CT y
  sí se edita aquí (y se empuja de vuelta a Twenty).
- **Asset importado de GitHub:** nombre, descripción y URLs del repo los posee GitHub (no editables en CT).

Ojo: esto sólo afecta a registros **importados** de ese proveedor. Los registros **nativos de CT** no tienen ningún
campo bloqueado. Y no confundir con el **write-back** de Twenty (nombre/web/email/importe/stage de clientes, contactos y
oportunidades): esos sí se editan en CT **a propósito** y se empujan a Twenty.

### 6. Aislamiento, auditoría, retención y seguridad del borde

- **Aislamiento por organización:** cada fila lleva su `organization_id` y toda consulta se filtra por él. No se puede
  leer ni tocar un dato de otra organización: para tu sesión, sencillamente "no existe" (`NOT_FOUND`).
- **Auditoría a prueba de borrado:** **cada cambio** deja rastro en dos registros **append-only** (que nunca se
  editan ni se borran): *quién hizo qué* (audit log) y *cómo cambió el estado* (diff antes→después). Por eso, aunque
  una tarea se purgue por retención, **queda constancia** de que existió y de que se eliminó.
- **Retención (borrado controlado):** hay tres borrados automáticos, **todos opt-in** (por defecto "conservar
  siempre") y todos dejan anotación en el audit log. Cada política lleva al lado un botón **«Purgar ahora»** que
  ejecuta ese barrido en el momento sin esperar al worker, y te dice cuántos registros borró:
  - **Retención de tareas completadas:** elimina las **tareas completadas (`DONE`)** más antiguas que el umbral de
    *Ajustes › Retención de tareas completadas*. Una tarea que tenga subtareas se conserva (borrarla las dejaría
    huérfanas).
  - **Retención de archivados:** el archivado es un **borrado suave reversible** (se conservan indefinidamente hasta
    que los restaures); si configuras un umbral en *Ajustes › Retención de archivados*, lo que lleve archivado más de
    N días se **borra definitivamente** (ya no se puede restaurar). Al borrar un elemento se llevan por delante sus
    piezas internas (las fases de un proyecto, sus enlaces a reutilizables), pero lo que **un registro vivo aún use**
    —por ejemplo un cliente archivado con un proyecto activo— se conserva y te lo dice en el resultado: primero
    archiva o reasigna lo que lo usa.
  - **Retención de «Por revisar»:** borra de la cola lo **descartado**, y lo **revisado sólo si ya lo pasaste a la
    biblioteca** — ahí sigue, con su enlace, así que no se pierde nada. Un revisado que **no** has procesado es la
    única copia que queda de él (su título, su enlace y tus notas), así que **se conserva indefinidamente** por
    mucho que pase el umbral: la retención está para tirar lo resuelto, no para decidir por ti. Lo pendiente no se
    toca nunca.
  Otros barridos afines: archivar oportunidades cerradas ~1 semana después y limpiar las capturas del Inbox **ya
  procesadas** (su contenido ya vive en la Library). Todos son **idempotentes** (ejecutarlos de más no rompe nada) y
  se pueden activar/desactivar en *Automation › Automatizaciones*.
- **Idempotencia (sin duplicados):** los syncs no duplican registros (CT recuerda la correspondencia externa↔interna con
  una identidad única por proveedor). La automatización *oportunidad ganada → crear proyecto* tampoco duplica: si ya
  existe el proyecto de esa oportunidad, no crea otro.
- **Seguridad del borde (API):** cada petición de escritura pasa por **sesión válida** (si no, `UNAUTHENTICATED`),
  **protección CSRF** por origen (peticiones de navegador con origen distinto al host → `CSRF`) y **límite de frecuencia**
  por IP (`RATE_LIMITED`). Los datos entrantes se validan (esquemas Zod): lo mal formado se rechaza con `VALIDATION`.
- **Secretos, nunca en CT:** el campo "credential location" es un **puntero** al gestor de contraseñas, jamás el secreto.
  Los **tokens de los canales del Inbox** se guardan **hasheados** (SHA-256); el texto plano se muestra **una sola vez**
  al crear o regenerar el canal (si lo pierdes, se regenera, no se recupera).

## Preguntas frecuentes

- **Edité un cliente en CT: ¿se refleja en Twenty?** Sí, los campos gestionados (nombre, web, email, teléfono, importe,
  stage…) se **empujan a Twenty** al guardar. Los registros **nuevos** sí se crean en Twenty (no en CT).
- **¿Puedo guardar una contraseña de un acceso?** No. Guarda **dónde** está la credencial (el puntero); el secreto vive
  en tu gestor de contraseñas. CT nunca almacena secretos.
- **Borré una tarea completada y ya no aparece.** El borrado por retención elimina la fila, pero **el registro queda en
  el historial (audit log)**. La retención se ajusta en Settings.
- **Un documento no abre dentro de CT.** Por diseño: los documentos son **referencias**; "Abrir" te lleva al fichero
  real en Google Drive. CT nunca guarda el contenido del fichero.
- **¿Detecta CT los documentos dentro de subcarpetas de Drive?** Sí, el sync es **recursivo**: recorre la carpeta
  configurada y todas sus subcarpetas a cualquier profundidad. Las carpetas en sí no se importan, solo los ficheros.
- **¿Dónde veo los recursos de un cliente?** En la ficha del **Cliente** (o del **Proyecto**), pestaña **Recursos**: incluye
  los suyos y los de sus proyectos.
- **No veo mis eventos en el Home.** Comparte tu(s) calendario(s) con el email de la cuenta de servicio de Google (permiso
  "Ver todos los detalles"), conéctalo en Automation › Integraciones y pulsa **Sync now**. El Home muestra solo los de
  **hoy**; es solo lectura (para editarlos, ve a Google Calendar).
- **Tengo varios calendarios: ¿los veo todos?** Sí. Se configuran juntos (sus IDs separados por coma) y el Home **agrega
  los eventos de todos**. Basta con compartir cada uno con el email de la cuenta de servicio.
- **La app no me deja cambiar un estado.** Es una regla de la máquina de estados: sólo se permiten las transiciones
  contempladas (ver "Integridad de los datos"). Por ejemplo, una oportunidad cerrada o un proyecto cerrado no se
  reabren, y una tarea hecha sólo puede **reabrirse** a "en curso". El mensaje indica la causa.
- **No puedo cerrar un proyecto.** Tiene tareas activas (por hacer / en curso / bloqueadas). Termínalas o cancélalas y
  vuelve a intentarlo.
- **No puedo editar una oportunidad.** No es un fallo: **en CT sólo se cambia su etapa**; el nombre, el importe, la
  fecha y el cliente se editan **en Twenty** y llegan con el sync. Si tampoco puedes cambiar la etapa, está
  **archivada** (congelada). Restáurala desde la pestaña *Archivadas* para
  volver a editarla; entonces admitirá cambios y nuevas tareas de preventa.
- **No me deja cambiar el título de una tarea o los datos de un repo.** Ese campo lo **posee un sistema externo**
  (Twenty para el título de tareas importadas; GitHub para nombre/URLs de un asset importado). Edítalo en el origen; el
  próximo sync lo trae a CT.
