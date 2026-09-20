# Organización de la información — Drive y Notion

> Cómo estructurar la información en las dos fuentes que el owner organiza libremente (**Google Drive** =
> ficheros; **Notion** = conocimiento/contexto). Las demás fuentes (Twenty, GitHub, Calendar) ya tienen su
> organización fija. Complementa a [`NOTION_INFORMATION_ARCHITECTURE.md`](./NOTION_INFORMATION_ARCHITECTURE.md)
> (contrato de sincronización de Notion) y a la matriz de propiedad de `apps/web/content/user-guide.md`.

## Principio

Cada sistema es dueño de una capa, sin duplicar la verdad:

| Sistema | Dueño de | 
|---|---|
| **Twenty** | CRM (clientes, contactos, oportunidades) |
| **Notion** | Conocimiento + documentación + contexto operativo |
| **Google Drive** | **Ficheros** (la capa de almacenamiento documental) |
| **GitHub** | Código + conocimiento técnico versionado |
| **Google Calendar** | Eventos / agenda |
| **Control Tower** | Gobierno + contexto transversal entre sistemas |
| Gestor de secretos | Credenciales (NUNCA en Notion/Drive/CT) |

## Google Drive — estructura de carpetas

Espeja los dominios de negocio (los mismos que Notion/CT), orientada a *ficheros*. La carpeta raíz es la que
está compartida con la service-account y configurada en `integrations.configuration.folderId`.

```
📁 Control Tower Drive  (carpeta compartida raíz = folderId)
├── 01 — Business          (estrategia, modelo de negocio, ANEXOS de los SOP*, legal & admin, facturas)
├── 02 — Clients
│   └── <Cliente>/         (propuestas, contratos, entregables, assets del cliente)
├── 03 — Projects
│   └── <Proyecto>/        (briefs, diseños, entregables, exports)
├── 04 — Knowledge & Research   (research, referencias, exports de notas)
├── 05 — Marketing & Sales      (content, brand/plantillas visuales, campañas)
├── 06 — Assets & Templates     (plantillas de documento, assets de diseño, prompts)
├── 07 — Learning               (cursos, certificados, material de estudio)
└── 99 — Archive
```

\* **Anexos de los SOP**, no los SOP: el documento del proceso vive en Notion y aquí van sus checklists,
formularios y plantillas. Ver «SOPs / procesos» más abajo.

### Convenciones
- **Prefijos numéricos** (`01–99`) para orden estable.
- **Nombra las carpetas de cliente/proyecto igual que en Twenty/CT** (mismo nombre de cliente, slug de
  proyecto) → salto entre sistemas sin fricción y base para auto-vincular documentos a su cliente/proyecto.
- **Fechas `YYYY-MM-DD`** como prefijo en documentos versionables; estado por sufijo (`_DRAFT`, `_FINAL`).
- **Sin secretos** en Drive (igual que Notion): las credenciales viven en el gestor de contraseñas.

### Cómo lo indexa Control Tower
- El sync de Drive es **recursivo**: recorre la carpeta raíz y **todas sus subcarpetas** a cualquier
  profundidad, indexando cada fichero como un `document` (referencia + enlace; nunca el contenido).
- Las **carpetas en sí NO se indexan** (no son documentos); solo sirven para organizar.
- Es **solo lectura + pull**: para cambiar algo, se edita en Drive. CT guarda referencia + `webViewLink`
  ("Abrir" redirige a Drive).
- **Reconcilia borrados**: un fichero borrado o movido **fuera** de la carpeta (o de sus subcarpetas)
  desaparece de CT en el siguiente sync. Solo afecta a documentos de origen Drive; los nativos de CT no se tocan.

## SOPs / procesos — dónde vive cada cosa (owner 2026-09-02)

Decisión tomada al redactar el primer SOP (gestión de oportunidades). Resuelve la ambigüedad que había entre este
documento (que listaba «procesos/SOPs» dentro de `01 — Business` de Drive) y el principio de arriba (Notion es dueño
de la documentación):

| Pieza | Dónde vive | Por qué |
|---|---|---|
| **El SOP** (el documento: qué se hace, quién, cuándo) | **Notion**, en la DB de *Knowledge Items* | Es documentación viva, se relaciona con otras cosas y se lee más de lo que se edita |
| **Sus anexos** (checklists, formularios, descripciones imprimibles, plantillas) | **Drive**, `01 — Business` | Son ficheros: se rellenan, se imprimen, se comparten |
| **El registro gobernado** (estado, sector, búsqueda, historial) | **Control Tower**, `knowledge_items` con `knowledge_type = PROCESS` | El estado `DRAFT/REVIEW/APPROVED` es lo que distingue un SOP vigente de un borrador |

- **No hay entidad «SOP» en CT** y no debe crearse sin un motivo nuevo: un SOP es un ítem de conocimiento de tipo
  proceso. Ver la cabecera de `apps/web/app/(app)/business/processes/page.tsx`.
- **Puerta de entrada:** **Negocio › Procesos (SOP)** — la Biblioteca acotada a `PROCESS`. El dato sigue viviendo en
  Conocimiento; lo que cambia es dónde se entra a buscarlo, porque un proceso es gobierno del negocio, no material
  de consulta.
- **El enlace a la carpeta de Drive** del SOP se pone en el campo **«URLs relacionadas»** (`source_url`) **desde
  Control Tower**, nunca desde Notion (el sync lo sobreescribiría). Ver la nota del contrato en
  [`NOTION_INFORMATION_ARCHITECTURE.md`](./NOTION_INFORMATION_ARCHITECTURE.md) §4.1.
- **Se puede escribir el SOP en Notion directamente**: al sincronizar, CT lo importa como ítem nuevo. Y al revés — si
  se crea en CT, el sync crea la página en Notion. Los dos caminos funcionan.

## Notion — estado actual (2026-08)

Se mantiene **como está por ahora**: la página compartida contiene solo las **bases de datos** que se
sincronizan con CT (Decisions, Strategic Areas, Capabilities, Services, Goals, Projects, Knowledge Items,
Assets, Learning, Resources), con IDs congelados en `integrations.configuration.databases`.

La propuesta completa del `Consideraciones sobre notion.docx` (secciones `00 HOME … 99 ARCHIVE`, dashboards y
prosa) es la **capa humana de navegación/documentación** — opcional y **no afecta al sync**. Se adoptará
incrementalmente cuando el owner lo necesite. Dos reglas para cuando se reorganice:
- **Mover una DB NO cambia su `database_id`** (los IDs de Notion son permanentes) → CT sigue funcionando.
  ⚠️ *Mover*, no *recrear/duplicar* (eso genera un ID nuevo y rompe el mapeo).
- **Conservar el acceso de la integración**: en Notion el acceso se hereda del padre; anidar las DBs bajo la
  página ya compartida (o re-compartir) para no perder acceso.
