# Patrón de desarrollo de aplicaciones con IA

> **Qué es.** El método con el que se construyó Control Tower, extraído y generalizado como **patrón
> reutilizable** para crear cualquier aplicación asistida por IA con calidad, trazabilidad y control. El
> objetivo es **estandarizar**: seguir siempre los mismos pasos, con los mismos artefactos, para que cada nuevo
> proyecto arranque con un método probado en lugar de improvisar.
>
> **Cómo usarlo.** Léelo antes de empezar un proyecto nuevo. Copia la estructura de documentos y las fases;
> adáptalas al tamaño (un proyecto pequeño puede fusionar documentos y tener menos milestones, pero **el orden y
> los gates no cambian**). Control Tower se cita como **ejemplo de referencia** a lo largo del documento.

---

## 1. Principios rectores

Lo que hizo que el método funcionara, en una lista:

1. **Documentación primero (design-first).** No se escribe código hasta que el problema, el dominio, la
   arquitectura, el stack y el modelo de datos están escritos y revisados. La IA construye contra un contrato,
   no interpreta sobre la marcha.
2. **Decisiones congeladas y con dueño humano.** Las decisiones de producto/arquitectura las **decide y congela
   el owner**; se registran con su porqué. La IA propone opciones, el humano elige.
3. **Regla de precedencia + regla de oro.** Cuando dos documentos se contradicen, hay un **orden de precedencia**
   fijo para resolverlo; si la contradicción **no** está resuelta, la regla de oro es **PARAR y señalar**, nunca
   inventar una regla de dominio.
4. **Construcción por milestones, app siempre arrancable.** Cada hito entrega una aplicación que compila y
   corre. Nada de ramas gigantes que no arrancan durante semanas.
5. **Una fuente de verdad del progreso.** Una bitácora cronológica (`BUILD_LOG`) es la verdad de "en qué punto
   estamos". Sobrevive al cierre del chat y permite a cualquier agente retomar.
6. **Backlog vivo de hallazgos.** Todo lo que se simplifica, difiere o se encuentra roto en el camino se anota
   en un backlog (`FINDINGS`), con impacto y "qué haría falta para hacerlo completo". No se pierde nada.
7. **Verificación por sub-fase, un commit por sub-fase.** Cada trozo se valida (typecheck · lint · unit ·
   integración · build · e2e) **antes** de commitear. El árbol siempre está verde.
8. **Arquitectura por capas + slice vertical por entidad.** Cada feature recorre las mismas capas en el mismo
   orden. Predecible, testeable, sin lógica de negocio en la UI ni en la API.
9. **Transversales centralizadas desde el día 0.** Todo lo que se repite en cada pantalla —**tema/estilo
   (tokens semánticos + primitivas UI), etiquetas de display (i18n), patrones de interacción**— vive en **una
   fuente única** desde el principio, nunca *inline* en cada componente. Retrofit-earlo después es carísimo
   (ver las "lecciones caras" de la Fase 0). El dato canónico (valor/DB/API) **no** se traduce ni se estiliza; sólo su representación.
10. **UI declarativa por registro, no formularios a medida.** El CRUD se describe **por datos** (un `spec` por
    entidad: campos, endpoints, relaciones) que un componente genérico consume. Añadir/editar una entidad se
    hace tocando el registro, no reescribiendo una pantalla.
11. **Seguridad y despliegue como gates, no como epílogo.** Hay un checklist de seguridad y un runbook de
    despliegue que se deben pasar; la exposición pública tiene su propio gate.
12. **Mejora continua con el mismo patrón.** Tras el MVP, cada mejora sigue exactamente los mismos pasos
    (capas → verificación → bitácora → backlog), incluyendo el sondeo de seguridad.

---

## 2. Las fases del patrón (el roadmap del método)

```
FASE 0   Documentación de diseño (9 documentos)         → contrato de construcción
FASE 0.5 Congelar decisiones (DECISIONS_FROZEN + ADRs)  → precedencia + regla de oro
FASE 1   Plan por milestones (ROADMAP)                  → recorrido con DoD
FASE 2   Construcción (capas + slice vertical)          → BUILD_LOG + FINDINGS + ADR/ERRATA
FASE 3   Endurecimiento y seguridad (SECURITY + CHECKLIST)
FASE 4   Despliegue (DEPLOYMENT runbook + gates pre-prod)
FASE 5   Mejora continua (mismo patrón) + gate de lanzamiento público
```

### FASE 0 — Documentación de diseño (los 9 documentos)

La entrada del proyecto. Es una **secuencia**: cada documento se apoya en el anterior, y los dos últimos son
**revisiones** que reconcilian inconsistencias antes de construir. Se **congelan** como línea base y **no se
reescriben** cuando la implementación evoluciona (las desviaciones van como ERRATA/ADR).

| # | Documento | Qué define / produce |
|---|---|---|
| 1 | **Spec** | Producto + requisitos funcionales. El "qué" y el "para quién" (exploratorio). |
| 2 | **Domain Model** | Entidades, propiedad de cada dato, invariantes, máquinas de estado. **Se congela.** |
| 3 | **Technical Architecture** | Capas, límites, patrones (outbox, jobs, adapters, API-first). |
| 4 | **Stack Decision** | Tecnología y modelo de despliegue. **Autoritativo** para el stack. |
| 5 | **Physical Data Model** | Esquema físico (tablas, columnas, tipos, índices, FKs). **Autoritativo** para el esquema. |
| 6 | **Information Architecture** | Navegación, secciones, arquitectura de información del producto. |
| 7 | **Wireframes + convenciones de UX** | Pantallas del MVP (baja fidelidad) **y el contrato de interacción**: cómo se crea/edita en TODA la app, estados loading/empty/error, patrón de navegación, drawer vs. página. |
| 8 | **Cross-Document Review + ERRATA** | Revisión cruzada de 1–7; detecta y **resuelve** inconsistencias como ERRATA-NNN. |
| 9 | **Implementation Plan Review** | Revisa/aprueba el plan de construcción con aclaraciones (IMP-NNN). |

> **Clave del método:** los documentos 8 y 9 son **gates de consistencia**. El 8 encuentra las contradicciones
> entre los documentos de diseño y las zanja (erratas). El 9 valida que el plan es construible. Saltárselos =
> construir sobre contradicciones.
>
> *Ejemplo CT:* `docs/1_…9_CONTROL_TOWER_*.md`; el 8 produjo ERRATA-001..016 (resolvió 4 inconsistencias
> críticas), el 9 produjo IMP-001..010.

> **⚠️ Lección cara (CT): el wireframe define pantallas, pero el *contrato de interacción* hay que
> congelarlo también.** En CT los wireframes (doc 7) fijaron layouts pero **no** el modelo de creación/edición.
> Ese patrón —**panel lateral estilo Twenty**: botón "＋ Nuevo" → drawer → crear-al-guardar → autoguardado por
> campo, idéntico en cada lista— se decidió **tarde** y obligó a **unificar a posteriori** todos los formularios
> inline entidad por entidad. Si vuelve a pasar: define en la Fase 0 (junto a los wireframes) un
> **documento de convenciones de UX** con las pocas decisiones que se repiten en toda la app (crear/editar,
> estados vacío/carga/error, navegación, cuándo drawer y cuándo ficha). Cuesta una página y ahorra un retrofit.

> **⚠️ Lección cara (CT): el sistema de tema y las etiquetas de display son *fundación*, no cosmética final.**
> CT arrancó con color/espaciado *inline* en cada componente (`bg-neutral-900`, `dark:…`) y con textos de UI
> escritos a mano. Consecuencia: una migración retroactiva de **~592 usos de color crudo → 0** a tokens
> semánticos, y una **pasada completa de traducción** al final. Ambas se evitan estableciendo en la Fase 0:
> **(a)** tokens semánticos + primitivas UI (`Button`/`Input`/`Card`/`TextLink`, badges por tono) como fuente
> única de color y forma —cambiar un color = un sitio, sin `dark:` en cada clase— y **(b)** una **capa de
> etiquetas de display** (`enumLabel`: código canónico → texto visible) separada del valor. Regla de oro del
> display: **el valor/DB/API y los datos del usuario o importados de terceros nunca se traducen ni se
> restilizan**; sólo su representación. *En CT:* `docs/DESIGN_TOKENS.md`, `apps/web/lib/labels.ts`.

### FASE 0.5 — Congelar decisiones

- **`DECISIONS_FROZEN.md`** — las decisiones del modelo base que no se re-discuten.
- **Regla de precedencia** (congelada) para resolver contradicciones. *En CT:* decisiones de arquitectura →
  ERRATA → Domain Model → Physical Data Model → Information Architecture → Wireframes → Spec.
- **Regla de oro:** contradicción no resuelta por la errata → **parar y señalar** (no inventar dominio).
- **ADRs** (`adr/ADR-NNN-*.md`) — cada decisión de arquitectura tomada **durante** la construcción (cuando el
  diseño no cubría un caso) se registra con contexto, decisión y consecuencias. *En CT:* ADR-001..004
  (p. ej. esquema de `portfolio_items` que la errata pidió pero el data model no definía).

### FASE 1 — Plan por milestones

- **`IMPLEMENTATION_ROADMAP.md`** — el recorrido dividido en **N milestones** (CT: 18, M01…M18). **Cada
  milestone entrega una app que arranca.** Copia versionada del plan aprobado (sobrevive al chat).
- **Definition of Done (DoD) por feature** — la misma checklist para cada entidad:
  `Domain ✓ · DB ✓ · Migración ✓ · Zod ✓ · Caso de uso ✓ · API ✓ · UI ✓ · loading/empty/error ✓ · authz org ✓
  · audit/change-event ✓ · tests ✓ · doc ✓`.
- **DoD de migración** — aplica desde DB limpia + rollback donde aplique + seed válido.
- **Journeys e2e mínimos** definidos por adelantado (los caminos críticos que deben funcionar siempre).
- **Fundación de UI antes del primer slice** (parte del andamiaje, no del pulido final): tokens semánticos +
  primitivas (`Button`/`Input`/`Card`/badges por tono), la capa de etiquetas de display, y el/los patrones de
  interacción (p. ej. el drawer de crear/editar) ya montados. Así el primer slice ya nace estilado, traducido y
  con el mismo patrón de edición que el último. (Ver las "lecciones caras" de la Fase 0 — es lo que en CT tocó retrofit-ear.)

### FASE 2 — Construcción

**Arquitectura por capas** (dependencias hacia dentro; sin framework en el dominio):
```
domain (entidades, enums, transiciones, reglas puras)
  → validation (Zod)
    → application (casos de uso: authz + scoping + auditoría + mapeo de errores)
      → api (route handlers con hardening: CSRF + rate-limit + sesión)
        → ui (server components leen queries; forms usan el cliente tipado)
integrations (adapters por proveedor) y db (schema/migraciones) como soportes transversales
```

**Slice vertical por entidad:** se construye una entidad de punta a punta recorriendo esas capas en orden,
en vez de "todas las tablas, luego toda la API, luego toda la UI". Cada slice cumple el DoD.

**Registro declarativo para la UI de CRUD** (principio 10): en lugar de un formulario a medida por pantalla,
hay **un `spec` por entidad** (campos editables derivados de los schemas Zod `update*`, endpoints REST,
relaciones, ruta de la ficha completa) que un componente **genérico** consume. Añadir/editar una entidad en el
panel = tocar el registro, no una vista. *En CT:* `apps/web/lib/record-registry.ts` alimenta el drawer global
`components/ui/record-panel.tsx` (controlado por query `?rec=<entidad>:<id|new>`, autoguardado por campo).

**Fuente de verdad en código para catálogos** (no una tabla a medio usar): lo que es esencialmente configuración
—el catálogo de automatizaciones, las specs de sync por proveedor— se describe **en código** como fuente única,
con un test de invariantes que evita el *drift*. *En CT:* `automations/catalog.ts` (14 automatizaciones),
`notion-specs.ts` (una spec por entidad).

**Ritmo de trabajo:**
- **Un commit por sub-fase**, con mensaje descriptivo.
- **Cadena de verificación antes de cada commit** (ver §5).
- **Se documenta cada paso** en `BUILD_LOG.md` (fuente de verdad del progreso) y se anota lo hallado en
  `FINDINGS_AND_DEFERRED.md`. Las desviaciones del diseño → ERRATA (citada en comentarios del código) o ADR.
- **Contratos de integración** por escrito antes de codificar cada adapter (qué campo es dueño de quién, IDs,
  dirección del sync). *En CT:* `NOTION_INFORMATION_ARCHITECTURE.md`, `INFORMATION_ORGANIZATION.md`.

### FASE 3 — Endurecimiento y seguridad

- **`SECURITY.md`** — baseline de reglas duras (p. ej. *solo referencias, nunca secretos*).
- **`SECURITY_CHECKLIST.md`** — checklist exhaustivo por dominios (auth, authz, inyección, secretos, cabeceras,
  infra, deps, datos) con veredicto por control, **más una Parte II con el gate de lanzamiento público**.
- **Sondeo de seguridad** con evidencia del código (revisión por dominios) al cerrar el MVP y antes de exponer.

### FASE 4 — Despliegue

- **`DEPLOYMENT.md`** — runbook (local y producción), con **gate pre-prod** (secretos definidos, HTTPS,
  healthchecks, **backups + prueba de restauración**).
- Imágenes **horneadas/inmutables** en producción; secretos por `env_file`/gestor, nunca en la imagen.

### FASE 5 — Mejora continua

- Cada mejora post-MVP sigue **el mismo patrón**: diseño mínimo → capas → verificación → `BUILD_LOG` →
  `FINDINGS`. *En CT:* integración de Google Calendar, Drive recursivo + reconciliación, desconectar
  integraciones, reorganización del Home — todas por el mismo camino.
- **Re-ejecutar el checklist de seguridad** en cada release y antes de cualquier cambio de exposición de red.
- El **gate de lanzamiento público** (Parte II del checklist) es su propia fase antes de abrir la app a internet.

---

## 3. Inventario de artefactos (qué documentos tiene todo proyecto)

**De diseño (congelados, línea base):** los 9 documentos de la Fase 0.

**Vivos (autoritativos, reflejan el estado actual):**
| Documento | Rol |
|---|---|
| `BUILD_LOG.md` | **Fuente de verdad del progreso.** Bitácora cronológica (lo más reciente arriba). |
| `FINDINGS_AND_DEFERRED.md` | Backlog vivo: hallazgos `F-*` / diferidos `E-*`, con impacto 🔴/🟡/🟢. |
| `adr/ADR-NNN-*.md` | Decisiones de arquitectura tomadas en construcción (contexto/decisión/consecuencias). |
| `DECISIONS_FROZEN.md` | Decisiones congeladas del modelo base + regla de precedencia. |
| `IMPLEMENTATION_ROADMAP.md` | Plan por milestones + tracker de estado + DoD. |
| Contratos de integración | Propiedad por campo, IDs, dirección del sync por proveedor. |
| `INFORMATION_ORGANIZATION.md` | Cómo se organiza la información en fuentes externas libres. |
| `DEPLOYMENT.md` | Cómo desplegar + gate pre-prod. |
| `SECURITY.md` + `SECURITY_CHECKLIST.md` | Baseline + checklist (Parte I self-hosted, Parte II público). |
| Sistema de tema (`DESIGN_TOKENS.md` + primitivas) | **Fuente única de color/forma**: tokens semánticos + `Button`/`Input`/`Card`/badges. Cambiar un color = un sitio. |
| Registro declarativo de CRUD | Un `spec` por entidad (campos + endpoints + relaciones) que alimenta la UI genérica del panel. *En CT:* `record-registry.ts`. |
| Capa de etiquetas de display | Código canónico → texto visible (i18n de UI), separada del valor. El dato nunca se traduce. *En CT:* `lib/labels.ts`. |
| `CLAUDE.md` (raíz) | **Onboarding del agente**: dónde está el estado, reglas duras, comandos, convenciones. |
| Guía de usuario | Manual para el usuario final + matriz de propiedad del dato (dueño/origen/dirección). |

> **Regla de precedencia documental:** donde el código y los documentos difieran, **manda el código** y su
> documentación viva; los documentos de diseño 1–9 son referencia histórica y **no** se reescriben.

---

## 4. Convenciones clave (formatos reutilizables)

- **ADR** (`ADR-NNN-titulo.md`): Estado · Fecha · Decisor · Milestone afectado · **Contexto** · **Decisión** ·
  **Consecuencias**. Uno por decisión de arquitectura.
- **FINDINGS** (`F-NNN`/`E-NNN`): agrupados por tipo (gaps modelo↔dominio, simplificaciones UI, diferidos a un
  milestone, convenciones elegidas, roadmap de producto). Cada ítem: **hallado en**, qué dice el diseño, qué hace
  el MVP, **qué haría falta para completarlo**. Leyenda de impacto 🟢 menor · 🟡 funcional · 🔴 arquitectura.
- **ERRATA** (`ERRATA-NNN`): corrección a la línea base de diseño, citada en los comentarios del código
  (`// ERRATA-014`) y en la revisión cruzada (doc 8).
- **Citación de diseño** (`doc N §X`): los comentarios del código apuntan a la sección exacta del documento que
  justifica una decisión (p. ej. `doc 5 §26`). Trazabilidad diseño↔código.
- **BUILD_LOG**: una entrada por paso/sub-fase, con lo hecho + la **verificación** (qué se corrió y su resultado)
  + lo pendiente. Lo más reciente arriba.

---

## 5. La cadena de verificación (Definition of Done técnico)

Antes de cerrar cualquier sub-fase y commitear:

```
typecheck · lint · unit · (integración si toca DB) · build · e2e-journeys
```

Además, para cambios con superficie de ejecución: **ejercitar el comportamiento de verdad** (no solo tests) —
correr el flujo afectado y observar el resultado (p. ej. sync en vivo contra una DB real en transacción
revertida, o driving de la UI). Verificar de forma **no destructiva** sobre datos reales (transacciones que se
revierten, fixtures que se limpian).

---

## 6. Roles: humano ↔ IA

| El humano (owner) | La IA (agente) |
|---|---|
| Define el problema y el producto (Spec). | Redacta y estructura los documentos de diseño. |
| **Decide y congela** producto/arquitectura/stack. | Propone opciones con trade-offs y una recomendación. |
| Aporta credenciales/IDs y valida con datos reales. | Construye por capas, verifica, documenta cada paso. |
| Prioriza el backlog y el gate de lanzamiento. | Mantiene BUILD_LOG/FINDINGS/ADRs y señala contradicciones. |

**Regla de oro (compartida):** ante una ambigüedad o contradicción no resuelta por el diseño, la IA **para y
pregunta**; no inventa reglas de negocio.

### Trabajar con el agente (Claude Code) de forma efectiva

- **`CLAUDE.md` es el contrato de arranque del agente.** En la raíz del proyecto, es lo primero que lee un agente
  que retoma: dónde está el estado (apunta a `BUILD_LOG`/`FINDINGS`/`adr/`), reglas duras (seguridad), comandos,
  convenciones y el flujo de entrega. Mantenerlo al día es lo que hace que **cualquier sesión nueva continúe sin
  contexto perdido** — el chat es efímero; el repo es la memoria.
- **Retomar = leer la bitácora, no re-descubrir.** La primera acción de una sesión nueva es leer `BUILD_LOG.md`
  (lo más reciente arriba) para saber "en qué punto nos quedamos"; la última de cada sesión es dejarlo escrito.
- **Documentar cada paso en `.md` dentro del repo** (feedback del owner): en proyectos largos, plan + progreso
  viven en el repo (BUILD_LOG + ADRs), no sólo en la conversación.
- **Subagentes con edición NO corren git sobre el árbol compartido** (feedback del owner): si se paraleliza con
  subagentes, ninguno hace commit/checkout/merge sobre el mismo working tree; el orquestador consolida y commitea.
- **Verificar de verdad, reportar con fidelidad:** si un test falla, se dice con su salida; si un paso se saltó,
  se dice. "Hecho" sólo cuando la cadena de verificación (§5) está en verde.

---

## 7. Plantilla de arranque para un proyecto nuevo (checklist)

1. ⬜ **Fase 0:** redactar los documentos de diseño 1–7 (adaptar el nº al tamaño; para algo pequeño, fusionar).
   Incluye en el 7 las **convenciones de UX** (crear/editar, estados vacío/carga/error, drawer vs. ficha) —
   no sólo pantallas estáticas.
2. ⬜ **Revisión cruzada (doc 8):** listar y **resolver** inconsistencias como ERRATA-NNN.
3. ⬜ **Revisión del plan (doc 9):** aprobar el plan de construcción con aclaraciones IMP-NNN.
4. ⬜ **Congelar:** `DECISIONS_FROZEN.md` + regla de precedencia + regla de oro; abrir `adr/`.
5. ⬜ **Plan:** `IMPLEMENTATION_ROADMAP.md` con milestones (cada uno = app arrancable) + DoD por feature/migración
   + journeys e2e mínimos.
6. ⬜ **Andamiaje:** repo (monorepo por capas), tooling, CI (install→lint→typecheck→test→build), Docker/deploy,
   `/api/health`, `CLAUDE.md`. **Fundación de UI antes del primer slice** (principio 9; ver Fase 0): tokens semánticos +
   primitivas UI, capa de etiquetas de display, y el patrón de interacción (drawer de crear/editar) montados.
7. ⬜ **Construir por slices verticales** entidad a entidad, cumpliendo el DoD; un commit por sub-fase con la
   cadena de verificación en verde; documentar en `BUILD_LOG` y anotar en `FINDINGS`.
8. ⬜ **Integraciones:** contrato por escrito (propiedad por campo/IDs/dirección) antes de cada adapter.
9. ⬜ **Seguridad:** `SECURITY.md` + `SECURITY_CHECKLIST.md`; sondeo de seguridad con evidencia al cerrar el MVP.
10. ⬜ **Despliegue:** `DEPLOYMENT.md` + gate pre-prod (secretos, HTTPS, healthchecks, backups + restore).
11. ⬜ **Mejora continua:** cada cambio por el mismo patrón; re-verificar seguridad en cada release.
12. ⬜ **Gate público:** completar la Parte II del checklist de seguridad antes de exponer la app a internet.

---

## 8. Portabilidad

El patrón escala hacia abajo: un proyecto pequeño puede tener **menos documentos** (fusionar Spec+Domain, omitir
Wireframes formales) y **menos milestones**, pero **no se saltan los gates**: revisión de consistencia del
diseño, decisiones congeladas con precedencia, app siempre arrancable, verificación por sub-fase, bitácora +
backlog, y los gates de seguridad y despliegue. Ese es el núcleo que hace repetible y fiable el desarrollo con IA.

Aunque se omitan los wireframes formales, **no se omiten dos cosas** (cuestan poco y evitan un retrofit caro):
**(1)** decidir el patrón de interacción de crear/editar y los estados vacío/carga/error, y **(2)** montar la
fundación de UI (tokens de tema + primitivas + capa de etiquetas) antes del primer slice. Son baratas al principio
y carísimas a mitad de camino (§ "lecciones caras" de la Fase 0).
